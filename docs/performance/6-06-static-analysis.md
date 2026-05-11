# 6-06 — Statische Performance-Analyse der Top-5-Screens

**Stand:** 2026-04-29
**Methode:** Code-Review der 5 Top-Verdächtigen (siehe `6-06-profiling-guide.md`) ohne Profiler-Lauf. Befunde dokumentiert, **keine Fixes** in diesem Dokument — die kommen in priorisierten Folge-Tasks.

**Anti-Pattern-Kategorien:**
- **F-RM**: Filter/Map/Sort im Render-Body ohne useMemo
- **IO**: Inline-Objects/Arrays als Props (jeder Re-Render = neue Referenz)
- **LK**: Listen ohne stable key oder mit Index als key
- **US**: useState mit großen Objekten (statt useReducer wo besser)
- **UE**: useEffect mit data-Array als Dependency

**Impact-Skala:** L=low, M=med, H=high

---

## Screen 1 — Dash.jsx

**Status:** ✅ größtenteils gefixt durch D2 (Commit `d093854`)

| Befund | Zeile | Pattern | Impact | Fix-Strategie |
|---|---|---|---|---|
| `widgetItems`-Array wird bei jedem Render neu erzeugt (Inline-Array mit Closure-Captures von aktiveBst, openMaengel, etc.) | ~73-150 | IO | L | useMemo([chef, mb, todayEntries, openMaengel, todayTermine, ...]) — aber Konsumenten sind nur die direkten Buttons, kein React.memo-Child → Impact niedrig |
| `vorname`/`initials`-Berechnung läuft pro Render (split + map + join) | 66-71 | F-RM | L | Pure-String-Ops, vernachlässigbar — höchstens useMemo wenn Dash zur Hot-Path wird |
| Quick-Actions-Buttons-Array Inline mit Closure (chef-bedingt) | (im JSX) | IO | L | Bestehend, kein Optimierungs-Bedarf |

**Gesamt-Bewertung:** Dash ist nach D2 sauber. Kein dringender Handlungsbedarf bei 10k Stunden — die memoized counts greifen nur auf `data.*.length` bzw. `.filter().length` zurück.

---

## Screen 2 — StundenUebersicht.jsx

**Status:** 🔴 **größter Verdachts-Hotspot**

| Befund | Zeile | Pattern | Impact | Fix-Strategie |
|---|---|---|---|---|
| `me = data.stundeneintraege.filter(isInMonth + isMitarbeiterEntry)` läuft jedes Render | 33-35 | F-RM | **H** | useMemo([data.stundeneintraege, mo, jr]) |
| `allUsers`-Array wird mit duplikat-Dedup pro Render aufgebaut | 37-40 | F-RM | M | useMemo([data.users, cu]) |
| `byUser`-Pipeline: für jeden User filter+reduce+forEach über `me` (= O(users × me)) | 41-59 | F-RM | **H** | useMemo([allUsers, me, data.baustellen]); bei 10k me und 20 users = 200k Operationen pro Render |
| `totalStd`/`arbTage`/`mitCount`-Berechnungen | 60-62 | F-RM | M | useMemo([byUser, me]) |
| Liste `byUser.map(...)` ohne Virtualisierung | (JSX) | LK | M | Bei 50+ Mitarbeitern: react-window evaluieren. Aktuell: für 10 Mitarbeiter unkritisch |
| Im Detail-Aufklapper `[...entries].sort(...).map(...)` neu pro Klick | (JSX) | F-RM | L | Sort ist im aufgeklappten Zustand, low-frequency |

**Worst-Case-Schätzung:** Bei 10k Einträgen + 20 Mitarbeitern macht der `byUser`-Loop ~200k bStdNum-Calls + 200k baustellen.find pro Render. Render-Schwelle 100ms wird vermutlich überschritten.

---

## Screen 3 — KostenView/* (List + Detail + index)

**Status:** ✅ Aggregations-Hotspot durch D3 (Commit `de55d9d`) + 6-03a-Split gefixt

| Befund | Zeile | Pattern | Impact | Fix-Strategie |
|---|---|---|---|---|
| `bsList = data.baustellen.filter(...)` bei `fl !== "alle"` läuft pro Render | List Z.31-34 | F-RM | L | useMemo([data.baustellen, fl]) — N = 100, vernachlässigbar |
| `useKostenAggregat`-Hook ist bereits memoized (D3) | aggregations.js | OK | — | bestätigt, kein Bedarf |
| `exportCSV`-Funktion neu pro Render (ist im List-Body definiert) | List ~85-130 | IO | L | useCallback evaluieren wenn Performance-relevant |
| Detail.jsx: `byUser` ähnliche Pipeline wie StundenUebersicht (filter + forEach) | Detail Z.59-67 | F-RM | M | useMemo([data.stundeneintraege, b.id]) |
| Detail.jsx: `[...bsKosten].reverse()` im JSX | Detail (JSX) | F-RM | L | useMemo, low Impact bei <50 Posten |
| Detail.jsx: index.jsx erzeugt `aggregat` bei jedem Render neu (= neue Object-Referenz auch bei gleichen calc-Funktionen) | index.jsx Z.21-26 | IO | M | useKostenAggregat returnt bereits memoized — aber das aggregat-Objekt im index wird neu zusammengebaut. Lösung: `useMemo(() => ({calcLohn, calcTotal, calcKat}), [aggregat])` oder direkt aggregat als Prop |

