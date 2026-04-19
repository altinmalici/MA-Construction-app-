-- =============================================================
-- ROLLBACK für migration_storage_buckets.sql (Task 4-01)
-- =============================================================
-- Entfernt Policies, Helper-Functions und Buckets in der richtigen
-- Reihenfolge (Policies → Functions → Buckets). Bucket-DELETE schlägt
-- fehl wenn Objects drin sind — das ist gewollt (verhindert
-- versehentlichen Datenverlust).
--
-- Vor Anwendung sicherstellen: storage.objects der Buckets ist leer
-- ODER bewusst akzeptiert dass die Files orphaned werden (separat
-- löschen).
-- =============================================================

DROP POLICY IF EXISTS "documents_select_policy" ON storage.objects;
DROP POLICY IF EXISTS "documents_insert_policy" ON storage.objects;
DROP POLICY IF EXISTS "documents_delete_policy" ON storage.objects;
DROP POLICY IF EXISTS "photos_select_policy" ON storage.objects;
DROP POLICY IF EXISTS "photos_insert_policy" ON storage.objects;
DROP POLICY IF EXISTS "photos_delete_policy" ON storage.objects;

DROP FUNCTION IF EXISTS public.storage_baustelle_id(text);
DROP FUNCTION IF EXISTS public.user_has_baustelle_access(uuid);

DELETE FROM storage.buckets WHERE id IN ('documents', 'photos');
