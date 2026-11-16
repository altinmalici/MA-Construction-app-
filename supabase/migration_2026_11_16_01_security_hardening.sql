-- =============================================================
-- MA Construction – Sicherheits-Haertung (Audit 2026-11, Paket 2)
-- NOCH NICHT ANGEWANDT. Von Hand im Supabase SQL-Editor ausfuehren.
--
-- Behebt aus docs/AUDIT_2026-11.md:
--   S-01  Mitarbeiter konnte die eigene Rolle auf 'chef' setzen
--   S-02  PIN-Drossel-Tabelle war von aussen les-/schreibbar
--   S-03  Mitarbeiter konnten fremde und freigegebene Stunden aendern
--   S-04  check_pin_exists ohne Drossel (PIN-Durchprobieren)
--   S-05  Einladungs-PIN: Ablauf nicht serverseitig geprueft, Lookup ungedrosselt
--   S-06  PIN-Format und -Eindeutigkeit nur im Client geprueft
--   S-07  SECURITY-DEFINER-Funktionen ohne festen search_path
--   S-08  Benutzername ungeprueft
--
-- Eigenschaften:
--   * Idempotent: kann mehrfach ausgefuehrt werden.
--   * Aendert KEINE Daten (nur Rechte, Policies, Funktionen, 1 neue Tabelle).
--   * Die aktuell ausgelieferte App funktioniert danach unveraendert weiter.
--     Einzige sichtbare Verhaltensaenderung: Mitarbeiter koennen nur noch
--     EIGENE, nicht freigegebene Stunden anlegen/aendern/loeschen (die App
--     bietet Mitarbeitern ohnehin nichts anderes an) und den eigenen
--     Stundensatz nicht mehr per API aendern.
--   * Getestet in supabase/tests/security_hardening.test.js gegen ein
--     lokales Wegwerf-Postgres. GoTrue selbst lief dabei nicht.
--
-- VOR DEM AUSFUEHREN pruefen (nur lesen): Alle Funktionen muessen der Rolle
-- gehoeren, mit der der SQL-Editor laeuft (normalerweise "postgres"), sonst
-- bricht Teil 6 mit "must be owner" ab (dann wird NICHTS geaendert):
--   SELECT oid::regprocedure, proowner::regrole, prokind FROM pg_proc
--   WHERE pronamespace = 'public'::regnamespace AND prosecdef;
--
-- Voraussetzung: alle bisherigen Migrationen sind angewandt (Reihenfolge in
-- docs/SETUP.md), insbesondere migration_stunden_freigabe.sql und
-- migration_onboarding_pin_hash.sql.
--
-- NACH DEM AUSFUEHREN TESTEN: Chef-Login, Mitarbeiter-Login, Mitarbeiter
-- bearbeiten (Name/Stundensatz), Stunde erfassen als Mitarbeiter, PIN im
-- Profil aendern, "Neuer Einladungs-PIN" + Erster Zugang auf zweitem Geraet.
-- Rollback: siehe Ende der Datei.
-- =============================================================

BEGIN;

-- -------------------------------------------------------------
-- TEIL 1 – S-01: users – Spaltenschutz fuer Schreibzugriffe
-- Die Policy "mitarbeiter_update_own" erlaubte jedem Nutzer, die EIGENE Zeile
-- komplett zu aendern (auch role). Die App schreibt users direkt nur in
-- users.update(): name + stundensatz (Chef im Mitarbeiter-Formular, jeder
-- Nutzer im eigenen Profil – dort wird der Stundensatz unveraendert
-- durchgereicht). Alles andere laeuft ueber RPCs.
--   * Spalten-GRANT: direkt schreibbar sind nur noch name und stundensatz.
--   * Policy bleibt (eigene Zeile), damit das Profil weiter speichern kann.
--   * Trigger (Teil 5): den Stundensatz darf nur der Chef aendern.
-- -------------------------------------------------------------
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON public.users FROM PUBLIC, anon, authenticated;
GRANT UPDATE (name, stundensatz) ON public.users TO authenticated;

DROP POLICY IF EXISTS "mitarbeiter_update_own" ON public.users;
CREATE POLICY "mitarbeiter_update_own" ON public.users FOR UPDATE
  USING (auth_id = auth.uid())
  WITH CHECK (auth_id = auth.uid());

