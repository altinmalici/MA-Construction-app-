# MA Construction App — Masterplan

*Letzte Aktualisierung: 2026-04-19 · Dokument ist lebend, Status-Felder werden pro Task gepflegt*

---

## 0. Wie dieses Dokument zu lesen ist

Dieser Masterplan ist die **Single Source of Truth** für die Weiterentwicklung der MA Construction App. Er ersetzt keinen anderen Plan im Projekt — er fasst sie alle zusammen und verschmilzt den Audit-Report (`AUDIT_REPORT_2026-04.md`) mit dem ursprünglichen Phasen-Plan (Phase 3-8).

**Konventionen:**
- Jeder Task hat ein Status-Feld: 🔴 TODO · 🟡 IN PROGRESS · 🟢 DONE · ⚪ DEFERRED · ❌ CANCELLED
- Wenn Claude Code einen Task abschließt, updatet er den Status auf 🟢 DONE + fügt Datum + Commit-Hash an
- Phasen werden der Reihe nach abgearbeitet — innerhalb einer Phase können Tasks parallelisiert werden, wenn die Abhängigkeits-Graphen es erlauben
- **Ein Task = ein Prompt = ein Commit** (Superpowers-Workflow)

---

## 1. Resume-Protokoll (für neue Claude-Sessions)

Wenn Altin in einer neuen Chat-Session das Projekt wiederaufnimmt, liest Claude Chat diesen Masterplan zuerst und arbeitet nach folgendem Muster:

1. **State-Check:** Welche Phase ist IN PROGRESS? Welcher Task ist der nächste mit Status TODO?
2. **Abhängigkeits-Check:** Sind die Vorgänger-Tasks wirklich DONE? Falls nicht, erst die nachziehen.
3. **Prompt-Bau:** Claude Chat schreibt den Claude-Code-Prompt für den nächsten Task als einzelner copy-paste-fähiger Block in einer `.txt`-Datei (Altins bevorzugter Workflow).
4. **Nach Task-Abschluss:** Altin meldet zurück ("done" oder "Fehler: ..."), Claude Chat aktualisiert Status und baut den nächsten Prompt.
5. **Kein Approval-Gate zwischen Tasks** — Claude Code läuft autonom, Sicherheit kommt aus TDD + code-reviewer + verification-before-completion + git commits pro Task.

**Merke:** Fortschritt wird nur im Masterplan getrackt, nicht in Claude-Memory. Memory ist flüchtig, der Plan ist fest.

**Recall-Befehl für Altin:** Im Terminal `plan` tippen → Masterplan-Inhalt landet in der Zwischenablage → Altin pastet ihn mit dem Satz "mach weiter mit masterplan" in die neue Claude-Chat-Session.

---

## 2. Projekt-Kontext (Stand April 2026)

### Stack
- **Frontend:** React + Vite + Tailwind + lucide-react
- **Backend:** Supabase (project ref: `roeqphnopokfdktvvbpp`)
- **Deployment:** Vercel (auto-deploy via GitHub push, Repo `altinmalici/MA-Construction-app-`)
- **Dev:** `npx vite --host` auf `localhost:5173`
- **Prod:** `ma-construction-app.vercel.app`

### Architektur (post Phase 2)
- `App.jsx` ist jetzt ~67 Zeilen (Router-only)
- 37 Komponenten-Dateien:
  - 23 Screens in `src/components/screens/`
  - 9 UI-Komponenten in `src/components/ui/`
  - `AppContext.jsx`, `helpers.js`
  - 12 API-Layer-Dateien in `src/lib/api/`

### User / Rollen
- **Altin:** `a.malici` · Chef-Rolle
- **Agim:** `ag.malici` · Mitarbeiter-Rolle

### Abgeschlossene Phasen
- **Phase 1 (Auth + RLS):** 🟢 DONE — Supabase Auth mit PIN-as-Password, synthetische Emails (`username@ma-construction.local`), 35 RLS-Policies über 11 Tabellen, Helper-Funktionen (`get_user_role`, `user_has_baustelle_access`)
- **Phase 2 (App.jsx Split):** 🟢 DONE — 37 Dateien extrahiert, 24 Bugs post-split gefixt, deployed

### Arbeitsweise / Prinzipien
- **Workflow-Teilung:** Claude Chat = Architekt (Planung, Prompt-Schreiben), Claude Code im Terminal = Ausführung. Altins Bruder führt manchmal auch Prompts aus.
- **Prompt-Stil:** Autonom, keine Approval-Gates zwischen Tasks
- **Terminal-Befehle:** Immer als einzelne kopierbare Plain-Text-Zeile, NIE in Markdown-Code-Blöcken
- **Längere Prompts:** Als Download-`.txt` liefern für One-Click-Copy
- **Sequenz:** Ein Fix nach dem anderen, nach jedem Testen
- **Neue Chat-Session pro Phase** für frischen Kontext
- **Keine unnötige Komplexität** (kein React Router, keine Skeleton-Loader ohne echten Bedarf)
- **Altin kommuniziert auf Deutsch**, oft per Voice — gelegentliche Zahlen-Fehler durch Voice sollen zurückgefragt werden
- **18 Claude-Code-Skills installiert** (Supabase Postgres, Vercel React, Web Design, Composition Patterns, Superpowers-Suite)

