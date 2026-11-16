-- =============================================================
-- MA Construction – Onboarding robust: Einladungs-Link + Reparatur (Paket 5)
-- NOCH NICHT ANGEWANDT. Von Hand im Supabase SQL-Editor ausfuehren.
--
-- Voraussetzung: migration_2026_11_16_01_security_hardening.sql ist
-- angewandt (nutzt rpc_throttle_hit und users_write_guard von dort).
--
-- Inhalt:
--   1. Tabelle onboarding_tokens + 3 RPCs fuer den Einladungs-Link:
--        create_onboarding_token(user)      Chef erzeugt Link-Token
--        validate_onboarding_token(token)   Link-Seite: "Hallo <Name>"
--        consume_onboarding_token(token,pin) Mitarbeiter setzt eigenen PIN
--      Vorteile gegenueber dem 4-stelligen Einladungs-PIN: Das Token hat
--      192 Bit Zufall (nicht erratbar), und der bisherige PIN des
--      Mitarbeiters bleibt gueltig, bis der Link eingeloest wird – ein
--      "Reset" hinterlaesst keinen Zombie-Zustand mehr, wenn die Nachricht
--      nicht ankommt.
--      RISIKO, bewusst in Kauf genommen: Wer den Link hat, kann den PIN
--      dieses Mitarbeiters setzen (wie ein Passwort-Reset-Link). Deshalb:
--        * Link fuer bereits eingerichtete Mitarbeiter nur 48 h gueltig
--          (neue Mitarbeiter: 7 Tage), einmal verwendbar
--        * nicht fuer Chef-Konten
--        * jede PIN-Aenderung, Deaktivierung oder ein neuer Link macht
--          offene Links ungueltig; der Chef kann sie widerrufen
--        * beim Einloesen entsteht eine Benachrichtigung fuer den Chef
--      Bei neu angelegten Mitarbeitern bleibt parallel der 4-stellige
--      Einladungs-PIN gueltig (Rueckfall-Weg der App).
--   2. repair_orphan_user(user): repariert ein Konto, bei dem public.users
--      und auth.users nicht zusammenpassen.
--   3. cleanup_orphan_auth_users(): entfernt Auth-Konten ohne Profil (sie
--      blockieren das erneute Anlegen desselben Benutzernamens).
--   4. reset_onboarding_v2: beendet zusaetzlich laufende Sitzungen des
--      Mitarbeiters und haelt auth.identities synchron.
--
-- VOR DEM AUSFUEHREN pruefen (nur lesen, muss "true" liefern – sonst
-- scheitern Reset und Einloesen am Beenden der Sitzungen):
--   SELECT has_table_privilege(current_user, 'auth.sessions', 'DELETE');
-- NACH DEM AUSFUEHREN sofort testen: in der App "Neuer Zugang" fuer einen
-- Test-Mitarbeiter und (alter Weg) einen Einladungs-PIN erzeugen.
--
-- Aendert KEINE bestehenden Daten. Idempotent. Die App nutzt den Link erst,
-- wenn diese Funktionen existieren (sie erkennt das selbst); der bisherige
-- Einladungs-PIN-Ablauf funktioniert vorher und nachher unveraendert.
-- Getestet in supabase/tests/onboarding.test.js (lokales Wegwerf-Postgres).
-- =============================================================

BEGIN;

-- Voraussetzung pruefen: ohne Migration 01 wuerden die Funktionen unten
-- zwar angelegt, aber beim Aufruf scheitern.
DO $$
BEGIN
  IF to_regprocedure('public.rpc_throttle_hit(text,integer,interval)') IS NULL THEN
    RAISE EXCEPTION 'Bitte zuerst migration_2026_11_16_01_security_hardening.sql ausfuehren';
  END IF;
END $$;

