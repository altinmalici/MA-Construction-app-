# Code Audit Report — MA Construction App
*Erstellt: 2026-04-18 von Claude Code (Opus 4.7) mit Superpowers · Read-only Analyse*

## Executive Summary

Die Codebase ist nach 3 Phasen Refactoring strukturell solide: Supabase-Auth+RLS sauber implementiert, App.jsx zerlegt, neue UI-Komponenten (TimePicker) testbar. Trotzdem zeigt der Audit **~70 priorisierte Findings**, die sich auf drei Themen ballen: **(1) Defensive Daten-Hygiene fehlt** (negative Werte, NaN, ungültige Datumsbereiche, kein Loading-State → Doppel-Klick erzeugt Duplikate, Logout/Löschen ohne Confirm), **(2) PWA-Versprechen ist nicht eingelöst** (kein Manifest, kein Service Worker, viewport blockiert Zoom, Theme-Color falsch, Bundle 530 KB ungesplittet), und **(3) Photos+Junctions sind tickende DB-Bomben** (Base64 in TEXT[] ohne Limits, Junction-Updates nicht atomar).

**Gesamt-Findings: 70** (Critical: 13, High: 28, Medium: 29).

DokView ("Dokumente") ist faktisch nicht funktional — User glaubt Dateien sind gespeichert, in der DB liegt nur ein Name. Zweite Sofort-Sache: `Math.random()` für Onboarding-PINs in `helpers.js` — krypto-schwach.

---

## Top 10 Most Impactful Findings

1. **DokView ist Fake-Feature** — User legen Dokumente an, nichts wird hochgeladen. → BUGS #1
2. **PWA-Manifest fehlt komplett** — `index.html` hat kein Manifest, kein Service Worker, keine apple-touch-icons. App ist nicht installierbar. → ARCHITEKTUR #1
3. **viewport `user-scalable=no`** — Verhindert Pinch-Zoom, WCAG-Verstoß. → UX #1
4. **Math.random für PIN-Generierung** — Onboarding-PINs sind vorhersehbar. → SECURITY #1
5. **Negative Zahlen erlaubt überall** — Pause, Fahrtzeit, Stundensatz, Betrag akzeptieren `-5`, kein `min` / `inputMode`. → BUGS #2
6. **Save-Buttons ohne Loading-State app-weit** — Doppel-Tap erzeugt Duplikate (BstForm, SteView, MngView, BtbView, KalView, MitForm, KostenView, SubView). → BUGS #3
7. **Photos als Base64 ohne Limits** — Eine Mängel-Row mit 20 Fotos sprengt Postgres TOAST. → ARCHITEKTUR #2 / PERFORMANCE #2
8. **Logout ohne Confirm + ohne Error-Handling** — `signOut`-Fehler verschluckt; User glaubt abgemeldet zu sein. → BUGS #5
9. **bStd berechnet Mitternachts-Übergang falsch** — Nachtschicht 22:00→02:00 = 0 Stunden. Falsche Lohnabrechnung. → BUGS #6
10. **Junction-Updates nicht atomar** — `syncJunctions` löscht erst, insertet dann ohne Rollback; Baustelle ohne Mitarbeiter wenn Insert kippt. → ARCHITEKTUR #3

---

## BUGS

### CRITICAL — DokView ist nicht funktional
- **Datei:** `src/components/screens/DokView.jsx:11-26`
- **Problem:** "Dokument hinzufügen" nutzt `prompt()` für den Namen, schreibt nur `{ name, groesse: "–" }` in die DB. Es wird KEINE Datei hochgeladen oder gespeichert.
- **Impact:** User glaubt Dokumente seien archiviert, beim Öffnen ist da nichts. Stiller Datenverlust auf Geschäftsebene.
- **Empfehlung:** Entweder Supabase Storage anbinden + echte Upload-UX, oder Modul ausblenden bis fertig.
- **Aufwand:** groß

### CRITICAL — Number-Inputs erlauben negative Werte und falsche Tastatur
- **Datei:** `SteView.jsx:540-568`, `RegView.jsx:471-475`, `MitForm.jsx:278-285`, `KostenView.jsx:645-652`
- **Problem:** `<input type="number">` ohne `min="0"`, ohne `inputMode="numeric|decimal"`. Pause, Fahrtzeit, Stundensatz, Betrag akzeptieren `-30`.
- **Impact:** Negative Pause bläht die Arbeitszeit auf, negative Beträge verfälschen Kostenübersicht. Auf iOS wird Buchstaben-Tastatur statt Ziffernblock gezeigt.
- **Empfehlung:** `min="0" inputMode="numeric"` (oder `decimal` für Beträge) + `Math.max(0, n)` beim Setzen.
- **Aufwand:** klein

