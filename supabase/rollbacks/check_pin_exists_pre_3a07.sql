-- =============================================================
-- ROLLBACK for migration_check_pin_exists_hardening.sql (Task 3a-07)
-- =============================================================
-- Restores the pre-3a-07 state:
--   - Function definition without explicit search_path
--   - EXECUTE re-granted to PUBLIC (matches schema.sql original)
--
-- Apply only if the hardening migration broke a legitimate caller.
-- =============================================================

CREATE OR REPLACE FUNCTION public.check_pin_exists(pin_input TEXT, exclude_user_id UUID DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.users
    WHERE pin_hash = crypt(pin_input, pin_hash)
    AND (exclude_user_id IS NULL OR id != exclude_user_id)
  );
$$;

GRANT EXECUTE ON FUNCTION public.check_pin_exists(TEXT, UUID) TO PUBLIC;
