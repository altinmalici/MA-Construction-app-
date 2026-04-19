-- =============================================================
-- MA Construction — Storage Buckets + RLS (Task 4-01)
-- =============================================================
-- Zwei Buckets:
--   documents — PDFs, Office, Bauzeichnungen (20 MB max, privat)
--   photos    — Mängel/Bautagebuch/Baustellen-Fotos (5 MB max, privat)
--
-- Pfad-Konvention: erster Path-Segment = baustelle_uuid, Beispiel:
--   documents: "{baustelle_id}/{doc_id}-{filename}"
--   photos:    "{baustelle_id}/{entity}/{entity_id}/{photo_id}.jpg"
--
-- Beide Buckets privat → signierte URLs für Reads. Policies nutzen
-- is_chef() (aus migration_auth.sql) und user_has_baustelle_access()
-- (in dieser Migration neu, weil bisher nur my_baustelle_ids() als
-- SET-returning Function existiert).
-- =============================================================

-- -------------------------------------------------------------
-- HELPER: user_has_baustelle_access(uuid) → bool
--   Defensive Wrapper um my_baustelle_ids(). Liefert false wenn
--   bid IS NULL (z.B. unsauberer Storage-Pfad).
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.user_has_baustelle_access(bid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT bid IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.my_baustelle_ids() AS mb WHERE mb = bid
    );
$$;

-- -------------------------------------------------------------
-- HELPER: storage_baustelle_id(text) → uuid
--   Extrahiert das erste UUID-Segment aus einem Storage-Pfad.
--   Returns NULL wenn der Pfad nicht mit UUID/ beginnt → Policy
--   greift dann nicht (sicherer Default).
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.storage_baustelle_id(path text)
RETURNS uuid
LANGUAGE sql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN path ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/'
      THEN substring(path from 1 for 36)::uuid
    ELSE NULL
  END
$$;

-- =============================================================
-- BUCKETS
-- =============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  false,
  20971520,  -- 20 MB
  ARRAY[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/msword',
    'application/vnd.ms-excel',
    'image/jpeg',
    'image/png'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'photos',
  'photos',
  false,
  5242880,  -- 5 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- =============================================================
-- POLICIES: documents
-- =============================================================

DROP POLICY IF EXISTS "documents_select_policy" ON storage.objects;
DROP POLICY IF EXISTS "documents_insert_policy" ON storage.objects;
DROP POLICY IF EXISTS "documents_delete_policy" ON storage.objects;

CREATE POLICY "documents_select_policy"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents'
  AND (
    public.is_chef()
    OR public.user_has_baustelle_access(public.storage_baustelle_id(name))
  )
);

CREATE POLICY "documents_insert_policy"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents'
  AND public.is_chef()
);

CREATE POLICY "documents_delete_policy"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents'
  AND public.is_chef()
);

-- UPDATE wird bewusst nicht erlaubt — Dokumente werden gelöscht und
-- neu hochgeladen (Versionierung später möglich, separater Task).

-- =============================================================
-- POLICIES: photos
-- =============================================================

DROP POLICY IF EXISTS "photos_select_policy" ON storage.objects;
DROP POLICY IF EXISTS "photos_insert_policy" ON storage.objects;
DROP POLICY IF EXISTS "photos_delete_policy" ON storage.objects;

CREATE POLICY "photos_select_policy"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'photos'
  AND (
    public.is_chef()
    OR public.user_has_baustelle_access(public.storage_baustelle_id(name))
  )
);

-- INSERT: sowohl Chef als auch Mitarbeiter können Fotos hochladen,
-- Mitarbeiter aber nur in Baustellen wo sie Zugriff haben.
CREATE POLICY "photos_insert_policy"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'photos'
  AND (
    public.is_chef()
    OR public.user_has_baustelle_access(public.storage_baustelle_id(name))
  )
);

-- DELETE: nur Chef.
CREATE POLICY "photos_delete_policy"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'photos'
  AND public.is_chef()
);
