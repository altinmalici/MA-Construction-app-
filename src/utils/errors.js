// Übersetzt technische Fehler (Supabase/Postgres/Netz) in eine deutsche,
// handlungsleitende Meldung für Toasts. Rohtexte wie "new row violates
// row-level security policy" helfen auf der Baustelle niemandem.

// Meldungen, die unsere eigenen RPCs bereits auf Deutsch werfen.
const EIGENE_MELDUNGEN = [
  /PIN bereits vergeben/i,
  /PIN muss aus genau 4 Ziffern/i,
  /Zu viele Versuche/i,
  /Einladungs-PIN abgelaufen/i,
  /Onboarding nicht abgeschlossen/i,
  /Benutzername ung(ü|ue)ltig/i,
  /Nur (der )?Chef/i,
  /Nicht erlaubt/i,
];

const CODE_TEXT = {
  42501: "Keine Berechtigung für diese Aktion.",
  23503: "Ein verknüpfter Datensatz existiert nicht mehr (z. B. Baustelle oder Mitarbeiter gelöscht).",
  23505: "Dieser Eintrag existiert bereits.",
  23502: "Ein Pflichtfeld fehlt.",
  23514: "Ein Wert ist nicht zulässig.",
  22007: "Ungültiges Datum.",
  22008: "Ungültiges Datum.",
  "22P02": "Ungültige Eingabe (Zahl oder Datum prüfen).",
  PGRST116: "Eintrag nicht gefunden oder keine Berechtigung.",
  PGRST301: "Sitzung abgelaufen – bitte neu anmelden.",
};

export const istNetzFehler = (e) => {
  if (!e) return false;
  // Bewusst NICHT jeder TypeError: ein Programmierfehler ("Cannot read
  // properties of undefined") darf nicht als Verbindungsproblem erscheinen.
  if (e.name === "AbortError") return true;
  const m = String(e.message || e);
  return /failed to fetch|load failed|networkerror|network request failed|fetch failed|netzwerk|timeout/i.test(m);
};

/**
 * @param {unknown} e        gefangener Fehler
 * @param {string} fallback  Text, wenn nichts Besseres bekannt ist
 */
export function fehlerText(e, fallback = "Etwas ist schiefgelaufen.") {
  if (!e) return fallback;
  const msg = String(e.message || "");
  if (EIGENE_MELDUNGEN.some((re) => re.test(msg))) return msg;
  if (/row-level security/i.test(msg)) return CODE_TEXT[42501];
  if (e.code && CODE_TEXT[e.code]) return CODE_TEXT[e.code];
  if (/JWT expired/i.test(msg)) return CODE_TEXT.PGRST301;
  if (istNetzFehler(e)) return "Keine Verbindung – bitte erneut versuchen.";
  return fallback;
}
