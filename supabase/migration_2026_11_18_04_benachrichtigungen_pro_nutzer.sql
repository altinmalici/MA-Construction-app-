-- =============================================================
-- MA Construction – Benachrichtigungen: nur eigene Baustellen, eigenes
-- "gelesen" pro Nutzer (Audit S-10)
-- NOCH NICHT ANGEWANDT. Von Hand im Supabase SQL-Editor ausfuehren.
--
-- Bisher sah jeder angemeldete Nutzer ALLE Benachrichtigungen (auch fremder
-- Baustellen), und "gelesen" war ein einziges Haekchen fuer alle – las einer,
-- war es fuer alle gelesen. Ausserdem durfte jeder Mitarbeiter jede
-- Benachrichtigung aendern.
--
-- Danach:
--   * Mitarbeiter sehen nur Mangel- und Stunden-Meldungen ihrer zugewiesenen
--     Baustellen. Alles andere (Kosten mit Betrag, Meldungen ohne
--     Baustelle) sieht nur der Chef. Der Chef sieht alle.
--   * "gelesen" merkt sich jeder Nutzer fuer sich (neue Tabelle
--     benachrichtigungen_gelesen).
--   * Mitarbeiter koennen Benachrichtigungen nur noch fuer ihre eigenen
--     Baustellen anlegen und keine mehr aendern.
--   * Wer eine Benachrichtigung ausloest, hat sie selbst sofort als gelesen.
--
-- Uebernahme: Was heute als gelesen markiert ist, gilt fuer alle Nutzer als
-- gelesen (sonst haette jeder ploetzlich alte ungelesene Meldungen). Die
-- bestehenden Benachrichtigungen selbst werden nicht veraendert.
--
-- Zeitpunkt: nach dem zugehoerigen PR; am besten, wenn alle Geraete die neue
-- App-Version haben. Mit einer aelteren Version funktioniert alles weiter,
-- nur bleibt dort der Zaehler ungelesener Meldungen stehen.
-- Neu zugewiesene oder neu angelegte Mitarbeiter sehen die bisherigen
-- Meldungen ihrer Baustelle zunaechst als ungelesen ("Alle gelesen" antippen).
-- Idempotent.
-- =============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.benachrichtigungen_gelesen (
  benachrichtigung_id UUID NOT NULL REFERENCES public.benachrichtigungen(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  gelesen_am TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (benachrichtigung_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_benach_gelesen_user ON public.benachrichtigungen_gelesen(user_id);

ALTER TABLE public.benachrichtigungen_gelesen ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.benachrichtigungen_gelesen FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON public.benachrichtigungen_gelesen TO authenticated;

DROP POLICY IF EXISTS gelesen_select_own ON public.benachrichtigungen_gelesen;
CREATE POLICY gelesen_select_own ON public.benachrichtigungen_gelesen
  FOR SELECT TO authenticated USING (user_id = get_my_user_id());
DROP POLICY IF EXISTS gelesen_insert_own ON public.benachrichtigungen_gelesen;
CREATE POLICY gelesen_insert_own ON public.benachrichtigungen_gelesen
  FOR INSERT TO authenticated WITH CHECK (user_id = get_my_user_id());

-- Uebernahme des bisherigen gemeinsamen Haekchens – nur beim ersten Lauf.
INSERT INTO public.benachrichtigungen_gelesen (benachrichtigung_id, user_id)
SELECT b.id, u.id
FROM public.benachrichtigungen b CROSS JOIN public.users u
WHERE b.gelesen IS TRUE
  AND NOT EXISTS (SELECT 1 FROM public.benachrichtigungen_gelesen)
ON CONFLICT DO NOTHING;

-- ---- Sichtbarkeit / Schreibrechte der Mitarbeiter --------------
DROP POLICY IF EXISTS "mitarbeiter_select" ON public.benachrichtigungen;
-- Nur Mangel- und Stunden-Meldungen: "info" enthaelt u.a. Kosten mit Betrag
-- ("Kosten: 1.200,00 EUR – Fliesen") und bleibt beim Chef.
CREATE POLICY "mitarbeiter_select" ON public.benachrichtigungen FOR SELECT
  USING (typ IN ('mangel', 'stunden') AND baustelle_id IN (SELECT my_baustelle_ids()));

DROP POLICY IF EXISTS "mitarbeiter_insert" ON public.benachrichtigungen;
CREATE POLICY "mitarbeiter_insert" ON public.benachrichtigungen FOR INSERT
  WITH CHECK (typ IN ('mangel', 'stunden') AND baustelle_id IN (SELECT my_baustelle_ids()));

DROP POLICY IF EXISTS "mitarbeiter_update" ON public.benachrichtigungen;

-- ---- Ausloeser hat die eigene Meldung sofort gelesen ------------
CREATE OR REPLACE FUNCTION public.benachrichtigung_ersteller_gelesen()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_me UUID := get_my_user_id();
BEGIN
  IF v_me IS NOT NULL THEN
    INSERT INTO public.benachrichtigungen_gelesen (benachrichtigung_id, user_id)
    VALUES (NEW.id, v_me) ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.benachrichtigung_ersteller_gelesen() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_benachrichtigung_ersteller_gelesen ON public.benachrichtigungen;
CREATE TRIGGER trg_benachrichtigung_ersteller_gelesen
  AFTER INSERT ON public.benachrichtigungen
  FOR EACH ROW EXECUTE FUNCTION public.benachrichtigung_ersteller_gelesen();

-- ---- Lesen: sichtbare Benachrichtigungen mit MEINEM "gelesen" ----
-- SECURITY INVOKER: es gelten die Policies des Aufrufers.
CREATE OR REPLACE FUNCTION public.meine_benachrichtigungen()
RETURNS TABLE(id UUID, typ TEXT, text TEXT, baustelle_id UUID, datum TIMESTAMPTZ, gelesen BOOLEAN)
LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = public, extensions
AS $$
  SELECT b.id, b.typ, b.text, b.baustelle_id, b.datum,
         EXISTS (
           SELECT 1 FROM public.benachrichtigungen_gelesen g
           WHERE g.benachrichtigung_id = b.id AND g.user_id = get_my_user_id()
         )
  FROM public.benachrichtigungen b
  ORDER BY b.datum DESC
  LIMIT 200;
$$;
REVOKE ALL ON FUNCTION public.meine_benachrichtigungen() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.meine_benachrichtigungen() TO authenticated;

-- ---- Alle fuer mich sichtbaren als gelesen markieren -------------
CREATE OR REPLACE FUNCTION public.benachrichtigungen_alle_gelesen()
RETURNS void
LANGUAGE sql SECURITY INVOKER
SET search_path = public, extensions
AS $$
  INSERT INTO public.benachrichtigungen_gelesen (benachrichtigung_id, user_id)
  SELECT b.id, get_my_user_id()
  FROM public.benachrichtigungen b
  WHERE get_my_user_id() IS NOT NULL
  ON CONFLICT DO NOTHING;
$$;
REVOKE ALL ON FUNCTION public.benachrichtigungen_alle_gelesen() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.benachrichtigungen_alle_gelesen() TO authenticated;

COMMIT;

NOTIFY pgrst, 'reload schema';

-- Verifikation:
--   SELECT policyname, cmd FROM pg_policies WHERE tablename = 'benachrichtigungen' ORDER BY 1;
--   -- chef_all (ALL), mitarbeiter_insert (INSERT), mitarbeiter_select (SELECT)
-- Rollback:
--   DROP FUNCTION meine_benachrichtigungen(); DROP FUNCTION benachrichtigungen_alle_gelesen();
--   DROP TRIGGER trg_benachrichtigung_ersteller_gelesen ON benachrichtigungen;
--   DROP FUNCTION benachrichtigung_ersteller_gelesen();
--   Policies "mitarbeiter_select/insert/update" wie in migration_rls.sql (Abschnitt 15) neu anlegen;
--   DROP TABLE benachrichtigungen_gelesen;
