-- =============================================================
-- Migration: Login & User Management Rebuild
-- Run this in the Supabase SQL Editor
-- =============================================================

-- 1. Add new columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_pin TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_pin_expiry TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_onboarded BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 2. Mark all existing users as onboarded and active
UPDATE users SET is_onboarded = true WHERE is_onboarded = false;
UPDATE users SET is_active = true WHERE is_active IS NULL;

-- 3. Generate username for existing chef user
UPDATE users SET username = 'a.malici' WHERE role = 'chef' AND username IS NULL;

-- 4. Update login_with_pin to check is_active and return new fields
CREATE OR REPLACE FUNCTION login_with_pin(pin_input TEXT)
RETURNS TABLE(id UUID, name TEXT, role TEXT, stundensatz NUMERIC, username TEXT, is_onboarded BOOLEAN) AS $$
  SELECT u.id, u.name, u.role, u.stundensatz, u.username, u.is_onboarded
  FROM users u
  WHERE u.pin_hash = crypt(pin_input, u.pin_hash)
  AND u.is_active = true;
$$ LANGUAGE sql SECURITY DEFINER;

-- 5. Login with username + onboarding PIN (for new employees)
CREATE OR REPLACE FUNCTION login_with_username(username_input TEXT, onboarding_pin_input TEXT)
RETURNS TABLE(id UUID, name TEXT, role TEXT, stundensatz NUMERIC, username TEXT) AS $$
  SELECT u.id, u.name, u.role, u.stundensatz, u.username
  FROM users u
  WHERE u.username = username_input
  AND u.is_active = true
  AND u.is_onboarded = false
  AND u.onboarding_pin = onboarding_pin_input
  AND u.onboarding_pin_expiry > now();
$$ LANGUAGE sql SECURITY DEFINER;

-- 6. Create user for onboarding (no personal PIN needed)
CREATE OR REPLACE FUNCTION create_user_for_onboarding(
  p_name TEXT,
  p_username TEXT,
  p_stundensatz NUMERIC,
  p_onboarding_pin TEXT,
  p_onboarding_pin_expiry TIMESTAMPTZ
)
RETURNS UUID AS $$
DECLARE
  new_id UUID;
BEGIN
  INSERT INTO users (name, role, pin_hash, stundensatz, username, onboarding_pin, onboarding_pin_expiry, is_onboarded, is_active)
  VALUES (
    p_name, 'mitarbeiter',
    crypt(gen_random_uuid()::text, gen_salt('bf')),
    p_stundensatz,
    p_username,
    p_onboarding_pin,
    p_onboarding_pin_expiry,
    false,
    true
  )
  RETURNING id INTO new_id;
  RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Complete onboarding (employee sets personal PIN)
CREATE OR REPLACE FUNCTION complete_onboarding(p_user_id UUID, p_new_pin TEXT)
RETURNS void AS $$
BEGIN
  UPDATE users SET
    pin_hash = crypt(p_new_pin, gen_salt('bf')),
    is_onboarded = true,
    onboarding_pin = null,
    onboarding_pin_expiry = null
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Reset onboarding PIN (chef action, also sets username if missing)
CREATE OR REPLACE FUNCTION reset_onboarding_pin(p_user_id UUID, p_new_pin TEXT, p_onboarding_pin_expiry TIMESTAMPTZ, p_username TEXT DEFAULT NULL)
RETURNS void AS $$
BEGIN
  UPDATE users SET
    pin_hash = crypt(gen_random_uuid()::text, gen_salt('bf')),
    is_onboarded = false,
    onboarding_pin = p_new_pin,
    onboarding_pin_expiry = p_onboarding_pin_expiry,
    username = COALESCE(p_username, username)
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
