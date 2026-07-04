-- =============================================================
-- MA Construction – Härtung: Indizes, Spaltenschutz, Datenintegrität
-- Erstellt 2026-07-04 (Audit #8 + #10). NICHT blind ausführen!
--
-- Aufbau:
--   TEIL A  – Indizes            → SICHER, sofort anwendbar (nur Performance)
--   TEIL B  – users-Spaltenschutz → nach Anwenden TESTEN (Chef-Login, User-Liste)
--   TEIL C  – Datenintegrität    → ERST Daten bereinigen, dann anwenden
--   TEIL D  – offene TODOs         → bewusst noch nicht umgesetzt (Begründung)
-- =============================================================


-- =============================================================
-- TEIL A – Sekundärindizes  (SICHER: ändert kein Verhalten, nur Tempo)
-- RLS-Helper my_baustelle_ids()/Filter scannen sonst sequentiell.
-- Bei wenigen Zeilen unsichtbar, skaliert aber O(n). IF NOT EXISTS = idempotent.
-- =============================================================
CREATE INDEX IF NOT EXISTS idx_bm_user            ON baustellen_mitarbeiter(user_id);
CREATE INDEX IF NOT EXISTS idx_bs_sub             ON baustellen_subunternehmer(sub_id);
CREATE INDEX IF NOT EXISTS idx_std_baustelle      ON stundeneintraege(baustelle_id);
CREATE INDEX IF NOT EXISTS idx_std_mitarbeiter    ON stundeneintraege(mitarbeiter_id);
CREATE INDEX IF NOT EXISTS idx_std_sub            ON stundeneintraege(sub_id);
CREATE INDEX IF NOT EXISTS idx_std_datum          ON stundeneintraege(datum);
CREATE INDEX IF NOT EXISTS idx_maengel_baustelle  ON maengel(baustelle_id);
CREATE INDEX IF NOT EXISTS idx_btb_baustelle      ON bautagebuch(baustelle_id);
CREATE INDEX IF NOT EXISTS idx_btba_user          ON bautagebuch_anwesende(user_id);
CREATE INDEX IF NOT EXISTS idx_kal_baustelle      ON kalender(baustelle_id);
CREATE INDEX IF NOT EXISTS idx_kalm_user          ON kalender_mitarbeiter(user_id);
CREATE INDEX IF NOT EXISTS idx_dok_baustelle      ON dokumente(baustelle_id);
CREATE INDEX IF NOT EXISTS idx_kosten_baustelle   ON kosten(baustelle_id);
CREATE INDEX IF NOT EXISTS idx_benach_baustelle   ON benachrichtigungen(baustelle_id);


-- =============================================================
-- TEIL B – users: pin_hash + onboarding_pin vor Clients verstecken (#8)
-- RLS filtert ZEILEN, nicht SPALTEN. Ohne das kann jeder eingeloggte
-- Mitarbeiter pin_hash (4-stellig, offline knackbar) + onboarding_pin
-- (Klartext) ALLER User lesen. Loesung: table-weites SELECT entziehen und
-- nur die unkritischen Spalten wieder freigeben. Login/PIN-Pruefung laufen
-- ueber SECURITY-DEFINER-RPCs (als Owner) und sind NICHT betroffen.
--
-- >>> NACH DEM ANWENDEN TESTEN <<<
--   - Chef-Login + Dashboard laedt Nutzer
--   - Handwerker-Liste zeigt Namen
--   - Mitarbeiter bearbeiten/anlegen funktioniert
-- Wenn etwas fehlt: eine Spalte zur GRANT-Liste ergaenzen (die App liest
-- aktuell: id,name,role,stundensatz,username,is_onboarded,is_active,
-- onboarding_pin_expiry — alle unten enthalten).
-- =============================================================
REVOKE SELECT ON users FROM anon, authenticated;
-- An BEIDE Rollen: Die App fragt users auch als anon ab (Start vor Login);
-- RLS liefert anon ohnehin 0 Zeilen, aber die Spalten-Rechte muessen da sein,
-- sonst wirft der Start-Load "permission denied".
GRANT SELECT (
  id, name, role, stundensatz, username,
  onboarding_pin_expiry, is_onboarded, is_active, created_at, auth_id
) ON users TO anon, authenticated;
-- pin_hash und onboarding_pin sind bewusst NICHT in der Liste.


-- =============================================================
-- TEIL C – Datenintegrität stundeneintraege (#10)  [ANGEWANDT 2026-07-04]
-- Bei ON DELETE SET NULL wird mitarbeiter_id NULL, person_typ bleibt aber
-- 'mitarbeiter' -> Zeile faellt aus der Auswertung ("verschwundene Stunden").
-- Ein CHECK-Constraint wuerde das Loeschen solcher Mitarbeiter blockieren
-- (Konflikt mit dem Cascade-SET-NULL), daher stattdessen ein Trigger, der den
-- Namen VOR dem Loeschen einfriert. Live angewandt + verifiziert (0 verwaist).

-- 1. Bestehende verwaiste Zeilen retten:
UPDATE stundeneintraege SET
  person_typ = 'sonstige',
  person_name = COALESCE(NULLIF(person_name,''), '(ehemaliger Mitarbeiter)')
WHERE person_typ = 'mitarbeiter' AND mitarbeiter_id IS NULL;

-- 2. Trigger: beim Loeschen eines Mitarbeiters dessen Stunden auf 'sonstige'
--    + Namensschnappschuss setzen (laeuft VOR dem Cascade-SET-NULL):
CREATE OR REPLACE FUNCTION snapshot_deleted_mitarbeiter()
RETURNS trigger AS $$
BEGIN
  UPDATE stundeneintraege
  SET person_typ = 'sonstige', person_name = OLD.name
  WHERE mitarbeiter_id = OLD.id AND person_typ = 'mitarbeiter';
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_snapshot_deleted_mitarbeiter ON users;
CREATE TRIGGER trg_snapshot_deleted_mitarbeiter
  BEFORE DELETE ON users
  FOR EACH ROW EXECUTE FUNCTION snapshot_deleted_mitarbeiter();


-- =============================================================
-- TEIL D – Offen (bewusst NICHT hier umgesetzt)
-- 1) onboarding_pin hashen statt Klartext: braucht Umbau von
--    lookup_user_for_onboarding (vergleicht aktuell Klartext) → eigener,
--    getesteter Schritt.
-- 2) PIN-Rate-Limit/Lockout serverseitig (#9) → am besten via Edge Function
--    vor lookup_user_by_pin; eigener Schritt.
--
-- STATUS: Teil A (Indizes), Teil B (Spaltenschutz) und Teil C (Trigger +
-- Cleanup) sind am 2026-07-04 LIVE angewandt und verifiziert.
-- =============================================================
