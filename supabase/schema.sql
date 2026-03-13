-- =============================================================
-- MA Construction – Supabase Schema
-- Dieses SQL im Supabase SQL Editor ausführen
-- =============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =============================================================
-- TABELLEN
-- =============================================================

-- Users (Mitarbeiter + Chef)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('chef', 'mitarbeiter')),
  pin_hash TEXT NOT NULL,
  stundensatz NUMERIC DEFAULT 45,
  username TEXT UNIQUE,
  onboarding_pin TEXT,
  onboarding_pin_expiry TIMESTAMPTZ,
  is_onboarded BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Subunternehmer
CREATE TABLE subunternehmer (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  gewerk TEXT DEFAULT '',
  telefon TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Baustellen
CREATE TABLE baustellen (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kunde TEXT NOT NULL,
  adresse TEXT DEFAULT '',
  status TEXT DEFAULT 'geplant' CHECK (status IN ('geplant', 'aktiv', 'fertig', 'abgerechnet')),
  fortschritt INTEGER DEFAULT 0,
  ansprechpartner TEXT DEFAULT '',
  telefon TEXT DEFAULT '',
  zugang TEXT DEFAULT '',
  startdatum DATE,
  enddatum DATE,
  budget NUMERIC DEFAULT 0,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Junction: Baustellen <-> Mitarbeiter
CREATE TABLE baustellen_mitarbeiter (
  baustelle_id UUID REFERENCES baustellen(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (baustelle_id, user_id)
);

-- Junction: Baustellen <-> Subunternehmer
CREATE TABLE baustellen_subunternehmer (
  baustelle_id UUID REFERENCES baustellen(id) ON DELETE CASCADE,
  sub_id UUID REFERENCES subunternehmer(id) ON DELETE CASCADE,
  PRIMARY KEY (baustelle_id, sub_id)
);

-- Stundeneinträge
CREATE TABLE stundeneintraege (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  baustelle_id UUID NOT NULL REFERENCES baustellen(id) ON DELETE CASCADE,
  datum DATE NOT NULL,
  beginn TEXT NOT NULL,
  ende TEXT NOT NULL,
  pause INTEGER DEFAULT 30,
  fahrtzeit INTEGER DEFAULT 0,
  arbeit TEXT DEFAULT '',
  material TEXT DEFAULT '',
  fotos TEXT[] DEFAULT '{}',
  person_typ TEXT DEFAULT 'mitarbeiter' CHECK (person_typ IN ('mitarbeiter', 'sub', 'sonstige')),
  mitarbeiter_id UUID REFERENCES users(id) ON DELETE SET NULL,
  sub_id UUID REFERENCES subunternehmer(id) ON DELETE SET NULL,
  person_name TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Mängel
CREATE TABLE maengel (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  baustelle_id UUID NOT NULL REFERENCES baustellen(id) ON DELETE CASCADE,
  titel TEXT NOT NULL,
  beschreibung TEXT DEFAULT '',
  prioritaet TEXT DEFAULT 'mittel' CHECK (prioritaet IN ('niedrig', 'mittel', 'hoch')),
  status TEXT DEFAULT 'offen' CHECK (status IN ('offen', 'in_arbeit', 'erledigt')),
  zustaendig UUID,
  erstellt_am DATE DEFAULT CURRENT_DATE,
  frist DATE,
  fotos TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Bautagebuch
CREATE TABLE bautagebuch (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  baustelle_id UUID NOT NULL REFERENCES baustellen(id) ON DELETE CASCADE,
  datum DATE NOT NULL,
  wetter TEXT DEFAULT 'sonnig',
  temperatur INTEGER DEFAULT 12,
  arbeiten TEXT DEFAULT '',
  besonderheiten TEXT DEFAULT '',
  behinderungen TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Junction: Bautagebuch <-> Anwesende
CREATE TABLE bautagebuch_anwesende (
  bautagebuch_id UUID REFERENCES bautagebuch(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (bautagebuch_id, user_id)
);

-- Kalender
CREATE TABLE kalender (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  datum DATE NOT NULL,
  baustelle_id UUID REFERENCES baustellen(id) ON DELETE SET NULL,
  titel TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Junction: Kalender <-> Mitarbeiter
CREATE TABLE kalender_mitarbeiter (
  kalender_id UUID REFERENCES kalender(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (kalender_id, user_id)
);

-- Dokumente
CREATE TABLE dokumente (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  baustelle_id UUID REFERENCES baustellen(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  typ TEXT DEFAULT 'dokument',
  groesse TEXT DEFAULT '–',
  datum DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Kosten
CREATE TABLE kosten (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  baustelle_id UUID NOT NULL REFERENCES baustellen(id) ON DELETE CASCADE,
  kategorie TEXT DEFAULT 'material' CHECK (kategorie IN ('material', 'subunternehmer', 'sonstiges')),
  beschreibung TEXT NOT NULL,
  betrag NUMERIC NOT NULL,
  datum DATE DEFAULT CURRENT_DATE,
  ersteller UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Benachrichtigungen
CREATE TABLE benachrichtigungen (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  typ TEXT DEFAULT 'info' CHECK (typ IN ('mangel', 'stunden', 'info')),
  text TEXT NOT NULL,
  baustelle_id UUID REFERENCES baustellen(id) ON DELETE SET NULL,
  datum TIMESTAMPTZ DEFAULT now(),
  gelesen BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================================
-- RPC: PIN-Login
-- =============================================================
CREATE OR REPLACE FUNCTION login_with_pin(pin_input TEXT)
RETURNS TABLE(id UUID, name TEXT, role TEXT, stundensatz NUMERIC, username TEXT, is_onboarded BOOLEAN) AS $$
  SELECT u.id, u.name, u.role, u.stundensatz, u.username, u.is_onboarded
  FROM users u
  WHERE u.pin_hash = crypt(pin_input, u.pin_hash)
  AND u.is_active = true;
$$ LANGUAGE sql SECURITY DEFINER;

-- RPC: Login with username + onboarding PIN
CREATE OR REPLACE FUNCTION login_with_username(username_input TEXT, onboarding_pin_input TEXT)
RETURNS TABLE(id UUID, name TEXT, role TEXT, stundensatz NUMERIC, username TEXT) AS $$
  SELECT u.id, u.name, u.role, u.stundensatz, u.username
  FROM users u
  WHERE u.username = username_input
  AND u.is_active = true
  AND u.is_onboarded = false
  AND u.onboarding_pin = onboarding_pin_input
  AND u.onboarding_pin_expiry > now();
$$ LANGUAGE sql SECURITY DEFINER;

-- =============================================================
-- RPC: User erstellen (mit PIN-Hash)
-- =============================================================
CREATE OR REPLACE FUNCTION create_user_with_pin(
  user_name TEXT,
  user_role TEXT,
  user_pin TEXT,
  user_stundensatz NUMERIC
)
RETURNS UUID AS $$
DECLARE
  new_id UUID;
BEGIN
  INSERT INTO users (name, role, pin_hash, stundensatz, is_onboarded, is_active)
  VALUES (user_name, user_role, crypt(user_pin, gen_salt('bf')), user_stundensatz, true, true)
  RETURNING id INTO new_id;
  RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: Create user for onboarding (no personal PIN)
CREATE OR REPLACE FUNCTION create_user_for_onboarding(
  p_name TEXT,
  p_username TEXT,
  p_stundensatz NUMERIC,
  p_onboarding_pin TEXT,
  p_onboarding_pin_expiry TIMESTAMPTZ
)
RETURNS UUID AS $$
DECLARE
  new_id UUID;
BEGIN
  INSERT INTO users (name, role, pin_hash, stundensatz, username, onboarding_pin, onboarding_pin_expiry, is_onboarded, is_active)
  VALUES (
    p_name, 'mitarbeiter',
    crypt(gen_random_uuid()::text, gen_salt('bf')),
    p_stundensatz, p_username, p_onboarding_pin, p_onboarding_pin_expiry, false, true
  )
  RETURNING id INTO new_id;
  RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: Complete onboarding (set personal PIN)
CREATE OR REPLACE FUNCTION complete_onboarding(p_user_id UUID, p_new_pin TEXT)
RETURNS void AS $$
BEGIN
  UPDATE users SET
    pin_hash = crypt(p_new_pin, gen_salt('bf')),
    is_onboarded = true,
    onboarding_pin = null,
    onboarding_pin_expiry = null
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: Reset onboarding PIN (chef action)
CREATE OR REPLACE FUNCTION reset_onboarding_pin(p_user_id UUID, p_new_pin TEXT, p_onboarding_pin_expiry TIMESTAMPTZ, p_username TEXT DEFAULT NULL)
RETURNS void AS $$
BEGIN
  UPDATE users SET
    pin_hash = crypt(gen_random_uuid()::text, gen_salt('bf')),
    is_onboarded = false,
    onboarding_pin = p_new_pin,
    onboarding_pin_expiry = p_onboarding_pin_expiry,
    username = COALESCE(p_username, username)
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================
-- RPC: User PIN ändern
-- =============================================================
CREATE OR REPLACE FUNCTION update_user_pin(user_id UUID, new_pin TEXT)
RETURNS void AS $$
BEGIN
  UPDATE users SET pin_hash = crypt(new_pin, gen_salt('bf'))
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================
-- RPC: PIN prüfen ob vergeben
-- =============================================================
CREATE OR REPLACE FUNCTION check_pin_exists(pin_input TEXT, exclude_user_id UUID DEFAULT NULL)
RETURNS BOOLEAN AS $$
  SELECT EXISTS(
    SELECT 1 FROM users
    WHERE pin_hash = crypt(pin_input, pin_hash)
    AND (exclude_user_id IS NULL OR id != exclude_user_id)
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- =============================================================
-- SEED: Chef-User (Altin Malici, PIN 1998)
-- =============================================================
INSERT INTO users (name, role, pin_hash, stundensatz, username, is_onboarded, is_active)
VALUES ('Altin Malici', 'chef', crypt('1998', gen_salt('bf')), 45, 'a.malici', true, true);

-- =============================================================
-- RLS deaktiviert (wird später nachgerüstet)
-- =============================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE subunternehmer ENABLE ROW LEVEL SECURITY;
ALTER TABLE baustellen ENABLE ROW LEVEL SECURITY;
ALTER TABLE baustellen_mitarbeiter ENABLE ROW LEVEL SECURITY;
ALTER TABLE baustellen_subunternehmer ENABLE ROW LEVEL SECURITY;
ALTER TABLE stundeneintraege ENABLE ROW LEVEL SECURITY;
ALTER TABLE maengel ENABLE ROW LEVEL SECURITY;
ALTER TABLE bautagebuch ENABLE ROW LEVEL SECURITY;
ALTER TABLE bautagebuch_anwesende ENABLE ROW LEVEL SECURITY;
ALTER TABLE kalender ENABLE ROW LEVEL SECURITY;
ALTER TABLE kalender_mitarbeiter ENABLE ROW LEVEL SECURITY;
ALTER TABLE dokumente ENABLE ROW LEVEL SECURITY;
ALTER TABLE kosten ENABLE ROW LEVEL SECURITY;
ALTER TABLE benachrichtigungen ENABLE ROW LEVEL SECURITY;

-- Permissive policies (anon kann alles – RLS kommt später)
CREATE POLICY "allow_all" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON subunternehmer FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON baustellen FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON baustellen_mitarbeiter FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON baustellen_subunternehmer FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON stundeneintraege FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON maengel FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON bautagebuch FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON bautagebuch_anwesende FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON kalender FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON kalender_mitarbeiter FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON dokumente FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON kosten FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON benachrichtigungen FOR ALL USING (true) WITH CHECK (true);
