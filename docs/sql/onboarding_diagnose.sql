-- =============================================================
-- MA Construction – Onboarding-Diagnose (NUR LESEN)
-- Im Supabase SQL-Editor ausfuehren. Aendert nichts. Jede Abfrage einzeln
-- markieren und ausfuehren; das Ergebnis sagt, was zu tun ist.
-- Reparatur: in der App "Zugang reparieren" (nach Migration 04) bzw. die
-- am Ende jeder Abfrage genannte Massnahme.
-- =============================================================

-- 1) Ueberblick: jeder Mitarbeiter mit Zustand von Profil UND Auth-Konto.
--    Spalte "problem" ist leer, wenn alles passt.
SELECT
  u.name,
  u.username,
  u.role,
  u.is_active,
  u.is_onboarded,
  u.onboarding_pin IS NOT NULL                         AS hat_einladungs_pin,
  u.onboarding_pin_expiry,
  (u.onboarding_pin_expiry < now())                    AS einladung_abgelaufen,
  a.id IS NOT NULL                                     AS hat_auth_konto,
  a.email                                              AS auth_email,
  a.banned_until,
  a.last_sign_in_at,
  concat_ws(' | ',
    CASE WHEN u.auth_id IS NULL THEN 'keine auth_id' END,
    CASE WHEN u.auth_id IS NOT NULL AND a.id IS NULL THEN 'auth_id zeigt ins Leere' END,
    CASE WHEN a.id IS NOT NULL AND a.email IS DISTINCT FROM u.username || '@ma-construction.local'
         THEN 'Auth-E-Mail passt nicht zum Benutzernamen' END,
    CASE WHEN u.username IS NULL OR u.username !~ '^[a-z0-9][a-z0-9._-]{1,30}$'
         THEN 'Benutzername ungueltig (Grossbuchstaben/Leerzeichen/Umlaute)' END,
    CASE WHEN a.id IS NOT NULL AND (a.confirmation_token IS NULL OR a.recovery_token IS NULL
           OR a.email_change IS NULL OR a.email_change_token_new IS NULL)
         THEN 'Auth-Token-Spalten NULL (Login gibt HTTP 500)' END,
    CASE WHEN a.id IS NOT NULL AND a.email_confirmed_at IS NULL THEN 'E-Mail nicht bestaetigt' END,
    CASE WHEN u.is_active AND a.banned_until IS NOT NULL AND a.banned_until > now()
         THEN 'aktiv, aber im Auth gesperrt' END,
    CASE WHEN NOT u.is_active AND (a.banned_until IS NULL OR a.banned_until < now())
         THEN 'deaktiviert, aber im Auth nicht gesperrt' END,
    CASE WHEN NOT u.is_onboarded AND u.onboarding_pin IS NULL THEN 'nicht eingerichtet und keine Einladung offen' END,
    CASE WHEN NOT u.is_onboarded AND u.onboarding_pin_expiry < now() THEN 'Einladung abgelaufen' END
  ) AS problem
FROM public.users u
LEFT JOIN auth.users a ON a.id = u.auth_id
ORDER BY u.created_at;

-- 2) Verwaiste Auth-Konten: Auth-Konto der App ohne Profil. Blockiert das
--    erneute Anlegen desselben Benutzernamens ("Benutzername bereits
--    vergeben"). Massnahme: cleanup_orphan_auth_users() (Migration 04).
SELECT a.id, a.email, a.created_at, a.last_sign_in_at
FROM auth.users a
WHERE a.email LIKE '%@ma-construction.local'
  AND NOT EXISTS (SELECT 1 FROM public.users u WHERE u.auth_id = a.id)
ORDER BY a.created_at;

-- 3) Auth-Konten ohne Identity-Eintrag (kann je nach GoTrue-Version den
--    Login stoeren). Massnahme: repair_orphan_user(<user_id>).
SELECT u.name, u.username, a.id AS auth_id
FROM public.users u
JOIN auth.users a ON a.id = u.auth_id
WHERE NOT EXISTS (SELECT 1 FROM auth.identities i WHERE i.user_id = a.id AND i.provider = 'email');

-- 4) Doppelte Auth-E-Mails oder mehrere Profile auf demselben Auth-Konto
--    (sollte 0 Zeilen liefern).
SELECT 'doppelte auth-email' AS art, email AS wert, count(*) AS anzahl
FROM auth.users WHERE email LIKE '%@ma-construction.local' GROUP BY email HAVING count(*) > 1
UNION ALL
SELECT 'mehrere profile je auth-konto', auth_id::text, count(*)
FROM public.users WHERE auth_id IS NOT NULL GROUP BY auth_id HAVING count(*) > 1;

-- 5) Einladungs-PINs noch im Klartext (muss 0 sein; sonst
--    migration_onboarding_pin_hash.sql ausfuehren).
SELECT count(*) AS klartext_einladungs_pins
FROM public.users
WHERE onboarding_pin IS NOT NULL AND onboarding_pin NOT LIKE '$2%';

-- 6) Welche Onboarding-Funktionen gibt es, und mit welchem search_path?
--    (zeigt, welche Migrationen angewandt sind)
SELECT p.proname,
       pg_get_function_identity_arguments(p.oid) AS argumente,
       p.prosecdef AS security_definer,
       (SELECT c FROM unnest(coalesce(p.proconfig, '{}')) c WHERE c LIKE 'search_path=%') AS search_path
FROM pg_proc p
WHERE p.pronamespace = 'public'::regnamespace
  AND p.proname IN (
    'create_user_with_auth', 'create_user_with_pin_v2', 'reset_onboarding_v2',
    'complete_onboarding_v2', 'update_user_pin_v2', 'lookup_user_for_onboarding',
    'lookup_user_by_pin', 'check_pin_exists', 'delete_user_with_auth', 'toggle_user_active_v2',
    'create_onboarding_token', 'validate_onboarding_token', 'consume_onboarding_token',
    'repair_orphan_user', 'cleanup_orphan_auth_users', 'rpc_throttle_hit')
ORDER BY p.proname;

-- 7) Offene Einladungs-Links (erst nach Migration 04 vorhanden).
-- SELECT u.name, u.username, t.created_at, t.expires_at, t.consumed_at
-- FROM public.onboarding_tokens t JOIN public.users u ON u.id = t.user_id
-- ORDER BY t.created_at DESC;

-- 8) Aktuelle Drossel-Zaehler (erst nach Migration 01): wer ist gerade
--    gesperrt? Schluessel 'onboarding:<benutzername>' = Einladungs-Login.
-- SELECT key, count, window_start FROM public.rpc_throttle ORDER BY window_start DESC;
