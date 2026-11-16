# Autopilot-Lauf 2026-11-16 — Abschlussbericht

## 1. Zusammenfassung

Der Lauf hat alle zehn Pakete bearbeitet; das Ergebnis sind zehn Pull Requests (#2 bis #11), die aufeinander aufbauen. `main` ist unberührt, nichts ist gemerged, und die Produktions-Datenbank wurde weder gelesen noch verändert. Die wichtigsten behobenen Fehler: Der Fortschritts-Regler leerte Baustellen und löschte ihr Team, ein Mitarbeiter konnte sich per API zum Chef machen, offline erfasste Stunden blieben nach einem Neustart hängen, und das Bautagebuch ließ sich in einem bestimmten Fall nicht speichern. Vier SQL-Migrationen warten auf manuelle Ausführung (Abschnitt 3). Alle Branches sind lokal grün (zuletzt 547 Tests, Lint, Build), aber nichts wurde auf einem echten iPhone oder gegen die echte Datenbank getestet.

## 2. Pakete

| Paket | Status | Branch | PR | Migration nötig? |
|---|---|---|---|---|
| 0 – Audit | 🟢 fertig | `autopilot-2026-11-16` | [#2](https://github.com/altinmalici/MA-Construction-app-/pull/2) | nein |
| 1 – Build/Tests/Lint | 🟢 fertig | `…-p1-stabil` | [#3](https://github.com/altinmalici/MA-Construction-app-/pull/3) | nein |
| 2 – Kritische Bugs & Sicherheit | 🟢 fertig | `…-p2-kritisch` | [#4](https://github.com/altinmalici/MA-Construction-app-/pull/4) | ja, Migration 1 |
| 3 – Bautagebuch speichern | 🟢 fertig | `…-p3-bautagebuch` | [#5](https://github.com/altinmalici/MA-Construction-app-/pull/5) | ja, Migration 2 (nach dem Merge) |
| 4 – PIN / Willkommen zurück / Auto-Lock | 🟢 fertig | `…-p4-pin-lock` | [#6](https://github.com/altinmalici/MA-Construction-app-/pull/6) | ja, Migration 3 (erst nach dem Deploy) |
| 5 – Onboarding + Einladungs-Link | 🟢 fertig | `…-p5-onboarding` | [#7](https://github.com/altinmalici/MA-Construction-app-/pull/7) | ja, Migration 4 |
| 6 – Mängel-Branch | 🟢 nichts zu tun | — | — | nein |
| 7 – Hohe/mittlere Audit-Punkte | 🟢 fertig (Teilmenge, siehe 5) | `…-p7-audit` | [#8](https://github.com/altinmalici/MA-Construction-app-/pull/8) | nein |
| 8 – Performance & iPhone-UX | 🟢 fertig, **ohne Review** | `…-p8-perf-ux` | [#9](https://github.com/altinmalici/MA-Construction-app-/pull/9) | nein |
| 9 – Testabdeckung | 🟢 fertig (Teilmenge, siehe 5), ohne Review | `…-p9-tests` | [#10](https://github.com/altinmalici/MA-Construction-app-/pull/10) | nein |
| 10 – Doku & Abschluss | 🟢 fertig | `…-p10-doku` | #11 | nein |

Paket 6: `feat/ux-maengel-architektur` steckt bereits vollständig in `main` (alle 6 Commits patch-gleich). Kein Rebase, kein PR.

Reviews: Die Pakete 2, 3, 4, 5 und 7 hatten je einen unabhängigen Review-Lauf, Paket 1 einen gemeinsamen mit 2 und 3; die Funde sind eingearbeitet. Die Pakete 8 und 9 hatten auf Altins Wunsch (Token sparen) keinen Review.

## 3. MANUELL AUSFÜHREN (STOP-Punkte für Altin)

Im Supabase SQL-Editor (Projekt `roeqphnopokfdktvvbpp`). Keine der Dateien wurde vom Autopiloten ausgeführt. Jede Datei enthält am Anfang Hinweise und am Ende Prüf-Abfragen und Rollback.

**Reihenfolge und Zeitpunkt:**

| Nr | Datei | Wann | Ändert Daten? |
|---|---|---|---|
| 1 | `supabase/migration_2026_11_16_01_security_hardening.sql` | sofort möglich, unabhängig vom Frontend | nein |
| 2 | `supabase/migration_2026_11_16_04_onboarding.sql` | nach Migration 1; vor oder nach dem Merge von #7 | nein |
| 3 | `supabase/migration_2026_11_16_02_bautagebuch_wetter.sql` | direkt nachdem #5 live ist | ja |
| 4 | `supabase/migration_2026_11_16_03_pin_lookup_sperren.sql` | erst wenn #6 live ist UND alle Geräte die neue Version geladen haben | nein |

Die Nummern in den Dateinamen sind die Reihenfolge, in der sie entstanden sind; die Tabelle zeigt die Reihenfolge, in der sie ausgeführt werden sollten.

### Migration 1: `…_01_security_hardening.sql`

- **Was:** Schließt die Rechte-Lücken S-01 bis S-08 aus dem Audit: Selbst-Beförderung zum Chef, offene Drossel-Tabelle, fremde und freigegebene Stunden änderbar, PIN-Regeln nur im Client, fehlender `search_path`.
- **Vorher prüfen (nur lesen):**
  - `SELECT oid::regprocedure, proowner::regrole, prokind FROM pg_proc WHERE pronamespace = 'public'::regnamespace AND prosecdef;` — alle Funktionen müssen `postgres` gehören, sonst bricht die Migration mit "must be owner" ab (dann wird nichts geändert).
  - `SELECT name, username, role FROM users WHERE role = 'chef';` — stehen dort nur bekannte Chefs?
  - `SELECT relname, relrowsecurity FROM pg_class WHERE relname = 'pin_lookup_throttle';` — bei `false` war die Drossel-Tabelle tatsächlich von außen schreibbar.
  - `SELECT kunde, adresse, status FROM baustellen b WHERE NOT EXISTS (SELECT 1 FROM baustellen_mitarbeiter m WHERE m.baustelle_id = b.id);` — Baustellen ohne Team; mögliche Opfer des Regler-Fehlers (leere Adresse, Status "geplant").
- **Danach sofort testen:** Chef-Login, Mitarbeiter-Login, Mitarbeiter bearbeiten (Name/Stundensatz), als Mitarbeiter eine Stunde erfassen, PIN im Profil ändern, "Neuer Einladungs-PIN" und Erster Zugang auf einem zweiten Gerät.
- **Verhaltensänderung:**
  - Mitarbeiter können per API nur noch eigene, nicht freigegebene Stunden anlegen, ändern und löschen und den eigenen Stundensatz nicht mehr ändern.
  - PIN prüfen/setzen: pro Mitarbeiter 6 Versuche pro Stunde.
  - Einladungs-Login: 5 Fehlversuche pro 15 Minuten je Benutzername; danach wird auch der richtige PIN 15 Minuten abgelehnt (der Hinweis steht im Einladungs-Login).
- **Bekannte Nebenwirkung:** Liegen auf einem geteilten Handy offline erfasste Stunden von Mitarbeiter A und Mitarbeiter B meldet sich an, werden sie erst gesendet, wenn A oder der Chef sich dort anmeldet. Die App zeigt das an.
- **Nicht behoben:** Der Einladungs-Login lässt sich von außen blockieren (60 Aufrufe pro Minute sperren ihn für alle). Der Einladungs-Link aus Migration 4 ist davon nicht betroffen.

### Migration 4 (zweite in der Ausführung): `…_04_onboarding.sql`

- **Was:** Einladungs-Link (Tabelle `onboarding_tokens`, Funktionen zum Erzeugen, Prüfen, Einlösen, Widerrufen), `repair_orphan_user`, `cleanup_orphan_auth_users`; `reset_onboarding_v2` beendet zusätzlich laufende Sitzungen.
- **Voraussetzung:** Migration 1. Fehlt sie, bricht die Datei mit einer klaren Meldung ab.
- **Vorher prüfen (nur lesen):** `SELECT has_table_privilege(current_user, 'auth.sessions', 'DELETE');` muss `true` liefern, sonst scheitern PIN-Reset und Einlösen.
- **Danach sofort testen:** "Neuer Zugang" für einen Test-Mitarbeiter (Link öffnen, PIN setzen, anmelden) und einmal den alten Einladungs-PIN-Weg.
- **Wann:** Egal. Die App erkennt selbst, ob die Funktionen da sind; ohne Migration läuft der Einladungs-PIN weiter, "Zugang reparieren" und "Verwaiste Konten bereinigen" melden dann, dass die Migration fehlt.
- **Risiko, bewusst in Kauf genommen:** Wer den Link hat, kann den PIN dieses Mitarbeiters festlegen (wie ein Passwort-Reset-Link). Abgesichert durch: einmal verwendbar, 48 Stunden gültig bei eingerichteten Mitarbeitern (7 Tage bei neuen), nicht für Chef-Konten, verfällt bei jeder PIN-Änderung oder Deaktivierung, vom Chef widerrufbar, Benachrichtigung beim Einlösen.
- **Bekannte Grenzen:**
  - Bei neu angelegten Mitarbeitern bleibt parallel der 4-stellige Einladungs-PIN 7 Tage gültig (Rückfall-Weg der App).
  - Die Benachrichtigung "… hat über den Einladungs-Link einen PIN festgelegt" können alle angemeldeten Nutzer lesen, nicht nur der Chef.
- **Diagnose vorab (nur lesend):** `docs/sql/onboarding_diagnose.sql` zeigt pro Mitarbeiter, ob Profil und Anmelde-Konto zusammenpassen, und listet verwaiste Konten.

### Migration 2 (dritte in der Ausführung): `…_02_bautagebuch_wetter.sql`

- **Was:** Das Bautagebuch-Formular hatte nie Wetterfelder, die API schrieb trotzdem bei jedem Eintrag "sonnig, 12 °C". Die Datei entfernt diese Standardwerte und leert sie bei den vorhandenen Einträgen.
- **Wann:** Erst wenn #5 live ist (die alte App-Version schreibt die erfundenen Werte weiter), dann zeitnah.
- **Ändert Daten:** `wetter`/`temperatur` aller Einträge mit genau "sonnig"/12 werden geleert, nur beim ersten Ausführen.
- **Ohne die Migration** funktioniert alles; alte Einträge zeigen dann fälschlich "sonnig, 12 °C".

### Migration 3 (letzte in der Ausführung): `…_03_pin_lookup_sperren.sql`

- **Was:** Sperrt die globale PIN-Suche `lookup_user_by_pin` für alle Aufrufer von außen.
- **Wann:** Erst nach Merge und Auslieferung von #6 UND nachdem alle Geräte die neue Version geladen haben. Die alte App-Version braucht die Funktion für den Login auf Geräten ohne gemerkten Nutzer; dort hieße es sonst "Falscher PIN".
- Ändert keine Daten.

## 4. EMPFOHLENE MERGE-REIHENFOLGE

#2 → #3 → #4 → #5 → #6 → #7 → #8 → #9 → #10 → #11

Jeder PR enthält alle vorherigen. Die Reihenfolge ist zwingend; ein späterer PR kann nicht vor einem früheren gemerged werden. Praktischer Ablauf:

1. Migration 1 ausführen und testen.
2. #2 bis #5 mergen, auf dem iPhone prüfen (Checkliste Teil A), dann Migration 2 ausführen.
3. #6 mergen, auf dem iPhone prüfen (Teil B). Wenn alle Geräte die neue Version haben: Migration 3.
4. Migration 4 ausführen, #7 mergen, Einladungs-Link prüfen (Teil C).
5. #8 mergen, prüfen (Teil D).
6. #9 erst nach einem Test auf dem iPhone mergen (Teil E), weil dieses Paket den App-Kern ändert und keinen Review hatte.
7. #10 und #11 (nur Tests und Doku).

Mergen als normaler Merge-Commit, nicht als Squash: Die Branches enthalten Merges untereinander, ein Squash würde in den Folge-PRs Konflikte erzeugen.

## 5. ÜBERSPRUNGEN / NICHT ERLEDIGT

Kein Task wurde nach drei Fehlversuchen verworfen. Bewusst nicht umgesetzt:

**Braucht eine Entscheidung von Altin:**
- **Offline-Entsperren (D-05):** Entschieden: kein Offline-Entsperren. Wer länger als 2 Minuten ohne Empfang im Hintergrund war, kann erst mit Empfang wieder entsperren; die Eingaben bleiben erhalten.
- **Stundensatz, Budget, Rechnungsdaten (S-09, U-13):** Mitarbeiter können diese Werte technisch lesen; versteckt sind sie nur in der Oberfläche. Abhilfe braucht eine Datenbank-Sicht und einen Umbau des Ladens.
- **Benachrichtigungen (S-10):** Alle sehen alle; "gelesen" ist ein gemeinsames Flag für alle Nutzer.
- **Fahrtzeit (D-26):** Wird erfasst, fließt aber in keine Berechnung ein. Wird sie bezahlt?
- **PIN-Länge (S-14):** 4 Stellen bleiben grundsätzlich schwach.
- **Bautagebuch durch Mitarbeiter:** Anlegen darf nur der Chef. Sollen Vorarbeiter das auch dürfen?
- **Stunden für Kollegen:** Nach Migration 1 können Mitarbeiter nur eigene Stunden erfassen.

**Kleinere offene Punkte aus dem Audit:**
- D-21: Bericht-Nr. des Regieberichts nummeriert sich beim Nachtragen um; "An-/Abfahrt 1×" ist fest verdrahtet.
- D-22: Wisch-Geste im Vorschau-Modal des Regieberichts.
- U-10: Verwaiste Fotos im Speicher (nach fehlgeschlagenem Speichern oder gelöschter Baustelle).
- S-12: Fehler-Log lässt sich von außen füllen.
- Benutzernamen-Vorschlag verliert Buchstaben wie ł, đ, ø (der Chef kann den Vorschlag ändern).

**Paket 9:** Keine eigenen Screen-Tests für Stundenübersicht/Freigabe und den Regiebericht-Screen. Die Rechenlogik dahinter ist getestet.

**Paket 1:** `npm audit` meldet noch 14 Punkte (2 kritisch in `vitest`/`tinypool`, nur Test-Werkzeug). Sie verschwinden erst mit Major-Upgrades (vitest 5, vite-plugin-pwa 2, sharp 0.35).

## 6. Was Altin auf dem iPhone testen soll

**A – nach #2 bis #5**
- [ ] Baustelle öffnen, Fortschritts-Regler bewegen: Adresse, Kontakt und Team sind danach noch da.
- [ ] Stunde im Flugmodus erfassen, App schließen, mit Netz öffnen und einloggen: Eintrag wird synchronisiert.
- [ ] Bautagebuch-Eintrag anlegen, auch mit Minus-Temperatur und mit nur einer Baustelle im System.
- [ ] Abmelden im Flugmodus: App landet auf dem Login, ohne Fehlermeldung.

**B – nach #6**
- [ ] PIN-Login mit gemerktem Nutzer.
- [ ] "Nicht X?" antippen, dann mit Benutzername + PIN anmelden. Verdeckt die Tastatur den Ziffernblock nicht mehr, sobald man eine Ziffer tippt?
- [ ] Formular offen lassen (z. B. Mangel mit Text), App länger als 2 Minuten in den Hintergrund: PIN-Abfrage liegt darüber, nach dem Entsperren ist die Eingabe noch da.
- [ ] Dasselbe im Flugmodus: Hinweis "Kein Empfang" erscheint im Sperr-Screen.
- [ ] 3× falscher PIN: 30 Sekunden Sperre.

**C – nach #7 und Migration 4**
- [ ] Neuen Mitarbeiter anlegen, Einladung über "Teilen" an sich selbst schicken, Link in Safari öffnen, PIN festlegen.
- [ ] Danach in der Home-Bildschirm-App mit Benutzername + PIN anmelden.
- [ ] Bei einem vorhandenen Mitarbeiter "Neuer Zugang": Der alte PIN funktioniert weiter, bis der Link eingelöst ist.
- [ ] "Link widerrufen": Der Link zeigt danach "Einladung nicht gültig".

**D – nach #8**
- [ ] Stunde mit 07:00–15:15 und 30 Minuten Pause: überall 7,75 h (Erfassung, Meine Stunden, Übersicht, Lohnexport).
- [ ] Regiebericht für einen einzelnen Tag: Unterschrift zeichnen, drucken — die Unterschrift steht im Dokument. Baustelle wechseln: Unterschrift ist weg.
- [ ] Lohnexport und Kosten-CSV herunterladen und in Excel öffnen (Download auf dem iPhone ist nicht bestätigt).
- [ ] Freigegebenen Eintrag als Chef ändern: Rückfrage erscheint, Freigabe ist danach zurückgenommen.
- [ ] Budget "50.000" eingeben: wird als fünfzigtausend gespeichert.

**E – vor dem Merge von #9 (Vercel-Vorschau des PRs oder lokal)**
- [ ] Alle Tabs durchgehen, vor und zurück navigieren, Baustelle anlegen und löschen: kein leerer Bildschirm, "Zurück" landet sinnvoll.
- [ ] Kleine Knöpfe treffen (Zurück im Header, Filter-Chips, Papierkorb): reagieren zuverlässig, Nachbarn werden nicht versehentlich ausgelöst.
- [ ] Foto hinzufügen: Auswahl zwischen Kamera und Mediathek erscheint.
- [ ] In einem langen Formular das unterste Feld antippen: bleibt über der Tastatur sichtbar.
- [ ] Nach einem späteren Deploy: Hinweis "Neue Version verfügbar" erscheint, "Aktualisieren" lädt neu.

## 7. Hinweise

**Zur Verlässlichkeit der Befunde**
- Die Live-Datenbank wurde nicht angefasst. Alle RLS-/RPC-Befunde stammen aus den SQL-Dateien im Repo; ob die Live-DB exakt diesem Stand entspricht, ist ungeprüft.
- SQL-Migrationen wurden gegen ein lokales Wegwerf-Postgres getestet (PGlite, neue Dev-Abhängigkeit `@electric-sql/pglite`), in das alle bisherigen Repo-Migrationen eingespielt werden. Dort ließen sich die Selbst-Beförderung zum Chef und das Zurücksetzen der PIN-Drossel vor Migration 1 tatsächlich ausnutzen. Der Login-Dienst von Supabase (GoTrue) läuft in diesem Test nicht.
- Was nur ein Gerät zeigen kann, ist ungetestet: Tastatur, Teilen-Menü, Kamera/Mediathek, CSV-Download, Druck des Regieberichts mit Unterschrift, Service-Worker-Update.

**Sichtbare Verhaltensänderungen**
- **Login auf neuem Gerät:** Benutzername + PIN statt nur PIN.
- **Inaktivitäts-Sperre:** Die App sperrt nach 15 Minuten ohne Eingabe (ruht, solange das Gerät offline ist). Das weicht von der früheren Entscheidung "kein Idle-Timeout" ab; abschaltbar über `INACTIVITY_LOCK_MS = 0` in `src/config.js`.
- **Stunden:** Überall auf Viertelstunden gerundet und mit bis zu zwei Nachkommastellen angezeigt. Summen können sich gegenüber früher um Minuten ändern und stimmen jetzt mit dem Lohnexport überein.
- **Regiebericht:** Die Unterschrift wird nur gedruckt, wenn genau ein Tag gewählt ist, und gilt nur für die Baustelle und den Zeitraum, in denen sie gegeben wurde.
- **Updates:** Neue Versionen erscheinen als Hinweis; erst der Tipp lädt neu. Beim ersten Start nach dem Merge von #9 läuft noch einmal das alte Verhalten.
- **CSV:** Texte, die mit `=`, `+`, `-` oder `@` beginnen, bekommen ein vorangestelltes Hochkomma (Schutz vor Formeln). In Excel ist es sichtbar; für einen späteren Lexware-Import ggf. anpassen.
- **App-Start:** Meldet nur noch dieses Gerät ab. Vorher wurden bei jedem Kaltstart auch die Sitzungen desselben Nutzers auf anderen Geräten beendet.

**Ursachen für "Mitarbeiter-Anlage scheitert oft"** (aus Code und SQL abgeleitet, nicht an der Live-DB bestätigt)
1. Schlug nach erfolgreicher Anlage oder PIN-Reset nur das Nachladen fehl, zeigte die App "Fehler" und der neue PIN wurde nie angezeigt.
2. "PIN zurücksetzen" lag ohne Rückfrage neben "Bearbeiten" und machte den bisherigen PIN sofort ungültig.
3. Benutzernamen mit Großbuchstaben, Leerzeichen oder Akzenten ergaben Konten, die sich nie anmelden konnten.
4. Ein Anmelde-Konto ohne Profil blockiert das erneute Anlegen desselben Benutzernamens.
5. `reset_onboarding_v2` aktualisierte bei fehlendem Anmelde-Konto nur das Profil; der neue Einladungs-PIN konnte dann nie funktionieren.
6. Fehlermeldungen waren pauschal ("Fehler", "Verbindungsfehler").

**Sonstiges**
- **Baustellen-Regler:** Der Fehler besteht seit dem Phase-2-Split. Jede Baustelle, deren Fortschritts-Regler seitdem bewegt wurde, hat Adresse, Kontakt, Zeitraum, Budget, Rechnungsdaten und Team verloren. Das wird nicht automatisch wiederhergestellt; siehe Prüf-Abfrage bei Migration 1.
- **Bautagebuch:** Ursache war keine RLS-Policy. Die Baustelle wurde beim Öffnen einmalig festgelegt; waren die Daten da noch nicht geladen, blieb sie leer, und bei genau einer Baustelle war die Auswahl ausgeblendet. Per Test nachgestellt; ob das der einzige Auslöser im Alltag war, zeigt erst das iPhone.
- **Tests und `error_log`:** Der ErrorBoundary-Test hat bisher bei jedem Testlauf versucht, in die echte Tabelle `error_log` zu schreiben; dort können Einträge "Testfehler" stehen. Ab #3 ist das Netz in Tests gesperrt.
- **Bundle:** Erstes Laden rund 168 kB gzip (vor dem Lauf rund 137 kB); der Zuwachs kommt größtenteils aus den Bibliotheks-Updates.
- **Commit-Betreff:** Der Audit-Commit nennt "81 Befunde"; richtig sind 69. Nicht korrigiert, weil das einen Force-Push bräuchte.
- **Einladungs-Link:** Er öffnet sich im Browser (Safari), nicht in der installierten App.