---

## 3. Entscheidungs-Log

| Datum | Entscheidung | Begründung |
|---|---|---|
| 2026-04 | Phase 3 wird in 3a / 3b / 3c aufgeteilt | Security-Fixes dürfen nicht warten, bis alle UX-Prompts durch sind |
| 2026-04 | Audit-Masterplan (Pakete A-F) wird mit ursprünglicher Roadmap (Phase 3-8) gemerged, nicht parallel geführt | Zwei parallele Roadmaps würden sich überschneiden (Paket D = Phase 5 PWA, Paket E = Phase 4 Storage) |
| 2026-04 | DokView wird in Phase 3b temporär deaktiviert, nicht erst in Phase 4 gefixt | Stiller Datenverlust ist das schlimmste UX-Versagen — User darf nicht denken, Dokumente seien gespeichert |
| 2026-04 | Auto-Lock bleibt bei 120 Sekunden Background-only (visibilitychange API), keine Idle-Timeout-Logik | User-Entscheidung aus früherer Session |
| 2026-04 | Auto-Seed "Testprojekt Muster GmbH" wird in Phase 3b entfernt | Überraschend auf leerer Prod-DB |
| 2026-04 | Keine externen AI-Agent-Produkte, Automation wird nativ in den Stack gebaut (Phase 8) | App soll fokussiert bleiben, Lexoffice/Storage sind bridges, nicht Monolith-Features |
| 2026-04 | Masterplan liegt als `docs/MASTERPLAN.md` im Repo, nicht im Claude-Projekt-Knowledge | Muss parallel zum Code versioniert werden und von Claude Code direkt updatebar sein |

---

## 4. Offene Bugs aus Phase 2 (Altin-Beobachtungen)

Diese werden in den passenden Phase-3-Teil-Tasks gelöst, sind hier nur zur Nachverfolgung gelistet:

- 🟢 ~~Bautagebuch "Speichern" funktioniert nicht~~ → gelöst in 3c-BTB (Repro-Test nach Phase-3a-Auth-Härtungen erfolgreich; Phase-1-Patch macht künftige Regressions diagnostizierbar)
- 🟢 ~~"Willkommen zurück" macht globalen PIN-Lookup statt User-spezifischer Validation~~ → gelöst in 3c-LOGIN (loginAsUser, schon seit Phase 3 Prompt 1)
- 🟢 ~~PIN-Re-Entry nach 120s Background (visibilitychange API) fehlt~~ → gelöst in 3c-LOGIN (BACKGROUND_LOCK_MS=120s, schon seit Phase 3 Bug-4-Rework); App-Start-Härtung via signOut neu in 3c-LOGIN

---

## 5. Roadmap

### 🎯 Phase 3a — Security-Sofort-Fixes · Status: 🟢 DONE · geschätzt ~4-6h

**Ziel:** Keine ausnutzbaren Schwachstellen mehr. Muss VOR allem anderen durch.

| ID | Task | Datei | Aufwand | Status |
|---|---|---|---|---|
| 3a-01 | `Math.random` → `crypto.getRandomValues` für Onboarding-PIN-Generierung | `src/utils/helpers.js` | klein | 🟢 DONE |
| 3a-02 | `supabase.js` fail-fast bei fehlenden Env-Vars (statt silent fallback) | `src/lib/supabase.js` | klein | 🟢 DONE |
| 3a-03 | Auth `signOut + signIn` durch `updateUser` ersetzen wo möglich | `src/lib/api/auth.js` | klein | 🟢 DONE |
| 3a-04 | Logout-Confirm-Modal (iOS-Style) einbauen | `src/components/screens/ProfilView.jsx:400-407` + neue `ConfirmModal`-Komponente | klein | 🟢 DONE |
| 3a-05 | `users.update` — undefined-Felder dürfen nicht als NULL ins DB-Update gehen | `src/lib/api/users.js:47-64` | klein | 🟢 DONE |
| 3a-06 | `baustellen.updateField` — Whitelist erlaubter Felder einführen | `src/lib/api/baustellen.js` | klein | 🟢 DONE |
| 3a-07 | `check_pin_exists` RPC — Chef-only ODER Rate-Limit | Supabase SQL-Migration + `src/lib/api/auth.js` | mittel | 🟢 DONE |

**Abschluss-Kriterium:** Alle 7 Tasks 🟢 DONE, `npm run build` läuft, Deploy auf Vercel ok, Altin hat Login/Logout auf Mobile getestet.

---

### 🎯 Phase 3b — Daten-Hygiene + Critical Bug Fixes · Status: 🟢 DONE · geschätzt ~6-8h

**Ziel:** Keine falschen Zahlen mehr. Keine Fake-Features mehr. Keine Duplikate mehr.

