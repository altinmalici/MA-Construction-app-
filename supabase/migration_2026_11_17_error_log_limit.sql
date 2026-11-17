-- =============================================================
-- MA Construction – Fehler-Log gegen Fuellen von aussen absichern (Audit S-12)
-- NOCH NICHT ANGEWANDT. Von Hand im Supabase SQL-Editor ausfuehren.
--
-- Hintergrund: In error_log darf jeder schreiben, auch ohne Anmeldung (die
-- App meldet Fehler schon vor dem Login). Mit dem oeffentlichen anon-Key
-- liesse sich die Tabelle beliebig fuellen – beim Free Plan zaehlt das gegen
-- das Speicherlimit der Datenbank.
--
-- Was diese Datei tut:
--   * hoechstens 200 neue Eintraege pro Stunde (insgesamt); was darueber
--     hinausgeht, wird still verworfen – die App bekommt keinen Fehler
--   * Textfelder werden auf sinnvolle Laengen gekuerzt (die App kuerzt
--     bereits selbst; hier gilt es auch fuer direkte Aufrufe)
--   * Eintraege aelter als 90 Tage werden beim Schreiben mit aufgeraeumt
--
-- Voraussetzung: migration_2026_11_16_01_security_hardening.sql (nutzt
-- rpc_throttle_hit von dort). Aendert keine bestehenden Eintraege ausser dem
-- Aufraeumen nach 90 Tagen. Idempotent. Zeitpunkt beliebig.
-- =============================================================

BEGIN;

DO $$
BEGIN
  IF to_regprocedure('public.rpc_throttle_hit(text,integer,interval)') IS NULL THEN
    RAISE EXCEPTION 'Bitte zuerst migration_2026_11_16_01_security_hardening.sql ausfuehren';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.error_log_guard()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  -- Limit erreicht → Zeile still verwerfen (RETURN NULL bricht den INSERT
  -- ohne Fehler ab; Monitoring darf die App nie stoeren).
  IF NOT rpc_throttle_hit('errorlog:*', 200, interval '1 hour') THEN
    RETURN NULL;
  END IF;
  NEW.message := left(NEW.message, 2000);
  NEW.stack := left(NEW.stack, 4000);
  NEW.component_stack := left(NEW.component_stack, 4000);
  NEW.url := left(NEW.url, 500);
  NEW.user_agent := left(NEW.user_agent, 500);
  -- Zeitstempel nicht vom Aufrufer bestimmen lassen.
  NEW.created_at := now();
  DELETE FROM public.error_log WHERE created_at < now() - interval '90 days';
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.error_log_guard() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_error_log_guard ON public.error_log;
CREATE TRIGGER trg_error_log_guard
  BEFORE INSERT ON public.error_log
  FOR EACH ROW EXECUTE FUNCTION public.error_log_guard();

COMMIT;

-- Verifikation:
--   SELECT tgname FROM pg_trigger WHERE tgrelid = 'public.error_log'::regclass AND NOT tgisinternal;
--   -- muss trg_error_log_guard zeigen
-- Rollback:
--   DROP TRIGGER trg_error_log_guard ON public.error_log;
--   DROP FUNCTION public.error_log_guard();