-- is_chef(): ein deaktivierter Chef verliert seine Rechte sofort (nicht erst,
-- wenn sein Token nach bis zu 1 h ablaeuft).
CREATE OR REPLACE FUNCTION public.is_chef()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.users
    WHERE auth_id = auth.uid() AND role = 'chef' AND is_active IS NOT FALSE
  );
$$;

-- -------------------------------------------------------------
-- TEIL 2 – S-02: Drossel-Tabellen abschotten
-- -------------------------------------------------------------
ALTER TABLE public.pin_lookup_throttle ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.pin_lookup_throttle FROM PUBLIC, anon, authenticated;

-- Allgemeine Drossel fuer weitere RPCs (pro Schluessel ein Zeitfenster).
CREATE TABLE IF NOT EXISTS public.rpc_throttle (
  key TEXT PRIMARY KEY,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  count INT NOT NULL DEFAULT 0
);
ALTER TABLE public.rpc_throttle ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.rpc_throttle FROM PUBLIC, anon, authenticated;

-- true = Aufruf erlaubt (und gezaehlt), false = Limit im Fenster erreicht.
CREATE OR REPLACE FUNCTION public.rpc_throttle_hit(p_key TEXT, p_max INT, p_window INTERVAL)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_start TIMESTAMPTZ;
  v_count INT;
BEGIN
  -- Alte Zaehler wegraeumen, damit die Tabelle nicht unbegrenzt waechst.
  DELETE FROM public.rpc_throttle WHERE window_start < now() - interval '1 day';

  INSERT INTO public.rpc_throttle (key, window_start, count)
  VALUES (p_key, now(), 0)
  ON CONFLICT (key) DO NOTHING;

  SELECT t.window_start, t.count INTO v_start, v_count
  FROM public.rpc_throttle t WHERE t.key = p_key FOR UPDATE;

  IF v_start < now() - p_window THEN
    UPDATE public.rpc_throttle SET window_start = now(), count = 1 WHERE key = p_key;
    RETURN true;
  END IF;
  IF v_count >= p_max THEN
    RETURN false;
  END IF;
  UPDATE public.rpc_throttle SET count = count + 1 WHERE key = p_key;
  RETURN true;
END;
$$;
-- Nur intern (aus anderen SECURITY-DEFINER-Funktionen) aufrufbar.
REVOKE ALL ON FUNCTION public.rpc_throttle_hit(TEXT, INT, INTERVAL) FROM PUBLIC, anon, authenticated;

-- -------------------------------------------------------------
-- TEIL 3 – S-03: Stundeneintraege
-- Mitarbeiter: nur EIGENE Eintraege, nur auf zugewiesenen Baustellen, und
-- nur solange sie nicht freigegeben sind. Freigeben darf nur der Chef.
-- Lesen bleibt wie bisher (Kollegen-Eintraege der eigenen Baustellen sichtbar).
-- -------------------------------------------------------------
ALTER TABLE public.stundeneintraege
  ADD COLUMN IF NOT EXISTS freigegeben BOOLEAN NOT NULL DEFAULT false;

DROP POLICY IF EXISTS "mitarbeiter_insert" ON public.stundeneintraege;
DROP POLICY IF EXISTS "mitarbeiter_update" ON public.stundeneintraege;
DROP POLICY IF EXISTS "mitarbeiter_delete" ON public.stundeneintraege;

CREATE POLICY "mitarbeiter_insert" ON public.stundeneintraege FOR INSERT
  WITH CHECK (
    baustelle_id IN (SELECT my_baustelle_ids())
    AND person_typ = 'mitarbeiter'
    AND mitarbeiter_id = get_my_user_id()
    AND freigegeben = false
  );

CREATE POLICY "mitarbeiter_update" ON public.stundeneintraege FOR UPDATE
  USING (mitarbeiter_id = get_my_user_id() AND freigegeben = false)
  WITH CHECK (
    baustelle_id IN (SELECT my_baustelle_ids())
    AND person_typ = 'mitarbeiter'
    AND mitarbeiter_id = get_my_user_id()
    AND freigegeben = false
  );

CREATE POLICY "mitarbeiter_delete" ON public.stundeneintraege FOR DELETE
  USING (mitarbeiter_id = get_my_user_id() AND freigegeben = false);

