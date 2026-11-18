-- =============================================================
-- MA Construction – Mitarbeiter erfassen Stunden nur auf offenen Baustellen
-- NOCH NICHT ANGEWANDT. Von Hand im Supabase SQL-Editor ausfuehren.
--
-- Die App blendet abgeschlossene Baustellen in der Stundenerfassung fuer
-- Mitarbeiter aus. Diese Datei setzt dieselbe Regel auf dem Server durch:
-- Ein Mitarbeiter kann einen Stundeneintrag nur anlegen oder aendern, wenn
-- die Baustelle den Status "geplant" oder "aktiv" hat. Sonst kommt die
-- Meldung "Baustelle ist abgeschlossen – bitte beim Chef melden."
--
-- Nicht betroffen: der Chef (traegt weiter ueberall nach), Loeschen eigener
-- Eintraege, sowie Aenderungen direkt in der Datenbank (SQL-Editor).
--
-- Folge fuer die Offline-Warteschlange: Hat ein Mitarbeiter Stunden ohne
-- Netz erfasst und die Baustelle wird VOR dem Senden auf "fertig" gesetzt,
-- lehnt der Server den Eintrag ab. Er geht nicht verloren: Die App zeigt ihn
-- als fehlgeschlagen mit dieser Meldung; der Chef kann ihn nachtragen oder
-- die Baustelle kurz wieder auf "aktiv" stellen.
--
-- Aendert KEINE Daten. Idempotent. Zeitpunkt beliebig; die App braucht
-- diese Datei nicht.
-- =============================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.stunden_nur_offene_baustellen()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_status TEXT;
BEGIN
  -- Ohne angemeldeten App-Nutzer (SQL-Editor, Wartung) und fuer den Chef
  -- gilt keine Einschraenkung.
  IF auth.uid() IS NULL OR coalesce(is_chef(), false) THEN
    RETURN NEW;
  END IF;
  SELECT b.status INTO v_status FROM public.baustellen b WHERE b.id = NEW.baustelle_id;
  IF v_status IS NOT NULL AND v_status NOT IN ('geplant', 'aktiv') THEN
    RAISE EXCEPTION 'Baustelle ist abgeschlossen – bitte beim Chef melden.'
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.stunden_nur_offene_baustellen() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_stunden_nur_offene_baustellen ON public.stundeneintraege;
CREATE TRIGGER trg_stunden_nur_offene_baustellen
  BEFORE INSERT OR UPDATE ON public.stundeneintraege
  FOR EACH ROW EXECUTE FUNCTION public.stunden_nur_offene_baustellen();

COMMIT;

-- Verifikation:
--   SELECT tgname FROM pg_trigger WHERE tgrelid = 'public.stundeneintraege'::regclass AND NOT tgisinternal;
-- Rollback:
--   DROP TRIGGER trg_stunden_nur_offene_baustellen ON public.stundeneintraege;
--   DROP FUNCTION public.stunden_nur_offene_baustellen();
