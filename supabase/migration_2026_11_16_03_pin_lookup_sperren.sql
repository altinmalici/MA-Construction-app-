-- =============================================================
-- MA Construction – Globale PIN-Suche abschalten (Audit A-06, S-04, S-11)
-- NOCH NICHT ANGEWANDT. Von Hand im Supabase SQL-Editor ausfuehren.
--
-- !!! ERST AUSFUEHREN, WENN PAKET 4 LIVE IST (gemerged + ausgeliefert) UND
-- !!! ALLE GERAETE DIE NEUE VERSION GELADEN HABEN (App einmal schliessen
-- !!! und neu oeffnen). Die alte App-Version nutzt lookup_user_by_pin fuer
-- !!! den Login auf Geraeten ohne gemerkten Nutzer – dort ginge der Login
-- !!! sonst nicht mehr ("Falscher PIN").
--
-- Hintergrund: lookup_user_by_pin(pin) lieferte anonym zu einem PIN den
-- Benutzernamen. Damit liess sich (trotz Drossel) herausfinden, welche PINs
-- vergeben sind und wem sie gehoeren. Ab Paket 4 meldet sich die App immer
-- mit Benutzername + PIN an und ruft diese Funktion nicht mehr auf.
--
-- Aendert keine Daten. Idempotent. Die Funktion bleibt bestehen (Rollback
-- = GRANT wieder setzen), ist aber von aussen nicht mehr aufrufbar.
-- =============================================================

REVOKE EXECUTE ON FUNCTION public.lookup_user_by_pin(TEXT) FROM PUBLIC, anon, authenticated;

-- Verifikation (muss "false" liefern):
--   SELECT has_function_privilege('anon', 'public.lookup_user_by_pin(text)', 'EXECUTE');
-- Rollback:
--   GRANT EXECUTE ON FUNCTION public.lookup_user_by_pin(TEXT) TO anon, authenticated;