### CRITICAL — Save-Handler ohne Loading-State (App-weit, ~8 Screens)
- **Datei:** `BstForm.jsx:38-72`, `SteView.jsx:66-119`, `MngView.jsx`, `BtbView.jsx`, `KalView.jsx`, `MitForm.jsx`, `KostenView.jsx`, `SubView.jsx`
- **Problem:** Save-Buttons werden während des Mutation-Promises NICHT disabled, kein Spinner. Doppel-Tap auf Mobile ist üblich.
- **Impact:** Bei langsamer Verbindung (Baustelle, schwaches LTE) entstehen Duplikate.
- **Empfehlung:** Zentrales Pattern (`useSaving`-Hook) oder pro Screen `[saving, setSaving]` + `disabled={saving}`.
- **Aufwand:** mittel (einmal Hook bauen, dann 8x integrieren)

### CRITICAL — Fortschritts-Slider in BstDet ohne Debounce
- **Datei:** `BstDet.jsx:128-148`
- **Problem:** `<input type="range">` feuert pro Bewegung einen `update`-Call ans Backend. Optimistic State fehlt → Slider hüpft sichtbar zurück.
- **Impact:** Backend-Flood (10-20 Calls pro Drag), spürbares UI-Lag, Race-Conditions.
- **Empfehlung:** Lokaler Optimistic-State + Debounce 300-500 ms vor `actions.baustellen.updateField`.
- **Aufwand:** klein

### CRITICAL — Logout ohne Confirm und ohne Error-Anzeige
- **Datei:** `ProfilView.jsx:400-407`
- **Problem:** Klick auf Logout ruft `signOut()` ohne Bestätigung. `try/catch` fängt Errors aber zeigt sie nicht an.
- **Impact:** Versehentlicher Tap loggt aus → ungespeicherte Eingaben weg. Bei Netz-Fehler glaubt User abgemeldet zu sein, ist aber noch eingeloggt (Session inkonsistent).
- **Empfehlung:** Custom Confirm-Modal "Wirklich abmelden?" + Error-Toast bei Fehler.
- **Aufwand:** klein

### HIGH — bStd: Mitternachts-Übergang nicht behandelt
- **Datei:** `src/utils/helpers.js:2-8`
- **Problem:** Wenn Beginn=22:00, Ende=02:00, ist `eMin - bMin` negativ → return "0.0".
- **Impact:** Nachtschicht wird mit 0 Stunden gespeichert. Mitarbeiter wird nicht bezahlt für die Nacht.
- **Empfehlung:** Wenn `eMin < bMin`, 24h × 60 addieren. Klein.
- **Aufwand:** klein

### HIGH — RegView: NaN bei Altdaten ohne fahrtzeit
- **Datei:** `RegView.jsx:48`
- **Problem:** `gf = te.reduce((s, e) => s + e.fahrtzeit, 0)` ohne Null-Check. Alte Einträge ohne `fahrtzeit` → NaN.
- **Impact:** "Fahrtzeit gesamt: NaN Min" im PDF und Vorschau.
- **Empfehlung:** `s + (e.fahrtzeit || 0)`.
- **Aufwand:** klein

### HIGH — KalView: Datums-Vergleich mit TZ-Bug
- **Datei:** `KalView.jsx:171-172, 36`
- **Problem:** Datum-String (`${jr}-${mm}-${tg}`) wird textuell mit `t.datum` verglichen, aber `new Date(t.datum)` (Z.36) interpretiert UTC. Mitternachts-/TZ-Grenze führt zu falschem Monat.
- **Impact:** Termine springen um Mitternacht in Nachbarmonate, Punkt-Markierung im Kalender fehlt am eigentlichen Tag.
- **Empfehlung:** Konsistent String-Vergleich (`t.datum.slice(0,10)`), nie `new Date()` für reine Datums-Strings.
- **Aufwand:** klein

### HIGH — MeineStd: Eigene Stunden teilweise nicht sichtbar
- **Datei:** `MeineStd.jsx:31, 36-43, 60`
- **Problem:** Filter prüft nur `e.mitarbeiterId === cu.id`, ignoriert `personTyp`-Field. Inkonsistent mit `StundenUebersicht` und `KostenView`.
- **Impact:** Chef-eigene Stunden via "ich"-Option oder PersonTyp `sub`/`sonstige` werden nicht gezählt → User sieht weniger als er eingetragen hat.
- **Empfehlung:** Gleichen Filter (`!e.personTyp || e.personTyp === "mitarbeiter"`) überall verwenden, in einen Helper extrahieren.
- **Aufwand:** klein

### HIGH — RegView: Inline-Edits werden NICHT in DB gespeichert
- **Datei:** `RegView.jsx:13, 28-32, 113-115`
- **Problem:** Korrekturen an Beginn/Ende/Pause via `edits`-State landen im PDF, aber `actions.stundeneintraege.update` wird nirgends gerufen. Beim nächsten Öffnen sind Korrekturen weg.
- **Impact:** User korrigiert Zeiten für den Bericht und glaubt sie seien gespeichert. SteView zeigt weiter alte Werte → Lohnabrechnung falsch.
- **Empfehlung:** Entweder explizit „Edits nur für Bericht" labeln, oder beim Drucken die geänderten Einträge per `update` persistieren.
- **Aufwand:** mittel