-- -------------------------------------------------------------
-- 1. Einladungs-Token
-- Gespeichert wird nur der SHA-256-Hash; das Token selbst steht nur im Link.
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.onboarding_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_onboarding_tokens_user ON public.onboarding_tokens(user_id);
ALTER TABLE public.onboarding_tokens ENABLE ROW LEVEL SECURITY;
-- Kein direkter Zugriff: nur ueber die RPCs unten.
REVOKE ALL ON public.onboarding_tokens FROM PUBLIC, anon, authenticated;

-- Chef erzeugt einen Link-Token. Gueltig 7 Tage fuer noch nicht
-- eingerichtete Mitarbeiter, 48 h fuer bereits eingerichtete (dort ist der
-- Link ein PIN-Reset). Aeltere offene Tokens desselben Nutzers werden
-- ungueltig. Nicht fuer Chef-Konten.
CREATE OR REPLACE FUNCTION public.create_onboarding_token(p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_token TEXT;
  v_auth_id UUID;
  v_active BOOLEAN;
  v_role TEXT;
  v_onboarded BOOLEAN;
  v_username TEXT;
BEGIN
  IF coalesce(is_chef(), false) = false THEN
    RAISE EXCEPTION 'Nur der Chef darf Einladungen erzeugen';
  END IF;
  SELECT auth_id, is_active, role, is_onboarded, username
    INTO v_auth_id, v_active, v_role, v_onboarded, v_username
  FROM public.users WHERE id = p_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Mitarbeiter nicht gefunden';
  END IF;
  IF v_role = 'chef' THEN
    RAISE EXCEPTION 'Fuer Chef-Konten gibt es keinen Einladungs-Link';
  END IF;
  IF v_username IS NULL THEN
    RAISE EXCEPTION 'Einladung nicht moeglich: Konto ist nicht bereit – bitte zuerst "Zugang reparieren"';
  END IF;
  IF v_active IS NOT TRUE THEN
    RAISE EXCEPTION 'Einladung nicht moeglich: Mitarbeiter ist deaktiviert';
  END IF;
  IF v_auth_id IS NULL OR NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_auth_id) THEN
    RAISE EXCEPTION 'Einladung nicht moeglich: Konto ist nicht bereit – bitte zuerst "Zugang reparieren"';
  END IF;

  DELETE FROM public.onboarding_tokens WHERE user_id = p_user_id AND consumed_at IS NULL;
  DELETE FROM public.onboarding_tokens WHERE expires_at < now() - interval '30 days';

  v_token := encode(gen_random_bytes(24), 'hex');
  INSERT INTO public.onboarding_tokens (user_id, token_hash, expires_at, created_by)
  VALUES (
    p_user_id, encode(digest(v_token, 'sha256'), 'hex'),
    now() + CASE WHEN v_onboarded IS TRUE THEN interval '48 hours' ELSE interval '7 days' END,
    get_my_user_id()
  );
  RETURN v_token;
END;
$$;

-- Link-Seite: Token gueltig? Liefert nur Vorname-tauglichen Namen +
-- Benutzername. Leere Antwort = ungueltig/abgelaufen/eingeloest.
CREATE OR REPLACE FUNCTION public.validate_onboarding_token(p_token TEXT)
RETURNS TABLE(name TEXT, username TEXT, expires_at TIMESTAMPTZ)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF p_token IS NULL OR p_token !~ '^[0-9a-f]{48}$' THEN
    RETURN;
  END IF;
  -- Bewusst KEINE Drossel: Ein 192-Bit-Token laesst sich nicht erraten, und
  -- eine globale Drossel koennte jeder von aussen ausloesen und damit alle
  -- echten Links blockieren.
  RETURN QUERY
    SELECT u.name, u.username, t.expires_at
    FROM public.onboarding_tokens t
    JOIN public.users u ON u.id = t.user_id
    WHERE t.token_hash = encode(digest(p_token, 'sha256'), 'hex')
      AND t.consumed_at IS NULL
      AND t.expires_at > now()
      AND u.is_active = true
      AND u.role <> 'chef';
