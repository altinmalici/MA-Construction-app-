# Autopilot-Nachtlauf 2026-11-16

*Wird nach jedem Paket fortgeschrieben. Der jeweils letzte Paket-Branch enthält den aktuellsten Stand dieser Datei.*

## Pakete

| Paket | Status | Branch | PR | Migration nötig? |
|---|---|---|---|---|
| 0 – Audit | 🟢 fertig | `autopilot-2026-11-16` | [#2](https://github.com/altinmalici/MA-Construction-app-/pull/2) | nein |
| 1 – Build/Tests/Lint | 🟢 fertig | `autopilot-2026-11-16-p1-stabil` | [#3](https://github.com/altinmalici/MA-Construction-app-/pull/3) | nein |
| 2 – Kritische Bugs & Sicherheit | 🟢 fertig | `autopilot-2026-11-16-p2-kritisch` | [#4](https://github.com/altinmalici/MA-Construction-app-/pull/4) | **ja** (`migration_2026_11_16_01_security_hardening.sql`) |
| 3 – Bautagebuch speichern | 🟢 fertig | `autopilot-2026-11-16-p3-bautagebuch` | [#5](https://github.com/altinmalici/MA-Construction-app-/pull/5) | ja, nach dem Merge (`migration_2026_11_16_02_bautagebuch_wetter.sql`) |
| 4 – PIN / Willkommen zurück / Auto-Lock | 🟡 umgesetzt, ohne Review-Lauf | `autopilot-2026-11-16-p4-pin-lock` | PR-P4 | ja, erst NACH Merge (`migration_2026_11_16_03_pin_lookup_sperren.sql`) |
| 5, 7, 8, 9, 10 | 🔴 nicht begonnen | — | — | — |
| 6 – Mängel-Branch | 🟢 nichts zu tun | — | — | nein |

Paket 6: `feat/ux-maengel-architektur` ist bereits vollständig in `main` (alle 6 Commits patch-gleich, `git cherry`). Kein Rebase, kein PR.

## MANUELL AUSFÜHREN (STOP-Punkte für Altin)

Im Supabase SQL-Editor (Projekt `roeqphnopokfdktvvbpp`), in dieser Reihenfolge. Keine der Dateien wurde vom Autopiloten ausgeführt.

### 1. `supabase/migration_2026_11_16_01_security_hardening.sql` — bald ausführen

- **Was:** Schließt die Rechte-Lücken S-01 bis S-08 aus dem Audit (Selbst-Beförderung zum Chef, offene Drossel-Tabelle, fremde/freigegebene Stunden änderbar, PIN-Regeln nur im Client, fehlender `search_path`).
- **Wann:** Unabhängig vom Frontend, kann sofort laufen. Die aktuell ausgelieferte App funktioniert danach unverändert.
- **Vorher prüfen** (nur lesen):
  - `SELECT oid::regprocedure, proowner::regrole, prokind FROM pg_proc WHERE pronamespace = 'public'::regnamespace AND prosecdef;` — alle Funktionen müssen `postgres` gehören, sonst bricht die Migration mit "must be owner" ab (dann wird nichts geändert).
  - `SELECT name, username, role FROM users WHERE role = 'chef';` — stehen dort nur bekannte Chefs?
  - `SELECT relname, relrowsecurity FROM pg_class WHERE relname = 'pin_lookup_throttle';` — bei `false` war die Drossel-Tabelle tatsächlich von außen schreibbar.
  - `SELECT kunde, adresse, status FROM baustellen b WHERE NOT EXISTS (SELECT 1 FROM baustellen_mitarbeiter m WHERE m.baustelle_id = b.id);` — Baustellen ohne Team; könnten Opfer des Regler-Fehlers U-01 sein (leere Adresse, Status "geplant").
- **Danach testen:** Chef-Login, Mitarbeiter-Login, Mitarbeiter bearbeiten (Name/Stundensatz), als Mitarbeiter Stunde erfassen, PIN im Profil ändern, "Neuer Einladungs-PIN" + Erster Zugang auf zweitem Gerät.
- **Verhaltensänderung:** Mitarbeiter können per API nur noch eigene, nicht freigegebene Stunden anlegen/ändern/löschen und den eigenen Stundensatz nicht mehr ändern. PIN prüfen/setzen ist pro Mitarbeiter auf 6 Versuche pro Stunde begrenzt, der Einladungs-Lookup auf 5 Fehlversuche pro 15 Minuten je Benutzername.
- **Bekannte Nebenwirkung:** Liegen auf einem geteilten Handy offline erfasste Stunden von Mitarbeiter A in der Warteschlange und Mitarbeiter B meldet sich an, werden sie erst synchronisiert, wenn A oder der Chef sich dort anmeldet (bisher wurden sie unter B's Sitzung eingetragen). Falls Mitarbeiter künftig Stunden für Kollegen erfassen sollen, muss Teil 3 der Datei angepasst werden.
- Verifikations-Abfragen und Rollback stehen am Ende der Datei.

### 2. `supabase/migration_2026_11_16_02_bautagebuch_wetter.sql` — direkt NACH dem Merge von Paket 3

- **Was:** Das Bautagebuch-Formular hatte nie Wetterfelder, die API schrieb trotzdem bei jedem Eintrag "sonnig, 12 °C". Die Datei entfernt diese erfundenen Standardwerte und leert sie bei den vorhandenen Einträgen.
- **Wann:** Erst wenn Paket 3 live ist (die alte App-Version schreibt die erfundenen Werte weiter). Dann zeitnah.
- **Ändert Daten:** `wetter`/`temperatur` aller Einträge mit genau "sonnig"/12 werden geleert — nur beim ersten Ausführen.
- **Ohne die Migration** funktioniert Paket 3 trotzdem; alte Einträge zeigen dann aber fälschlich "sonnig, 12 °C" an.
### 3. `supabase/migration_2026_11_16_03_pin_lookup_sperren.sql` — erst wenn Paket 4 live ist

- **Was:** Sperrt die globale PIN-Suche `lookup_user_by_pin` für alle Aufrufer von außen.
- **Wann:** Erst nach Merge + Auslieferung von Paket 4 UND nachdem alle Geräte die neue Version geladen haben. Die alte App-Version braucht die Funktion für den Login auf Geräten ohne gemerkten Nutzer.
- Ändert keine Daten.

## EMPFOHLENE MERGE-REIHENFOLGE

#2 (Audit) → #3 (P1) → #4 (P2) → #5 (P3) → PR P4. Jeder PR baut auf dem vorherigen auf.

## ÜBERSPRUNGEN / NICHT ERREICHT

Der Lauf endete am Nutzungslimit nach Paket 4. Nicht begonnen: Paket 5 (Onboarding, Einladungs-Link, `repair_orphan_user`, Diagnose-SQL), 7 (restliche hohe/mittlere Audit-Punkte), 8 (Performance, iPhone-UX, PWA-Update-Hinweis), 9 (Testabdeckung), 10 (Abschluss-Doku). Paket 4 hat keinen Review-Lauf bekommen.

## Hinweise

- Paket 4: Auf einem Gerät ohne gemerkten Nutzer fragt der Login jetzt Benutzername + PIN ab (vorher nur PIN mit globaler Suche). Die Sperre legt sich als PIN-Screen über den offenen Screen, Formular-Eingaben bleiben erhalten. Zusätzlich sperrt die App nach 15 Minuten ohne Eingabe (`INACTIVITY_LOCK_MS` in `src/config.js`, 0 = aus) — das weicht von der früheren Entscheidung "kein Idle-Timeout" ab und war im Auftrag als optional genannt.
- Paket 4: Daten werden erst nach dem Login geladen; ohne Netz erscheint der Login statt des Fehlerbildschirms.

- Paket 3: Ursache des Bautagebuch-Fehlers war keine RLS-Policy. Die Baustelle wurde beim Öffnen des Screens einmalig festgelegt; waren die Daten da noch nicht geladen, blieb sie leer, und bei genau einer Baustelle war die Auswahl ausgeblendet. Per Test nachgestellt. Ob das der einzige Auslöser im Alltag war, zeigt erst der Test am Gerät.
- Paket 3: Alle Aktionen (`useAppData`) behandeln das Nachladen nach einem erfolgreichen Schreibvorgang jetzt als best-effort. Vorher wurde aus "gespeichert, aber Liste nicht aktualisiert" eine Fehlermeldung, die zum doppelten Speichern einlud (Audit A-02, D-03, U-04).
- Paket 3: Dashboard-Kacheln und "Mehr" setzen die zuletzt geöffnete Baustelle zurück, damit globale Listen nicht still gefiltert sind (Audit U-09, Teil).
- Paket 3, offene Frage: Bautagebuch-Einträge darf laut RLS und UI nur der Chef anlegen. Sollen das auch Mitarbeiter (Vorarbeiter) dürfen, braucht es eine Policy-Änderung.

- Paket 2: SQL-Migrationen wurden gegen ein lokales Wegwerf-Postgres (PGlite, neue Dev-Abhängigkeit `@electric-sql/pglite`) getestet, in das alle bisherigen Repo-Migrationen eingespielt werden. Dort ließen sich S-01 und S-02 vor der Migration tatsächlich ausnutzen. GoTrue (Login selbst) läuft in diesem Test nicht, und ob die Live-DB exakt dem Repo-Stand entspricht, ist ungeprüft.
- Paket 2 (U-01): Der Regler-Fehler besteht seit dem Phase-2-Split. Jede Baustelle, deren Fortschritts-Regler seitdem bewegt wurde, hat Adresse, Kontakt, Zeitraum, Budget, Rechnungsdaten und Team verloren. Das lässt sich nicht automatisch wiederherstellen; siehe Prüf-Abfrage oben.

- Paket 1: `npm audit` meldet nach den Updates noch 14 Punkte (2 kritisch in `vitest`/`tinypool`, nur Test-Werkzeug). Sie verschwinden erst mit Major-Upgrades (vitest 5, vite-plugin-pwa 2, sharp 0.35) — laut Auftrag nicht gemacht.
- Paket 1: Der ErrorBoundary-Test hat bisher bei jedem Testlauf versucht, eine Zeile in die echte Tabelle `error_log` zu schreiben. In `error_log` können deshalb Einträge mit der Meldung "Testfehler" stehen. Ab jetzt ist das Netz in Tests gesperrt.
- Paket 2, vom Review gefunden und behoben: `update_user_pin_v2` wäre ein ungedrosseltes PIN-Orakel gewesen; der Ablauf des Einladungs-PINs ließ sich über `update_user_pin_v2` umgehen; ein veralteter Stundensatz aus dem Profil hätte das Speichern scheitern lassen. Nicht behoben: der Einladungs-Lookup lässt sich von außen blockieren (60 Aufrufe/Minute sperren ihn für alle) — wird mit dem Einladungs-Link in Paket 5 entschärft.
- Code-Review: ein Review-Lauf pro Paket über den gesamten Paket-Diff (nicht pro Einzel-Task).

- Der Audit-Commit nennt im Betreff "81 Befunde"; richtig sind 69 Tabellenzeilen in `docs/AUDIT_2026-11.md`. Nicht korrigiert, weil das einen Force-Push bräuchte.
- Die Live-Datenbank wurde nicht angefasst und nicht gelesen. RLS-/RPC-Befunde stammen aus den SQL-Dateien im Repo.