| ID | Task | Datei | Aufwand | Status |
|---|---|---|---|---|
| 3b-01 | **DokView deaktivieren** mit "In Entwicklung"-Hinweis (bis Phase 4 echte Uploads bringt) | `src/components/screens/DokView.jsx` | klein | 🟢 DONE |
| 3b-02 | Number-Inputs app-weit: `min="0"` + `inputMode="numeric/decimal"` + `Math.max(0, n)` beim Setzen | `SteView.jsx:540-568`, `RegView.jsx:471-475`, `MitForm.jsx:278-285`, `KostenView.jsx:645-652`, `BstForm.jsx:314` (audit-miss) | klein | 🟢 DONE |
| 3b-03 | `bStd` Mitternachts-Übergang fixen (22:00→02:00 = aktuell 0 Stunden) | `src/utils/helpers.js:2-8` | klein | 🟢 DONE |
| 3b-04 | `RegView` NaN-Bug bei altem `fahrtzeit`-Feld | `RegView.jsx:48` + KostenView (4 defensive) | klein | 🟢 DONE |
| 3b-05 | `KalView` TZ-Bug: konsistent String-Vergleich mit `t.datum.slice(0,10)` | `KalView.jsx:171-172, 36` | klein | 🟢 DONE |
| 3b-06 | `MeineStd` Filter-Konsistenz mit `StundenUebersicht` und `KostenView` (Helper extrahieren) | `MeineStd.jsx:31, 36-43, 60` + neuer Helper | klein | 🟢 DONE |
| 3b-07 | `KostenView` CSV-Export: `bsList` (gefiltert) statt `data.baustellen` | `KostenView.jsx:95-147` | klein | 🟢 DONE |
| 3b-08 | `RegView` Inline-Edits: entweder per `stundeneintraege.update` persistieren ODER klar als "nur für Bericht" labeln | `RegView.jsx:13, 28-32, 113-115` | mittel | 🟢 DONE |
| 3b-09 | Komma als Dezimaltrenner akzeptieren in Betrag/Stundensatz-Feldern | betroffene Forms | klein | 🟢 DONE |
| 3b-10 | Auto-Seed "Testprojekt Muster GmbH" entfernen oder auf `import.meta.env.DEV` beschränken | `src/AppContext.jsx:107-138` | klein | 🟢 DONE |
| 3b-11 | `benachrichtigungen.removeAll` — explizit User-Filter einbauen (defense-in-depth) | `src/lib/api/benachrichtigungen.js:50` | klein | 🟢 DONE |
| 3b-12 | `stripUndefined`-Helper aus `users.js` nach `src/utils/objects.js` extrahieren und auf `baustellen.update` + `stundeneintraege.update` anwenden | `src/lib/api/baustellen.js`, `src/lib/api/stundeneintraege.js`, neuer Utils-File | klein | 🟢 DONE |

**Abschluss-Kriterium:** Alle 11 Tasks 🟢 DONE, Nachtschicht-Test (22:00→02:00) zeigt korrekte Stunden, DokView zeigt klaren Hinweis, CSV-Export matched Bildschirm-Filter.

---

### 🎯 Phase 3c — UX-Kernstück · Status: 🟢 DONE · geschätzt ~10-15h

**Ziel:** Die App fühlt sich auf Baustellen-Mobile endlich fertig an. Keine versehentlichen Doppel-Klicks, keine verlorenen Formular-Eingaben, keine versehentlichen Logouts.

Dies enthält die ursprünglich als "Phase 3" geplanten Themen (Login, Bautagebuch RLS, Regiebericht UX) plus Paket C aus dem Audit.

| ID | Task | Datei | Aufwand | Status |
|---|---|---|---|---|
| 3c-LOGIN | Login-Fixes: App startet immer auf PIN-Screen, user-spezifische PIN-Validation (kein globaler Lookup), Background-Auto-Lock nach 120s via visibilitychange API | `LoginView.jsx`, `App.jsx`, `AppContext.jsx` | mittel | 🟢 DONE |
| 3c-BTB | Bautagebuch Speichern-Bug diagnostizieren und fixen (vermutlich RLS-Policy) | Supabase-Policies + `BtbView.jsx` | mittel | 🟢 DONE |
| 3c-REG | Regiebericht: Close-Button-UX + 30-Min-Intervall-Validation für Zeiten | `RegView.jsx` | klein | 🟢 DONE |
| 3c-SAVING | Zentraler `useSaving`-Hook bauen, dann app-weit in Save-Handlern integrieren (`BstForm`, `SteView`, `MngView`, `BtbView`, `KalView`, `MitForm`, `KostenView`, `SubView`) inkl. `disabled={saving}` + Spinner | neuer Hook + 8 Screens | mittel | 🟢 DONE |
| 3c-MODAL | `ConfirmModal` + `PromptModal` (iOS-Style) bauen und alle `window.confirm()` / `window.prompt()` Aufrufe ersetzen | neue Komponenten + alle Screens mit confirm/prompt | mittel | 🟢 DONE |
| 3c-DIRTY | `BstForm` Dirty-Check vor Zurück-Tap (Confirm-Modal "Änderungen verwerfen?") | `BstForm.jsx:11-32` | klein | 🟢 DONE |
| 3c-SLIDER | `BstDet` Fortschritts-Slider: lokaler Optimistic-State + Debounce 300-500ms vor `updateField` | `BstDet.jsx:128-148` | klein | 🟢 DONE |
| 3c-TOUCH | Touch-Targets app-weit auf ≥44px | audit-weit | mittel | 🟢 DONE |
| 3c-TOAST | Toast-Queue mit X-Close, Errors länger anzeigen | `Toast`-Komponente + `AppContext` | klein | 🟢 DONE |
| 3c-SAFEAREA | `ScreenLayout` um `safe-area-inset-bottom` erweitern | `ScreenLayout.jsx` | klein | 🟢 DONE |
| 3c-THEME | Theme-Color-Werte konsolidieren (index.html meta + manifest später in Phase 5) | `index.html` + Konstanten-Datei | klein | 🟢 DONE |
| 3c-SIGPAD | `SigPad` Canvas-Resize bei Rotation handhaben | `SigPad.jsx` | mittel | 🟢 DONE |
| 3c-SPINNER | Loading-Spinner + Error-Messages wo sie fehlen (MngView-Styling gleich mit-überarbeiten) | `MngView.jsx` + ggf. andere | klein | 🟢 DONE |