### HIGH — KostenView CSV-Export ignoriert Filter
- **Datei:** `KostenView.jsx:95-147`
- **Problem:** Export iteriert `data.baustellen` statt `bsList` (gefiltert). User mit aktivem Filter "abgerechnet" sieht ALLES im Export.
- **Impact:** Export passt nicht zur Bildschirmansicht — irreführend für die Buchhaltung.
- **Empfehlung:** `bsList` benutzen; numerische Spalten als `.toFixed(2)`.
- **Aufwand:** klein

### HIGH — BstForm Datenverlust bei Back-Tap
- **Datei:** `BstForm.jsx:11-32`
- **Problem:** Kein Dirty-Check vor Navigation. Versehentlich Zurück-Tap verwirft Eingaben kommentarlos.
- **Impact:** Bei längerem Formular (Baustelle anlegen mit 12 Feldern) sehr ärgerlich.
- **Empfehlung:** `isDirty`-State + Confirm-Modal "Änderungen verwerfen?".
- **Aufwand:** klein

### HIGH — `users.update` schreibt undefined als NULL ins DB
- **Datei:** `src/lib/api/users.js:47-64`
- **Problem:** Partial-Updates wie `update(id, { pin: 'xyz' })` setzen `name: undefined, stundensatz: undefined` ins Update-Objekt → Supabase schreibt NULL.
- **Impact:** PIN-Update kann Namen löschen.
- **Empfehlung:** Felder nur ins Update-Objekt aufnehmen, wenn definiert.
- **Aufwand:** klein

### HIGH — `benachrichtigungen.removeAll` löscht global
- **Datei:** `src/lib/api/benachrichtigungen.js:50`
- **Problem:** Kein User-Filter. Funktion heißt `removeAll`, hat aber unter Mitarbeiter-RLS andere Semantik als unter Chef-RLS.
- **Impact:** Wenn Mitarbeiter Schreibrechte hätte, würde es Notifications anderer User wegputzen. Aktuell durch RLS abgefangen — aber defense-in-depth fehlt.
- **Empfehlung:** Filter explizit per `eq("user_id", currentUserId)` oder Chef-only.
- **Aufwand:** klein

### HIGH — SigPad: Canvas wird bei Resize/Rotation nicht skaliert
- **Datei:** `src/components/ui/SigPad.jsx:9-24`
- **Problem:** `useEffect([])` setzt Canvas-Größe nur beim Mount. Rotation oder Tastatur-Aufpoppen verzerrt das Bildverhältnis.
- **Impact:** Unterschriften werden nach Rotation verzerrt; geladene Signatur erscheint verzogen.
- **Empfehlung:** `ResizeObserver` + `devicePixelRatio` statt Faktor 2.
- **Aufwand:** mittel

### HIGH — supabase.js wirft nicht bei fehlenden Env-Vars
- **Datei:** `src/lib/supabase.js:6-10`
- **Problem:** Nur `console.error`, dann `createClient(undefined, undefined)`.
- **Impact:** App startet mit kaputtem Client; spätere Fehler sind kryptisch.
- **Empfehlung:** `throw new Error(...)` bei fehlenden Vars — fail fast.
- **Aufwand:** klein

### MEDIUM — Sammel-Findings (1-Zeilen)
- `KalView.jsx:55-67`: `saveTermin` ohne `selDay`-Null-Check → DB-Insert mit `null` schlägt kryptisch fehl.
- `MitForm.jsx:22-29`: useEffect regeneriert Username bei jeder Namen-Änderung → manuelle Korrekturen springen zurück.
- `KostenView.jsx`: Beträge mit deutschem Komma werden auf Ganzzahl geclippt — `inputMode="decimal"` + Komma→Punkt-Replace fehlt.
- `kalender.js:27-47` / `bautagebuch.js:31-56`: Junction-Insert-Errors verschluckt → Eintrag ohne Anwesende möglich.
- `MitView.jsx:46-55` / `SubView.jsx:33-42`: User-Delete prüft keine Abhängigkeiten (Stunden, Mängel-Zuständigkeit). Soft-Delete via `is_active=false` wäre safer.
- `KalView.jsx:42-48` / `MngView.jsx:23`: Datums-Validation gegen heute fehlt; Frist in der Vergangenheit erlaubt.

---

## SECURITY

