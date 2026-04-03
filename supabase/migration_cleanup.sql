-- =============================================================
-- MA Construction – Cleanup Migration
-- Ausführen NACHDEM alles getestet und stabil läuft
-- =============================================================

-- 1. Alte RPC-Funktionen droppen
DROP FUNCTION IF EXISTS login_with_pin(TEXT);
DROP FUNCTION IF EXISTS login_with_username(TEXT, TEXT);
DROP FUNCTION IF EXISTS create_user_with_pin(TEXT, TEXT, TEXT, NUMERIC);
DROP FUNCTION IF EXISTS create_user_for_onboarding(TEXT, TEXT, NUMERIC, TEXT, TIMESTAMPTZ);
DROP FUNCTION IF EXISTS complete_onboarding(UUID, TEXT);
DROP FUNCTION IF EXISTS reset_onboarding_pin(UUID, TEXT, TIMESTAMPTZ, TEXT);
DROP FUNCTION IF EXISTS update_user_pin(UUID, TEXT);

-- 2. Temporären Migration-Helper droppen
DROP FUNCTION IF EXISTS check_single_pin(UUID, TEXT);

-- 3. auth_id auf NOT NULL setzen (alle User müssen auth_id haben)
ALTER TABLE users ALTER COLUMN auth_id SET NOT NULL;

-- 4. username auf NOT NULL setzen (alle User müssen Username haben)
ALTER TABLE users ALTER COLUMN username SET NOT NULL;
