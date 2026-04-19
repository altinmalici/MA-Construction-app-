-- =============================================================
-- MA Construction — check_pin_exists Hardening (Task 3a-07, Option D)
-- =============================================================
-- Goal: shut down anonymous PIN-enumeration via the public RPC.
--   - REVOKE from anon + PUBLIC: no anonymous JWT may call this anymore.
--   - GRANT to authenticated: keeps both legitimate callers working
--       * Login.jsx:133  (Mitarbeiter setting personal PIN after onboarding)
--       * ProfilView.jsx:63 (any logged-in user changing their PIN)
--   - SET search_path = public, extensions on the SECURITY DEFINER
--     function as a defense-in-depth against search-path-injection.
--     `extensions` is required because crypt() lives there in Supabase.
--
-- Function body is unchanged from schema.sql:279-286 — only the
-- security boundary moves.
-- =============================================================

CREATE OR REPLACE FUNCTION public.check_pin_exists(pin_input TEXT, exclude_user_id UUID DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.users
    WHERE pin_hash = crypt(pin_input, pin_hash)
    AND (exclude_user_id IS NULL OR id != exclude_user_id)
  );
$$;

-- Lock down: anonymous role can no longer call this RPC.
REVOKE EXECUTE ON FUNCTION public.check_pin_exists(TEXT, UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.check_pin_exists(TEXT, UUID) FROM anon;

-- Authenticated callers (both Mitarbeiter and Chef) keep access.
GRANT EXECUTE ON FUNCTION public.check_pin_exists(TEXT, UUID) TO authenticated;