### CRITICAL — Math.random für PIN-Generation
- **Datei:** `src/utils/helpers.js:82`
- **Problem:** `genPin()` nutzt `Math.random()` — krypto-schwach. Bei nur 9000 möglichen PINs ist Brute-Force ohnehin trivial, aber Math.random macht es noch leichter.
- **Impact:** Onboarding-PINs sind erratbar; Angreifer mit Wissen über Browser-Seed kann PIN reproduzieren.
- **Empfehlung:** `crypto.getRandomValues(new Uint32Array(1))[0] % 9000 + 1000`.
- **Aufwand:** klein

### CRITICAL — auth: signOut + signIn nicht atomar
- **Datei:** `src/lib/api/auth.js:95-101 (completeOnboarding)`, `141-145 (reAuthWithPin)`
- **Problem:** Erst `signOut()`, dann `signInWithPassword()`. Bricht der zweite Call ab (Netz-Drop), ist User komplett ausgeloggt mit angeblich neuem PIN, der "nicht funktioniert".
- **Impact:** User kann sich nach PIN-Wechsel nicht mehr einloggen — Datenverlust auf User-Ebene.
- **Empfehlung:** `supabase.auth.updateUser({ password: newPin })` nutzen — Session bleibt erhalten.
- **Aufwand:** klein

### HIGH — `check_pin_exists` ist offen aufrufbar
- **Datei:** `src/lib/api/users.js:74-81`
- **Problem:** RPC erlaubt PIN-Aufzählung von außen (per anon Key) ohne Rate-Limit.
- **Impact:** Angreifer kann ermitteln, welche der 9000 PINs vergeben sind.
- **Empfehlung:** Nur als Chef aufrufbar machen oder serverseitig auf Unique-Constraint setzen.
- **Aufwand:** mittel

### HIGH — Globaler PIN-Lookup in `auth.login` (Legacy-Pfad)
- **Datei:** `src/lib/api/auth.js:6-39`
- **Problem:** `lookup_user_by_pin` matcht gegen alle User. Bei nur 10 Usern und 4-stelligem PIN ist Kollisionsrisiko ~0.1% — geringer aber existent. Phase 3 hat `loginAsUser` eingeführt; `login` bleibt als Fallback.
- **Impact:** PIN von User A loggt unter User B ein, wenn beide identisch.
- **Empfehlung:** `login()` deprecaten, in API-Layer entfernen sobald keiner mehr aufruft (Login.jsx Fallback prüfen).
- **Aufwand:** klein

### HIGH — `baustellen.updateField` akzeptiert beliebige Spalten
- **Datei:** `src/lib/api/baustellen.js:97-100`
- **Problem:** `update({ [field]: value })` lässt `id`, `created_at`, `details` etc. überschreiben.
- **Impact:** Defense-in-depth-Loch. RLS schützt Zeilen, nicht Spalten.
- **Empfehlung:** Whitelist erlaubter Felder (`status`, `fortschritt`, `enddatum`).
- **Aufwand:** klein

### MEDIUM — Onboarding-PIN als Klartext im DB
- **Datei:** `supabase/schema.sql:21-22`
- **Problem:** `onboarding_pin TEXT` ist nicht gehasht (anders als `pin_hash`).
- **Impact:** DB-Leak oder Service-Key-Exposure → alle aktiven Onboarding-PINs lesbar. Begrenzt durch Expiry.
- **Empfehlung:** `crypt()` analog zu `pin_hash`.
- **Aufwand:** mittel

### MEDIUM — `escHtml` ist HTML-Body-only
- **Datei:** `src/utils/helpers.js:30-38`
- **Problem:** Reicht für PDF-Body-Text, nicht für HTML-Attribute oder JS-Kontext.
- **Empfehlung:** Dokumentieren als "nur für Body-Text". Nicht in Attribute interpolieren.

---

## UX

### CRITICAL — viewport blockiert Pinch-Zoom
- **Datei:** `index.html:5`
- **Problem:** `maximum-scale=1.0, user-scalable=no` verhindert Zoom.
- **Impact:** WCAG 2.1 Verstoß (1.4.4 Resize Text). Sehbehinderte Mitarbeiter können nicht zoomen. BFSG ab Juni 2025 macht das rechtlich relevant.
- **Empfehlung:** Beide Direktiven entfernen. iOS-Zoom-Bug bei Inputs ist bereits durch `font-size: max(1rem, 16px)` in `index.css` abgedeckt.
- **Aufwand:** klein

### CRITICAL — Löschen ohne Kontext / ohne Folgenwarnung
- **Datei:** `BstDet.jsx:23` (Baustelle), `DokView.jsx` (Dokument), mehrere Screens (`MitView`, `SubView`, `KalView`, `BtbView`, `MngView`)
- **Problem:** `confirm("Löschen?")` ohne Namen / ohne Hinweis auf abhängige Daten.
- **Impact:** Chef löscht falsche Baustelle inkl. Stundeneinträge, Mängel, Tagebuch — irreversibel.
- **Empfehlung:** Custom iOS-Confirm-Modal mit Namen + Anzahl abhängiger Records ("Baustelle 'X' inkl. 47 Stunden, 3 Mängel löschen?").
- **Aufwand:** mittel

