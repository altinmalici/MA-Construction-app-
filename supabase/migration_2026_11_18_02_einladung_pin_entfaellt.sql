-- =============================================================
-- MA Construction – Einladungs-PIN entfaellt, sobald ein Link erzeugt wurde
-- NOCH NICHT ANGEWANDT. Von Hand im Supabase SQL-Editor ausfuehren.
--
-- Bisher blieb bei neu angelegten Mitarbeitern neben dem Einladungs-Link
-- auch der 4-stellige Einladungs-PIN 7 Tage gueltig. Mit dieser Datei wird
-- der Einladungs-PIN ungueltig, sobald fuer den Mitarbeiter ein Link erzeugt
-- wird. Der normale PIN bereits eingerichteter Mitarbeiter ist nicht
-- betroffen (er bleibt gueltig, bis der Link eingeloest wird).
--
-- Voraussetzung: migration_2026_11_16_04_onboarding.sql (bereits live).
-- Aendert keine bestehenden Daten: Offene Einladungs-PINs bleiben gueltig,
-- bis fuer den Mitarbeiter das naechste Mal ein Link erzeugt wird.
-- Idempotent. Zeitpunkt beliebig; die App braucht diese Datei nicht.
--
-- Rueckfall-Weg bleibt: Kann die App keinen Link erzeugen, zeigt sie wie
-- bisher den Einladungs-PIN (dann wurde auch kein Link-Token angelegt).
-- =============================================================

BEGIN;

DO $$
BEGIN
  IF to_regclass('public.onboarding_tokens') IS NULL THEN
    RAISE EXCEPTION 'Bitte zuerst migration_2026_11_16_04_onboarding.sql ausfuehren';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.onboarding_token_pin_entfaellt()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  UPDATE public.users
  SET onboarding_pin = NULL, onboarding_pin_expiry = NULL
  WHERE id = NEW.user_id AND onboarding_pin IS NOT NULL;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.onboarding_token_pin_entfaellt() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_onboarding_token_pin_entfaellt ON public.onboarding_tokens;
CREATE TRIGGER trg_onboarding_token_pin_entfaellt
  AFTER INSERT ON public.onboarding_tokens
  FOR EACH ROW EXECUTE FUNCTION public.onboarding_token_pin_entfaellt();

COMMIT;

-- Verifikation:
--   SELECT tgname FROM pg_trigger WHERE tgrelid = 'public.onboarding_tokens'::regclass AND NOT tgisinternal;
-- Rollback:
--   DROP TRIGGER trg_onboarding_token_pin_entfaellt ON public.onboarding_tokens;
--   DROP FUNCTION public.onboarding_token_pin_entfaellt();
