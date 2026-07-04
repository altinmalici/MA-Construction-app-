-- =============================================================
-- MA Construction – PIN-Brute-Force-Bremse (#9)  [ANGEWANDT 2026-07-04]
--
-- Problem: lookup_user_by_pin(pin) durchsucht ALLE User per crypt() und gibt
-- bei Treffer den Username zurueck. Als anon-RPC ist das ein Brute-Force-
-- Orakel: 0000..9999 durchprobieren findet gueltige PIN->User in Sekunden.
-- (Der "Willkommen zurueck"-Pfad nutzt signInWithPassword und ist bereits
-- von Supabase-Auth rate-limited; nur diese globale Suche war ungebremst.)
--
-- Loesung: serverseitige Drossel direkt in der DB (keine Edge Function noetig).
-- Max. 20 Lookups pro Minute global -> 10.000 PINs dauern >8h statt Sekunden,
-- der Angreifer bekommt waehrenddessen nur leere Antworten. Echte Logins
-- (2-10 Nutzer, selten) liegen weit unter 20/Min und merken nichts.
-- Verifiziert: nach 25 Aufrufen deckelt der Zaehler bei 20.
-- =============================================================

CREATE TABLE IF NOT EXISTS pin_lookup_throttle (
  id INT PRIMARY KEY DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  count INT NOT NULL DEFAULT 0
);
INSERT INTO pin_lookup_throttle (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION lookup_user_by_pin(pin_input TEXT)
RETURNS TABLE(username TEXT, auth_id UUID, is_onboarded BOOLEAN) AS $$
DECLARE
  v_count INT;
  v_window TIMESTAMPTZ;
BEGIN
  -- Drossel: max 20 Lookups pro Minute (global). for update serialisiert.
  SELECT t.window_start, t.count INTO v_window, v_count
  FROM pin_lookup_throttle t WHERE t.id = 1 FOR UPDATE;

  IF v_window IS NULL OR v_window < now() - interval '1 minute' THEN
    UPDATE pin_lookup_throttle SET window_start = now(), count = 1 WHERE id = 1;
  ELSE
    IF v_count >= 20 THEN
      RETURN; -- gedrosselt: leere Antwort
    END IF;
    UPDATE pin_lookup_throttle SET count = count + 1 WHERE id = 1;
  END IF;

  RETURN QUERY
    SELECT u.username, u.auth_id, u.is_onboarded
    FROM public.users u
    WHERE u.pin_hash = crypt(pin_input, u.pin_hash)
    AND u.is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================
-- Noch offen fuer spaeter (#9):
-- - Laengere PINs (6-8 statt 4 Stellen) + Sperre bekannter Muster (0000,1234)
-- - Pro-IP-Limit (braucht Edge Function; die globale Bremse reicht als
--   erste, wirksame Stufe)
-- =============================================================
