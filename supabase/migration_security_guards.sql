-- =============================================================
-- MA Construction – Sicherheits-Guards fuer Admin-RPCs (2026-07-04)
-- Etappe 2 zum P0-Befund. Ergaenzt jede SECURITY-DEFINER-Admin-Funktion
-- um eine Aufrufer-Pruefung, damit ein bereits eingeloggter Mitarbeiter
-- sie nicht zur Rechte-Eskalation missbrauchen kann (SECURITY DEFINER
-- umgeht RLS). Etappe 1 (REVOKE ... FROM anon) steckt in migration_auth.sql.
--
-- Guard-Logik:
--   CHEF-ONLY  : nur der Chef darf (anlegen/loeschen/reset/aktivieren).
--   SELF-OR-CHEF: der betroffene Nutzer selbst ODER der Chef
--                 (eigener PIN-Wechsel, Onboarding-Abschluss).
-- coalesce(...) sorgt dafuer, dass ein NULL-Ergebnis (keine gueltige
-- Session) als "nicht erlaubt" gewertet wird statt durchzurutschen.
--
-- Die INSERT-Bloecke enthalten weiterhin die GoTrue-Token-Spalten='' aus
-- dem Login-Fix (migration_auth.sql), damit signInWithPassword nicht crasht.
-- =============================================================

-- ---------- CHEF-ONLY ----------

CREATE OR REPLACE FUNCTION create_user_with_pin_v2(
  p_name TEXT, p_role TEXT, p_pin TEXT, p_stundensatz NUMERIC, p_username TEXT
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
    crypt(p_pin, gen_salt('bf')), now(), 'authenticated', 'authenticated',
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
  INSERT INTO public.users (name, role, pin_hash, stundensatz, username, is_onboarded, is_active, auth_id)
  VALUES (p_name, p_role, crypt(p_pin, gen_salt('bf')), p_stundensatz, p_username, true, true, new_auth_id)
  RETURNING id INTO new_user_id;
  RETURN new_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
    p_stundensatz, p_username, p_onboarding_pin, p_onboarding_pin_expiry, false, true, new_auth_id
  )
  RETURNING id INTO new_user_id;
  RETURN new_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION delete_user_with_auth(p_user_id UUID)
RETURNS void AS $$
DECLARE v_auth_id UUID;
BEGIN
  IF coalesce(is_chef(), false) = false THEN RAISE EXCEPTION 'Nur der Chef darf Nutzer loeschen'; END IF;
  SELECT auth_id INTO v_auth_id FROM public.users WHERE id = p_user_id;
  DELETE FROM public.users WHERE id = p_user_id;
  IF v_auth_id IS NOT NULL THEN DELETE FROM auth.users WHERE id = v_auth_id; END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
    is_onboarded = false, onboarding_pin = p_new_pin, onboarding_pin_expiry = p_expiry, username = v_username
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION toggle_user_active_v2(p_user_id UUID, p_is_active BOOLEAN)
RETURNS void AS $$
DECLARE v_auth_id UUID;
BEGIN
  IF coalesce(is_chef(), false) = false THEN RAISE EXCEPTION 'Nur der Chef darf Nutzer (de)aktivieren'; END IF;
  SELECT auth_id INTO v_auth_id FROM public.users WHERE id = p_user_id;
  UPDATE public.users SET is_active = p_is_active WHERE id = p_user_id;
  IF v_auth_id IS NOT NULL THEN
    IF p_is_active THEN
      UPDATE auth.users SET banned_until = NULL, updated_at = now() WHERE id = v_auth_id;
    ELSE
      UPDATE auth.users SET banned_until = '2099-12-31'::timestamptz, updated_at = now() WHERE id = v_auth_id;
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---------- SELF-OR-CHEF ----------

CREATE OR REPLACE FUNCTION update_user_pin_v2(p_user_id UUID, p_new_pin TEXT)
RETURNS void AS $$
DECLARE v_auth_id UUID;
BEGIN
  IF coalesce(is_chef(), false) = false AND coalesce(p_user_id = get_my_user_id(), false) = false THEN
    RAISE EXCEPTION 'Nicht erlaubt';
  END IF;
  SELECT auth_id INTO v_auth_id FROM public.users WHERE id = p_user_id;
  IF v_auth_id IS NOT NULL THEN
    UPDATE auth.users SET encrypted_password = crypt(p_new_pin, gen_salt('bf')), updated_at = now() WHERE id = v_auth_id;
  END IF;
  UPDATE public.users SET pin_hash = crypt(p_new_pin, gen_salt('bf')) WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION complete_onboarding_v2(p_user_id UUID, p_new_pin TEXT)
RETURNS void AS $$
DECLARE v_auth_id UUID;
BEGIN
  IF coalesce(is_chef(), false) = false AND coalesce(p_user_id = get_my_user_id(), false) = false THEN
    RAISE EXCEPTION 'Nicht erlaubt';
  END IF;
  SELECT auth_id INTO v_auth_id FROM public.users WHERE id = p_user_id;
  IF v_auth_id IS NULL THEN RAISE EXCEPTION 'User hat keine auth_id'; END IF;
  UPDATE auth.users SET encrypted_password = crypt(p_new_pin, gen_salt('bf')), updated_at = now() WHERE id = v_auth_id;
  UPDATE public.users SET
    pin_hash = crypt(p_new_pin, gen_salt('bf')), is_onboarded = true, onboarding_pin = null, onboarding_pin_expiry = null
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
