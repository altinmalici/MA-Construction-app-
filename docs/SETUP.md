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

Fehlt eine Variable, bricht die App beim Start mit einer klaren Meldung ab (`src/lib/supabase.js`). `.env` und `.env.local` sind in `.gitignore` und gehören nie ins Repo.

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
17. Dateien `migration_2026_11_16_*.sql` in der Reihenfolge aus `docs/AUTOPILOT_2026-11-16.md`

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

## 7. Weitere Dokumente

- `docs/MASTERPLAN.md` — Roadmap und Status
- `docs/AUDIT_2026-11.md` — aktueller Audit
- `docs/AUTOPILOT_2026-11-16.md` — Nachtlauf-Protokoll mit den manuell auszuführenden Migrationen
