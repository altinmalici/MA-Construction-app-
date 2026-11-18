# Setup — MA Construction App

## 1. Lokales Setup

Voraussetzung: Node 22 (wie in CI), npm.

```
npm ci
cp .env.example .env      # dann echte Werte eintragen
npm run dev               # http://localhost:5173
```

Vor jedem Push müssen alle drei grün sein:

```
npm test
npm run lint
npm run build
```

Bundle-Analyse nur bei Bedarf: `ANALYZE=1 npm run build` schreibt `stats.html` ins Projektverzeichnis (nicht nach `dist/`, wird also nicht mit ausgeliefert).

## 2. Umgebungsvariablen

| Variable | Wo | Zweck |
|---|---|---|
| `VITE_SUPABASE_URL` | `.env` lokal, Vercel-Projekt, GitHub-Secret | Projekt-URL, muss mit `https://` beginnen |
| `VITE_SUPABASE_ANON_KEY` | `.env` lokal, Vercel-Projekt, GitHub-Secret | öffentlicher anon-Key |
| `VITE_ONBOARDING_LINK` | optional, Vercel-Projekt | `0` schaltet den Einladungs-Link ab (dann nur Einladungs-PIN). Ohne Angabe nutzt die App den Link, sobald Migration 04 ausgeführt ist. |

Fehlt eine Variable, bricht die App beim Start mit einer klaren Meldung ab (`src/lib/supabase.js`). `.env` und `.env.local` sind in `.gitignore` und gehören nie ins Repo.

SQL-Tests: `supabase/tests/` spielt alle Migrationen in ein Wegwerf-Postgres im Arbeitsspeicher ein (PGlite) und prüft Rollen, Policies und RPCs. Neue Migrationen dort mit testen.

Die Tests brauchen die Variablen ebenfalls (das Supabase-Modul wird beim Import geprüft), erreichen die Datenbank aber nicht: `src/test/setup.js` sperrt `fetch` für alle Tests.

GitHub-Secrets (Repo → Settings → Secrets and variables → Actions): `VITE_SUPABASE_URL` und `VITE_SUPABASE_ANON_KEY`. Beide Workflows (`ci.yml`, `keep-alive.yml`) nutzen sie.

## 3. Deployment

- Vercel deployt jeden Push auf `main` live: https://ma-construction-app.vercel.app
- CI (`.github/workflows/ci.yml`) läuft bei Push auf `main` und bei jedem Pull Request: Lint, Tests, Build.
- Änderungen daher über Branch + Pull Request, erst nach grünem CI mergen.

## 4. Datenbank-Migrationen

Migrationen werden **von Hand** im Supabase SQL-Editor ausgeführt (Projekt `roeqphnopokfdktvvbpp`). Die Dateien in `supabase/` sind die Referenz; es gibt kein automatisches Migrations-Tool.

Reihenfolge für eine neue, leere Datenbank:

1. `schema.sql`
2. `migration_login_rebuild.sql`
3. `migration_auth.sql`
4. `scripts/migrate-to-auth.mjs` (nur bei Bestandsnutzern ohne Auth-Konto; braucht `SUPABASE_SERVICE_KEY`)
5. `migration_rls.sql`
6. `migration_cleanup.sql`
7. `migration_check_pin_exists_hardening.sql`
8. `migration_storage_buckets.sql`
9. `migration_dokumente_storage_path.sql`
10. `migration_sync_baustelle_junctions.sql`
11. `migration_security_guards.sql`
12. `migration_hardening.sql`
13. `migration_stunden_freigabe.sql`
14. `migration_pin_throttle.sql`
15. `migration_error_log.sql`
16. `migration_onboarding_pin_hash.sql`
17. `migration_2026_11_16_01_security_hardening.sql`
18. `migration_2026_11_16_04_onboarding.sql` (braucht 17)
19. `migration_2026_11_16_02_bautagebuch_wetter.sql`
20. `migration_2026_11_16_03_pin_lookup_sperren.sql`
21. `migration_2026_11_17_pause_default_0.sql`
22. `migration_2026_11_17_error_log_limit.sql` (braucht 17)
23. `migration_2026_11_18_01_regiebericht_nr.sql`
24. `migration_2026_11_18_02_einladung_pin_entfaellt.sql` (braucht 18)
25. `migration_2026_11_18_03_lohndaten_schutz.sql` (erst wenn alle Geräte die App-Version mit `kollegen_liste`/`meine_baustellen` geladen haben)
26. `migration_2026_11_18_04_benachrichtigungen_pro_nutzer.sql` (zusammen mit 25)
27. `migration_2026_11_18_05_stunden_nur_offene_baustellen.sql`

