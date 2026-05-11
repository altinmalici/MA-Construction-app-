# 6-06 — Performance Profiling Guide

**Stand:** 2026-04-29
**Ziel:** Bei realistischem Daten-Volumen (10k Stunden / 100 Baustellen / 500 Mängel) die echten Performance-Bottlenecks der App identifizieren — als Voraussetzung für gezielte Optimierungen.

---

## 1. Top-Verdächtige (Reihenfolge nach Impact-Wahrscheinlichkeit)

| Screen | Warum verdächtig | Verdachts-Code |
|---|---|---|
| **Dash** | Rendert Aggregate über alle Module, Initial-View | `Dash.jsx`, useApp-Re-Renders |
| **StundenUebersicht** | Listet alle Mitarbeiter × Einträge expanded | `StundenUebersicht.jsx`, byUser-Loop |
| **KostenView (List)** | Aggregations-Pass über alle Stunden + Kosten + Users | `KostenView/aggregations.js` (Hook), `List.jsx` Render |
| **KostenView (Detail)** | Zusätzlich byUser-Loop + Einzelposten-Liste | `KostenView/Detail.jsx` |
| **MeineStd** | byWeek-Loop pro Render, kein useMemo | `MeineStd.jsx` |
| **KalView** | Termine + Stundeneintraege im Monat-Filter | `KalView.jsx` |

---

## 2. Mess-Methodik

### React DevTools Profiler

1. Chrome → Extensions → React DevTools → Profiler-Tab aktivieren
2. Pro Top-Screen einen Profiling-Run:
   - "Record" starten
   - In den Screen navigieren (oder bei Dash: Hard-Refresh)
   - "Stop"
3. Notiere:
   - **Total Render Time** des kommittierten Trees
   - **"Why did this render?"** für jede Komponente die auffällig oft rendert
   - **Top-3 langsamste Komponenten** im "Ranked"-View

### Chrome Performance-Tab

Für tieferes Profiling (Long Tasks, Garbage Collection, Layout Thrashing):

1. DevTools → Performance → Record
2. Navigation/Interaktion ausführen
3. Stop, dann analysieren:
   - **Long Tasks** (rot markiert, > 50ms)
   - **Scripting** vs. **Rendering** vs. **Painting** Verhältnis
   - Während des Render: Frame-Drops?

### Manuelles Lag-Testing

Bei Listen/Scroll:
- Auf Top-Screen scrollen lassen, fühlt es sich smooth (60fps) an?
- Tab-Switch (Dash → StundenUebersicht): wie lange bis erste Frame?
- Form-Eingabe: Latenz beim Tippen messen

---

## 3. Mess-Plan: 3 Daten-Mengen

Pro Top-Screen werden 3 Profilings gemacht:

| Daten-Menge | Setup | Ziel |
|---|---|---|
| **leer** | Frische Test-DB ohne Daten | Baseline-Render-Kosten messen |
| **prod-aktuell** | Aktuelle Real-DB (Stand 2026-04) | Status-Quo dokumentieren |
| **10k-perf-test** | Mit `scripts/seed-perf-test-data.mjs --apply` befüllt | Worst-Case messen |

Pro Kombination (5 Screens × 3 Mengen = 15 Läufe) Render-Zeit notieren in einer Tabelle:

```markdown
| Screen | leer | prod-aktuell | 10k-perf-test |
|---|---:|---:|---:|
| Dash | XXms | XXms | XXms |
| ... | | | |
```

---

## 4. Schwellwerte für Optimierungs-Pflicht

| Schwelle | Konsequenz |
|---|---|
| Render < 50ms | OK, kein Handlungsbedarf |
| 50-100ms | Beobachten, dokumentieren als "warm" |
| 100-300ms | Optimierungs-Kandidat (useMemo, Virtualisierung) |
| > 300ms | **Kritisch** — User merkt Lag, sofort fixen |

Scroll-Lag bei Listen: jeder Frame > 16ms (60fps verloren) ist relevant.

---

## 5. Was wir aus statischer Analyse schon vermuten

(Quelle: `docs/performance/6-06-static-analysis.md`)

- **D1 (Clock-Komponente)** hat AppContext-Re-Renders entkoppelt — verifizieren dass kein anderer 30s-Tick noch aktiv ist
- **D2 (Dash useMemo)** sollte bei Dash bereits gewirkt haben — überprüfen
- **D3 (KostenView aggregations-Map)** sollte bei KostenView bereits gewirkt haben — überprüfen
- **MeineStd, StundenUebersicht** haben kein useMemo um die byWeek/byUser-Loops — Verdacht hoch

---

## 6. Workflow nach Profiling

1. Tabelle (5 Screens × 3 Mengen) ausfüllen
2. Pro Screen mit Schwelle "warm" oder höher: Folge-Issue mit Hotspot + vorgeschlagener Fix anlegen
3. Issues priorisieren nach Impact (Häufigkeit × Render-Zeit)
4. Optimierungen in Folge-Tasks (6-06b, 6-06c, ...)

---

## 7. Notizen

- **Cleanup nach Test:** `node scripts/seed-perf-test-data.mjs --cleanup` — entfernt alle `[PERF-TEST]`-markierten Rows
- **Backup vor Apply:** Wenn Test gegen Prod-DB läuft, vorher Backup machen (Supabase Dashboard → Database → Backups)
- **Empfehlung:** lieber Supabase-Branch nutzen oder lokale Dev-DB mit Schema-Dump
