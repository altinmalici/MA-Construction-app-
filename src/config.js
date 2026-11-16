// Zentrale Schalter und Zeiten der App.

// Einladungs-Link (Mitarbeiter setzt den PIN über einen Link statt über
// einen 4-stelligen Einladungs-PIN). Braucht die Datenbank-Funktionen aus
// supabase/migration_2026_11_16_04_onboarding.sql.
//   "auto" (Standard): Link verwenden, sobald die Funktionen vorhanden sind;
//                      fehlen sie, fällt die App still auf den
//                      Einladungs-PIN zurück.
//   "0":               Link nie verwenden (nur Einladungs-PIN).
// Steuerbar über die Umgebungsvariable VITE_ONBOARDING_LINK.
export const ONBOARDING_LINK_MODE =
  import.meta.env?.VITE_ONBOARDING_LINK === "0" ? "0" : "auto";
// URL-Parameter, der das Token im Einladungs-Link trägt.
export const INVITE_PARAM = "einladung";

// Sperre (PIN-Wiedereingabe), wenn die App so lange im Hintergrund war.
export const BACKGROUND_LOCK_MS = 120 * 1000;

// Sperre, wenn die App so lange OFFEN, aber unbenutzt war (z.B. Handy liegt
// entsperrt auf der Baustelle). 0 = abgeschaltet. Die Sperre legt sich nur
// über den aktuellen Screen — Eingaben in Formularen bleiben erhalten.
export const INACTIVITY_LOCK_MS = 15 * 60 * 1000;