**Worst-Case-Schätzung:** Aggregations-Pass ist 1× pro Daten-Refresh. Bei 10k Einträgen ist das ein einmaliger ~10ms-Pass — akzeptabel.

---

## Screen 4 — MeineStd.jsx

**Status:** 🟡 mittlerer Hotspot

| Befund | Zeile | Pattern | Impact | Fix-Strategie |
|---|---|---|---|---|
| `all = data.stundeneintraege.filter(eigene + Mitarbeiter-Typ)` läuft pro Render | 33-35 | F-RM | M | useMemo([data.stundeneintraege, cu.id]) |
| `me = all.filter(isInMonth)` läuft pro Render | 36 | F-RM | M | useMemo([all, mo, jr]) |
| `moH`/`totalH` mit reduce+bStdNum pro Render | 37-44 | F-RM | M | useMemo([me]) bzw. useMemo([all]) |
| `byWeek`-Loop mit Date-Math pro Render | 46-58 | F-RM | M | useMemo([me]); Date-Konstruktion + KW-Berechnung ist nicht trivial |
| Liste `Object.entries(byWeek).reverse().map(...)` | (JSX) | F-RM | L | Eingebettet im byWeek useMemo |

**Worst-Case-Schätzung:** Bei einem User mit 1k eigenen Einträgen über 12 Monate: pro Render ~1k Filter + ~80 Date-Konstruktoren. Ohne Memo bei jedem clockTick (jetzt durch D1 gefixt) wäre das fatal — jetzt nur noch bei tatsächlichen State-Changes.

---

## Screen 5 — KalView.jsx

**Status:** 🟡 mittlerer Hotspot

| Befund | Zeile | Pattern | Impact | Fix-Strategie |
|---|---|---|---|---|
| `tm = data.kalender.filter(im Monat)` läuft pro Render | 38-44 | F-RM | M | useMemo([data.kalender, mo, jr]) |
| `dayTermine = data.kalender.filter(selDay)` läuft pro Render | 45-47 | F-RM | L | useMemo([data.kalender, selDay]) |
| Im JSX vermutlich ein Day-Grid das pro Tag `tm.filter(t => t.datum === ...)` macht (= O(days × tm)) | (JSX) | F-RM | M | Map vorher aufbauen: `useMemo(byDay = new Map())` mit datum→termine[] |
| `kf` (Form-State) wird komplett pro Tippen geupdated, jedes Char triggert Re-Render des ganzen Forms | 17 | US | L | Akzeptabel für Form mit 3 Feldern, useReducer wäre Overkill |

**Worst-Case-Schätzung:** Bei normalem Kalendar-Volumen (~50 Termine/Monat) unkritisch. Bei 500+ Terminen: useMemo nötig.

---

## Cross-Cutting Befunde

| Befund | Wo | Pattern | Impact | Fix-Strategie |
|---|---|---|---|---|
| Inline-Object `style={{...}}` in praktisch jedem JSX-Element | app-weit | IO | L (in den meisten Fällen) | Nur relevant für React.memo-Children. Aktuell keine memo-Components. Skip. |
| `useApp()`-Returnwert ist ein neues Objekt pro Provider-Render → alle Konsumenten rerendern bei jedem Provider-State-Change | AppContext.jsx | IO | M | Bei kommendem Realtime (Phase B) wird das wichtiger — Provider-Value mit useMemo wrappen wenn Performance sinkt |
| `data`-Object aus useAppData ist ein neues Objekt pro Refresh | useAppData.js | IO | L | Inhalt ändert sich tatsächlich → kein false-positive |

---

## Empfohlene Folge-Task-Prioritäten

| Prio | Task | Geschätzter Aufwand | Erwarteter Gain |
|---|---|---|---|
| **1** | StundenUebersicht: byUser-Pipeline + me-Filter memoizen | klein (4 useMemo-Wrappers) | hoch — bei 10k+ Einträgen messbarer Render-Speedup |
| **2** | MeineStd: 4 Filter/Reduce/byWeek memoizen | klein | mittel — vor allem bei Mitarbeitern mit langer Historie |
| **3** | KalView: byDay-Map + tm-Memo | klein | mittel — wirkt bei viel Termin-Volumen |
| 4 | KostenView/index.jsx: aggregat-Object memoizen | trivial | niedrig — defensiv für React.memo-Zukunft |
| 5 | AppContext-Provider-Value memoizen | mittel | mittel — wird mit Realtime wichtig |

**Voraussetzung für echte Priorisierung:** Profiler-Lauf mit `seed-perf-test-data.mjs --apply` — die statische Analyse identifiziert _potentielle_ Hotspots; welche tatsächlich knallen entscheidet erst die Messung.

---

## Was statisch NICHT erkennbar ist

- **Tatsächliche Render-Häufigkeit** (= wie oft pro User-Aktion?). Nur Profiler.
- **Browser-Specific-Costs** (Layout-Thrashing, Style-Recalc). Nur Performance-Tab.
- **Network/IO** (Supabase-Queries). Audit-Report + Browser DevTools Network-Tab.
- **Memory-Footprint** (Memory-Leaks). Chrome Memory-Tab.

Diese Themen sind im Profiling-Guide (`6-06-profiling-guide.md`) abgedeckt.
