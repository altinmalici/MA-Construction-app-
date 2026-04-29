# 6-03a — KostenView Split-Plan

**Stand:** 2026-04-29
**Quelle:** `src/components/screens/KostenView.jsx` (967 Zeilen)
**Voraussetzung:** D3 (`de55d9d`) — `byBaustelleAggregat` Lookup-Map existiert bereits, calc*-Reader sind O(1)

---

## 1. Aktuelle Struktur

| Zeile | Section |
|---|---|
| 1-12 | Imports + Component-Header + State (`confirmDeleteKost`) |
| 25-34 | State (`selBs`, `sf`, `fl`, `kf`-Form-Object) |
| 35-46 | `katLabels` + `katColors` Konstanten |
| 47-52 | `bsList` (Filter nach Status) |
| 54-95 | **D3 Aggregations-Map** + `calcLohn` / `calcTotal` / `calcKat` Reader |
| 97-99 | `totalAll` + `budgetAll` |
| 101-128 | `saveKost` Handler (Form-Submit) |
| 130-181 | `exportCSV` Handler (CSV-Download) |
| 183-563 | **Detail-Ansicht** (wenn `selBs` gesetzt): Budget-Card, Stunden-Summary, Kategorie-Aufteilung, Lohn-Detail-Tabelle, Einzelposten-Liste, Delete-Confirm-Modal |
| 565-963 | **Hauptübersicht (List)**: Form-Toggle, "Neuer Kosten"-Form, Gesamtübersicht-KPIs, Filter-Chips, Baustellen-Liste mit Card-Klick → `setSelBs(b)` |
| 964-967 | Export |

---

## 2. Ziel-Struktur

```
src/components/screens/KostenView/
├── index.jsx           (~50 Z.) — Router: zeigt Detail vs. List basierend auf selBs
├── List.jsx            (~250 Z.) — Übersicht + Filter + Baustellen-Liste + KPIs
├── Detail.jsx          (~380 Z.) — Single-Baustelle Detail
├── Form.jsx            (~120 Z.) — Neuer-Kosten-Eintrag (separater Subcomponent)
└── aggregations.js     (~50 Z.)  — useKostenAggregat-Hook + Helpers
```

`src/components/screens/KostenView.jsx` wird zu Re-Export der `index.jsx` (oder gelöscht, App.jsx-Import auf `KostenView/index` aktualisiert).

---

## 3. Props pro Komponente

### `aggregations.js` (Hook + Helpers)
```js
export function useKostenAggregat(baustellen, stundeneintraege, users, kosten) {
  // useMemo aus D3 — gibt Map zurück
  return { byBaustelleAggregat, calcLohn, calcTotal, calcKat, totalAll, budgetAll };
}
```

### `index.jsx`
```js
const KostenView = () => {
  const { ... } = useApp();
  const [selBs, setSelBs] = useState(null);
  const aggregat = useKostenAggregat(data.baustellen, data.stundeneintraege, data.users, data.kosten);

  if (selBs) return <Detail bs={selBs} aggregat={aggregat} onBack={() => setSelBs(null)} />;
  return <List aggregat={aggregat} onSelectBs={setSelBs} />;
};
```

### `List.jsx`
Props: `{ aggregat, onSelectBs }`
- Hat eigenen Form-State (`sf`, `kf`) für `<Form>`
- Filter-State (`fl`)
- Rendert Form (toggle), Übersichts-KPIs, Filter-Chips, Baustellen-Liste

### `Detail.jsx`
Props: `{ bs, aggregat, onBack }`
- Liest `aggregat.calcLohn(bs.id)`, `calcKat(bs.id, kat)` etc.
- Hat eigenen `confirmDeleteKost`-State

### `Form.jsx`
Props: `{ kf, sKf, onSave, saving, baustellen, katLabels }`
- Pure Render — Logic in Parent (`List`)
- Inputs für Baustelle/Kategorie/Beschreibung/Betrag/Datum

---

## 4. Schritte für Execution

| # | Schritt | Verify | Commit-Msg |
|---|---|---|---|
| 1 | Verzeichnis `KostenView/` anlegen, `aggregations.js` mit useKostenAggregat-Hook extrahieren (Code aus Z.54-95 + Z.97-99) | Build + Tests | `6-03a (1/N): aggregations.js extrahiert` |
| 2 | `index.jsx` als Router-Skelett (lazy import von List, Detail später) — KostenView.jsx-Original bleibt vorerst unangetastet | nur Build (kein Routing-Switch) | `6-03a (2/N): index.jsx Router-Skelett` |
| 3 | `Detail.jsx` extrahieren (Z.184-563), Props {bs, aggregat, onBack} | Build + Tests | `6-03a (3/N): Detail.jsx extrahiert` |
| 4 | `Form.jsx` extrahieren (Form-Block aus Hauptübersicht), Props {kf, sKf, onSave, saving, baustellen, katLabels} | Build + Tests | `6-03a (4/N): Form.jsx extrahiert` |
| 5 | `List.jsx` extrahieren (Z.566-963 minus Form-Block), Props {aggregat, onSelectBs} | Build + Tests | `6-03a (5/N): List.jsx extrahiert` |
| 6 | `index.jsx` final wiring (Detail/List basierend auf selBs); `App.jsx` Import auf `./screens/KostenView` (Re-Export funktioniert via index.jsx) bzw. KostenView.jsx-Datei löschen | Build + Tests | `6-03a (N/N): KostenView.jsx ersetzt durch index.jsx` |

---

## 5. Risiken / Worauf achten

### Hoch
- **`exportCSV` greift direkt auf `data.stundeneintraege`/`data.users`/`data.kosten` zu** (Z.134-170), nicht via aggregat-Map. Muss in List.jsx bleiben mit Zugriff auf `data` aus `useApp()`. Alternativ: in aggregations.js eine `getCSVRows(aggregat, data)` Helper-Funktion bauen — aber das verkompliziert Phase 1.
- **`saveKost` benutzt `actions.kosten.create` + `addN` + `withSaving`** — alles Hooks aus useApp + useSaving. Form.jsx muss diese als Props bekommen oder selbst useApp/useSaving aufrufen.
- **`selBs`-Closure**: aktuell ist `selBs` der ganze Baustelle-Objekt, nicht nur die ID. Beim Rerender (z.B. nach Edit) ist `selBs` veraltet → Detail.jsx muss `data.baustellen.find(b => b.id === selBs.id)` resolven, statt direkt `selBs.kunde` etc. zu nutzen.

### Mittel
- **`katColors` + `katLabels`** in mehreren Sub-Components benutzt → in `aggregations.js` oder `constants.js` ausexportieren
- **`fH`-Helper** (Stunden-Format) ist nur in KostenView lokal definiert (Z.47) — als Helper in `helpers.js` oder lokal in jeder Sub-Component

### Niedrig
- **Tests**: aktuell keine direkten Tests für KostenView. Build-grün + Vitest 172 (helpers/storage/api) reichen als Smoke-Coverage.

---

## 6. Done-Definition

- [ ] `KostenView/index.jsx` + List.jsx + Detail.jsx + Form.jsx + aggregations.js existieren
- [ ] Original `KostenView.jsx` ist entweder gelöscht oder Re-Export
- [ ] App.jsx importiert weiterhin `KostenView` (transparenter Wechsel)
- [ ] Build + Tests + Lint grün
- [ ] Smoke: Liste öffnet, Click → Detail, Form-Submit → Refresh, CSV-Export funktioniert, Filter-Chips funktionieren
