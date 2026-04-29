# 6-03b — SteView Split-Plan

**Stand:** 2026-04-29
**Quelle:** `src/components/screens/SteView.jsx` (778 Zeilen)
**Voraussetzung:** keine

---

## 1. Aktuelle Struktur

| Zeile | Section |
|---|---|
| 1-7 | Imports |
| 9-23 | useApp-Destrukturierung |
| 24-44 | useSaving + State (editId, confirmDelete, fd-Form-Object, saved, showList) |
| 45-48 | mb (gefilterte Baustellen) |
| 50-68 | `startEdit(e)` — füllt Form mit Eintrag-Werten |
| 70-143 | `save()` — kombinierter Create/Update-Handler mit Foto-Upload |
| 145-157 | `delEntry()` + `doDeleteEntry()` |
| 159-162 | `bsEintraege` (Liste-Filter) |
| 164-188 | Saved-Screen (Success-Animation) |
| 189-... | Hauptsicht: Form-Block + optionale Listen-Anzeige (showList toggle) |

---

## 2. Was sind getVal und edits konkret?

**WICHTIG:** SteView hat KEIN getVal/edits-System (das war früher in RegView). SteView hat:
- `fd` (form-data) — useState-Objekt mit allen Form-Feldern
- `editId` — null oder Eintrags-ID, signalisiert Edit-Modus
- `startEdit(e)` füllt fd komplett mit den Eintrags-Werten
- `save()` schreibt fd zurück in DB (create wenn editId=null, update sonst)

**Heißt:** Das edits-state.js Helper-File aus dem Brief-Vorschlag ist hier NICHT nötig. Form-State ist bereits gut gekapselt.

---

## 3. Ziel-Struktur

```
src/components/screens/SteView/
├── index.jsx           (~80 Z.) — Container: hält fd + editId, Routing zwischen Detail/Form/List
├── List.jsx            (~150 Z.) — Liste der Einträge (bsEintraege), Edit/Delete-Buttons
├── Detail.jsx          (~140 Z.) — read-only Detail eines Eintrags (mit Fotos), neu als Phase-4-Bug-Fix
│                                    Hinweis: aktuell existiert StundenDetailModal (BUG-FU-1, 4d92038);
│                                    Detail.jsx KÖNNTE diesen Modal-Inhalt als Screen-Layout wiederverwenden.
├── Form.jsx            (~280 Z.) — Form für Create + Edit, kapselt save()/startEdit
└── (kein edits-state.js — fd-State reicht)
```

---

## 4. Props pro Komponente

### `index.jsx`
```js
const SteView = () => {
  const { sb, chef, cu } = useApp();
  if (!cu) return null;

  // 3 Modi:
  // - "form" (default): Form sichtbar (Create oder Edit basierend auf editId)
  // - "list": Liste sichtbar
  // - "detail": Detail eines ausgewählten Eintrags (selEntry)
  const [mode, setMode] = useState("form");
  const [editId, setEditId] = useState(null);
  const [selEntry, setSelEntry] = useState(null);

  if (mode === "list") return <List onEdit={(e) => { setEditId(e.id); setMode("form"); }}
                                    onSelect={(e) => { setSelEntry(e); setMode("detail"); }}
                                    onBack={() => setMode("form")} />;
  if (mode === "detail" && selEntry) return <Detail eintrag={selEntry}
                                                    onEdit={() => { setEditId(selEntry.id); setMode("form"); }}
                                                    onBack={() => setMode("list")} />;
  return <Form editId={editId} onSavedNavTo={() => setMode("form")} onShowList={() => setMode("list")} />;
};
```

### `List.jsx`
Props: `{ onEdit, onSelect, onBack }`
- Eigener confirmDelete-State + doDeleteEntry-Handler
- Ruft useApp + actions

### `Detail.jsx`
Props: `{ eintrag, onEdit, onBack }`
- Read-only-Anzeige analog zu StundenDetailModal aber als Screen
- Edit-Button → onEdit() → Form-Modus

### `Form.jsx`
Props: `{ editId, onSavedNavTo, onShowList }`
- Hält fd-State + saved-State
- save()/startEdit-Handler intern (oder aus Hook)
- Bei editId: lädt Eintrag aus data und füllt fd

---

## 5. Schritte für Execution

