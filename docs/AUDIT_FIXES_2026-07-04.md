# Audit-Fixes – Nacht vom 03./04.07.2026

Zusammenfassung der Überarbeitung nach dem Tiefenaudit (27-Agenten, 58 Befunde).

## 1. Kernproblem gelöst: Mitarbeiter-Login

**Symptom:** Neu angelegte Handwerker konnten sich nicht anmelden – „ging nur auf deinem Handy".

**Ursache (bewiesen):** `create_user_with_auth`/`create_user_with_pin_v2` legten den
Login-Account per direktem `INSERT` in `auth.users` an, ließen aber GoTrue-Pflicht-
Spalten (`confirmation_token`, `recovery_token`, …) auf `NULL`. Dadurch stürzte
`signInWithPassword` serverseitig mit **HTTP 500** ab.

**Fix (live in der DB):** Token-Spalten auf `''` gesetzt (Backfill + Funktionen
gepatcht). End-to-End getestet: neu angelegter Nutzer → Login `200` + Token. ✅

## 2. Sicherheit geschlossen (live in der DB)

- **Fremdzugriff:** `REVOKE EXECUTE ... FROM anon` auf allen 7 Admin-RPCs → ein
  Unbekannter kann sich nicht mehr selbst einen Chef-Account anlegen o. Ä.
  (verifiziert: `anon` darf nicht, eingeloggt darf).
- **Rechte-Eskalation:** In jeder Admin-Funktion `is_chef()`- bzw. „nur man
  selbst"-Wächter → ein Mitarbeiter kann keine fremden PINs setzen/löschen.
  (verifiziert: Nicht-Chef wird abgewiesen.)
- Quelle: `supabase/migration_auth.sql` + `supabase/migration_security_guards.sql`.

## 3. Deployt (Vercel, `main`)

Vier Frontend-Fixes sind live:

| Fix | Wirkung |
|-----|---------|
| Daten nach Login laden | kein leeres Dashboard mehr („gefühlter Datenverlust") |
| Baustellen-Empty-State | Mitarbeiter ohne Zuweisung bekommt Hinweis statt totem Dropdown |
| Onboarding-Meldung | „PIN falsch/abgelaufen" statt nur „Falscher PIN" |
| Error-Boundary | kein weißer Bildschirm bei Render-Fehlern |

Außerdem live in der DB: 2 hängende Handwerker reaktiviert (neue Einladungs-PINs),
Mitarbeiter↔Baustelle-Zuordnungen aus den Alt-Stunden nachgetragen.

## 4. Auf dem Zweig `deploy/audit-fixes` (noch NICHT deployt – morgen reviewen)

- **Lohnexport (CSV):** neuer Chef-Button in der Stundenübersicht, exportiert den
  Monat detailliert (Datum/Baustelle/Tätigkeit/Zeiten/Stunden/Satz/Betrag +
  Zusammenfassung je Mitarbeiter + Gesamt). Deutsch-freundlich, auf Viertelstunde
  gerundet, später an **Lexware** anpassbar. Mit 6 Unit-Tests.
- **Unterschriftsfeld** 80 → 140 px (besser mit dem Finger).
- **Offline-Hinweis-Balken** bei fehlender Internetverbindung.
- **CI** (`.github/workflows/ci.yml`) – Lint+Test+Build. *(Noch nicht gepusht:
  Git-Zugang braucht `workflow`-Scope → `gh auth refresh -s workflow` oder über die
  GitHub-Weboberfläche einfügen. Dazu 2 Secrets setzen: `VITE_SUPABASE_URL`,
  `VITE_SUPABASE_ANON_KEY`.)*
- **console.log** aus dem Prod-Build entfernt (`error`/`warn` bleiben).

## 5. Vorbereitet, aber bewusst NICHT ausgeführt (brauchen Test mit dir)

`supabase/migration_hardening.sql`:
- **Teil A – Indizes:** sicher, sofort anwendbar.
- **Teil B – users-Spaltenschutz:** versteckt `pin_hash`/`onboarding_pin` vor
  Clients → nach Anwenden testen (Chef-Login, User-Liste, Bearbeiten).
- **Teil C – Datenintegrität:** erst 2 verwaiste Stunden-Zeilen bereinigen, dann
  Constraint setzen.
- **Teil D – offene TODOs:** `onboarding_pin` hashen, `person_name`-Snapshot beim
  Löschen, PIN-Rate-Limit (#9, via Edge Function).

## 6. Offene Punkte / Entscheidungen für morgen

1. **Deploy testen:** App neu laden → als Chef einloggen → Dashboard zeigt Daten?
2. **Anlegen testen:** einen Test-Handwerker anlegen (bestätigt, dass der
   `is_chef()`-Wächter den Chef nicht blockiert – logisch sicher, aber ungetestet).
3. **Zweig `deploy/audit-fixes` deployen** (Lohnexport etc.), CI-Datei nachziehen.
4. **Härtung** (`migration_hardening.sql`) gemeinsam anwenden + testen.
5. **Lexware-Format:** Muster-Import/Screenshot → dann Export passgenau anpassen.
6. **Buchhaltung/Steuerberater-Zugang** (schreibgeschützte Rolle) – Konzept + RLS.
7. **Mängel-Feature** (6 alte Commits, seit Mai) prüfen & separat deployen.
8. **PINs an die 2 Handwerker** schicken: Ali → `a.adam` / **4726**,
   Altin → `a.haxholli` / **8135** (gültig bis 11.07.).