END;
$$;

-- Mitarbeiter loest den Link ein und setzt seinen eigenen PIN. Danach
-- meldet sich die App mit Benutzername + PIN an (signInWithPassword).
-- Fehler als Ausnahme mit deutschem Text (die App zeigt ihn an).
CREATE OR REPLACE FUNCTION public.consume_onboarding_token(p_token TEXT, p_new_pin TEXT)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_id UUID;
  v_user_id UUID;
  v_auth_id UUID;
  v_username TEXT;
  v_name TEXT;
BEGIN
  IF p_token IS NULL OR p_token !~ '^[0-9a-f]{48}$' THEN
    RAISE EXCEPTION 'Einladung ungueltig oder abgelaufen';
  END IF;
  IF p_new_pin IS NULL OR p_new_pin !~ '^[0-9]{4}$' THEN
    RAISE EXCEPTION 'PIN muss aus genau 4 Ziffern bestehen';
  END IF;

  SELECT t.id, t.user_id, u.auth_id, u.username, u.name
    INTO v_id, v_user_id, v_auth_id, v_username, v_name
  FROM public.onboarding_tokens t
  JOIN public.users u ON u.id = t.user_id
  WHERE t.token_hash = encode(digest(p_token, 'sha256'), 'hex')
    AND t.consumed_at IS NULL
    AND t.expires_at > now()
    AND u.is_active = true
    AND u.role <> 'chef'
  FOR UPDATE OF t;
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'Einladung ungueltig oder abgelaufen';
  END IF;
  IF v_auth_id IS NULL OR v_username IS NULL
     OR NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_auth_id) THEN
    RAISE EXCEPTION 'Einladung kann nicht eingeloest werden: Konto ist nicht bereit – bitte beim Bauleiter melden';
  END IF;

  -- Hinweis: Die Meldung "PIN bereits vergeben" verraet dem Inhaber eines
  -- gueltigen Links, ob ein PIN schon existiert. Eine Drossel greift hier
  -- nicht (eine Ausnahme rollt ihren Zaehler zurueck); der Nutzen fuer einen
  -- Angreifer ist gering: Der erste freie PIN verbraucht den Link.
  IF EXISTS (
    SELECT 1 FROM public.users
    WHERE id <> v_user_id AND pin_hash = crypt(p_new_pin, pin_hash)
  ) THEN
    RAISE EXCEPTION 'PIN bereits vergeben';
  END IF;

  -- Erst als verbraucht markieren, dann den PIN setzen (der Trigger unten
  -- raeumt bei PIN-Aenderungen OFFENE Tokens weg).
  UPDATE public.onboarding_tokens SET consumed_at = now() WHERE id = v_id;
  UPDATE auth.users SET
    encrypted_password = crypt(p_new_pin, gen_salt('bf')),
    banned_until = NULL,
    updated_at = now()
  WHERE id = v_auth_id;
  UPDATE public.users SET
    pin_hash = crypt(p_new_pin, gen_salt('bf')),
    is_onboarded = true,
    onboarding_pin = NULL,
    onboarding_pin_expiry = NULL
  WHERE id = v_user_id;
  -- Alte Anmeldungen (alter PIN, anderes Geraet) koennen nicht mehr
  -- verlaengert werden. Ein bereits ausgestelltes Zugriffs-Token gilt noch
  -- bis zu seinem Ablauf (max. 1 h).
  DELETE FROM auth.sessions WHERE user_id = v_auth_id;
  -- Der Chef soll sehen, dass ein Link benutzt wurde.
  INSERT INTO public.benachrichtigungen (typ, text)
  VALUES ('info', v_name || ' hat über den Einladungs-Link einen PIN festgelegt.');

  RETURN v_username;
END;
$$;