-- -------------------------------------------------------------
-- TEIL 4 – S-06 / S-05: PIN-Regeln im Server
-- Basis: migration_security_guards.sql (Guards unveraendert uebernommen).
-- Neu: Format ^\d{4}$, Eindeutigkeit, Ablauf des Einladungs-PINs.
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_user_pin_v2(p_user_id UUID, p_new_pin TEXT)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_auth_id UUID;
  v_onboarded BOOLEAN;
  v_is_chef BOOLEAN := coalesce(is_chef(), false);
BEGIN
  IF v_is_chef = false AND coalesce(p_user_id = get_my_user_id(), false) = false THEN
    RAISE EXCEPTION 'Nicht erlaubt';
  END IF;
  IF p_new_pin IS NULL OR p_new_pin !~ '^[0-9]{4}$' THEN
    RAISE EXCEPTION 'PIN muss aus genau 4 Ziffern bestehen';
  END IF;
  SELECT is_onboarded INTO v_onboarded FROM public.users WHERE id = p_user_id;
  IF v_is_chef = false THEN
    -- Ohne das koennte ein Eingeladener den Ablauf des Einladungs-PINs
    -- umgehen, indem er statt complete_onboarding_v2 diese Funktion ruft.
    IF v_onboarded IS NOT TRUE THEN
      RAISE EXCEPTION 'Onboarding nicht abgeschlossen';
    END IF;
    -- Die Meldung "PIN bereits vergeben" verraet, welche PINs existieren →
    -- gleiche Drossel wie check_pin_exists.
    IF NOT rpc_throttle_hit('pin:' || coalesce(auth.uid()::text, 'none'), 6, interval '1 hour') THEN
      RAISE EXCEPTION 'Zu viele Versuche – bitte in einer Stunde erneut probieren';
    END IF;
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.users
    WHERE id <> p_user_id AND pin_hash = crypt(p_new_pin, pin_hash)
  ) THEN
    RAISE EXCEPTION 'PIN bereits vergeben';
  END IF;
  SELECT auth_id INTO v_auth_id FROM public.users WHERE id = p_user_id;
  IF v_auth_id IS NOT NULL THEN
    UPDATE auth.users SET encrypted_password = crypt(p_new_pin, gen_salt('bf')), updated_at = now() WHERE id = v_auth_id;
  END IF;
  UPDATE public.users SET pin_hash = crypt(p_new_pin, gen_salt('bf')) WHERE id = p_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_onboarding_v2(p_user_id UUID, p_new_pin TEXT)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_auth_id UUID;
  v_onboarded BOOLEAN;
  v_expiry TIMESTAMPTZ;
  v_is_chef BOOLEAN := coalesce(is_chef(), false);
BEGIN
  IF v_is_chef = false AND coalesce(p_user_id = get_my_user_id(), false) = false THEN
    RAISE EXCEPTION 'Nicht erlaubt';
  END IF;
  IF p_new_pin IS NULL OR p_new_pin !~ '^[0-9]{4}$' THEN
    RAISE EXCEPTION 'PIN muss aus genau 4 Ziffern bestehen';
  END IF;
  SELECT auth_id, is_onboarded, onboarding_pin_expiry
    INTO v_auth_id, v_onboarded, v_expiry
  FROM public.users WHERE id = p_user_id;
  IF v_auth_id IS NULL THEN RAISE EXCEPTION 'User hat keine auth_id'; END IF;
  -- Der 7-Tage-Ablauf wurde bisher nur im Lookup geprueft; per direktem
  -- signInWithPassword blieb ein abgelaufener Einladungs-PIN nutzbar.
  IF v_is_chef = false AND v_onboarded IS NOT TRUE
     AND v_expiry IS NOT NULL AND v_expiry < now() THEN
    RAISE EXCEPTION 'Einladungs-PIN abgelaufen';
  END IF;
  IF v_is_chef = false
     AND NOT rpc_throttle_hit('pin:' || coalesce(auth.uid()::text, 'none'), 6, interval '1 hour') THEN
    RAISE EXCEPTION 'Zu viele Versuche – bitte in einer Stunde erneut probieren';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.users
    WHERE id <> p_user_id AND pin_hash = crypt(p_new_pin, pin_hash)
  ) THEN
    RAISE EXCEPTION 'PIN bereits vergeben';
  END IF;
  UPDATE auth.users SET encrypted_password = crypt(p_new_pin, gen_salt('bf')), updated_at = now() WHERE id = v_auth_id;
  UPDATE public.users SET
    pin_hash = crypt(p_new_pin, gen_salt('bf')), is_onboarded = true, onboarding_pin = null, onboarding_pin_expiry = null
  WHERE id = p_user_id;
