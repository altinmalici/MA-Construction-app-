-- =============================================================
-- MA Construction – Stunden-Freigabe (#13)
-- Markiert Stundeneintraege als "freigegeben/abgerechnet", damit der Chef
-- sieht, welche Monate schon an die Lohnbuchhaltung uebergeben sind.
--
-- WICHTIG: Vor (oder gemeinsam mit) dem Deploy des zugehoerigen Frontends
-- anwenden — sonst laeuft der "Freigeben"-Button ins Leere (Spalte fehlt).
-- Reines Hinzufuegen einer Spalte mit Default → sicher, kein Datenverlust.
-- =============================================================
ALTER TABLE stundeneintraege
  ADD COLUMN IF NOT EXISTS freigegeben BOOLEAN NOT NULL DEFAULT false;

-- Optional: schneller Filter auf offene/freigegebene Stunden.
CREATE INDEX IF NOT EXISTS idx_std_freigegeben ON stundeneintraege(freigegeben);