### HIGH — Touch-Targets unter 44px (CLAUDE.md-Regel)
- **Datei:** `Dash.jsx:168-225` (Bell, Avatar 40×40), `BstList.jsx:33-52` (Plus 36×36), `BstDet.jsx:60-93` (Edit/Delete 34×34), `NotifView.jsx:119-130` (X ~32×32)
- **Problem:** Eigene Regel aus CLAUDE.md (min 44px) wird mehrfach unterlaufen.
- **Impact:** Auf Baustelle mit Handschuhen oder nassen Fingern fast nicht treffbar.
- **Empfehlung:** Alle Icon-Buttons auf min 44×44 px (Icon kann visuell kleiner bleiben).
- **Aufwand:** mittel (~6-8 Stellen)

### HIGH — Browser-`confirm()` und `prompt()` durchgängig
- **Datei:** `BtbView`, `SteView`, `MitView`, `NotifView`, `DokView`, `KostenView`, `MngView`, `KalView`, `BstDet`, `SubView` — 10 Stellen
- **Problem:** Native Browser-Dialoge brechen iOS-Look komplett. In PWA-Standalone manchmal hässlich/geblockt.
- **Empfehlung:** Reusable `<ConfirmModal>` / `<PromptModal>` im iOS-Stil.
- **Aufwand:** mittel

### HIGH — Native Date/Range-Inputs brechen iOS-Look
- **Datei:** `BstForm.jsx:271, 289` (`type="date"`), `BstDet.jsx:129` (`type="range"`)
- **Problem:** Native Browser-Picker rendern stark unterschiedlich (iOS / Android / Desktop), Slider sieht aus wie Web-Form.
- **Empfehlung:** Eigener iOS-Style DatePicker analog zum neuen TimePicker; Custom Range-Slider.
- **Aufwand:** groß (lohnt sich, wiederkehrend)

### HIGH — WhatsApp-PIN-Versand ohne Fallback
- **Datei:** `MitView.jsx:56-58`, `MitForm.jsx:76-78`
- **Problem:** WhatsApp-Link öffnet sich evtl. nicht (Pop-up-Blocker, kein WhatsApp installiert). Kein Clipboard-Fallback. PIN bleibt für User unzugänglich.
- **Impact:** Onboarding-PIN landet nirgends; Chef muss neu generieren.
- **Empfehlung:** `navigator.clipboard.writeText(pin)` + Toast "PIN kopiert" als Fallback.
- **Aufwand:** klein

### HIGH — PhotoGrid: `<img>` ohne `alt`, ohne `loading="lazy"`
- **Datei:** `src/components/ui/PhotoGrid.jsx:18-21`
- **Problem:** Screenreader liest nichts; React 19 wirft Warning. Bei 20+ Fotos lädt der Browser alle gleichzeitig.
- **Empfehlung:** `alt="Foto N"` oder `alt=""` + `loading="lazy"` + Klick öffnet Lightbox.
- **Aufwand:** klein (alt+lazy) bzw. mittel (Lightbox)

### HIGH — ScreenLayout: kein safe-area-bottom
- **Datei:** `src/components/ui/ScreenLayout.jsx:13-19`
- **Problem:** Padding-bottom statisch `32px`, ignoriert `env(safe-area-inset-bottom)`. iPhone Home-Indicator verdeckt letzte Items.
- **Empfehlung:** `padding-bottom: calc(32px + env(safe-area-inset-bottom))`.
- **Aufwand:** klein

### HIGH — Toast: kein Stacking, kurze Dauer für Errors
- **Datei:** `src/components/ui/Toast.jsx:5-37`
- **Problem:** Nur eine Instanz; mehrere parallele Aktionen überschreiben sich. Errors verschwinden nach 1.8s. Kein manuelles Schließen.
- **Empfehlung:** Toast-Queue im Context, gestapelt rendern. Errors 4-5s + X-Button.
- **Aufwand:** mittel