**Abschluss-Kriterium:** Alle 13 Tasks 🟢 DONE. Altin testet auf iPhone: Doppel-Tap Save erzeugt keine Duplikate, Logout fragt nach, BstForm-Zurück bei Änderungen fragt nach, Bautagebuch speichert erfolgreich, alle confirm/prompt sind iOS-Modals.

---

### 🎯 Phase 4 — Supabase Storage + Foto-Architektur · Status: 🟡 IN PROGRESS · geschätzt ~8-12h

**Ziel:** Echte Datei-Uploads. Base64-Fotos verschwinden aus der DB. DokView wird funktional.

| ID | Task | Aufwand | Status |
|---|---|---|---|
| 4-01 | Supabase Storage Buckets einrichten (`documents`, `photos`), RLS-Policies definieren | mittel | 🟢 DONE |
| 4-02 | Storage-Upload-Helper in `src/lib/storage.js` bauen | klein | 🟢 DONE |
| 4-03 | DokView aktivieren: echter File-Upload + Anzeige + Download-Link | groß | 🔴 TODO |
| 4-04 | Client-seitige Photo-Compression (Canvas resize + JPEG q=0.7, max 1600px Kante) | mittel | 🔴 TODO |
| 4-05 | `PhotoGrid` erweitern: max 5 Fotos pro Eintrag, `alt`-Texte, Lazy-Loading, Lightbox | mittel | 🔴 TODO |
| 4-06 | Migration: bestehende Base64-Fotos in Storage umziehen (Migrations-Script + DB-Spalten-Umstellung) | groß | 🔴 TODO |
| 4-07 | Junction-Sync atomar als RPC (Paket F Vorziehen, da Photo-Junctions betroffen) | mittel | 🔴 TODO |

**Abschluss-Kriterium:** Alle Tasks 🟢 DONE. DB-Table-Size für `maengel` / `stundeneintraege` deutlich reduziert. DokView funktional.

---

### 🎯 Phase 5 — PWA-Versprechen einlösen · Status: 🟢 DONE · geschätzt ~6-10h

**Bilanz Phase 5 (10/10):** App ist installierbare PWA mit Offline-Shell, App-Shell-Caching, Vendor-Splitting und schlankem Erst-Load. iPhone-Smoke-Test 5-10 grün.

| Stats | Vorher | Nachher |
|---|---:|---:|
| Main-Bundle | 546 KB | **53 KB** |
| Erst-Load gzip | 148 KB | **~124 KB** |
| Chunks (JS) | 1 | 24 (3 vendor + main + 20 lazy) |
| PWA-Status | nicht installierbar | installierbar (iOS + Android) |
| Service-Worker | — | aktiv mit 4 Runtime-Strategien |
| Pre-Cache | — | 46 entries / 636 KB |

Neue Deps: `vite-plugin-pwa`, `sharp` (dev), `rollup-plugin-visualizer` (dev).
Neue Assets: `manifest.webmanifest`, `sw.js`, 5 PNG-Icons, 2 SVG-Logos, `scripts/gen-icons.mjs`.
18 Commits (10 Code + 8 Docs/Polish).

**Ziel:** App ist installierbar auf iPhone/Android. Basis-Offline-Fähigkeit. Schnelleres Laden.

