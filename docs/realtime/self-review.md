# 6-01/6-02 — Self-Review Code-Audit

**Stand:** 2026-04-30
**Scope:** 3 Files — `src/lib/useRealtime.js`, `mergeIncomingRow` aus `src/lib/useAppData.js`, Subscription-Block aus `src/context/AppContext.jsx`
**Methode:** Code-Read mit Fokus auf Cleanup, Dedup-Korrektheit, enabled-Race-Conditions, Memory-Leaks, Error-Handling.

---

## Findings

### 1. **HIGH** — `useRealtime.js:30-67` Stale Handler-Closure
**Problem:** Die `useEffect`-Deps sind `[table, filter, enabled]`. Wenn ein Handler (z.B. `onInsert`) sich ändert (neuer Closure), wird die Subscription NICHT neu aufgebaut. Stattdessen feuert die alte Subscription mit dem alten Handler. Ein Kommentar weist darauf hin, dass Aufrufer `useCallback` für stable Refs nutzen sollten — und das tut der `AppContext` auch korrekt mit `[mergeIncomingRow]` als dep.

**Aktuell unkritisch:** `mergeIncomingRow` selbst hat `[]`-deps in `useCallback` — daher sind die `AppContext`-Handler stabil über die App-Lebenszeit, und der "stale closure"-Pfad wird nie betreten.

**Empfehlung:** Den Pattern via `useRef` defensiv robust machen — Handler in einen Ref spiegeln, der sync mit jedem Render, und im Subscription-Callback `ref.current(payload.new)` rufen. Verhindert Bug bei zukünftigem Refactor wo Handler doch unstable werden. Alternativ: explizite Doc-Warnung in JSDoc-Header (vorhanden, aber leicht zu übersehen).

### 2. **MEDIUM** — `useRealtime.js:45-56` Kein Subscription-Status-Handling
**Problem:** `.subscribe()` wird ohne Status-Callback aufgerufen. Supabase liefert beim `.subscribe(callback)` Status-Übergänge `SUBSCRIBED` / `CHANNEL_ERROR` / `TIMED_OUT` / `CLOSED`. Aktuell schlucken wir alle Fehler stillschweigend — der User merkt nicht, dass Realtime ausgefallen ist.

**Empfehlung:** Status-Callback ergänzen: bei `CHANNEL_ERROR` / `TIMED_OUT` einmal `console.warn('[useRealtime] Channel-Error für Tabelle X — Realtime inaktiv. Manueller Refresh nötig.')`. Optional: `onError`-Callback in Hook-API exposen für UI-Banner ("Live-Updates pausiert").

### 3. **MEDIUM** — `useAppData.js:72-96` Dedup ohne updated_at-Vergleich ✅ FIXED
**Problem:** `mergeIncomingRow` machte UPDATE als `{ ...next[idx], ...row }` — der eingehende `row` überschrieb blind die lokalen Felder. Bei Out-of-Order-Events (Realtime-Race: zwei UPDATEs in falscher Reihenfolge) konnte ein älterer Snapshot den neueren überschreiben.

**Aktuell unkritisch (war):** Postgres `replication` liefert Events üblicherweise in commit-Reihenfolge pro Connection. Race-Window minimal. Aber bei Reconnect/Replay (z.B. nach kurzem Netz-Drop) konnten Events anders ankommen.

**Fix (Commit `06d2d7d`, 6-02b):** `isNewer(incoming, existing)`-Helper in `useAppData.js`. Wenn der bestehende Eintrag ein `updatedAt` hat, muss das eingehende Event STRIKT neuer sein — sonst behalten wir den Stand. Eingehend ohne `updatedAt` → behalten (sicherer Default, Reihenfolge unbekannt). Bestehender ohne `updatedAt` → akzeptieren (keine Referenz). Test-Coverage in `useAppData.test.js` (älter-skip / neuer-ersetzen / ohne-updatedAt-behalten).

### 4. **MEDIUM** — `useAppData.js:79-80` INSERT-Dedup nutzt snake_case-`row.id`, lokaler State hat camelCase ✅ FIXED
**Problem:** Realtime liefert die Postgres-Row direkt (snake_case keys: `baustelle_id`, `mitarbeiter_id`, `created_at` etc.). Lokaler State enthält aber das **gemappte** Object (camelCase: `baustelleId`, `mitarbeiterId`). Der eingefügte Row war daher **inkonsistent zum Rest des States** und Komponenten, die `e.baustelleId` lasen, sahen `undefined`.

**Severity hochgestuft auf HIGH** — das war ein echter funktionaler Bug, nicht nur Style.

