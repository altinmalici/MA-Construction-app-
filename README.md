# MA Construction – Baustellen-App

PWA für das Baustellenmanagement von MA Construction (Innenausbau und Renovierung, München): Baustellen, Stundenerfassung mit Offline-Warteschlange, Lohnexport, Regieberichte, Bautagebuch, Mängel, Kosten, Fotos.

Live: https://ma-construction-app.vercel.app (Vercel deployt jeden Push auf `main`).

## Schnellstart

```
npm ci
cp .env.example .env   # echte Werte eintragen
npm run dev
```

Vor jedem Push: `npm test`, `npm run lint`, `npm run build`.

## Dokumentation

- `docs/SETUP.md` — lokales Setup, Umgebungsvariablen, Datenbank-Migrationen, Keep-Alive, Realtime
- `docs/MASTERPLAN.md` — Roadmap und Status
- `docs/AUDIT_2026-11.md` — Audit vom November 2026
- `docs/AUTOPILOT_2026-11-16.md` — Abschlussbericht des Laufs vom 16.11.2026
- `CLAUDE.md` — Projektregeln (Auth, Design, Arbeitsweise)

## Technik

React 19, Vite, Tailwind, Supabase (Postgres, Auth, Storage, Realtime), Vitest. SQL-Migrationen liegen in `supabase/` und werden von Hand im Supabase SQL-Editor ausgeführt.
