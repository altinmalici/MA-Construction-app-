# Autopilot-Nachtlauf 2026-11-16

*Wird nach jedem Paket fortgeschrieben. Der jeweils letzte Paket-Branch enthält den aktuellsten Stand dieser Datei.*

## Pakete

| Paket | Status | Branch | PR | Migration nötig? |
|---|---|---|---|---|
| 0 – Audit | 🟢 fertig | `autopilot-2026-11-16` | [#2](https://github.com/altinmalici/MA-Construction-app-/pull/2) | nein |
| 1 – Build/Tests/Lint | 🟢 fertig | `autopilot-2026-11-16-p1-stabil` | PR-P1 | nein |
| 6 – Mängel-Branch | 🟢 nichts zu tun | — | — | nein |

Paket 6: `feat/ux-maengel-architektur` ist bereits vollständig in `main` (alle 6 Commits patch-gleich, `git cherry`). Kein Rebase, kein PR.

## MANUELL AUSFÜHREN (STOP-Punkte für Altin)

*Noch keine.*

## ÜBERSPRUNGEN

*Noch nichts.*

## Hinweise

- Paket 1: `npm audit` meldet nach den Updates noch 14 Punkte (2 kritisch in `vitest`/`tinypool`, nur Test-Werkzeug). Sie verschwinden erst mit Major-Upgrades (vitest 5, vite-plugin-pwa 2, sharp 0.35) — laut Auftrag nicht gemacht.
- Paket 1: Der ErrorBoundary-Test hat bisher bei jedem Testlauf versucht, eine Zeile in die echte Tabelle `error_log` zu schreiben. In `error_log` können deshalb Einträge mit der Meldung "Testfehler" stehen. Ab jetzt ist das Netz in Tests gesperrt.
- Code-Review: ein Review-Lauf pro Paket über den gesamten Paket-Diff (nicht pro Einzel-Task).

- Der Audit-Commit nennt im Betreff "81 Befunde"; richtig sind 69 Tabellenzeilen in `docs/AUDIT_2026-11.md`. Nicht korrigiert, weil das einen Force-Push bräuchte.
- Die Live-Datenbank wurde nicht angefasst und nicht gelesen. RLS-/RPC-Befunde stammen aus den SQL-Dateien im Repo.
