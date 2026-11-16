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
--      Vorteile gegenueber dem 4-stelligen Einladungs-PIN: 192 Bit Zufall
--      (nicht erratbar), und der bisherige PIN des Mitarbeiters bleibt
--      gueltig, bis der Link eingeloest wird – ein "Reset" hinterlaesst
--      keinen Zombie-Zustand mehr, wenn die Nachricht nicht ankommt.
--   2. repair_orphan_user(user): repariert ein Konto, bei dem public.users
--      und auth.users nicht zusammenpassen.
--   3. cleanup_orphan_auth_users(): entfernt Auth-Konten ohne Profil (sie
--      blockieren das erneute Anlegen desselben Benutzernamens).
--   4. reset_onboarding_v2: beendet zusaetzlich laufende Sitzungen des
--      Mitarbeiters und haelt auth.identities synchron.
--
-- Aendert KEINE bestehenden Daten. Idempotent. Die App nutzt den Link erst,
-- wenn diese Funktionen existieren (sie erkennt das selbst); der bisherige
-- Einladungs-PIN-Ablauf funktioniert vorher und nachher unveraendert.
-- Getestet in supabase/tests/onboarding.test.js (lokales Wegwerf-Postgres).
-- =============================================================

BEGIN;

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

-- Chef erzeugt einen Link-Token (7 Tage gueltig). Aeltere, noch nicht
-- eingeloeste Tokens desselben Nutzers werden ungueltig.
CREATE OR REPLACE FUNCTION public.create_onboarding_token(p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_token TEXT;
  v_auth_id UUID;
  v_active BOOLEAN;
BEGIN
  IF coalesce(is_chef(), false) = false THEN
    RAISE EXCEPTION 'Nur der Chef darf Einladungen erzeugen';
  END IF;
  SELECT auth_id, is_active INTO v_auth_id, v_active FROM public.users WHERE id = p_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Mitarbeiter nicht gefunden';
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
  VALUES (p_user_id, encode(digest(v_token, 'sha256'), 'hex'), now() + interval '7 days', get_my_user_id());
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
  IF NOT rpc_throttle_hit('einladung:*', 120, interval '1 minute') THEN
    RETURN;
  END IF;
  RETURN QUERY
    SELECT u.name, u.username, t.expires_at
    FROM public.onboarding_tokens t
    JOIN public.users u ON u.id = t.user_id
    WHERE t.token_hash = encode(digest(p_token, 'sha256'), 'hex')
      AND t.consumed_at IS NULL
      AND t.expires_at > now()
      AND u.is_active = true;
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
BEGIN
  IF p_token IS NULL OR p_token !~ '^[0-9a-f]{48}$' THEN
    RAISE EXCEPTION 'Einladung ungueltig oder abgelaufen';
  END IF;
  IF p_new_pin IS NULL OR p_new_pin !~ '^[0-9]{4}$' THEN
    RAISE EXCEPTION 'PIN muss aus genau 4 Ziffern bestehen';
  END IF;

  SELECT t.id, t.user_id, u.auth_id, u.username
    INTO v_id, v_user_id, v_auth_id, v_username
  FROM public.onboarding_tokens t
  JOIN public.users u ON u.id = t.user_id
  WHERE t.token_hash = encode(digest(p_token, 'sha256'), 'hex')
    AND t.consumed_at IS NULL
    AND t.expires_at > now()
    AND u.is_active = true
  FOR UPDATE OF t;
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'Einladung ungueltig oder abgelaufen';
  END IF;
  IF v_auth_id IS NULL OR NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_auth_id) THEN
    RAISE EXCEPTION 'Einladung kann nicht eingeloest werden: Konto ist nicht bereit – bitte beim Bauleiter melden';
  END IF;

  -- Die Meldung "PIN bereits vergeben" verraet, welche PINs existieren:
  -- pro Einladung hoechstens 6 Versuche je Stunde.
  IF NOT rpc_throttle_hit('einladung:' || v_id::text, 6, interval '1 hour') THEN
    RAISE EXCEPTION 'Zu viele Versuche – bitte in einer Stunde erneut probieren';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.users
    WHERE id <> v_user_id AND pin_hash = crypt(p_new_pin, pin_hash)
  ) THEN
    RAISE EXCEPTION 'PIN bereits vergeben';
  END IF;

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
  UPDATE public.onboarding_tokens SET consumed_at = now() WHERE id = v_id;
  -- Alte Sitzungen (alter PIN, anderes Geraet) beenden.
  DELETE FROM auth.sessions WHERE user_id = v_auth_id;

  RETURN v_username;
END;
$$;

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
    RAISE EXCEPTION 'Benutzername ungueltig – bitte Mitarbeiter loeschen und mit gueltigem Benutzernamen neu anlegen';
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
    SELECT 1 FROM auth.identities
    WHERE user_id = v_auth_id AND provider = 'email'
      AND (provider_id IS DISTINCT FROM v_email OR identity_data->>'email' IS DISTINCT FROM v_email)
  ) THEN
    UPDATE auth.identities SET
      provider_id = v_email,
      identity_data = jsonb_build_object('sub', v_auth_id::text, 'email', v_email),
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
    provider_id = v_email,
    identity_data = jsonb_build_object('sub', v_auth_id::text, 'email', v_email),
    updated_at = now()
  WHERE user_id = v_auth_id AND provider = 'email';
  UPDATE public.users SET
    pin_hash = crypt(gen_random_uuid()::text, gen_salt('bf')),
    is_onboarded = false,
    onboarding_pin = crypt(p_new_pin, gen_salt('bf')),
    onboarding_pin_expiry = p_expiry,
    username = v_username
  WHERE id = p_user_id;
  -- Der alte PIN gilt nicht mehr → auch keine alte Sitzung.
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
--      'repair_orphan_user','cleanup_orphan_auth_users');   -- 5 Zeilen
--   SELECT relrowsecurity FROM pg_class WHERE relname = 'onboarding_tokens';  -- true
-- Danach in der App: Mitarbeiter → "Zugangslink" erzeugen, Link auf einem
-- zweiten Geraet oeffnen, PIN setzen, anmelden.
-- Rollback:
--   DROP FUNCTION create_onboarding_token(uuid), validate_onboarding_token(text),
--     consume_onboarding_token(text,text), repair_orphan_user(uuid), cleanup_orphan_auth_users();
--   DROP TABLE onboarding_tokens;
--   reset_onboarding_v2: Version aus migration_onboarding_pin_hash.sql erneut ausfuehren.
-- =============================================================