| ID | Task | Aufwand | Status |
|---|---|---|---|
| 5-01 | `vite-plugin-pwa` installieren + konfigurieren | klein | 🟢 DONE |
| 5-02 | `manifest.webmanifest` erstellen (name, icons, theme_color, display) | klein | 🟢 DONE |
| 5-03 | `apple-touch-icon` + iOS Splash-Screens | klein | 🟢 DONE |
| 5-04 | `viewport`-Meta-Tag: `user-scalable=no` entfernen (WCAG) | klein | 🟢 DONE |
| 5-05 | Service Worker: Cache-First für statische Assets, Stale-While-Revalidate für Daten | mittel | 🟢 DONE |
| 5-06 | `React.lazy` für alle Screens außer Login/Dash | klein | 🟢 DONE |
| 5-07 | `vite` `manualChunks` für Vendor-Chunks (lucide-react, supabase, recharts falls drin) | klein | 🟢 DONE |
| 5-08 | `key={v}` aus `<Screen>`-Rendering entfernen (unnötige Remounts) | klein | 🟢 DONE |
| 5-09 | Bundle-Analyzer einmal laufen lassen, Low-Hanging-Fruit entfernen | klein | 🟢 DONE |
| 5-10 | Auf iPhone "Zum Home-Screen hinzufügen" testen | klein | 🟢 DONE |

**Abschluss-Kriterium:** App öffnet sich offline auf iPhone (letzter Stand sichtbar), Install-Prompt erscheint, Bundle-Size < 350KB gzipped.

---

### 🎯 Phase 6 — Realtime + Performance · Status: 🔴 TODO · geschätzt tbd

**Ziel:** Chef sieht Mitarbeiter-Eintragungen live. App skaliert auf 10k+ Stundeneinträge.

| ID | Task | Aufwand | Status |
|---|---|---|---|
| 6-01 | Supabase Realtime-Subscriptions für `stundeneintraege`, `maengel`, `benachrichtigungen` | mittel | 🔴 TODO |
| 6-02 | AppContext: Realtime-Updates mergen ohne Full-Refresh | mittel | 🔴 TODO |
| 6-03 | KostenView / SteView in List/Detail/Form aufteilen (aktuell 949 + 728 Zeilen) | groß | 🔴 TODO |
| 6-04 | API-Wrapper mit AbortController + Retry für GETs | mittel | 🔴 TODO |
| 6-05 | `bautagebuch` + `kalender` `update()`-Funktionen ergänzen (aktuell nur delete+create) | mittel | 🔴 TODO |
| 6-06 | Performance-Profiling mit Testdatensatz 10k Stunden / 100 Baustellen | mittel | 🔴 TODO |
| 6-07 | Vitest-Coverage auf wichtigste Helpers ausdehnen (`bStd`, Datum-Utils, Filter-Helpers) | mittel | 🔴 TODO |

---

### 🎯 Phase 7 — Lexoffice-Integration · Status: 🔴 TODO · geschätzt tbd

**Ziel:** Stunden, Regieberichte, Materialien aus der App landen per Klick in Lexoffice als Rechnung/Angebot-Entwurf. App bleibt fokussiert, Lexoffice macht Buchhaltung, smarte Brücke dazwischen.

| ID | Task | Aufwand | Status |
|---|---|---|---|
| 7-01 | Lexoffice API-Dokumentation studieren, Auth-Flow festlegen (OAuth) | mittel | 🔴 TODO |
| 7-02 | Supabase Edge Function für Lexoffice-API-Calls (Secret-Schutz) | mittel | 🔴 TODO |
| 7-03 | "Nach Lexoffice exportieren"-Button in Regiebericht + Kostenübersicht | mittel | 🔴 TODO |
| 7-04 | Mapping Baustelle → Lexoffice-Kunde | mittel | 🔴 TODO |
| 7-05 | Test-Modus + Prod-Modus für Lexoffice | klein | 🔴 TODO |

---

### 🎯 Phase 8 — Automation-Layer · Status: ⚪ DEFERRED bis nach Phase 7

**Ziel / Vision:** Die App wird zum "digitalen Mitarbeiter" für Admin-Tasks. Automatische wöchentliche Reports, Rechnungs-Vorbereitung, Dokumenten-Sortierung, Voice-Note-Summaries.

Konkrete Tasks werden definiert, wenn Phase 7 abgeschlossen ist und wir die Realität der Lexoffice-Integration kennen. Geplante Building-Blocks:
- Supabase Edge Functions (zeitgesteuert via `pg_cron`)
- Wöchentlicher Report-Trigger (Sonntag 18:00 → PDF + Email an Chef)
- Voice-Note-Upload → Transkription → Bautagebuch-Eintrag-Vorschlag
- Rechnungs-Preview-Queue (User prüft, App bereitet vor)

---

## 6. Architektur-Cleanup (Paket F — laufend, parallel)

Diese Tasks sind **nicht phase-gebunden** und werden eingeschoben, wenn sie gerade sinnvoll sind (z.B. wenn eine betroffene Datei sowieso angefasst wird).

