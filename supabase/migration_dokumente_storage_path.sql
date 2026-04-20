-- =============================================================
-- Task 4-03: dokumente.storage_path hinzufügen
-- =============================================================
-- Pfad im Storage-Bucket 'documents', Format:
--   "{baustelle_id}/{doc_id}-{filename}"
--
-- Pre-existierende dokumente-Rows (aus 3b-01-Test-Data) bekommen NULL
-- → UI zeigt sie read-only mit 'Legacy'-Badge ohne Download.
-- =============================================================

ALTER TABLE public.dokumente
  ADD COLUMN IF NOT EXISTS storage_path text;

COMMENT ON COLUMN public.dokumente.storage_path IS
  'Pfad im Storage-Bucket documents. NULL für Legacy-Einträge vor Task 4-03.';