### HIGH — Theme-Color-Inkonsistenz
- **Datei:** `index.html:8` (#8E3A9E) vs `helpers.js:41` (#7C3AED) vs CLAUDE.md (#8E3A9E → #A04878)
- **Problem:** Drei verschiedene Lila-Töne im Projekt.
- **Impact:** Adressleiste/Statusbar passt nicht zum App-Look; CLAUDE.md desynchronisiert.
- **Empfehlung:** Auf einen Wert (z.B. #6D28D9 = `PD`) konsolidieren in HTML, helpers.js, CLAUDE.md.
- **Aufwand:** klein

### MEDIUM — Sammel-Findings (1-Zeilen)
- Empty-State-Inkonsistenz: manche Screens nutzen `<Empty>`, andere bloßes "Keine"-Text. `<Empty>` hat keinen CTA-Slot.
- **Naturstein-Pflichtfelder** (CLAUDE.md-Regel) werden nirgends erzwungen — keine "Steinart"/"Oberfläche"-Felder in SteView/RegView/MngView/BtbView/KostenView.
- `BtbView.jsx:143-163`: Chef kann sich nicht als anwesend markieren (nur `role === "mitarbeiter"` gelistet).
- `index.css:14, 33-34`: `html/body { overflow:hidden }` + `overscroll-behavior:none` blockt Pull-to-Refresh in PWA-Standalone.
- `BstForm.jsx:419-435`: Empty-State im Team-Selector verlinkt zu MitForm und verwirft das aktuelle Form unsichtbar.

---

## PERFORMANCE

### HIGH — Eager-loaded Routing, Bundle 530 KB
- **Datei:** `src/App.jsx:2-24`, Build zeigt 530 KB / 142 KB gzip
- **Problem:** Alle 22 Screens via Static-Imports. Mitarbeiter, der nur 3 Views nutzt, lädt alles.
- **Impact:** Lange First-Load auf 3G/4G-Baustelle; PWA wirkt schwer.
- **Empfehlung:** `React.lazy()` + `<Suspense>` für alle Screens außer `Login` und `Dash`. Vite splittet automatisch.
- **Aufwand:** mittel

### HIGH — `key={v}` erzwingt Re-Mount aller Screens
- **Datei:** `src/App.jsx:31`
- **Problem:** View-Wechsel mountet komplett neu. Form-States gehen verloren. StrictMode verdoppelt Mount-Kosten in Dev.
- **Impact:** User wechselt aus Formular kurz zur Liste und zurück → alles weg.
- **Empfehlung:** `key` weg, fade-Animation per CSS-Klasse auf inneren Wrapper.
- **Aufwand:** klein

### HIGH — Photos als Base64 in TEXT[] ohne Compression/Limits
- **Datei:** `stundeneintraege.js`, `maengel.js`, `PhotoGrid.jsx`, useAppData
- **Problem:** Fotos werden ungekürzt als Base64 in DB-Spalten gespeichert. Eine Mängel-Row mit 10 Fotos kann mehrere MB groß werden → sprengt Postgres TOAST und Supabase Row-Limits, blockiert `getAll`.
- **Impact:** Bei wachsender DB explodiert Storage und Mobile-Datenvolumen pro Sync.
- **Empfehlung:** Client-seitige Compression (Canvas: max 1280px, JPEG q=0.7) + max 5 Fotos pro Eintrag. Mittelfristig auf Supabase Storage migrieren.
- **Aufwand:** mittel (Compression sofort), groß (Storage-Migration)

### HIGH — `useAppData.reload()` lädt 11 Tabellen pro Mutation
- **Datei:** `src/lib/useAppData.js`
- **Problem:** Jede Mutation triggert Promise.all über alle Loader (laut Code: einzelne `reload(...entities)` nutzbar, aber an einigen Stellen wird zu breit nachgeladen). Bei wachsendem Datenvolumen wird das langsam.
- **Empfehlung:** `reload(domain)` statt globalem reload überall sicherstellen. Pagination + Filter (z.B. letzte 90 Tage Stundeneinträge).
- **Aufwand:** mittel

### HIGH — KostenView: O(n) Aggregationen pro Render
- **Datei:** `KostenView.jsx:65-66, 779-805`
- **Problem:** `calcTotal`/`calcLohn`/`calcKat` werden je Baustelle 4× gerechnet, jedes Mal über `data.stundeneintraege` iterierend. Kein `useMemo`.
- **Impact:** Scroll-Lag auf altem Handy bei 20+ Baustellen × 100+ Stunden.
- **Empfehlung:** Ein Pass über `stundeneintraege` gruppiert nach `baustelleId`, Ergebnis in `useMemo`.
- **Aufwand:** mittel

### MEDIUM — Sammel-Findings (1-Zeilen)
- `AppContext.jsx:47-50`: `clockTime` re-rendert die ganze App alle 30s. Sollte lokal in `TabBar`/`<Clock>` leben.
- `vite.config.js`: Kein `manualChunks` für Vendor-Splitting (React, Supabase, Lucide). Cache-Invalidierung lädt alles bei jedem App-Update.
- `Dash.jsx:439-500`: Widget-Counts ohne `useMemo` — bei jedem Render O(n) `filter` pro Modul.

---

## ARCHITEKTUR

### CRITICAL — PWA-Manifest, Service Worker, Touch-Icons fehlen
- **Datei:** `index.html`, `public/`
- **Problem:** Keine `manifest.json`, kein `<link rel="manifest">`, keine `apple-touch-icon`-Links — nur `vite.svg` im public-Ordner.
- **Impact:** App ist trotz PWA-Anspruch (CLAUDE.md) NICHT installierbar; kein Add-to-Homescreen mit App-Icon, kein Offline-Modus.
- **Empfehlung:** `vite-plugin-pwa` mit Workbox; `manifest.json` mit Icons (192/512); `apple-touch-icon` (180×180).
- **Aufwand:** mittel

### CRITICAL — Photo-Storage als Base64-TEXT[] (siehe Performance)
- Genannt unter Performance, aber strukturell ist es eine Architektur-Entscheidung mit Wachstumsproblem.

### CRITICAL — Junction-Sync ist nicht atomar
- **Datei:** `src/lib/api/baustellen.js:107-117`
- **Problem:** `syncJunctions` macht erst 2× DELETE, dann 2× INSERT. Errors werden komplett verschluckt (`Promise.all` ohne Check). Bricht Insert ab → Baustelle ohne Mitarbeiter.
- **Empfehlung:** RPC mit Transaction, oder Diff-basiertes Update mit Error-Check pro Step.
- **Aufwand:** mittel

### HIGH — Inline-Style-Duplikation app-weit
- **Datei:** Praktisch alle Screens (Dash, BstList, BstDet, BstForm, ProfilView, KostenView, …)
- **Problem:** Card-Style (`background:white, borderRadius:12, padding, boxShadow:CS`), Section-Header (uppercase, 13px, #8e8e93), Icon-Button-Style werden 50+ mal kopiert. Bei jedem Render entsteht ein neues Style-Objekt → Memo-Brüche.
- **Impact:** Wartung teuer, Designänderungen müssen vielfach gemacht werden, leichte Inkonsistenzen schleichen ein.
- **Empfehlung:** Komponenten extrahieren: `<Card>`, `<SectionHeader>`, `<IconButton>`, `<ListRow>`. Tailwind-Klassen oder CSS-Components.
- **Aufwand:** groß (lohnt langfristig)

### HIGH — Inkonsistente API-Returns
- **Datei:** alle `src/lib/api/*.js`
- **Problem:** `subunternehmer.create` returnt Objekt, `baustellen.create` nur ID, `kosten.create` rohes data, `bautagebuch.create` ID. Aufrufer parsen pro Modul anders.
- **Empfehlung:** Konvention festlegen — überall mapped Object oder überall ID.
- **Aufwand:** klein

### HIGH — Auth: 5 Login-Funktionen mit überlappender Logik
- **Datei:** `auth.js` — `login`, `loginAsUser`, `loginWithUsername`, `completeOnboarding`, `reAuthWithPin`
- **Problem:** Alle machen `signIn → getProfile`. Drift-Risiko.
- **Empfehlung:** `_signInAndLoadProfile(email, pwd)` Helper extrahieren.
- **Aufwand:** klein

### HIGH — Kein API-Wrapper mit AbortController / Retry
- **Datei:** alle API-Module
- **Problem:** PWA auf schwachem Netz. Kein Timeout, kein Abort bei View-Wechsel → Memory-Leaks und stale Updates.
- **Empfehlung:** Wrapper mit AbortController + Retry für GETs.
- **Aufwand:** mittel

### HIGH — `bautagebuch` und `kalender` haben kein `update()`
- **Datei:** `bautagebuch.js`, `kalender.js`
- **Problem:** Edit erfordert delete+create, was Junction-Foreign-Keys zerreißt.
- **Empfehlung:** `update()` mit Junction-Sync ergänzen.
- **Aufwand:** mittel

### MEDIUM — Sammel-Findings (1-Zeilen)
- **Große Dateien:** KostenView (949), SteView (728), BstForm (665), Login (588), RegView (586), Dash (505), KalView (494), BstDet (479), ProfilView (433), AppContext (417). Empfehlung: KostenView in List/Detail/Form zerlegen, SteView in Form/List, BstForm braucht ein `<Section>`-Pattern.
- `package.json:33`: ungenutztes `pg`-Package in devDependencies (Frontend nutzt nur Supabase-JS).

---

## CODE QUALITY

### MEDIUM — Sammel-Findings
- **Lint-Baseline 50 Errors / 5 Warnings:** Haupt-Kategorien `react-hooks/set-state-in-effect`, `no-unused-vars` (ungenutztes `e` in catch), `no-empty` (leere catch-Blöcke). Eslint-Cleanup-Sprint lohnt.
- `helpers.js bStd`: returnt String, wird 30+× per `parseFloat` geparst — `bStdNum()` Number-Variante extrahieren.
- `Hdr.jsx:5-64`: doppelte Render-Logik für `large` vs compact — gemeinsame Sub-Renders + Style-Map.
- `WI.jsx:5-17`: Wetter-Default ist `<Sun>` — irreführend. Map-Lookup + neutraler Default (`Cloud`).
- `AppContext.jsx:107-138`: Auto-Seed "Testprojekt Muster GmbH" bei leerem `data.baustellen` — auf leere Prod-DB unerwartet. Auf Dev beschränken oder entfernen.

---

## Positive Findings

1. **Supabase Auth + RLS Migration** sauber durchgezogen (Phase 1+2). v2-RPCs konsequent als SECURITY DEFINER. `auth_id` als verbindendes Feld klar dokumentiert.
2. **TimePicker** ist gut gebaut: pure Helpers extrahiert, vitest-Coverage 12 Tests, Mask-Image-Fade, Scroll-Snap, sauberer Initial-Scroll-Guard.
3. **Phase 3 Login-Security-Fixes** (Background-Lock, sessionUser, loginAsUser, Initial-Login-Screen) sind durchgängig gut implementiert.
4. **PDF-Modal** (Phase 3 Prompt 3) hat solides Error-Handling — printingRef-Guard, idempotenter cleanup, ESC + Backdrop close.
5. **iOS-Style** ist visuell überzeugend: Tab-Bar mit `backdrop-filter`, `safe-area-inset-bottom`, Card-Pattern, Lila-Gradient. Desktop-iPhone-Simulation ist nettes Detail.

---

## Vorschlag für neuen Masterplan

Vorschlag in 5 Paketen, sortiert nach Impact / Risiko-Reduktion:

**Paket A: Sofort-Sicherheits-Fixes** (1 Sprint, ~4-6h)
- Math.random → crypto.getRandomValues
- supabase.js fail-fast bei fehlenden Env-Vars
- auth signOut+signIn ersetzen durch updateUser
- check_pin_exists: Chef-only oder Rate-Limit
- baustellen.updateField: Whitelist
- Logout-Confirm-Modal
- users.update: undefined nicht überschreiben

**Paket B: Daten-Hygiene** (1 Sprint, ~6-8h)
- Number-Inputs: min + inputMode überall
- bStd Mitternachts-Übergang
- RegView NaN-Bug + Edits-Persistierung klarstellen
- KalView TZ-Bug
- MeineStd Filter-Konsistenz
- KostenView CSV-Export auf bsList
- Komma als Dezimal akzeptieren

**Paket C: UX-Pflicht** (1-2 Sprints, ~10-15h)
- ConfirmModal + PromptModal (iOS-Style) für alle confirm()/prompt()
- Save-Loading-State + disabled (zentraler Hook, App-weit)
- BstForm Dirty-Check
- Touch-Targets ≥44px überall
- Toast Queue + Errors länger / X-Close
- ScreenLayout safe-area-bottom
- WhatsApp-PIN: Clipboard-Fallback
- BstDet Slider Debounce + Optimistic
- Theme-Color konsolidieren

**Paket D: PWA-Versprechen einlösen** (1 Sprint, ~6-10h)
- vite-plugin-pwa + Manifest + apple-touch-icon
- viewport: user-scalable raus
- Service Worker für Offline-Cache
- React.lazy für alle Screens außer Login/Dash
- vite manualChunks für Vendor-Chunks
- key={v} entfernen
- Bundle-Analyzer einmal laufen lassen

**Paket E: Foto-Architektur** (separates Mini-Projekt, ~8-12h)
- Client-seitige Compression (Canvas resize + JPEG q=0.7)
- Max 5 Fotos pro Eintrag
- PhotoGrid: alt + lazy + Lightbox
- Mittelfristig: Supabase Storage statt Base64

**Paket F: Architektur-Cleanup** (laufend, je nach Dringlichkeit)
- DokView funktional machen ODER ausblenden (kann auch in Paket A als CRITICAL)
- Junction-Sync atomar (RPC)
- Inline-Style → Card/SectionHeader/IconButton-Komponenten
- API-Wrapper mit AbortController + Retry
- bautagebuch/kalender update() ergänzen
- KostenView/SteView aufteilen

---

## Was ich bewusst nicht angefasst habe

- **Supabase-Migrations-SQL-Files** im Detail (RLS-Policies wurden im API-Audit indirekt geprüft, aber kein vollständiger SQL-Review).
- **Photo-Storage-Migration zu Supabase Storage** — genannt als Empfehlung, aber kein Konzept ausgearbeitet.
- **Tatsächliche Browser-Tests** auf realem iPhone (nur Code-Analyse, kein DevTools-Run).
- **i18n** — App ist deutsch-only, das ist absichtlich und im Scope.
- **CI/CD-Setup** (Vercel Auto-Deploy ist da, kein GitHub Actions-Setup geprüft).
- **Schemas der RPC-Funktionen** im Detail (lookup_user_by_pin etc. nur dem Namen nach).
- **Test-Coverage-Erweiterung** über TimePicker hinaus — vitest-Infra ist installiert, aber keine weiteren Tests aktuell.
- **Performance-Profiling** mit echten Daten (10k Stunden, 100 Baustellen).
