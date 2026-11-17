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
-- Hinweise:
--   * Den EIGENEN Stundensatz kann ein Mitarbeiter weiterhin lesen (eigene
--     Zeile, wird beim Anmelden geladen).
--   * Benachrichtigungen "Kosten: Betrag – Text" schliesst erst
--     migration_2026_11_18_04_benachrichtigungen_pro_nutzer.sql – beide
--     Dateien zusammen ausfuehren.
--   * Am besten ausserhalb der Arbeitszeit ausfuehren (kurz nach dem
--     Ausfuehren kann ein Mitarbeiter einmalig eine leere Baustellenliste
--     sehen, bis er die App neu oeffnet).
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
  -- nur fuer angemeldete, nicht deaktivierte Nutzer mit Profil
  WHERE EXISTS (
    SELECT 1 FROM public.users me
    WHERE me.auth_id = auth.uid() AND me.is_active IS NOT FALSE
  )
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
          FROM jsonb_each(
            CASE WHEN jsonb_typeof(b.details) = 'object' THEN b.details ELSE '{}'::jsonb END
          ) AS t(k, v)
          WHERE t.k NOT ILIKE 'rechnung%'),
         b.created_at
  FROM public.baustellen b
  WHERE b.id IN (SELECT my_baustelle_ids())
    AND EXISTS (
      SELECT 1 FROM public.users me
      WHERE me.auth_id = auth.uid() AND me.is_active IS NOT FALSE
    )
  ORDER BY b.created_at, b.id;
$$;
REVOKE ALL ON FUNCTION public.meine_baustellen() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.meine_baustellen() TO authenticated;

-- ---- kosten --------------------------------------------------
DROP POLICY IF EXISTS "mitarbeiter_select_assigned" ON public.kosten;

-- ---- Kontrolle -----------------------------------------------
-- Bricht ab (und macht alles rueckgaengig), falls auf einer der drei
-- Tabellen noch eine andere Lese-Regel liegt, die die Daten offen liesse.
DO $$
DECLARE
  v_rest TEXT;
BEGIN
  SELECT string_agg(tablename || '.' || policyname, ', ') INTO v_rest
  FROM pg_policies
  WHERE schemaname = 'public'
    AND cmd IN ('SELECT', 'ALL')
    AND (
      (tablename = 'users' AND policyname NOT IN ('chef_all', 'mitarbeiter_select'))
      OR (tablename IN ('baustellen', 'kosten') AND policyname <> 'chef_all')
    );
  IF v_rest IS NOT NULL THEN
    RAISE EXCEPTION 'Abbruch: unerwartete Lese-Regeln vorhanden (%). Nichts wurde geaendert – bitte melden.', v_rest;
  END IF;
END $$;

COMMIT;

NOTIFY pgrst, 'reload schema';

-- Verifikation (als Chef in der App: alles wie vorher; als Mitarbeiter:
-- Baustellen und Kollegen-Namen sichtbar, Kosten-Bereich nicht):
--   SELECT tablename, policyname FROM pg_policies WHERE tablename IN ('users','baustellen','kosten') ORDER BY 1, 2;
--   -- erwartet: baustellen chef_all | kosten chef_all | users chef_all,
--   --           mitarbeiter_select, mitarbeiter_update_own
-- Rollback:
--   DROP POLICY "mitarbeiter_select" ON users;
--   CREATE POLICY "mitarbeiter_select" ON users FOR SELECT USING (auth.uid() IS NOT NULL);
--   CREATE POLICY "mitarbeiter_select_assigned" ON baustellen FOR SELECT USING (id IN (SELECT my_baustelle_ids()));
--   CREATE POLICY "mitarbeiter_select_assigned" ON kosten FOR SELECT USING (baustelle_id IN (SELECT my_baustelle_ids()));
--   DROP FUNCTION kollegen_liste(); DROP FUNCTION meine_baustellen();