| ID | Task | Aufwand | Status |
|---|---|---|---|
| F-01 | `<Card>`, `<SectionHeader>`, `<IconButton>`, `<ListRow>` Komponenten extrahieren, Inline-Styles sukzessive ersetzen | groß | 🔴 TODO |
| F-02 | Auth: `_signInAndLoadProfile(email, pwd)` Helper extrahieren, 5 Login-Funktionen konsolidieren | klein | 🔴 TODO |
| F-03 | API-Returns konsistent machen (überall mapped Object ODER überall ID) | klein | 🔴 TODO |
| F-04 | `bStdNum()` Number-Variante neben `bStd()` (String) extrahieren — spart 30+ `parseFloat`-Calls | klein | 🔴 TODO |
| F-05 | `Hdr.jsx` `large` vs compact: gemeinsame Sub-Renders | klein | 🔴 TODO |
| F-06 | `WI.jsx` Wetter-Icon-Default auf neutral (`Cloud`) statt `Sun` | klein | 🔴 TODO |
| F-07 | ESLint-Cleanup-Sprint: 50 Errors + 5 Warnings abarbeiten | mittel | 🔴 TODO |
| F-08 | `pg`-Package aus devDependencies entfernen (ungenutzt im Frontend) | klein | 🔴 TODO |
| F-09 | `BstForm` mit `<Section>`-Pattern refaktorieren (665 Zeilen) | mittel | 🔴 TODO |

---

## 7. Explizit out-of-scope

Um Scope-Creep zu verhindern, diese Themen werden **nicht** angefasst (außer explizit neu entschieden):

- **i18n / Mehrsprachigkeit** — App ist absichtlich Deutsch-only
- **GitHub Actions CI/CD** — Vercel Auto-Deploy reicht für das Setup
- **Vollständiger SQL-Review** aller RLS-Policies — RLS wurde in Phase 1 gebaut, Stichproben in Phase 3a reichen
- **Externe AI-Agent-Produkte** — Automation wird nativ in Supabase Edge Functions gebaut (siehe Decision Log)
- **React Router** — eigener History-Stack reicht für die App-Struktur
- **Skeleton-Loader** — echte Spinner reichen, Skeleton wäre Overengineering für die Daten-Größe
- **Tests außer Vitest für Helpers** — kein E2E/Playwright bis die App stabil auf Prod läuft
- **Android-spezifische Optimierungen** — iOS ist Primär-Plattform des Teams

---

## 8. Referenz-Dokumente im Projekt

| Datei | Zweck | Stand |
|---|---|---|
| `MA_Construction_App.jsx` | Monolith-Version vor Phase 2 (Referenz) | eingefroren |
| `full-source.txt` | Aktuelle Codebase-Dump für Claude-Search | wird bei Bedarf aktualisiert |
| `AUDIT_REPORT_2026-04.md` | Vollständiger Audit (70 Findings, detaillierte Fix-Empfehlungen) | eingefroren 2026-04-18 |
| `docs/MASTERPLAN.md` | **Dieses Dokument — lebende Roadmap** | aktuell |

---

## 9. Changelog (Task-Abschlüsse)

Jeder abgeschlossene Task wird hier mit Datum + Commit-Hash eingetragen — neueste oben.

