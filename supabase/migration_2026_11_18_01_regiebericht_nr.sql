-- =============================================================
-- MA Construction – Feste, fortlaufende Regiebericht-Nummern
-- NOCH NICHT ANGEWANDT. Von Hand im Supabase SQL-Editor ausfuehren.
--
-- Bisher war die Bericht-Nr. nur die Position des Tages in der Liste aller
-- Tage einer Baustelle – wurde nachtraeglich ein frueherer Tag erfasst,
-- verschoben sich alle Nummern. Jetzt bekommt jeder Bericht (Baustelle +
-- Tag) beim ersten Drucken eine feste Nummer: pro Baustelle fortlaufend,
-- nie geaendert, nie wiederverwendet (Zeilen koennen von der App weder
-- geaendert noch geloescht werden).
--
-- Was diese Datei tut:
--   * neue Tabelle regiebericht_nummern (Baustelle, Tag, Nr)
--   * Uebernahme: alle Tage, die es heute schon gibt, bekommen genau die
--     Nummer, die die App ihnen im Moment anzeigt (nur beim ersten Lauf)
--   * Funktion regiebericht_nummern_vergeben(baustelle, tage[])
--
-- Aendert KEINE bestehenden Daten (legt nur die neue Tabelle an und fuellt
-- sie). Idempotent. Zeitpunkt beliebig: Die App erkennt selbst, ob die
-- Tabelle existiert, und nutzt bis dahin die bisherige Zaehlung.
-- =============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.regiebericht_nummern (
  baustelle_id UUID NOT NULL REFERENCES public.baustellen(id) ON DELETE CASCADE,
  datum DATE NOT NULL,
  nr INTEGER NOT NULL CHECK (nr > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (baustelle_id, datum),
  UNIQUE (baustelle_id, nr)
);

ALTER TABLE public.regiebericht_nummern ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.regiebericht_nummern FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.regiebericht_nummern TO authenticated;

DROP POLICY IF EXISTS regiebericht_nummern_select ON public.regiebericht_nummern;
CREATE POLICY regiebericht_nummern_select ON public.regiebericht_nummern
  FOR SELECT TO authenticated
  USING (coalesce(is_chef(), false) OR baustelle_id IN (SELECT my_baustelle_ids()));

-- Uebernahme der bisherigen Zaehlung – nur solange die Tabelle leer ist.
INSERT INTO public.regiebericht_nummern (baustelle_id, datum, nr)
SELECT t.baustelle_id, t.datum,
       row_number() OVER (PARTITION BY t.baustelle_id ORDER BY t.datum)
FROM (SELECT DISTINCT baustelle_id, datum FROM public.stundeneintraege) t
WHERE NOT EXISTS (SELECT 1 FROM public.regiebericht_nummern);

CREATE OR REPLACE FUNCTION public.regiebericht_nummern_vergeben(p_baustelle_id UUID, p_daten DATE[])
RETURNS TABLE(tag DATE, nummer INTEGER)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_d DATE;
BEGIN
  IF NOT (coalesce(is_chef(), false) OR p_baustelle_id IN (SELECT my_baustelle_ids())) THEN
    RAISE EXCEPTION 'Keine Berechtigung' USING ERRCODE = '42501';
  END IF;
  IF p_daten IS NULL OR cardinality(p_daten) = 0 THEN
    RETURN;
  END IF;
  IF cardinality(p_daten) > 400 THEN
    RAISE EXCEPTION 'Zu viele Tage auf einmal';
  END IF;
  -- Sperre auf der Baustelle: zwei gleichzeitige Aufrufe vergeben nie
  -- dieselbe Nummer.
  PERFORM 1 FROM public.baustellen b WHERE b.id = p_baustelle_id FOR NO KEY UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Baustelle nicht gefunden';
  END IF;
  FOR v_d IN SELECT DISTINCT d FROM unnest(p_daten) AS d WHERE d IS NOT NULL ORDER BY d LOOP
    -- Nummern nur fuer Tage, an denen es wirklich Eintraege gibt.
    IF NOT EXISTS (
      SELECT 1 FROM public.stundeneintraege s
      WHERE s.baustelle_id = p_baustelle_id AND s.datum = v_d
    ) THEN
      CONTINUE;
    END IF;
    INSERT INTO public.regiebericht_nummern (baustelle_id, datum, nr)
    SELECT p_baustelle_id, v_d, coalesce(max(r.nr), 0) + 1
    FROM public.regiebericht_nummern r
    WHERE r.baustelle_id = p_baustelle_id
    ON CONFLICT (baustelle_id, datum) DO NOTHING;
  END LOOP;
  RETURN QUERY
    SELECT r.datum, r.nr FROM public.regiebericht_nummern r
    WHERE r.baustelle_id = p_baustelle_id AND r.datum = ANY (p_daten)
    ORDER BY r.datum;
END;
$$;
REVOKE ALL ON FUNCTION public.regiebericht_nummern_vergeben(UUID, DATE[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.regiebericht_nummern_vergeben(UUID, DATE[]) TO authenticated;

COMMIT;

NOTIFY pgrst, 'reload schema';

-- Verifikation:
--   SELECT count(*) FROM regiebericht_nummern;   -- = Anzahl (Baustelle, Tag) mit Eintraegen
-- Rollback (Nummern gehen verloren, die App zaehlt dann wieder wie frueher):
--   DROP FUNCTION public.regiebericht_nummern_vergeben(UUID, DATE[]);
--   DROP TABLE public.regiebericht_nummern;
