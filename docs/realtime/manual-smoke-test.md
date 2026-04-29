# Realtime Subscriptions — Manual Smoke-Test (6-01/02)

**Stand:** 2026-04-29
**Ziel:** Verifizieren dass Mitarbeiter-Erfassungen live im Chef-View erscheinen, ohne Pull-to-Refresh.

**Setup:**
- App läuft auf zwei Geräten/Browser-Sessions (z.B. Chrome + Safari, oder Chrome + Inkognito-Tab)
- Browser A: eingeloggt als **Chef** (Altin)
- Browser B: eingeloggt als **Mitarbeiter** (Agim)

---

## 1. Stundeneintrag live

| Schritt | Erwartung |
|---|---|
| 1. Browser A: Dashboard offen, Tile "Stunden" zeigt aktuellen Tages-Count | Count vor Test notieren |
| 2. Browser A: zu **StundenUebersicht** wechseln, aktuellen Monat |  Liste mit bisherigen Mitarbeitern |
| 3. Browser B: Stunden-Eintrag erfassen (Baustelle, Beginn 08:00, Ende 16:00, Pause 30, Tätigkeit "Realtime-Test") |  Speichert ohne Fehler |
| 4. **Innerhalb 2-3 Sekunden in Browser A:** | StundenUebersicht-Liste zeigt neuen Eintrag bei Agim. Tages-Count auf Dashboard +1 (nach kurzem Tab-Wechsel zur Verifikation) |

**Fail-Kriterium:** Eintrag erscheint nicht innerhalb 5s OHNE manuelles Refresh in Browser A.

---

## 2. Mangel live

| Schritt | Erwartung |
|---|---|
| 1. Browser A: **Mängel** offen, Filter "alle" |  Vorhandene Mängel sichtbar |
| 2. Browser B: Mangel erfassen (Baustelle, Titel "Realtime-Mangel", Priorität mittel) |  Speichert ohne Fehler |
| 3. Innerhalb 2-3 Sekunden in Browser A: | Neuer Mangel erscheint in der Liste |

---

## 3. Benachrichtigung live

| Schritt | Erwartung |
|---|---|
| 1. Browser A: Bell-Icon im Header, Counter sichtbar | Count vor Test notieren |
| 2. Browser B: erfasst Stundeneintrag oder Mangel → triggert `addN`-Aufruf | "info"/"stunden"/"mangel"-Notif wird via API erstellt |
| 3. Browser A: Bell-Counter erhöht sich innerhalb 2-3s ohne Refresh | Hover/Click → neue Benachrichtigung sichtbar |

---

## 4. Update-Live (Status-Wechsel)

| Schritt | Erwartung |
|---|---|
| 1. Browser A: Mängel offen, ein Mangel mit Status "offen" |  |
| 2. Browser B: gleichen Mangel auf "in_arbeit" oder "erledigt" setzen | Status-Update läuft |
| 3. Browser A: Status-Badge ändert sich innerhalb 2-3s |  |

---

## 5. Delete-Live

| Schritt | Erwartung |
|---|---|
| 1. Browser A: Mängel-Liste mit X Einträgen | X notieren |
| 2. Browser B: einen Mangel löschen | Confirm-Modal → Löschen |
| 3. Browser A: Mangel verschwindet aus Liste innerhalb 2-3s, Liste hat X−1 Einträge |  |

---

## 6. Edge-Cases

### 6.1 Lokale Mutation + eingehender Realtime-Event derselbe Row

| Schritt | Erwartung |
|---|---|
| 1. Browser A erfasst Stundeneintrag (eigener Tab) | Optimistic-Update via `actions.stundeneintraege.create` + lokaler reload |
| 2. Realtime-Event für denselben Insert kommt zurück (Echo) | `mergeIncomingRow` skipt — Row schon im State (Dedup by ID) |
| 3. Browser A zeigt Eintrag GENAU 1× | **Kein Duplikat** |

**Code-Verifikation:** `useAppData.test.js → "INSERT duplicate: skippt wenn ID schon existiert"` ✓

### 6.2 Mitarbeiter-RLS-Filterung

| Schritt | Erwartung |
|---|---|
| 1. Browser B (Mitarbeiter) in StundenUebersicht-View | sieht nur eigene Einträge (RLS) |
| 2. Browser A erfasst Stundeneintrag für ANDEREN Mitarbeiter | Browser B bekommt KEIN Realtime-Event (RLS filtert) |
| 3. Browser B: Liste unverändert |  |

**Hinweis:** RLS-Filter bei Realtime gilt automatisch via Supabase. Wenn Mitarbeiter doch fremde Events bekommt → RLS-Bug, NICHT Subscription-Bug.

### 6.3 Logout / Login-Wechsel

| Schritt | Erwartung |
|---|---|
| 1. Browser A eingeloggt, Subscriptions aktiv |  |
| 2. Logout in Browser A | useRealtime-Cleanup feuert (cu wird null → enabled wird false → useEffect-Return ruft `removeChannel`) |
| 3. Andere User-Login in Browser A | Subscriptions starten neu |

**Code-Verifikation:** `useRealtime.test.js → "subscribed NICHT wenn enabled=false"` + Cleanup-Test ✓

### 6.4 Lange Inaktivität (Background-Lock)

| Schritt | Erwartung |
|---|---|
| 1. Browser A 120s+ im Hintergrund, Background-Lock greift (3c-LOGIN) | cu wird null → Subscriptions cleanup |
| 2. PIN-Re-Entry → cu wird wieder gesetzt | Subscriptions starten neu, ggf. mit Delay-Lag (Events während Inaktivität sind verloren — aktiver reload bei Re-Login könnte das fixen, ist aber NICHT Teil von 6-01/02) |

---

## 7. Was NICHT durch Realtime abgedeckt ist (bewusst)

- **users**: Mitarbeiter-Anlage/Edit ist Chef-only und selten live-relevant
- **dokumente**: Upload-Flow, kein Erfassungs-Volumen
- **baustellen**: Selten geändert, Refresh bei Tab-Wechsel reicht
- **kosten / kalender / bautagebuch / subunternehmer**: weniger zeitkritisch

Falls Bedarf entsteht: weitere `useRealtime`-Aufrufe im AppProvider sind trivial nachzuziehen.

---

## 8. Bei Fail

1. Browser DevTools → Network → WS-Verbindung zu `realtime.supabase.co`
   - Frame-View zeigt INSERT/UPDATE/DELETE-Payloads in Echtzeit
   - Wenn keine Frames: Auth-Token möglicherweise nicht weitergereicht
2. Browser Console: Fehler von `supabase.channel().subscribe()` als Warning sichtbar?
3. Supabase Dashboard → Database → Replication: ist die Tabelle für Realtime publiziert?
   - Prüfen: `supabase_realtime` Publication enthält die 3 Tabellen
   - Falls nein: SQL `ALTER PUBLICATION supabase_realtime ADD TABLE stundeneintraege, maengel, benachrichtigungen;` ausführen

---

## 9. Performance-Check während Smoke

- DevTools Performance-Tab: 60s Recording während aktiver Subscription
- Erwartung: kein zusätzliches Render-Spike beim Eingang eines Events (nur betroffene Komponenten rerendern wegen `mergeIncomingRow → setData`)
- Hot-Spot-Verdacht: AppContext-Konsumenten rerendern alle bei jedem `data`-Change → kommt im Folge-Task `useMemo` für Provider-Value (siehe `docs/performance/6-06-static-analysis.md` Cross-Cutting-Befund)
