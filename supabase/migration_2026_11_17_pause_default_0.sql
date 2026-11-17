-- =============================================================
-- MA Construction – Stundeneintraege: Spalten-Standard fuer "pause" auf 0
-- NOCH NICHT ANGEWANDT. Von Hand im Supabase SQL-Editor ausfuehren.
--
-- Hintergrund: Pause und Fahrtzeit starten in der Stundenerfassung jetzt bei
-- 0 statt pauschal 30 Minuten. In der Datenbank hat die Spalte "pause" laut
-- supabase/schema.sql noch den Standardwert 30 ("fahrtzeit" hat bereits 0).
--
-- Wirkung: nur fuer KUENFTIGE Zeilen, die ohne Angabe einer Pause eingefuegt
-- werden. Die App schickt die Pause bei jedem Eintrag ausdruecklich mit –
-- sie ist von diesem Standardwert also nicht betroffen, weder vor noch nach
-- der Migration. Die Migration raeumt nur die Abweichung zwischen App und
-- Schema auf (z.B. fuer Eintraege, die jemand von Hand per SQL anlegt).
--
-- Aendert KEINE bestehenden Daten. Idempotent. Zeitpunkt beliebig.
-- =============================================================

ALTER TABLE public.stundeneintraege ALTER COLUMN pause SET DEFAULT 0;
ALTER TABLE public.stundeneintraege ALTER COLUMN fahrtzeit SET DEFAULT 0;

-- Verifikation (beide Zeilen muessen 0 zeigen):
--   SELECT column_name, column_default FROM information_schema.columns
--   WHERE table_schema = 'public' AND table_name = 'stundeneintraege'
--     AND column_name IN ('pause', 'fahrtzeit');
-- Rollback:
--   ALTER TABLE public.stundeneintraege ALTER COLUMN pause SET DEFAULT 30;