-- Offene Links verlieren ihre Gueltigkeit, sobald sich PIN oder Status des
-- Mitarbeiters aendern (PIN-Wechsel, Reset, Deaktivierung, Reparatur).
CREATE OR REPLACE FUNCTION public.users_invalidate_onboarding_tokens()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF NEW.pin_hash IS DISTINCT FROM OLD.pin_hash
     OR NEW.is_active IS DISTINCT FROM OLD.is_active THEN
    DELETE FROM public.onboarding_tokens WHERE user_id = NEW.id AND consumed_at IS NULL;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_users_invalidate_onboarding_tokens ON public.users;
CREATE TRIGGER trg_users_invalidate_onboarding_tokens
  AFTER UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.users_invalidate_onboarding_tokens();
REVOKE ALL ON FUNCTION public.users_invalidate_onboarding_tokens() FROM PUBLIC, anon, authenticated;

-- Chef widerruft offene Links eines Mitarbeiters (z.B. an den falschen
-- Chat geschickt). Liefert die Anzahl.
CREATE OR REPLACE FUNCTION public.revoke_onboarding_tokens(p_user_id UUID)
RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE v_n INT;
BEGIN
  IF coalesce(is_chef(), false) = false THEN
    RAISE EXCEPTION 'Nur der Chef darf Einladungen widerrufen';
  END IF;
  DELETE FROM public.onboarding_tokens WHERE user_id = p_user_id AND consumed_at IS NULL;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN v_n;
