-- =============================================================
-- Task 4-07: sync_baustelle_junctions RPC
-- =============================================================
-- Atomares Update der Mitarbeiter- und Subunternehmer-Zuordnungen
-- einer Baustelle. Ersetzt den bisherigen DELETE+INSERT aus zwei
-- Round-Trips durch eine Transaktion — bei Fehler rollback, kein
-- halb-ausgeführter Zustand.
--
-- RLS: Function ist SECURITY DEFINER, prüft aber intern is_chef(),
-- damit Mitarbeiter die Zuordnungen nicht umschreiben können.
-- =============================================================

CREATE OR REPLACE FUNCTION public.sync_baustelle_junctions(
  p_baustelle_id uuid,
  p_mitarbeiter_ids uuid[],
  p_sub_ids uuid[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Authorization: nur Chef darf Zuordnungen ändern
  IF NOT public.is_chef() THEN
    RAISE EXCEPTION 'Nur Chef darf Baustellen-Zuordnungen ändern'
      USING ERRCODE = '42501';  -- insufficient_privilege
  END IF;

  -- Transaktion ist implizit durch PL/pgSQL-Function — alle Statements
  -- laufen innerhalb einer Transaktion, bei Exception wird rollback.

  -- Mitarbeiter-Zuordnungen
  DELETE FROM public.baustellen_mitarbeiter
   WHERE baustelle_id = p_baustelle_id;

  IF array_length(p_mitarbeiter_ids, 1) > 0 THEN
    INSERT INTO public.baustellen_mitarbeiter (baustelle_id, user_id)
    SELECT p_baustelle_id, uid
      FROM unnest(p_mitarbeiter_ids) AS uid
    ON CONFLICT DO NOTHING;
  END IF;

  -- Subunternehmer-Zuordnungen
  DELETE FROM public.baustellen_subunternehmer
   WHERE baustelle_id = p_baustelle_id;

  IF array_length(p_sub_ids, 1) > 0 THEN
    INSERT INTO public.baustellen_subunternehmer (baustelle_id, sub_id)
    SELECT p_baustelle_id, sid
      FROM unnest(p_sub_ids) AS sid
    ON CONFLICT DO NOTHING;
  END IF;
END;
$$;

COMMENT ON FUNCTION public.sync_baustelle_junctions IS
  'Atomare Aktualisierung der Mitarbeiter- und Subunternehmer-Zuordnungen einer Baustelle. Chef-only, SECURITY DEFINER.';

-- Rechte: nur authenticated Users dürfen überhaupt rufen; die
-- is_chef()-Prüfung im Body stoppt Mitarbeiter.
REVOKE ALL ON FUNCTION public.sync_baustelle_junctions(uuid, uuid[], uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sync_baustelle_junctions(uuid, uuid[], uuid[]) TO authenticated;
