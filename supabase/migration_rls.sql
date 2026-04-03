-- =============================================================
-- MA Construction – RLS Policies
-- Ausführen NACHDEM alle User auth_id haben (Schritt 2 + 3 fertig)
-- =============================================================

-- =============================================================
-- 1. Alte "allow_all" Policies entfernen
-- =============================================================
DROP POLICY IF EXISTS "allow_all" ON users;
DROP POLICY IF EXISTS "allow_all" ON subunternehmer;
DROP POLICY IF EXISTS "allow_all" ON baustellen;
DROP POLICY IF EXISTS "allow_all" ON baustellen_mitarbeiter;
DROP POLICY IF EXISTS "allow_all" ON baustellen_subunternehmer;
DROP POLICY IF EXISTS "allow_all" ON stundeneintraege;
DROP POLICY IF EXISTS "allow_all" ON maengel;
DROP POLICY IF EXISTS "allow_all" ON bautagebuch;
DROP POLICY IF EXISTS "allow_all" ON bautagebuch_anwesende;
DROP POLICY IF EXISTS "allow_all" ON kalender;
DROP POLICY IF EXISTS "allow_all" ON kalender_mitarbeiter;
DROP POLICY IF EXISTS "allow_all" ON dokumente;
DROP POLICY IF EXISTS "allow_all" ON kosten;
DROP POLICY IF EXISTS "allow_all" ON benachrichtigungen;

-- =============================================================
-- 2. users
-- Chef: ALL | Mitarbeiter: SELECT all, UPDATE own
-- =============================================================
CREATE POLICY "chef_all" ON users FOR ALL
  USING (is_chef())
  WITH CHECK (is_chef());

CREATE POLICY "mitarbeiter_select" ON users FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "mitarbeiter_update_own" ON users FOR UPDATE
  USING (auth_id = auth.uid())
  WITH CHECK (auth_id = auth.uid());

-- =============================================================
-- 3. subunternehmer
-- Chef: ALL | Mitarbeiter: SELECT
-- =============================================================
CREATE POLICY "chef_all" ON subunternehmer FOR ALL
  USING (is_chef())
  WITH CHECK (is_chef());

CREATE POLICY "mitarbeiter_select" ON subunternehmer FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- =============================================================
-- 4. baustellen
-- Chef: ALL | Mitarbeiter: SELECT assigned
-- =============================================================
CREATE POLICY "chef_all" ON baustellen FOR ALL
  USING (is_chef())
  WITH CHECK (is_chef());

CREATE POLICY "mitarbeiter_select_assigned" ON baustellen FOR SELECT
  USING (id IN (SELECT my_baustelle_ids()));

-- =============================================================
-- 5. baustellen_mitarbeiter
-- Chef: ALL | Mitarbeiter: SELECT own/assigned
-- =============================================================
CREATE POLICY "chef_all" ON baustellen_mitarbeiter FOR ALL
  USING (is_chef())
  WITH CHECK (is_chef());

CREATE POLICY "mitarbeiter_select" ON baustellen_mitarbeiter FOR SELECT
  USING (
    user_id = get_my_user_id()
    OR baustelle_id IN (SELECT my_baustelle_ids())
  );

-- =============================================================
-- 6. baustellen_subunternehmer
-- Chef: ALL | Mitarbeiter: SELECT assigned
-- =============================================================
CREATE POLICY "chef_all" ON baustellen_subunternehmer FOR ALL
  USING (is_chef())
  WITH CHECK (is_chef());

CREATE POLICY "mitarbeiter_select_assigned" ON baustellen_subunternehmer FOR SELECT
  USING (baustelle_id IN (SELECT my_baustelle_ids()));

-- =============================================================
-- 7. stundeneintraege
-- Chef: ALL | Mitarbeiter: CRUD own + assigned Baustellen
-- =============================================================
CREATE POLICY "chef_all" ON stundeneintraege FOR ALL
  USING (is_chef())
  WITH CHECK (is_chef());

CREATE POLICY "mitarbeiter_select" ON stundeneintraege FOR SELECT
  USING (
    mitarbeiter_id = get_my_user_id()
    OR baustelle_id IN (SELECT my_baustelle_ids())
  );

CREATE POLICY "mitarbeiter_insert" ON stundeneintraege FOR INSERT
  WITH CHECK (baustelle_id IN (SELECT my_baustelle_ids()));

