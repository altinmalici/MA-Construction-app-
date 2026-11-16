-- =============================================================
-- MA Construction – Bautagebuch: erfundene Wetterdaten entfernen (Paket 3)
-- NOCH NICHT ANGEWANDT. Von Hand im Supabase SQL-Editor ausfuehren.
--
-- Hintergrund (Audit D-17): Das Bautagebuch-Formular hatte nie Wetterfelder.
-- Die API schrieb trotzdem fuer JEDEN Eintrag wetter='sonnig' und
-- temperatur=12. Ab Paket 3 gibt es echte, optionale Felder und die Liste
-- zeigt Wetter/Temperatur an – ohne diese Migration stuende bei allen alten
-- Eintraegen faelschlich "sonnig, 12 °C".
--
-- WANN: direkt NACHDEM Paket 3 live ist (gemerged + von Vercel ausgeliefert).
-- Die alte App-Version schreibt weiter 'sonnig'/12 – wuerde man vorher
-- aufraeumen, kaemen bis zum Deploy neue erfundene Werte dazu.
--
-- AENDERT DATEN: setzt wetter/temperatur auf NULL bei allen Eintraegen, die
-- genau 'sonnig'/12 tragen. Das laeuft nur beim ERSTEN Ausfuehren (erkannt
-- am noch vorhandenen Spalten-Standard); ein spaeteres erneutes Ausfuehren
-- aendert nichts mehr und kann echte Eintraege nicht treffen.
-- Einschraenkung: Ein nach dem Deploy, aber vor dieser Migration von Hand
-- eingetragenes echtes "sonnig, 12 °C" wuerde ebenfalls geleert.
-- =============================================================

BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'bautagebuch'
      AND column_name = 'wetter' AND column_default IS NOT NULL
  ) THEN
    UPDATE public.bautagebuch
    SET wetter = NULL, temperatur = NULL
    WHERE wetter = 'sonnig' AND temperatur = 12;
  END IF;
END $$;

-- Keine erfundenen Standardwerte mehr.
ALTER TABLE public.bautagebuch ALTER COLUMN wetter DROP DEFAULT;
ALTER TABLE public.bautagebuch ALTER COLUMN temperatur DROP DEFAULT;

COMMIT;

-- Verifikation:
--   SELECT count(*) FILTER (WHERE wetter IS NULL) AS ohne_wetter, count(*) AS gesamt FROM bautagebuch;
-- Rollback (stellt nur die Standardwerte wieder her, nicht die geleerten Daten):
--   ALTER TABLE bautagebuch ALTER COLUMN wetter SET DEFAULT 'sonnig';
--   ALTER TABLE bautagebuch ALTER COLUMN temperatur SET DEFAULT 12;
