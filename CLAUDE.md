# MA Construction - Baustellen-App

## Projektübersicht
PWA für Baustellenmanagement einer kleinen Innenausbau- und Renovierungsfirma in München.
Inhaber: Altin Malici. Zielgruppe: 2-10 Mitarbeiter + Subunternehmer.
Live: https://ma-construction-app.vercel.app (Vercel, Deploy = Push auf `main`).

## Tech Stack
- React 19 mit Vite, Tailwind CSS, Lucide React Icons
- Supabase (Postgres + Auth + Storage + Realtime), RLS auf allen Tabellen
- Komponenten unter `src/components/`, Datenzugriff unter `src/lib/api/`,
  globaler State in `src/context/AppContext.jsx` (+ `src/lib/useAppData.js`)
- PWA (VitePWA/Workbox), Mobile-first
- Tests: Vitest (`npm test`), Lint: ESLint (`npm run lint`)
- Build braucht `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` (.env, gitignored)

## Auth (wichtig!)
- PIN-basierter Login (4-stellig, rollenbasiert: Chef, Mitarbeiter)
- Dual-Identity: `public.users` ↔ `auth.users` (synthetische E-Mail
  `username@ma-construction.local`, PIN = Auth-Passwort)
- Onboarding: Chef legt Mitarbeiter an → Einladungs-PIN (7 Tage gültig) per
  WhatsApp → Mitarbeiter setzt eigenen PIN ("Erster Zugang")
- Alle Passwort-Änderungen laufen über SECURITY-DEFINER-RPCs
  (`complete_onboarding_v2`, `update_user_pin_v2` …) in `supabase/migration_*.sql`
- NIEMALS `supabase.auth.updateUser({password})` oder `signUp` mit dem PIN
  aufrufen: GoTrue-Policy verlangt min. 6 Zeichen → 422 weak_password.
  `signInWithPassword` prüft keine Länge und ist ok.
- SQL-Migrationen werden manuell im Supabase SQL-Editor angewandt
  (Projekt roeqphnopokfdktvvbpp); Dateien in `supabase/` sind die Referenz.

## Features (live)
- Dashboard mit Modulen, rollenabhängig
- Baustellen-Verwaltung inkl. Team-Zuweisung (`baustellen_mitarbeiter`)
- Stundenerfassung mit Wetter, Offline-Queue + Auto-Sync, Freigabe-Workflow
- Stundenübersicht mit Lohnexport (CSV, deutsch, Viertelstunden-Rundung)
- Kalender/Termine, Regieberichte mit PDF-Vorschau, Bautagebuch
- Mängelmanagement (baustellenbezogen + globaler Chef-Tab)
- Kosten- und Materialübersicht, Fotodokumentation (Supabase Storage)
- Digitale Unterschriften (SigPad), Benachrichtigungen (in-App, DB-basiert)
- Fehler-Monitoring in `error_log`-Tabelle (nur Chef liest)

## Geplante Features
- Web-Push-Benachrichtigungen (braucht VAPID-Keys + Serverfunktion)
- Materialtracking im Detail, Soll-Ist-Vergleich pro Baustelle
- Lexware-Lohnexport-Format (wartet auf Muster-Importdatei)
- Read-only-Rolle für Buchhaltung/Steuerberater

## Design
- Apple iOS Style, minimalistisch, Lila Farbschema (Gradient #8E3A9E → #A04878)
- Mobile-first, responsive (Handy = native Look, Desktop = iPhone-Simulation)
- Deutsche UI-Texte

## Regeln
- Immer Mobile-first denken, große Touch-Buttons (min 44px)
- Deutsche Labels
- Arbeitszeiten auf 15-Minuten runden
- Bei Naturstein immer Steinart und Oberfläche angeben
- Vor jedem Push: `npm test` + `npm run lint` + `npm run build`