- 2026-04-20 · 4-02 · ddf4400 · src/lib/storage.js: uploadDocument/getDocumentUrl/deleteDocument + uploadPhoto/getPhotoUrl/getPhotoUrls/deletePhoto/deletePhotos; sanitizeFilename mit Umlaut-Mapping + Längen-Limit; +12 vitest-Szenarien
- 2026-04-20 · 4-01 · 193277e · Storage-Buckets documents (20MB, PDF/Office) + photos (5MB, JPEG/PNG/WEBP); 6 RLS-Policies (je SELECT/INSERT/DELETE pro Bucket); 2 Helper-Functions (user_has_baustelle_access, storage_baustelle_id); Migration in Prod ausgeführt
- 2026-04-20 · 5-10 · — · iPhone PWA-Smoke erfolgreich: Icon scharf, Standalone-Modus läuft, Offline-Shell zeigt Error-Screen korrekt. **Phase 5 komplett (10/10).**
- 2026-04-20 · 5-09 · 5cc5921 · rollup-plugin-visualizer für dist/stats.html; Erst-Load gzip ~124 KB (Ziel <350 erreicht); kein Wildcard-Lucide-Import, keine Module-Duplikate, keine Source-Maps in Prod; pg-Removal in F-08; stats.html aus PWA-Precache ausgeschlossen
- 2026-04-20 · 5-08 · 42d81ba · key={v} aus view-fade-Wrapper entfernt; keine Remounts mehr bei Tab-Wechsel; lokaler Screen-State (Monats-Navigation, Form-State, useSaving-mountedRef) bleibt erhalten; Fade triggert nur bei First-Mount
- 2026-04-20 · 5-07 · 15efd70 · vendor-react/vendor-supabase/vendor-icons als separate Chunks (Function-Variante); Main-Chunk 422→53KB (gzip 123→17KB); Long-Term-Caching für Vendors über mehrere Deploys
- 2026-04-20 · 5-06 · 6c654cf · React.lazy für 20 Screens (alle außer Login/Dash/TabBar); Suspense-Wrapper mit Spinner-Fallback; Main-Bundle 546→422KB (−22.6%), gzip 148→123KB (−16.9%); 20 on-demand Chunks
- 2026-04-20 · 5-05 · 9d58a47 · Workbox-Strategien: Supabase NetworkOnly (nie stale Daten), Google-Fonts CacheFirst, Images StaleWhileRevalidate; navigateFallback /index.html; skipWaiting+clientsClaim für stille Auto-Updates
- 2026-04-20 · 5-04 · b5b34e6 · user-scalable=no + maximum-scale=1.0 aus viewport-Meta entfernt (WCAG 1.4.4 / BFSG); Pinch-Zoom jetzt überall möglich; iOS-Input-Auto-Zoom durch globales font-size:max(1rem,16px) bereits abgedeckt
- 2026-04-20 · 5-03 · d69728e · PWA-Icons (192/512/512-maskable) + apple-touch-icon 180 + favicon-32 aus ma-logo.svg via sharp generiert; scripts/gen-icons.mjs für Re-Runs; iOS-Splash-Screens bewusst weggelassen (iOS 15+ generiert automatisch); Build pre-cached 16 entries
- 2026-04-20 · 5-02 · 3a277b2 · Manifest mit name/short_name/theme_color #7C3AED/standalone/portrait/lang=de; iOS apple-mobile-web-app-* Meta-Tags (status-bar default, title, touch-icon); Icons als Referenzen (Dateien folgen in 5-03)
- 2026-04-20 · 5-01 · b442e9d · vite-plugin-pwa installiert; Minimal-Konfig mit registerType=autoUpdate und manifest=false; Service-Worker cached Build-Assets (5 entries, 574 KiB); dev-mode SW deaktiviert
- 2026-04-20 · 3c-SPINNER · 47e3472 · App-Level-Error-Screen mit Retry bei useAppData-Fail; MngView Frist-Warnung (überfällig=rot, ≤3 Tage=orange); Splash-Spinner auf Spinner-Komponente konsolidiert. **Phase 3c komplett (13/13).**
- 2026-04-20 · 3c-SIGPAD · 822acf6 · SigPad: ResizeObserver + setTransform(dpr) statt fixem Faktor 2; Signatur-Snapshot bleibt bei Rotation/Layout-Shift erhalten; Löschen-Button Icon 14px + minHeight + aria-label
- 2026-04-20 · 3c-THEME · eb52c09 · --brand-primary/--brand-light/--brand-dark als CSS-Vars; <meta name="theme-color"> von #8E3A9E auf #7C3AED korrigiert (Statusbar matched jetzt App-Primary); helpers.js P/PL/PD mit Sync-Kommentar; Manifest-Anbindung folgt in Task 5-02
- 2026-04-20 · 3c-SAFEAREA · 0eeaebe · ScreenLayout bottom-Padding um var(--safe-bottom) erweitert; --safe-bottom CSS-Var + viewport-fit=cover; Toast-Wrapper auf env(safe-area-inset-top); Home-Indicator-Bereich respektiert
- 2026-04-20 · 3c-TOAST · 3621a87 · Toast-Queue (max 3 parallel) + X-Close-Button; Errors 4500ms statt 1800ms; aria-live für Screen-Reader; show()-API unverändert
- 2026-04-20 · 3c-TOUCH · 1b294ad · IconButton-Komponente mit 44×44 Touch-Target (iOS-HIG); Header-Plus/X (4 Screens), Card-Trash (4 Screens), Monats-Chevrons (KalView/MeineStd/StundenUebersicht), KostenView Download umgestellt; Composite-Buttons (mit Label) bewusst belassen, Reste via Paket F
- 2026-04-20 · 3c-SLIDER · a0a979e · BstDet Fortschritts-Slider: lokaler Optimistic-State + 400ms Debounce auf DB-Update; Rollback bei Fehler; spart ~99% der Request-Last beim Drag (1 statt N Requests). Hooks-Order vor early-return (rules-of-hooks-Fix).
- 2026-04-20 · 3c-DIRTY · 5ffd5f9 · BstForm Dirty-Check via JSON-Snapshot-Vergleich; ConfirmModal bei Back-Tap verhindert ungewollten Verlust von Eingaben; Save-Pfad bleibt unberührt
- 2026-04-20 · 3c-MODAL · b60e08e · PromptModal neu (für Phase 4 bereit); ConfirmModal app-weit ausgerollt; 9 window.confirm()-Aufrufe ersetzt (KalView/NotifView/BtbView/SteView/KostenView/MitView/MngView/SubView/BstDet); BstDet mit konkreter Folgenwarnung; einheitliche iOS-Style-Dialoge
- 2026-04-19 · 3c-SAVING · 2e7b48f+7fa2d1f · useSaving-Hook (re-entrant-safe) + Spinner-Komponente; 8 Screens gehärtet (BstForm/SteView/MngView/BtbView/KalView/MitForm/KostenView/SubView) gegen Doppel-Save-Duplikate; informative catch-Messages app-weit; +5 vitest-Szenarien
- 2026-04-19 · 3c-REG · a4d9e67 · RegView: Close-X im PDF-Preview-Modal auf 44x44 (iOS-HIG-konform). 30-Min-Intervall-Validation bereits seit Phase 3 Prompt 3 via TimePicker (minuteStep=30 + snapMinute).
- 2026-04-19 · 3c-BTB · b11ec95 · Bautagebuch-Save: Error-Propagation gehärtet + Orphan-Rollback bei Junction-Fail; ursprünglicher Save-Bug durch Repro-Test nicht mehr reproduzierbar (vermutlich Nebenwirkung Phase-3a-Auth-Härtungen)
- 2026-04-19 · 3c-LOGIN · 528eefe · Login-Flow gehärtet: App-Start invalidiert Session hart via signOut (Defense-in-Depth gegen DevTools-Console-Missbrauch des alten JWT). Sub-Fix 2 (loginAsUser user-spezifisch) + Sub-Fix 3 (BG-Lock 120s via visibilitychange) waren bereits durch Phase 3 implementiert.
- 2026-04-19 · 3b-12 · 46d73b4 · stripUndefined nach src/utils/objects.js extrahiert; users.js importiert statt lokal; baustellen.update + stundeneintraege.update defense-in-depth gehärtet; +8 vitest-Szenarien
- 2026-04-19 · 3b-11 · 5bf0d43 · benachrichtigungen.removeAll durch Chef-Guard im Aufrufer abgesichert (Schema hat kein user_id, Benachrichtigungen sind shared); 'Alle löschen'-Button nur für Chef gerendert
- 2026-04-19 · 3b-10 · 7c00c45 · Auto-Seed "Testprojekt Muster GmbH" nur noch in Dev-Env (import.meta.env.DEV-Guard); Prod bleibt unberührt
- 2026-04-19 · 3b-09 · 2067b06 · parseDecimal-Helper akzeptiert Komma + Punkt; 3 Dezimal-Inputs (Stundensatz/Betrag/Budget) auf type=text/inputMode=decimal umgestellt; MitForm/KostenView/BstForm Save-Handler DRY; +12 vitest-Szenarien
- 2026-04-19 · 3b-08 · 750c5cd · RegView: beginn/ende/pause-Edits werden vor dem Druck per stundeneintraege.update persistiert; Fehler-Pfad bricht Druck ab; bemerkung bleibt transient (keine DB-Spalte)
- 2026-04-19 · 3b-07 · 2700206 · KostenView CSV-Export iteriert bsList (status-gefiltert) statt data.baustellen; Filename mit Status-Suffix
- 2026-04-19 · 3b-06 · b805520 · isInMonth + isMitarbeiterEntry Helper in helpers.js; MeineStd+StundenUebersicht auf TZ-safe String-Compare umgestellt; KostenView DRY; +14 vitest-Szenarien
- 2026-04-19 · 3b-05 · 4667735 · KalView TZ-Bug: konsistenter String-Vergleich auf t.datum.slice(0,10) an 3 Stellen (tm, dayTermine, hat)
- 2026-04-19 · 3b-04 · 1bfb099 · 5 reduce-Sums null-safe (RegView fahrtzeit NaN-Fix + KostenView betrag/kosten defensive)
- 2026-04-19 · 3b-03 · 840b672 · bStd Mitternachts-Übergang gefixt (Nachtschicht 22:00→02:00 jetzt korrekt 4.0h statt 0.0h); +8 vitest-Szenarien
- 2026-04-19 · 3b-02 · 1d74ca7 · 6 number-inputs gehärtet (min=0, inputMode, Guard) in SteView/RegView/MitForm/BstForm/KostenView
- 2026-04-19 · 3b-01 · 54d530f · DokView deaktiviert: prompt-basierter Fake-Upload entfernt + In-Entwicklung-Banner; bestehende Einträge read-only
- 2026-04-19 · 3a-07 · 10c4534 · check_pin_exists gehärtet (Option D: REVOKE anon, GRANT authenticated, SET search_path = public, extensions); Migration in Prod, Smoke-Test ok
- 2026-04-19 · 3a-06 · 214a08d · Whitelist (status, fortschritt) für baustellen.updateField; Defense-in-depth gegen Typos/Misuse
- 2026-04-19 · 3a-05 · 7d4a4dc · users.update filtert undefined-Felder; leeres Payload ist No-op
- 2026-04-19 · 3a-04 · 30dffbc · iOS-Style ConfirmModal-Komponente + Logout-Bestätigung in ProfilView + Error-Toast bei signOut-Fail
- 2026-04-19 · 3a-03 · 21bb52b · updateUser statt signOut+signIn für Credential-Changes in completeOnboarding + reAuthWithPin
- 2026-04-19 · 3a-02 · 23497ae · Fail-fast Guard für fehlende Supabase Env-Vars (+ .env.example, vitest-Coverage)
- 2026-04-19 · 3a-01 · d1ce650 · Math.random durch crypto.getRandomValues für PIN-Generierung ersetzt (+ vitest-Coverage)

---

*Ende des Masterplans. Claude Code aktualisiert diese Datei nach jedem erfolgreich abgeschlossenen Task.*