END;
$$;

-- S-05: Einladungs-Lookup drosseln (5 Versuche / 15 min pro eingeladenem
-- Benutzernamen, 60 / min insgesamt). Gedrosselt = leere Antwort, wie bei
-- falschem PIN. Der Zaehler pro Benutzername wird nur fuer tatsaechlich
-- eingeladene Nutzer gefuehrt (sonst koennte man die Tabelle mit
-- Fantasienamen fuellen).
-- Bekannte Grenze: Wer den Benutzernamen kennt, kann dessen Erst-Anmeldung
-- fuer 15 min blockieren. Das ist der Preis dafuer, dass der 4-stellige
-- Einladungs-PIN nicht durchprobiert werden kann.
CREATE OR REPLACE FUNCTION public.lookup_user_for_onboarding(username_input TEXT, onboarding_pin_input TEXT)
RETURNS TABLE(user_id UUID, username TEXT, auth_id UUID)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF NOT rpc_throttle_hit('onboarding:*', 60, interval '1 minute') THEN
    RETURN;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.username = username_input AND u.is_onboarded = false
  ) THEN
    RETURN;
  END IF;
  IF NOT rpc_throttle_hit('onboarding:' || username_input, 5, interval '15 minutes') THEN
    RETURN;
  END IF;
  RETURN QUERY
    SELECT u.id, u.username, u.auth_id
    FROM public.users u
    WHERE u.username = username_input
      AND u.is_active = true
      AND u.is_onboarded = false
      AND u.onboarding_pin IS NOT NULL
      AND u.onboarding_pin = crypt(onboarding_pin_input, u.onboarding_pin)
      AND u.onboarding_pin_expiry > now();
END;
$$;

