# Autopilot-Nachtlauf 2026-11-16

*Wird nach jedem Paket fortgeschrieben. Der jeweils letzte Paket-Branch enthält den aktuellsten Stand dieser Datei.*

## Pakete

| Paket | Status | Branch | PR | Migration nötig? |
|---|---|---|---|---|
| 0 – Audit | 🟢 fertig | `autopilot-2026-11-16` | [#2](https://github.com/altinmalici/MA-Construction-app-/pull/2) | nein |
| 1 – Build/Tests/Lint | 🟢 fertig | `autopilot-2026-11-16-p1-stabil` | [#3](https://github.com/altinmalici/MA-Construction-app-/pull/3) | nein |
| 2 – Kritische Bugs & Sicherheit | 🟢 fertig | `autopilot-2026-11-16-p2-kritisch` | PR-P2 | **ja** (`migration_2026_11_16_01_security_hardening.sql`) |
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

## ÜBERSPRUNGEN

*Noch nichts.*

## Hinweise

- Paket 2: SQL-Migrationen wurden gegen ein lokales Wegwerf-Postgres (PGlite, neue Dev-Abhängigkeit `@electric-sql/pglite`) getestet, in das alle bisherigen Repo-Migrationen eingespielt werden. Dort ließen sich S-01 und S-02 vor der Migration tatsächlich ausnutzen. GoTrue (Login selbst) läuft in diesem Test nicht, und ob die Live-DB exakt dem Repo-Stand entspricht, ist ungeprüft.
- Paket 2 (U-01): Der Regler-Fehler besteht seit dem Phase-2-Split. Jede Baustelle, deren Fortschritts-Regler seitdem bewegt wurde, hat Adresse, Kontakt, Zeitraum, Budget, Rechnungsdaten und Team verloren. Das lässt sich nicht automatisch wiederherstellen; siehe Prüf-Abfrage oben.

- Paket 1: `npm audit` meldet nach den Updates noch 14 Punkte (2 kritisch in `vitest`/`tinypool`, nur Test-Werkzeug). Sie verschwinden erst mit Major-Upgrades (vitest 5, vite-plugin-pwa 2, sharp 0.35) — laut Auftrag nicht gemacht.
- Paket 1: Der ErrorBoundary-Test hat bisher bei jedem Testlauf versucht, eine Zeile in die echte Tabelle `error_log` zu schreiben. In `error_log` können deshalb Einträge mit der Meldung "Testfehler" stehen. Ab jetzt ist das Netz in Tests gesperrt.
- Paket 2, vom Review gefunden und behoben: `update_user_pin_v2` wäre ein ungedrosseltes PIN-Orakel gewesen; der Ablauf des Einladungs-PINs ließ sich über `update_user_pin_v2` umgehen; ein veralteter Stundensatz aus dem Profil hätte das Speichern scheitern lassen. Nicht behoben: der Einladungs-Lookup lässt sich von außen blockieren (60 Aufrufe/Minute sperren ihn für alle) — wird mit dem Einladungs-Link in Paket 5 entschärft.
- Code-Review: ein Review-Lauf pro Paket über den gesamten Paket-Diff (nicht pro Einzel-Task).

- Der Audit-Commit nennt im Betreff "81 Befunde"; richtig sind 69 Tabellenzeilen in `docs/AUDIT_2026-11.md`. Nicht korrigiert, weil das einen Force-Push bräuchte.
- Die Live-Datenbank wurde nicht angefasst und nicht gelesen. RLS-/RPC-Befunde stammen aus den SQL-Dateien im Repo.