| # | Schritt | Risiko |
|---|---|---|
| 1 | `SteView/Form.jsx` extrahieren (Form-Block + save()) | Mittel — viele Hooks (useApp, useSaving, addN) |
| 2 | `SteView/List.jsx` extrahieren (Listen-Block + delEntry) | Niedrig |
| 3 | `SteView/Detail.jsx` neu bauen (StundenDetailModal-Inhalt als Screen-Variante) | Mittel — neue UI |
| 4 | `SteView/index.jsx` als Router (mode-State) | Niedrig |
| 5 | `SteView.jsx` löschen | Trivial |

Pro Schritt: build + test + lint nach jedem Commit. Bei Fail: rollback.

---

## 6. Risiken / offene Fragen

### Hoch
- **Saved-Animation**: aktuell triggert sie aus dem Form-Save-Handler (`setSaved(...)`) und navigiert nach `nav(sb ? "bsd" : "dash")` für Mitarbeiter. Im Split: Form muss diese Navigation/Side-Effect bekommen. Lösung: `onSavedNavTo` Callback aus Container.
- **showList-Toggle vs. mode-State**: Pre-Split toggelt SteView eine Liste IM SELBEN Screen (form bleibt sichtbar im Hintergrund). Im neuen Modell wäre Liste ein eigener Screen-Modus → andere UX. **Entscheidung nötig**: behalten wir den Toggle (List als Section innerhalb Form-Screen) oder wirklich Routing zur eigenen List-View?
  - Empfehlung: Routing-Variante — sauberer, näher am Pattern von Baustellen.
- **Edit-Initialisierung**: Beim Edit-Button-Klick in List/Detail muss Form mit den Werten gefüllt werden. Lösung: editId als Prop an Form, Form macht `useEffect([editId, data])` und lädt fd entsprechend. Riskant: useEffect mit Daten als dep kann Form-Eingaben überschreiben → unique key oder useMemo + manueller Init.

### Mittel
- **fahrtzeit-Field**: hat in der App eine Sonderbehandlung (NaN-Fix aus 3b-04). Sicherstellen dass im Form.jsx der parseDecimal-Pfad bestehen bleibt.
- **trigPhoto/photoCb**: verwendet AppContext.fileRef + global photoCb. Form.jsx muss trigPhoto aus useApp bekommen — funktioniert direkt.
- **Mode-Default**: nach erfolgreichem Save sollte App in welchem Modus landen? Vermutlich "list" (User sieht die frische Eintrag-Liste) — aktuell bleibt im Form-Modus und resetet fd.

### Niedrig
- **TimePicker** wird vom Form genutzt — bleibt in Form.jsx
- **Saved-Screen** (Z.164-188) als eigene Sub-Komponente oder Inline in Form?

---

## 7. Vorab zu klären VOR Execution

1. **showList-UX**: Toggle bleibt im Form-Screen ODER Liste als eigener Screen-Modus? (siehe Risiken Hoch)
2. **Detail.jsx**: existiert bereits StundenDetailModal als Bottom-Sheet — sollen wir das als read-only Modal behalten ODER eine vollständige Detail-Screen-Variante bauen?
3. **Edit-Init via useEffect**: ist das das saubere Pattern oder lieber `<Form key={editId}>` für Force-Remount?
4. **Saved-Navigation**: aktuell für Mitarbeiter `nav(sb ? "bsd" : "dash")` — soll das im Container oder im Form bleiben?

Diese Fragen sind nicht autonom entscheidbar — Brief hat den Detail-Pfad als gegeben angenommen, aber SteView-Daten-Modell weicht ab. **Phase-Brief-Vorschlag: Plan einfrieren, Execution in einer fokussierten Session mit Altins Review der Fragen 1-4.**

---

## 8. Done-Definition (Soll-Zustand)

- [ ] `SteView/index.jsx` + List.jsx + Detail.jsx + Form.jsx existieren
- [ ] `SteView.jsx` gelöscht oder zu Re-Export reduziert
- [ ] App.jsx-Import unverändert (`./screens/SteView` resolved auf `index.jsx`)
- [ ] Build + Tests + Lint grün
- [ ] Smoke (Chef): Liste öffnet, Eintrag-Klick → Detail, Edit → Form mit gefüllten Werten, Save → Refresh
- [ ] Smoke (Mitarbeiter): Form-only, Save → Navigation zurück zu bsd/dash
- [ ] StundenDetailModal-Komponente kann optional gelöscht werden falls Detail.jsx den Use-Case komplett übernimmt
