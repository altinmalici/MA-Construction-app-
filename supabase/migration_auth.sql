-- =============================================================
-- MA Construction – Auth Migration
-- Supabase Auth Integration + neue RPC-Funktionen
-- Im Supabase SQL Editor ausführen
-- =============================================================

-- 1. auth_id Spalte hinzufügen (Link zu auth.users)
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_id UUID UNIQUE;

-- =============================================================
-- 2. Helper-Funktionen für RLS
-- =============================================================

-- Gibt die public.users.id für den aktuell eingeloggten auth.user zurück
CREATE OR REPLACE FUNCTION get_my_user_id()
RETURNS UUID AS $$
  SELECT id FROM public.users WHERE auth_id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Prüft ob der aktuelle User ein Chef ist
CREATE OR REPLACE FUNCTION is_chef()
RETURNS BOOLEAN AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.users
    WHERE auth_id = auth.uid() AND role = 'chef'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Gibt alle Baustellen-IDs zurück, denen der aktuelle User zugewiesen ist
CREATE OR REPLACE FUNCTION my_baustelle_ids()
RETURNS SETOF UUID AS $$
  SELECT baustelle_id FROM public.baustellen_mitarbeiter
  WHERE user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid());
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Lädt volles User-Profil nach signIn (aufgerufen vom Frontend)
CREATE OR REPLACE FUNCTION get_user_by_auth_id()
RETURNS TABLE(id UUID, name TEXT, role TEXT, stundensatz NUMERIC, username TEXT, is_onboarded BOOLEAN) AS $$
  SELECT u.id, u.name, u.role, u.stundensatz, u.username, u.is_onboarded
  FROM public.users u
  WHERE u.auth_id = auth.uid()
  AND u.is_active = true;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- =============================================================
-- 3. Lookup-Funktionen (SECURITY DEFINER, bypass RLS)
-- Ersetzen alte Login-RPCs als reiner Lookup
-- =============================================================

-- Mode C: PIN eingeben → findet Username + auth_id
-- Gibt nur das Minimum zurück, was für signInWithPassword nötig ist
CREATE OR REPLACE FUNCTION lookup_user_by_pin(pin_input TEXT)
RETURNS TABLE(username TEXT, auth_id UUID, is_onboarded BOOLEAN) AS $$
  SELECT u.username, u.auth_id, u.is_onboarded
  FROM public.users u
  WHERE u.pin_hash = crypt(pin_input, u.pin_hash)
  AND u.is_active = true;
$$ LANGUAGE sql SECURITY DEFINER;

-- Mode A: Username + Onboarding-PIN → findet auth_id für Onboarding
CREATE OR REPLACE FUNCTION lookup_user_for_onboarding(username_input TEXT, onboarding_pin_input TEXT)
RETURNS TABLE(user_id UUID, username TEXT, auth_id UUID) AS $$
  SELECT u.id, u.username, u.auth_id
  FROM public.users u
  WHERE u.username = username_input
  AND u.is_active = true
  AND u.is_onboarded = false
  AND u.onboarding_pin = onboarding_pin_input
  AND u.onboarding_pin_expiry > now();
$$ LANGUAGE sql SECURITY DEFINER;

-- =============================================================
-- 4. Temporärer Helper für Migration Script
-- Prüft ob ein Kandidat-PIN für einen bestimmten User korrekt ist
-- =============================================================

CREATE OR REPLACE FUNCTION check_single_pin(p_user_id UUID, candidate TEXT)
RETURNS BOOLEAN AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.users
    WHERE id = p_user_id
    AND pin_hash = crypt(candidate, pin_hash)
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- =============================================================
-- 5. v2 RPC-Funktionen (auth.users + public.users synchron)
-- =============================================================

-- Complete Onboarding: Setzt neuen PIN + Auth-Passwort
CREATE OR REPLACE FUNCTION complete_onboarding_v2(p_user_id UUID, p_new_pin TEXT)
RETURNS void AS $$
DECLARE
  v_auth_id UUID;
BEGIN
  -- Auth-Passwort aktualisieren
  SELECT auth_id INTO v_auth_id FROM public.users WHERE id = p_user_id;
  IF v_auth_id IS NULL THEN
    RAISE EXCEPTION 'User hat keine auth_id';
  END IF;

  -- Update auth.users password
  UPDATE auth.users SET
    encrypted_password = crypt(p_new_pin, gen_salt('bf')),
    updated_at = now()
  WHERE id = v_auth_id;

  -- Update public.users
  UPDATE public.users SET
    pin_hash = crypt(p_new_pin, gen_salt('bf')),
    is_onboarded = true,
    onboarding_pin = null,
    onboarding_pin_expiry = null
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Chef erstellt User mit PIN direkt (kein Onboarding)
CREATE OR REPLACE FUNCTION create_user_with_pin_v2(
  p_name TEXT,
  p_role TEXT,
  p_pin TEXT,
  p_stundensatz NUMERIC,
  p_username TEXT
)
RETURNS UUID AS $$
DECLARE
  new_user_id UUID;
  new_auth_id UUID;
  v_email TEXT;
BEGIN
  v_email := p_username || '@ma-construction.local';

  -- 1. Auth User erstellen
  new_auth_id := gen_random_uuid();
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at,
    aud, role, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) VALUES (
    new_auth_id, '00000000-0000-0000-0000-000000000000', v_email,
    crypt(p_pin, gen_salt('bf')), now(),
    'authenticated', 'authenticated',
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('name', p_name),
    now(), now()
  );

  -- 2. Auth Identity erstellen
  INSERT INTO auth.identities (
    id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), new_auth_id, v_email, 'email',
    jsonb_build_object('sub', new_auth_id::text, 'email', v_email),
    now(), now(), now()
  );

  -- 3. Public User erstellen
  INSERT INTO public.users (name, role, pin_hash, stundensatz, username, is_onboarded, is_active, auth_id)
  VALUES (p_name, p_role, crypt(p_pin, gen_salt('bf')), p_stundensatz, p_username, true, true, new_auth_id)
  RETURNING id INTO new_user_id;

  RETURN new_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Chef erstellt User für Onboarding (mit temporärem PIN)
