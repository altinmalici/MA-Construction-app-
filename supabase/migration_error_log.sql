-- =============================================================
-- MA Construction – Monitoring ohne Fremd-Dienst  [ANGEWANDT 2026-07-04]
-- Fehler/Abstuerze werden von der App in diese Tabelle geschrieben, damit
-- man Probleme sieht, ohne auf einen Anruf zu warten. Nur der Chef darf lesen;
-- jeder (auch anon, vor Login) darf melden. Verifiziert: Insert 201, anon
-- liest 0 Zeilen.
-- =============================================================
CREATE TABLE IF NOT EXISTS error_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message TEXT,
  stack TEXT,
  component_stack TEXT,
  url TEXT,
  user_agent TEXT,
  user_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE error_log ENABLE ROW LEVEL SECURITY;
GRANT INSERT ON error_log TO anon, authenticated;
GRANT SELECT ON error_log TO authenticated;

DROP POLICY IF EXISTS error_insert ON error_log;
CREATE POLICY error_insert ON error_log FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS error_select_chef ON error_log;
CREATE POLICY error_select_chef ON error_log FOR SELECT TO authenticated USING (is_chef());

-- Zum Anschauen (als Chef / im Dashboard):
--   SELECT created_at, message, url, user_agent FROM error_log ORDER BY created_at DESC LIMIT 50;
