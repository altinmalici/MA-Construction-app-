-- =============================================================
-- MA Construction – onboarding_pin hashen (2026-08-15)
-- Letzter offener Punkt aus dem Juli-Audit (#8-Restnotiz): Der
-- Einladungs-PIN lag bisher im KLARTEXT in public.users.onboarding_pin.
-- Der API-Zugriff ist zwar seit migration_hardening.sql gesperrt
-- (Spalten-REVOKE), aber Backups/DB-Zugriffe sahen den PIN weiterhin.
--
-- Dieses Skript macht onboarding_pin zu einem bcrypt-Hash:
--   1. Backfill bestehender Klartext-PINs (idempotent via $2-Prefix-Check)
--   2. lookup_user_for_onboarding vergleicht per crypt()
--   3. create_user_with_auth + reset_onboarding_v2 speichern nur den Hash
--
-- Reihenfolge: NACH migration_auth.sql und migration_security_guards.sql
-- ausfuehren — dieses Skript ist danach die AUTORITATIVE Version der
-- drei Funktionen (Guards + GoTrue-Token-Spalten='' bleiben erhalten).
--
-- Die App braucht KEINE Aenderung: Der PIN wird client-seitig generiert
-- (genPin), sofort per WhatsApp geteilt und nie aus der DB gelesen
-- ("Neuer PIN" erzeugt immer einen frischen). auth.users.encrypted_password
-- traegt weiterhin den eigenen GoTrue-bcrypt (unveraendert).
-- =============================================================

-- 1. Backfill: vorhandene Klartext-PINs hashen.
--    bcrypt-Hashes beginnen mit '$2' — Klartext-4-Steller nie.
UPDATE public.users
SET onboarding_pin = crypt(onboarding_pin, gen_salt('bf'))
WHERE onboarding_pin IS NOT NULL
  AND onboarding_pin NOT LIKE '$2%';

-- 2. Lookup: Hash-Vergleich statt Klartext-Gleichheit.
CREATE OR REPLACE FUNCTION lookup_user_for_onboarding(username_input TEXT, onboarding_pin_input TEXT)
RETURNS TABLE(user_id UUID, username TEXT, auth_id UUID) AS $$
  SELECT u.id, u.username, u.auth_id
  FROM public.users u
  WHERE u.username = username_input
  AND u.is_active = true
  AND u.is_onboarded = false
  AND u.onboarding_pin IS NOT NULL
  AND u.onboarding_pin = crypt(onboarding_pin_input, u.onboarding_pin)
  AND u.onboarding_pin_expiry > now();
$$ LANGUAGE sql SECURITY DEFINER;

-- 3a. create_user_with_auth: Hash speichern (Basis: migration_security_guards.sql).
CREATE OR REPLACE FUNCTION create_user_with_auth(
  p_name TEXT, p_username TEXT, p_stundensatz NUMERIC, p_onboarding_pin TEXT, p_onboarding_pin_expiry TIMESTAMPTZ
) RETURNS UUID AS $$
DECLARE new_user_id UUID; new_auth_id UUID; v_email TEXT;
BEGIN
  IF coalesce(is_chef(), false) = false THEN RAISE EXCEPTION 'Nur der Chef darf Nutzer anlegen'; END IF;
  v_email := p_username || '@ma-construction.local';
  new_auth_id := gen_random_uuid();
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at,
    aud, role, raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change, email_change_token_new,
    email_change_token_current, phone_change, phone_change_token, reauthentication_token
  ) VALUES (
    new_auth_id, '00000000-0000-0000-0000-000000000000', v_email,
    crypt(p_onboarding_pin, gen_salt('bf')), now(), 'authenticated', 'authenticated',
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('name', p_name), now(), now(),
    '', '', '', '', '', '', '', ''
  );
  INSERT INTO auth.identities (
    id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), new_auth_id, v_email, 'email',
    jsonb_build_object('sub', new_auth_id::text, 'email', v_email), now(), now(), now()
  );
  INSERT INTO public.users (
    name, role, pin_hash, stundensatz, username, onboarding_pin, onboarding_pin_expiry, is_onboarded, is_active, auth_id
  ) VALUES (
    p_name, 'mitarbeiter', crypt(gen_random_uuid()::text, gen_salt('bf')),
    p_stundensatz, p_username,
    crypt(p_onboarding_pin, gen_salt('bf')),
    p_onboarding_pin_expiry, false, true, new_auth_id
  )
  RETURNING id INTO new_user_id;
  RETURN new_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3b. reset_onboarding_v2: Hash speichern (Basis: migration_security_guards.sql).
CREATE OR REPLACE FUNCTION reset_onboarding_v2(
  p_user_id UUID, p_new_pin TEXT, p_expiry TIMESTAMPTZ, p_username TEXT DEFAULT NULL
) RETURNS void AS $$
DECLARE v_auth_id UUID; v_username TEXT; v_email TEXT;
BEGIN
  IF coalesce(is_chef(), false) = false THEN RAISE EXCEPTION 'Nur der Chef darf Onboarding zuruecksetzen'; END IF;
  SELECT auth_id, username INTO v_auth_id, v_username FROM public.users WHERE id = p_user_id;
  v_username := COALESCE(p_username, v_username);
  v_email := v_username || '@ma-construction.local';
  IF v_auth_id IS NOT NULL THEN
    UPDATE auth.users SET encrypted_password = crypt(p_new_pin, gen_salt('bf')), email = v_email, updated_at = now() WHERE id = v_auth_id;
  END IF;
  UPDATE public.users SET
    pin_hash = crypt(gen_random_uuid()::text, gen_salt('bf')),
    is_onboarded = false,
    onboarding_pin = crypt(p_new_pin, gen_salt('bf')),
    onboarding_pin_expiry = p_expiry,
    username = v_username
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================
-- Verifikation (nach dem Ausfuehren im SQL-Editor):
--   SELECT count(*) FROM users
--   WHERE onboarding_pin IS NOT NULL AND onboarding_pin NOT LIKE '$2%';
--   -- muss 0 sein
-- Dann: In der App "Neuer Einladungs-PIN" fuer einen Test-MA erzeugen und
-- den Erst-Login auf einem zweiten Geraet durchspielen.
-- Rollback: alte Funktionsversionen aus migration_security_guards.sql
-- bzw. migration_auth.sql erneut ausfuehren (Klartext-Vergleich); bereits
-- gehashte PINs sind dann ungueltig -> pro MA "Neuer PIN" erzeugen.
-- =============================================================