CREATE OR REPLACE FUNCTION create_user_with_auth(
  p_name TEXT,
  p_username TEXT,
  p_stundensatz NUMERIC,
  p_onboarding_pin TEXT,
  p_onboarding_pin_expiry TIMESTAMPTZ
)
RETURNS UUID AS $$
DECLARE
  new_user_id UUID;
  new_auth_id UUID;
  v_email TEXT;
  v_temp_password TEXT;
BEGIN
  v_email := p_username || '@ma-construction.local';
  -- Temporäres Passwort = onboarding_pin (wird bei Onboarding geändert)
  v_temp_password := p_onboarding_pin;

  -- 1. Auth User erstellen
  new_auth_id := gen_random_uuid();
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at,
    aud, role, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) VALUES (
    new_auth_id, '00000000-0000-0000-0000-000000000000', v_email,
    crypt(v_temp_password, gen_salt('bf')), now(),
    'authenticated', 'authenticated',
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('name', p_name),
    now(), now()
  );

  -- 2. Auth Identity erstellen
  INSERT INTO auth.identities (
    id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), new_auth_id, v_email, 'email',
    jsonb_build_object('sub', new_auth_id::text, 'email', v_email),
    now(), now(), now()
  );

  -- 3. Public User erstellen
  INSERT INTO public.users (
    name, role, pin_hash, stundensatz, username,
    onboarding_pin, onboarding_pin_expiry,
    is_onboarded, is_active, auth_id
  ) VALUES (
    p_name, 'mitarbeiter',
    crypt(gen_random_uuid()::text, gen_salt('bf')),
    p_stundensatz, p_username,
    p_onboarding_pin, p_onboarding_pin_expiry,
    false, true, new_auth_id
  )
  RETURNING id INTO new_user_id;

  RETURN new_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PIN ändern (auth + public synchron)
CREATE OR REPLACE FUNCTION update_user_pin_v2(p_user_id UUID, p_new_pin TEXT)
RETURNS void AS $$
DECLARE
  v_auth_id UUID;
BEGIN
  SELECT auth_id INTO v_auth_id FROM public.users WHERE id = p_user_id;
  IF v_auth_id IS NOT NULL THEN
    UPDATE auth.users SET
      encrypted_password = crypt(p_new_pin, gen_salt('bf')),
      updated_at = now()
    WHERE id = v_auth_id;
  END IF;

  UPDATE public.users SET pin_hash = crypt(p_new_pin, gen_salt('bf'))
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Onboarding zurücksetzen (Chef-Aktion)
CREATE OR REPLACE FUNCTION reset_onboarding_v2(
  p_user_id UUID,
  p_new_pin TEXT,
  p_expiry TIMESTAMPTZ,
  p_username TEXT DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  v_auth_id UUID;
  v_username TEXT;
  v_email TEXT;
BEGIN
  SELECT auth_id, username INTO v_auth_id, v_username FROM public.users WHERE id = p_user_id;

  -- Username aktualisieren falls angegeben
  v_username := COALESCE(p_username, v_username);
  v_email := v_username || '@ma-construction.local';

  -- Auth-Passwort auf Onboarding-PIN setzen
  IF v_auth_id IS NOT NULL THEN
    UPDATE auth.users SET
      encrypted_password = crypt(p_new_pin, gen_salt('bf')),
      email = v_email,
      updated_at = now()
    WHERE id = v_auth_id;
  END IF;

  -- Public User aktualisieren
  UPDATE public.users SET
    pin_hash = crypt(gen_random_uuid()::text, gen_salt('bf')),
    is_onboarded = false,
    onboarding_pin = p_new_pin,
    onboarding_pin_expiry = p_expiry,
    username = v_username
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- User löschen (auth + public)
CREATE OR REPLACE FUNCTION delete_user_with_auth(p_user_id UUID)
RETURNS void AS $$
DECLARE
  v_auth_id UUID;
BEGIN
  SELECT auth_id INTO v_auth_id FROM public.users WHERE id = p_user_id;

  -- Public User löschen (CASCADE löscht Junction-Einträge)
  DELETE FROM public.users WHERE id = p_user_id;

  -- Auth User löschen
  IF v_auth_id IS NOT NULL THEN
    DELETE FROM auth.users WHERE id = v_auth_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- User aktivieren/deaktivieren + auth ban
CREATE OR REPLACE FUNCTION toggle_user_active_v2(p_user_id UUID, p_is_active BOOLEAN)
RETURNS void AS $$
DECLARE
  v_auth_id UUID;
BEGIN
  SELECT auth_id INTO v_auth_id FROM public.users WHERE id = p_user_id;

  -- Public User Status
  UPDATE public.users SET is_active = p_is_active WHERE id = p_user_id;

  -- Auth User ban/unban
  IF v_auth_id IS NOT NULL THEN
    IF p_is_active THEN
      UPDATE auth.users SET banned_until = NULL, updated_at = now() WHERE id = v_auth_id;
    ELSE
      UPDATE auth.users SET banned_until = '2099-12-31'::timestamptz, updated_at = now() WHERE id = v_auth_id;
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
