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

// Meldungen unserer RPCs, die serverseitig ohne Umlaute stehen oder für den
// Nutzer umformuliert werden sollen: [Muster, Anzeige].
const SERVER_TEXT = [
  [/Einladung ungueltig oder abgelaufen/i, "Einladung ungültig oder abgelaufen."],
  [/Einladung kann nicht eingeloest werden/i, "Die Einladung kann nicht eingelöst werden: Konto ist nicht bereit – bitte beim Bauleiter melden."],
  [/Konto ist nicht bereit/i, 'Konto ist nicht bereit – bitte zuerst „Zugang reparieren“ antippen.'],
  [/Mitarbeiter ist deaktiviert/i, "Nicht möglich: Der Mitarbeiter ist deaktiviert."],
  [/Mitarbeiter nicht gefunden/i, "Mitarbeiter nicht gefunden – bitte Liste neu laden."],
  [/Anmelde-Adresse gehoert bereits einem anderen Mitarbeiter/i, "Der Benutzername gehört bereits einem anderen Mitarbeiter."],
  [/Anmelde-Adresse gehoert bereits/i, 'Der Benutzername ist durch ein anderes Konto belegt – bitte „Verwaiste Konten bereinigen“ antippen.'],
  [/Fuer Chef-Konten gibt es keinen Einladungs-Link/i, "Für Chef-Konten gibt es keinen Einladungs-Link."],
  [/Benutzername ungueltig – bitte im SQL-Editor/i, "Der Benutzername dieses Mitarbeiters ist ungültig und muss in der Datenbank korrigiert werden (siehe docs/sql/onboarding_diagnose.sql)."],
  [/Benutzername fehlt/i, "Der Benutzername fehlt."],
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
  return /failed to fetch|load failed|networkerror|network request failed|fetch failed|netzwerk/i.test(m);
};

/**
 * @param {unknown} e        gefangener Fehler
 * @param {string} fallback  Text, wenn nichts Besseres bekannt ist
 */
export function fehlerText(e, fallback = "Etwas ist schiefgelaufen.") {
  if (!e) return fallback;
  const msg = String(e.message || "");
  const mapped = SERVER_TEXT.find(([re]) => re.test(msg));
  if (mapped) return mapped[1];
  if (EIGENE_MELDUNGEN.some((re) => re.test(msg))) return msg;
  if (/row-level security/i.test(msg)) return CODE_TEXT[42501];
  if (e.code && CODE_TEXT[e.code]) return CODE_TEXT[e.code];
  if (/JWT expired/i.test(msg)) return CODE_TEXT.PGRST301;
  if (istNetzFehler(e)) return "Keine Verbindung – bitte erneut versuchen.";
  return fallback;
}