-- S-04: PIN-Abfragen pro eingeloggtem Nutzer drosseln (zusammen 6 / Stunde
-- fuer check_pin_exists, update_user_pin_v2, complete_onboarding_v2).
-- Normale Nutzung braucht 2 Aufrufe (pruefen + setzen).
CREATE OR REPLACE FUNCTION public.check_pin_exists(pin_input TEXT, exclude_user_id UUID DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF NOT rpc_throttle_hit('pin:' || coalesce(auth.uid()::text, 'none'), 6, interval '1 hour') THEN
    RAISE EXCEPTION 'Zu viele Versuche – bitte in einer Stunde erneut probieren';
  END IF;
  RETURN EXISTS(
    SELECT 1 FROM public.users
    WHERE pin_hash = crypt(pin_input, pin_hash)
      AND (exclude_user_id IS NULL OR id != exclude_user_id)
  );
END;
$$;
REVOKE EXECUTE ON FUNCTION public.check_pin_exists(TEXT, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_pin_exists(TEXT, UUID) TO authenticated;

-- -------------------------------------------------------------
-- TEIL 5 – S-08 + S-01: Schreib-Waechter auf users
-- (a) Benutzername: wird Teil der Auth-E-Mail; GoTrue schreibt E-Mails beim
--     Login klein. Grossbuchstaben/Leerzeichen/Umlaute ergaben Konten, die
--     sich nie anmelden konnten. Geprueft nur bei INSERT oder Aenderung des
--     Benutzernamens, damit bestehende Zeilen nicht blockiert werden.
-- (b) Stundensatz: nur der Chef kann ihn aendern (Aenderungen anderer werden
--     verworfen). Greift nur bei Aufrufen
--     ueber die API (auth.uid() gesetzt) – SQL-Editor/Service-Role bleiben frei.
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.users_write_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, extensions
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.username IS DISTINCT FROM OLD.username THEN
    IF NEW.username IS NULL OR NEW.username !~ '^[a-z0-9][a-z0-9._-]{1,30}$' THEN
      RAISE EXCEPTION 'Benutzername ungueltig: 2-31 Zeichen, nur a-z, 0-9, Punkt, Bindestrich, Unterstrich';
    END IF;
  END IF;
  -- Still zuruecksetzen statt Fehler: Das Profil schickt den Stundensatz
  -- aus dem Login-Zeitpunkt mit. Hat der Chef ihn inzwischen geaendert,
  -- wuerde ein Fehler das Profil-Speichern scheitern lassen (nachdem der
  -- PIN schon geaendert ist) – und ohne Schutz den Chef-Wert ueberschreiben.
  IF TG_OP = 'UPDATE'
     AND NEW.stundensatz IS DISTINCT FROM OLD.stundensatz
     AND auth.uid() IS NOT NULL
     AND coalesce(public.is_chef(), false) = false THEN
    NEW.stundensatz := OLD.stundensatz;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_users_validate_username ON public.users;
DROP TRIGGER IF EXISTS trg_users_write_guard ON public.users;
CREATE TRIGGER trg_users_write_guard
  BEFORE INSERT OR UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.users_write_guard();

-- -------------------------------------------------------------
-- TEIL 6 – S-07: fester search_path fuer ALLE SECURITY-DEFINER-Funktionen
-- in public, die noch keinen haben. 'extensions' wegen crypt()/gen_salt().
-- Schleife statt fester Liste, damit keine Funktion vergessen wird und das
-- Skript nicht an einer fehlenden Signatur scheitert.
-- -------------------------------------------------------------
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef
      AND NOT EXISTS (
        SELECT 1 FROM unnest(coalesce(p.proconfig, '{}'::text[])) c
        WHERE c LIKE 'search_path=%'
      )
  LOOP
    EXECUTE format('ALTER FUNCTION %s SET search_path = public, extensions', r.sig);
  END LOOP;
END $$;

-- -------------------------------------------------------------
-- TEIL 7 – Admin-RPCs: EXECUTE auch von PUBLIC entziehen
-- migration_auth.sql entzog nur "anon". Funktionen sind aber standardmaessig
-- fuer PUBLIC ausfuehrbar, und anon ist Teil von PUBLIC – der Entzug wirkte
-- also nicht. (Nicht ausnutzbar, weil die Funktionen intern is_chef()
-- pruefen; hier wird die zweite Schranke nachgezogen.)
-- -------------------------------------------------------------
DO $$
DECLARE sig TEXT;
BEGIN
  FOREACH sig IN ARRAY ARRAY[
    'public.create_user_with_pin_v2(text,text,text,numeric,text)',
    'public.create_user_with_auth(text,text,numeric,text,timestamptz)',
    'public.delete_user_with_auth(uuid)',
    'public.reset_onboarding_v2(uuid,text,timestamptz,text)',
    'public.toggle_user_active_v2(uuid,boolean)',
    'public.update_user_pin_v2(uuid,text)',
    'public.complete_onboarding_v2(uuid,text)',
    'public.sync_baustelle_junctions(uuid,uuid[],uuid[])'
  ] LOOP
    IF to_regprocedure(sig) IS NOT NULL THEN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon', sig);
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', sig);
    END IF;
  END LOOP;
END $$;

COMMIT;

-- =============================================================
-- Verifikation (nach dem Ausfuehren, im SQL-Editor):
--
--   -- 1) keine SECURITY-DEFINER-Funktion ohne search_path (muss 0 Zeilen liefern)
--   SELECT p.oid::regprocedure FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
--   WHERE n.nspname = 'public' AND p.prosecdef
--     AND NOT EXISTS (SELECT 1 FROM unnest(coalesce(p.proconfig,'{}')) c WHERE c LIKE 'search_path=%');
--
--   -- 2) RLS auf den Drossel-Tabellen (beide true)
--   SELECT relname, relrowsecurity FROM pg_class WHERE relname IN ('pin_lookup_throttle','rpc_throttle');
--
--   -- 3) direkt schreibbare users-Spalten (nur name, stundensatz)
--   SELECT column_name, privilege_type FROM information_schema.column_privileges
--   WHERE table_name = 'users' AND grantee = 'authenticated' AND privilege_type = 'UPDATE';
--
--   -- 4) Hat sich schon jemand befoerdert? (nur bekannte Chefs duerfen erscheinen)
--   SELECT name, username, role, created_at FROM users WHERE role = 'chef';
--
-- Rollback (nur im Notfall, stellt die alten Luecken wieder her):
--   - Policies stundeneintraege: Abschnitt 7 aus migration_rls.sql erneut ausfuehren
--   - users: GRANT INSERT, UPDATE, DELETE ON users TO authenticated;
--   - Funktionen: migration_security_guards.sql, migration_onboarding_pin_hash.sql,
--     migration_check_pin_exists_hardening.sql erneut ausfuehren
--   - DROP TRIGGER trg_users_write_guard ON users;
-- =============================================================