CREATE POLICY "mitarbeiter_update" ON stundeneintraege FOR UPDATE
  USING (
    mitarbeiter_id = get_my_user_id()
    OR baustelle_id IN (SELECT my_baustelle_ids())
  )
  WITH CHECK (baustelle_id IN (SELECT my_baustelle_ids()));

CREATE POLICY "mitarbeiter_delete" ON stundeneintraege FOR DELETE
  USING (
    mitarbeiter_id = get_my_user_id()
    OR baustelle_id IN (SELECT my_baustelle_ids())
  );

-- =============================================================
-- 8. maengel
-- Chef: ALL | Mitarbeiter: SELECT/INSERT assigned
-- =============================================================
CREATE POLICY "chef_all" ON maengel FOR ALL
  USING (is_chef())
  WITH CHECK (is_chef());

CREATE POLICY "mitarbeiter_select_assigned" ON maengel FOR SELECT
  USING (baustelle_id IN (SELECT my_baustelle_ids()));

CREATE POLICY "mitarbeiter_insert_assigned" ON maengel FOR INSERT
  WITH CHECK (baustelle_id IN (SELECT my_baustelle_ids()));

-- =============================================================
-- 9. bautagebuch
-- Chef: ALL | Mitarbeiter: SELECT assigned
-- =============================================================
CREATE POLICY "chef_all" ON bautagebuch FOR ALL
  USING (is_chef())
  WITH CHECK (is_chef());

CREATE POLICY "mitarbeiter_select_assigned" ON bautagebuch FOR SELECT
  USING (baustelle_id IN (SELECT my_baustelle_ids()));

-- =============================================================
-- 10. bautagebuch_anwesende
-- Chef: ALL | Mitarbeiter: SELECT assigned
-- =============================================================
CREATE POLICY "chef_all" ON bautagebuch_anwesende FOR ALL
  USING (is_chef())
  WITH CHECK (is_chef());

CREATE POLICY "mitarbeiter_select_assigned" ON bautagebuch_anwesende FOR SELECT
  USING (
    bautagebuch_id IN (
      SELECT bt.id FROM bautagebuch bt
      WHERE bt.baustelle_id IN (SELECT my_baustelle_ids())
    )
  );

-- =============================================================
-- 11. kalender
-- Chef: ALL | Mitarbeiter: SELECT assigned + eigene
-- =============================================================
CREATE POLICY "chef_all" ON kalender FOR ALL
  USING (is_chef())
  WITH CHECK (is_chef());

CREATE POLICY "mitarbeiter_select" ON kalender FOR SELECT
  USING (
    baustelle_id IN (SELECT my_baustelle_ids())
    OR id IN (
      SELECT kalender_id FROM kalender_mitarbeiter
      WHERE user_id = get_my_user_id()
    )
  );

-- =============================================================
-- 12. kalender_mitarbeiter
-- Chef: ALL | Mitarbeiter: SELECT own
-- =============================================================
CREATE POLICY "chef_all" ON kalender_mitarbeiter FOR ALL
  USING (is_chef())
  WITH CHECK (is_chef());

CREATE POLICY "mitarbeiter_select_own" ON kalender_mitarbeiter FOR SELECT
  USING (user_id = get_my_user_id());

-- =============================================================
-- 13. dokumente
-- Chef: ALL | Mitarbeiter: SELECT assigned
-- =============================================================
CREATE POLICY "chef_all" ON dokumente FOR ALL
  USING (is_chef())
  WITH CHECK (is_chef());

CREATE POLICY "mitarbeiter_select_assigned" ON dokumente FOR SELECT
  USING (baustelle_id IN (SELECT my_baustelle_ids()));

-- =============================================================
-- 14. kosten
-- Chef: ALL | Mitarbeiter: SELECT assigned
-- =============================================================
CREATE POLICY "chef_all" ON kosten FOR ALL
  USING (is_chef())
  WITH CHECK (is_chef());

CREATE POLICY "mitarbeiter_select_assigned" ON kosten FOR SELECT
  USING (baustelle_id IN (SELECT my_baustelle_ids()));

-- =============================================================
-- 15. benachrichtigungen
-- Chef: ALL | Mitarbeiter: SELECT/INSERT/UPDATE all
-- (Benachrichtigungen sind für alle sichtbar)
-- =============================================================
CREATE POLICY "chef_all" ON benachrichtigungen FOR ALL
  USING (is_chef())
  WITH CHECK (is_chef());

CREATE POLICY "mitarbeiter_select" ON benachrichtigungen FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "mitarbeiter_insert" ON benachrichtigungen FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "mitarbeiter_update" ON benachrichtigungen FOR UPDATE
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);
