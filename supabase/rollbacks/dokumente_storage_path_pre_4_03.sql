-- ROLLBACK für migration_dokumente_storage_path.sql (Task 4-03)
-- Entfernt die storage_path-Spalte. Files im Storage-Bucket 'documents'
-- bleiben orphaned — separat aufräumen falls gewünscht.

ALTER TABLE public.dokumente DROP COLUMN IF EXISTS storage_path;
