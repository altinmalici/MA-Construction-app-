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
-- Rueckfall-Weg bleibt: Gibt es die Link-Funktion nicht, zeigt die App wie
-- bisher den Einladungs-PIN.
-- Restrisiko: Wer sich VOR dem Erzeugen des Links schon mit dem
-- Einladungs-PIN angemeldet hatte, bleibt hoechstens bis zum Ablauf seines
-- Zugriffstokens (ca. 1 Stunde) angemeldet.
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
DECLARE
  v_auth_id UUID;
BEGIN
  -- Nur Mitarbeiter, die ihren eigenen PIN noch NICHT gesetzt haben: Bei
  -- ihnen ist der Einladungs-PIN zugleich das Anmelde-Passwort. Bei bereits
  -- eingerichteten Mitarbeitern ist das Passwort ihr echter PIN – der bleibt
  -- gueltig, bis der Link eingeloest wird.
  UPDATE public.users
  SET onboarding_pin = NULL, onboarding_pin_expiry = NULL
  WHERE id = NEW.user_id AND is_onboarded IS NOT TRUE
  RETURNING auth_id INTO v_auth_id;
  IF v_auth_id IS NOT NULL THEN
    -- Anmelde-Passwort durch einen nicht erratbaren Zufallswert ersetzen
    -- (sonst liesse sich der Einladungs-PIN weiter im normalen Login nutzen)
    -- und laufende Sitzungen beenden. Der Link setzt beim Einloesen selbst
    -- ein neues Passwort.
    UPDATE auth.users
    SET encrypted_password = crypt(encode(gen_random_bytes(24), 'hex'), gen_salt('bf')),
        updated_at = now()
    WHERE id = v_auth_id;
    DELETE FROM auth.sessions WHERE user_id = v_auth_id;
  END IF;
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
