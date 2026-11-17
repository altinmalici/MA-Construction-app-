-- =============================================================
-- MA Construction – Stundensatz, Budget, Rechnungsdaten und Kosten sind
-- fuer Mitarbeiter technisch nicht mehr lesbar (Audit S-09, U-13)
-- NOCH NICHT ANGEWANDT. Von Hand im Supabase SQL-Editor ausfuehren.
--
-- !! ERST AUSFUEHREN, WENN ALLE GERAETE DIE NEUE APP-VERSION GELADEN HABEN
-- !! (die Version, die mit dem PR zu dieser Datei ausgeliefert wurde).
-- !! Mit einer aelteren Version saehen Mitarbeiter danach keine Baustellen
-- !! und keine Namen der Kollegen mehr. Der Chef ist nicht betroffen.
--
-- Bisher (nur in der App versteckt, technisch aber lesbar):
--   * users: jeder angemeldete Nutzer konnte alle Zeilen inkl. Stundensatz lesen
--   * baustellen: Mitarbeiter lasen ihre Baustellen komplett (Budget,
--     Rechnungsdaten in "details")
--   * kosten: Mitarbeiter lasen alle Kosten ihrer Baustellen
--
-- Danach:
--   * users: Mitarbeiter lesen direkt nur noch die EIGENE Zeile. Fuer die
--     Namen der Kollegen gibt es kollegen_liste() (id, Name, Rolle, aktiv –
--     kein Stundensatz, kein Benutzername).
--   * baustellen: Mitarbeiter lesen die Tabelle nicht mehr direkt, sondern
--     meine_baustellen(): ihre zugewiesenen Baustellen OHNE Budget und OHNE
--     Rechnungsdaten.
--   * kosten: nur noch der Chef.
--   Der Chef liest und schreibt alles wie bisher.
--
-- Aendert KEINE Daten. Idempotent.
-- =============================================================

BEGIN;

-- ---- users ---------------------------------------------------
DROP POLICY IF EXISTS "mitarbeiter_select" ON public.users;
CREATE POLICY "mitarbeiter_select" ON public.users FOR SELECT
  USING (auth_id = auth.uid());

CREATE OR REPLACE FUNCTION public.kollegen_liste()
RETURNS TABLE(id UUID, name TEXT, role TEXT, is_active BOOLEAN)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT u.id, u.name, u.role, u.is_active
  FROM public.users u
  WHERE get_my_user_id() IS NOT NULL
  ORDER BY u.created_at, u.id;
$$;
REVOKE ALL ON FUNCTION public.kollegen_liste() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.kollegen_liste() TO authenticated;

-- ---- baustellen ----------------------------------------------
DROP POLICY IF EXISTS "mitarbeiter_select_assigned" ON public.baustellen;

CREATE OR REPLACE FUNCTION public.meine_baustellen()
RETURNS TABLE(
  id UUID, kunde TEXT, adresse TEXT, status TEXT, fortschritt INTEGER,
  ansprechpartner TEXT, telefon TEXT, zugang TEXT, startdatum DATE,
  enddatum DATE, details JSONB, created_at TIMESTAMPTZ
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT b.id, b.kunde, b.adresse, b.status, b.fortschritt,
         b.ansprechpartner, b.telefon, b.zugang, b.startdatum, b.enddatum,
         -- alles, was mit "rechnung" beginnt, bleibt beim Chef
         (SELECT coalesce(jsonb_object_agg(t.k, t.v), '{}'::jsonb)
          FROM jsonb_each(coalesce(b.details, '{}'::jsonb)) AS t(k, v)
          WHERE t.k NOT ILIKE 'rechnung%'),
         b.created_at
  FROM public.baustellen b
  WHERE b.id IN (SELECT my_baustelle_ids())
  ORDER BY b.created_at, b.id;
$$;
REVOKE ALL ON FUNCTION public.meine_baustellen() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.meine_baustellen() TO authenticated;

-- ---- kosten --------------------------------------------------
DROP POLICY IF EXISTS "mitarbeiter_select_assigned" ON public.kosten;

COMMIT;

NOTIFY pgrst, 'reload schema';

-- Verifikation (als Chef in der App: alles wie vorher; als Mitarbeiter:
-- Baustellen und Kollegen-Namen sichtbar, Kosten-Bereich nicht):
--   SELECT policyname FROM pg_policies WHERE tablename IN ('users','baustellen','kosten') ORDER BY 1;
-- Rollback:
--   DROP POLICY "mitarbeiter_select" ON users;
--   CREATE POLICY "mitarbeiter_select" ON users FOR SELECT USING (auth.uid() IS NOT NULL);
--   CREATE POLICY "mitarbeiter_select_assigned" ON baustellen FOR SELECT USING (id IN (SELECT my_baustelle_ids()));
--   CREATE POLICY "mitarbeiter_select_assigned" ON kosten FOR SELECT USING (baustelle_id IN (SELECT my_baustelle_ids()));
--   DROP FUNCTION kollegen_liste(); DROP FUNCTION meine_baustellen();