Für die **bestehende** Datenbank gelten bei 17 bis 20 zusätzliche Zeitpunkte (zum Teil erst nach dem Deploy eines bestimmten Frontend-Stands) und Prüf-Abfragen: siehe `docs/AUTOPILOT_2026-11-16.md`, Abschnitt 3.

Rollback-Skripte für einzelne Schritte liegen in `supabase/rollbacks/`.

Regeln:

- Nie `supabase.auth.updateUser({ password })` oder `signUp` mit dem PIN aufrufen (GoTrue verlangt 6 Zeichen → 422). PIN-Änderungen laufen nur über die SECURITY-DEFINER-RPCs.
- Neue Migrationen als neue Datei anlegen, bestehende nicht umschreiben.

## 5. Supabase Keep-Alive

Der Free Plan pausiert ein Projekt nach 7 Tagen ohne Aktivität. Dann ist die App nicht mehr erreichbar, bis das Projekt im Dashboard von Hand fortgesetzt wird.

`.github/workflows/keep-alive.yml` fragt deshalb alle 3 Tage einmal die Datenbank ab:

- Zeitplan: `17 6 */3 * *` (UTC), zusätzlich von Hand startbar (Actions → "Supabase Keep-Alive" → Run workflow).
- Abfrage: `GET $VITE_SUPABASE_URL/rest/v1/baustellen?select=id&limit=1` mit dem anon-Key. RLS liefert dabei 0 Zeilen; es zählt nur der Zugriff.
- Braucht die beiden GitHub-Secrets aus Abschnitt 2.

Zu beachten:

- GitHub deaktiviert geplante Workflows in Repos ohne Aktivität nach 60 Tagen. Kommt eine Mail "scheduled workflow disabled", den Workflow unter Actions wieder aktivieren.
- Schlägt der Lauf fehl (z. B. Secret geändert), meldet GitHub das per Mail an den Repo-Besitzer.
- Ist das Projekt doch pausiert: Supabase-Dashboard → Projekt → "Restore project".

## 6. Realtime

Live-Updates (Stunden, Mängel, Benachrichtigungen) funktionieren nur, wenn die Tabellen in der Publication `supabase_realtime` stehen. Das muss **einmalig von Hand** aktiviert werden:

Supabase-Dashboard → Database → Publications → `supabase_realtime` → Tabellen `stundeneintraege`, `maengel`, `benachrichtigungen` einschalten.

Ohne diesen Schritt läuft die App normal weiter, zeigt Änderungen anderer Nutzer aber erst nach dem nächsten Laden. Prüfschritte stehen in `docs/realtime/manual-smoke-test.md`.

## 7. Einstellungen im Code

`src/config.js`:

- `BACKGROUND_LOCK_MS` — Sperre nach so langer Zeit im Hintergrund (Standard 120 s).
- `INACTIVITY_LOCK_MS` — Sperre nach so langer Zeit ohne Eingabe (Standard 15 min, `0` = aus).
- `ONBOARDING_LINK_MODE` — über `VITE_ONBOARDING_LINK` (siehe Abschnitt 2).

## 8. Weitere Dokumente

- `docs/MASTERPLAN.md` — Roadmap und Status
- `docs/AUDIT_2026-11.md` — aktueller Audit
- `docs/AUTOPILOT_2026-11-16.md` — Abschlussbericht des Laufs vom 16.11.2026: PRs, Merge-Reihenfolge, manuell auszuführende Migrationen, iPhone-Checkliste
- `docs/sql/onboarding_diagnose.sql` — nur lesende Abfragen zum Zustand der Mitarbeiter-Konten