END;
$$;
REVOKE ALL ON FUNCTION public.revoke_onboarding_tokens(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.revoke_onboarding_tokens(UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.create_onboarding_token(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_onboarding_token(UUID) TO authenticated;
-- validate/consume muessen ohne Anmeldung gehen (der Eingeladene hat noch
-- keine Sitzung). Schutz: 192-Bit-Token + Drosseln.
REVOKE ALL ON FUNCTION public.validate_onboarding_token(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_onboarding_token(TEXT) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.consume_onboarding_token(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_onboarding_token(TEXT, TEXT) TO anon, authenticated;

-- -------------------------------------------------------------
-- 2. repair_orphan_user: bringt public.users und auth.users in Einklang.
-- Rueckgabe: kommagetrennte Liste dessen, was getan wurde, oder 'ok'.
-- Aendert KEINEN PIN eines funktionierenden Kontos. Wird ein Auth-Konto neu
-- angelegt/verknuepft, bekommt es ein Zufalls-Passwort und der Mitarbeiter
-- wird auf "nicht eingerichtet" gesetzt → danach neue Einladung schicken.
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.repair_orphan_user(p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_user public.users%ROWTYPE;
  v_email TEXT;
  v_auth_id UUID;
  v_done TEXT[] := '{}';
BEGIN
  IF coalesce(is_chef(), false) = false THEN
    RAISE EXCEPTION 'Nur der Chef darf Zugaenge reparieren';
  END IF;
  SELECT * INTO v_user FROM public.users WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Mitarbeiter nicht gefunden';
  END IF;
  IF v_user.username IS NULL OR v_user.username !~ '^[a-z0-9][a-z0-9._-]{1,30}$' THEN
    -- NICHT loeschen und neu anlegen (das wuerde die erfassten Stunden vom
    -- Mitarbeiter loesen). Ein neuer Einladungs-PIN aus der App setzt
    -- zugleich einen gueltigen Benutzernamen.
    RAISE EXCEPTION 'Benutzername ungueltig – bitte im SQL-Editor korrigieren (siehe docs/sql/onboarding_diagnose.sql)';
  END IF;
  v_email := v_user.username || '@ma-construction.local';

  -- (a) Verknuepfung fehlt oder zeigt ins Leere
  IF v_user.auth_id IS NOT NULL AND EXISTS (SELECT 1 FROM auth.users WHERE id = v_user.auth_id) THEN
    v_auth_id := v_user.auth_id;
  ELSE
    -- Gibt es ein unverknuepftes Auth-Konto mit dieser E-Mail? Dann uebernehmen.
    SELECT a.id INTO v_auth_id
    FROM auth.users a
    WHERE a.email = v_email
      AND NOT EXISTS (SELECT 1 FROM public.users u WHERE u.auth_id = a.id AND u.id <> p_user_id);
    IF v_auth_id IS NOT NULL THEN
      UPDATE auth.users SET
        encrypted_password = crypt(gen_random_uuid()::text, gen_salt('bf')),
        updated_at = now()
      WHERE id = v_auth_id;
      -- Anmeldungen des frueheren Inhabers dieser Adresse beenden.
      DELETE FROM auth.sessions WHERE user_id = v_auth_id;
      v_done := array_append(v_done, 'auth_verknuepft');
    ELSE
      IF EXISTS (SELECT 1 FROM auth.users WHERE email = v_email) THEN
        RAISE EXCEPTION 'Die Anmelde-Adresse gehoert bereits einem anderen Mitarbeiter';
      END IF;
      v_auth_id := gen_random_uuid();
      INSERT INTO auth.users (
        id, instance_id, email, encrypted_password, email_confirmed_at,
        aud, role, raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
        confirmation_token, recovery_token, email_change, email_change_token_new,
        email_change_token_current, phone_change, phone_change_token, reauthentication_token
      ) VALUES (
        v_auth_id, '00000000-0000-0000-0000-000000000000', v_email,
        crypt(gen_random_uuid()::text, gen_salt('bf')), now(), 'authenticated', 'authenticated',
        '{"provider":"email","providers":["email"]}'::jsonb,
        jsonb_build_object('name', v_user.name), now(), now(),
        '', '', '', '', '', '', '', ''
      );
      v_done := array_append(v_done, 'auth_angelegt');
    END IF;
    UPDATE public.users SET
      auth_id = v_auth_id,
      is_onboarded = false,
      pin_hash = crypt(gen_random_uuid()::text, gen_salt('bf')),
      onboarding_pin = NULL,
      onboarding_pin_expiry = NULL
    WHERE id = p_user_id;
  END IF;

  -- (b) E-Mail passt nicht zum Benutzernamen
  IF EXISTS (SELECT 1 FROM auth.users WHERE id = v_auth_id AND email IS DISTINCT FROM v_email) THEN
    IF EXISTS (SELECT 1 FROM auth.users WHERE email = v_email AND id <> v_auth_id) THEN
      RAISE EXCEPTION 'Die Anmelde-Adresse gehoert bereits einem anderen Konto – bitte zuerst verwaiste Konten bereinigen';
    END IF;
    UPDATE auth.users SET email = v_email, updated_at = now() WHERE id = v_auth_id;
    v_done := array_append(v_done, 'email_korrigiert');
  END IF;

  -- (c) Identity fehlt oder ist veraltet
  IF NOT EXISTS (SELECT 1 FROM auth.identities WHERE user_id = v_auth_id AND provider = 'email') THEN
    INSERT INTO auth.identities (
      id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(), v_auth_id, v_email, 'email',
      jsonb_build_object('sub', v_auth_id::text, 'email', v_email), now(), now(), now()
    );
    v_done := array_append(v_done, 'identity_angelegt');
  ELSIF EXISTS (
    -- provider_id ist je nach Entstehung die E-Mail (unsere RPCs) oder die
    -- User-ID (von GoTrue angelegt) – beides ist in Ordnung.
    SELECT 1 FROM auth.identities
    WHERE user_id = v_auth_id AND provider = 'email'
      AND (provider_id NOT IN (v_email, v_auth_id::text)
           OR identity_data->>'email' IS DISTINCT FROM v_email)
  ) THEN
    UPDATE auth.identities SET
      provider_id = CASE WHEN provider_id = v_auth_id::text THEN provider_id ELSE v_email END,
      -- vorhandene Felder behalten, nur sub/email richtigstellen
      identity_data = coalesce(identity_data, '{}'::jsonb)
        || jsonb_build_object('sub', v_auth_id::text, 'email', v_email),
      updated_at = now()
    WHERE user_id = v_auth_id AND provider = 'email';
    v_done := array_append(v_done, 'identity_korrigiert');
  END IF;

  -- (d) Token-Spalten NULL → GoTrue antwortet beim Login mit HTTP 500
  UPDATE auth.users SET
    confirmation_token = coalesce(confirmation_token, ''),
    recovery_token = coalesce(recovery_token, ''),
    email_change = coalesce(email_change, ''),
    email_change_token_new = coalesce(email_change_token_new, ''),
    email_change_token_current = coalesce(email_change_token_current, ''),
    phone_change = coalesce(phone_change, ''),
    phone_change_token = coalesce(phone_change_token, ''),
    reauthentication_token = coalesce(reauthentication_token, ''),
    email_confirmed_at = coalesce(email_confirmed_at, now())
  WHERE id = v_auth_id
    AND (confirmation_token IS NULL OR recovery_token IS NULL OR email_change IS NULL
      OR email_change_token_new IS NULL OR email_change_token_current IS NULL
      OR phone_change IS NULL OR phone_change_token IS NULL
      OR reauthentication_token IS NULL OR email_confirmed_at IS NULL);
  IF FOUND THEN v_done := array_append(v_done, 'auth_felder_korrigiert'); END IF;

  -- (e) Sperre passt nicht zu aktiv/deaktiviert
  IF v_user.is_active IS NOT FALSE THEN
    UPDATE auth.users SET banned_until = NULL, updated_at = now()
    WHERE id = v_auth_id AND banned_until IS NOT NULL;
    IF FOUND THEN v_done := array_append(v_done, 'sperre_aufgehoben'); END IF;
  ELSE
    UPDATE auth.users SET banned_until = '2099-12-31'::timestamptz, updated_at = now()
    WHERE id = v_auth_id AND banned_until IS NULL;
    IF FOUND THEN v_done := array_append(v_done, 'sperre_gesetzt'); END IF;
  END IF;

  IF array_length(v_done, 1) IS NULL THEN
    RETURN 'ok';
  END IF;
  RETURN array_to_string(v_done, ',');
END;
$$;
REVOKE ALL ON FUNCTION public.repair_orphan_user(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.repair_orphan_user(UUID) TO authenticated;

-- -------------------------------------------------------------
-- 3. Verwaiste Auth-Konten (ohne Profil) entfernen. Nur Konten mit der
-- synthetischen App-Domain; liefert die Anzahl. Solche Konten koennen sich
-- nicht anmelden, blockieren aber das Anlegen desselben Benutzernamens.
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cleanup_orphan_auth_users()
RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE v_n INT;
BEGIN
  IF coalesce(is_chef(), false) = false THEN
    RAISE EXCEPTION 'Nur der Chef darf verwaiste Konten bereinigen';
  END IF;
  DELETE FROM auth.users a
  WHERE a.email LIKE '%@ma-construction.local'
    AND NOT EXISTS (SELECT 1 FROM public.users u WHERE u.auth_id = a.id);
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN v_n;
END;
$$;
REVOKE ALL ON FUNCTION public.cleanup_orphan_auth_users() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cleanup_orphan_auth_users() TO authenticated;

-- -------------------------------------------------------------
-- 4. reset_onboarding_v2 (Basis: migration_onboarding_pin_hash.sql)
-- Neu: laufende Sitzungen beenden, Identity mitziehen, klare Fehler bei
-- fehlendem/defektem Auth-Konto statt stillem Teil-Update (das hinterliess
-- einen Mitarbeiter, dessen neuer Einladungs-PIN nie funktionierte).
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reset_onboarding_v2(
  p_user_id UUID, p_new_pin TEXT, p_expiry TIMESTAMPTZ, p_username TEXT DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE v_auth_id UUID; v_username TEXT; v_email TEXT;
BEGIN
  IF coalesce(is_chef(), false) = false THEN RAISE EXCEPTION 'Nur der Chef darf Onboarding zuruecksetzen'; END IF;
  IF p_new_pin IS NULL OR p_new_pin !~ '^[0-9]{4}$' THEN
    RAISE EXCEPTION 'PIN muss aus genau 4 Ziffern bestehen';
  END IF;
  SELECT auth_id, username INTO v_auth_id, v_username FROM public.users WHERE id = p_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Mitarbeiter nicht gefunden'; END IF;
  v_username := COALESCE(p_username, v_username);
  v_email := v_username || '@ma-construction.local';
  IF v_auth_id IS NULL OR NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_auth_id) THEN
    RAISE EXCEPTION 'Zuruecksetzen nicht moeglich: Konto ist nicht bereit – bitte zuerst "Zugang reparieren"';
  END IF;
  UPDATE auth.users SET encrypted_password = crypt(p_new_pin, gen_salt('bf')), email = v_email, updated_at = now() WHERE id = v_auth_id;
  UPDATE auth.identities SET
    provider_id = CASE WHEN provider_id = v_auth_id::text THEN provider_id ELSE v_email END,
    identity_data = coalesce(identity_data, '{}'::jsonb)
      || jsonb_build_object('sub', v_auth_id::text, 'email', v_email),
    updated_at = now()
  WHERE user_id = v_auth_id AND provider = 'email';
  IF v_username IS NULL THEN
    RAISE EXCEPTION 'Benutzername fehlt';
  END IF;
  UPDATE public.users SET
    pin_hash = crypt(gen_random_uuid()::text, gen_salt('bf')),
    is_onboarded = false,
    onboarding_pin = crypt(p_new_pin, gen_salt('bf')),
    onboarding_pin_expiry = p_expiry,
    username = v_username
  WHERE id = p_user_id;
  -- Der alte PIN gilt nicht mehr → alte Anmeldungen koennen nicht mehr
  -- verlaengert werden (ein ausgestelltes Zugriffs-Token gilt noch max. 1 h).
  -- Offene Einladungs-Links raeumt der Trigger weg (pin_hash aendert sich).
  DELETE FROM auth.sessions WHERE user_id = v_auth_id;
END;
$$;
REVOKE ALL ON FUNCTION public.reset_onboarding_v2(UUID, TEXT, TIMESTAMPTZ, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reset_onboarding_v2(UUID, TEXT, TIMESTAMPTZ, TEXT) TO authenticated;

COMMIT;

-- =============================================================
-- Verifikation:
--   SELECT proname FROM pg_proc WHERE proname IN
--     ('create_onboarding_token','validate_onboarding_token','consume_onboarding_token',
--      'revoke_onboarding_tokens','repair_orphan_user','cleanup_orphan_auth_users');   -- 6 Zeilen
--   SELECT relrowsecurity FROM pg_class WHERE relname = 'onboarding_tokens';  -- true
-- Danach in der App: Mitarbeiter → "Zugangslink" erzeugen, Link auf einem
-- zweiten Geraet oeffnen, PIN setzen, anmelden.
-- Rollback:
--   DROP TRIGGER trg_users_invalidate_onboarding_tokens ON users;
--   DROP FUNCTION create_onboarding_token(uuid), validate_onboarding_token(text),
--     consume_onboarding_token(text,text), revoke_onboarding_tokens(uuid),
--     users_invalidate_onboarding_tokens(), repair_orphan_user(uuid), cleanup_orphan_auth_users();
--   DROP TABLE onboarding_tokens;
--   reset_onboarding_v2: Version aus migration_onboarding_pin_hash.sql erneut ausfuehren.
-- =============================================================