**Fix (Commit `06d2d7d`, 6-02b):** Generischer `mapKeysToCamel`-Helper in `useAppData.js` mappt top-level snake_case-Keys zu camelCase, wird als erster Schritt in `mergeIncomingRow` aufgerufen. Postgres-Realtime-Payloads sind flach, daher keine Rekursion. Test-Coverage in `useAppData.test.js` (alle camelCase-Keys da, alle snake_case-Keys verschwunden).

### 5. **MEDIUM** — `AppContext.jsx:34-85` Re-Subscribe bei jedem `cu`-Wechsel, auch wenn nur `cu.name` editiert
**Problem:** `realtimeEnabled = !!cu` — Boolean-Stable. ABER: bei `setCu(newObj)` (z.B. nach PIN-Change in ProfilView) ändert sich `cu` als Referenz, `mergeIncomingRow` ist `useCallback([])` stabil, `realtimeEnabled` Wert bleibt true. Effekt: kein Re-Subscribe. **Tatsächlich OK**, kein Re-Subscribe-Storm.

**Severity downgraded zu LOW.** Kein Bug, nur prüfens-wert beim Lesen.

### 6. **LOW** — `useRealtime.js:37-39` Channel-Name kollidiert bei zwei Subscriptions ohne Filter
**Problem:** Wenn dieselbe Tabelle 2× ohne Filter subscribed wird (Doppel-Komponente, Tab-Wechsel), kollidiert `realtime:stundeneintraege` als Channel-Name. Supabase-Verhalten: zweite Subscription joint denselben Channel — möglicherweise Events verloren oder doppelt. Aktuell tritt das nicht auf (nur AppContext subscribed), wäre aber ein Footgun.

**Empfehlung:** Channel-Name mit unique-suffix (z.B. `realtime:${table}:${useId()}`).

### 7. **LOW** — `mergeIncomingRow` ignoriert unbekannte `op`-Werte still
**Problem:** Wenn op `"REPLACE"` oder Tippfehler, fall-through zu `return prev` ohne Warnung. Kein Bug, aber Debug-erschwerend.

**Empfehlung:** Default-Branch mit `console.warn('[mergeIncomingRow] unbekannte op:', op)`.

### 8. **LOW** — `useRealtime.js:34` Initial-Sync-Lücke
**Problem:** Wenn der User schon eingeloggt ist und `useRealtime` mountet, **fehlen** alle Events, die VOR dem Subscribe passiert sind. Der initiale `loadAll()` aus `useAppData` läuft parallel, aber nicht atomar mit dem Subscribe. Race-Window: Event passiert nach `getAll`, vor `subscribe` → verloren.

**Empfehlung:** Subscribe-First-Pattern: erst `.subscribe()`, danach `loadAll()`. Eintreffende Events während `loadAll` werden in einer Queue gepuffert, nach `loadAll`-Completion abgespielt mit Dedup. Aufwand: mittel; aktuell unkritisch da App seit Jahren ohne Realtime lief und User auf Tab-Wechsel/Refresh trainiert ist.

---

## Zusammenfassung

| # | Severity | Datei | Quick-Fix-Möglich? |
|---|---|---|---|
| 1 | HIGH | useRealtime.js:30 | Ja — Handler-Ref-Pattern, ~5 Zeilen |
| 2 | MEDIUM | useRealtime.js:56 | Ja — Status-Callback, ~10 Zeilen |
| 3 | MEDIUM ✅ FIXED | useAppData.js:82 | Commit `06d2d7d` (6-02b) |
| 4 | **HIGH** ✅ FIXED | useAppData.js:79 | Commit `06d2d7d` (6-02b) |
| 5 | LOW | AppContext.jsx | Kein Action |
| 6 | LOW | useRealtime.js:37 | Ja — useId-Suffix |
| 7 | LOW | mergeIncomingRow | Trivial |
| 8 | LOW | useRealtime-Architektur | Nein — Refactor |

**Empfehlung für Altin nach Merge:**
Finding **#4 ist der wichtigste** — der Realtime-Insert macht aktuell Rows mit snake_case-Keys in den State. Komponenten, die auf `e.baustelleId` zugreifen, sehen `undefined` für gerade live-eingefügte Einträge. Test bewusst übersehen weil Mocks pure Pass-through sind. **Reproducer:** Browser A bekommt Realtime-INSERT → Eintrag erscheint in der Liste, aber `bs?.kunde`-Lookup liefert `undefined` → "?" als Baustellen-Name.

**Vorgeschlagener Folge-Task:** `6-02b: Realtime-Row-Mapping zu camelCase + updated_at-Dedup`. ✅ ERLEDIGT (Commit `06d2d7d`).
