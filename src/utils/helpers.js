// Stunden berechnen — Number-Variante. Liefert Dezimalstunden als Number,
// damit Aggregationen ohne parseFloat()-Wrapping summieren können.
// Nachtschicht-tauglich: Ende <= Beginn → +24h. Math.max(0, …) verhindert
// negative Stunden, falls Pause > Schichtlänge ist.
//
// Ergebnis ist IMMER auf die Viertelstunde gerundet (Projektregel
// "Arbeitszeiten auf 15 Minuten runden"). Das ist die einzige Stelle, an der
// Arbeitszeit berechnet wird — Übersicht, Kosten, Regiebericht und Lohnexport
// rechnen dadurch mit denselben Stunden. Vorher rundete nur der Lohnexport,
// sodass drei Screens drei verschiedene Summen zeigten.
export const round15 = (h) => Math.round(h * 4) / 4;

export const bStdNum = (b, e, p) => {
  if (!b || !e) return 0;
  const [bH, bM] = b.split(":").map(Number);
  const [eH, eM] = e.split(":").map(Number);
  if (![bH, bM, eH, eM].every(Number.isFinite)) return 0;
  const rawDiff = eH * 60 + eM - (bH * 60 + bM);
  const diff = rawDiff < 0 ? rawDiff + 1440 : rawDiff;
  return round15(Math.max(0, (diff - (Number(p) || 0)) / 60));
};

// Bezahlte Fahrtzeit eines Eintrags in Stunden (Viertelstunden-Raster).
// Regel: Fahrtzeit wird nur bezahlt, wenn sie ausdrücklich eingetragen ist
// (> 0). Dann zählt sie wie Arbeitszeit zum normalen Stundensatz.
export const fahrtStd = (e) =>
  round15(Math.max(0, Number(e?.fahrtzeit) || 0) / 60);

// Bezahlte Stunden eines Eintrags = Arbeitszeit + eingetragene Fahrtzeit.
// Grundlage für Stundenübersicht, Lohnexport und Lohnkosten. (Der
// Regiebericht für den Kunden nennt weiterhin nur die Arbeitszeit.)
export const lohnStd = (e) => bStdNum(e.beginn, e.ende, e.pause) + fahrtStd(e);

// Stunden als deutscher Text: 8 → "8", 7.5 → "7,5", 7.75 → "7,75".
// Zwei Nachkommastellen, weil Viertelstunden sonst falsch aussehen
// (7,75 h wurde mit einer Stelle zu "7.8").
export const fStd = (h) =>
  Number(h || 0).toLocaleString("de-DE", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

// Stunden eines Eintrags als Anzeige-Text (ohne "h").
export const bStd = (b, e, p) => fStd(bStdNum(b, e, p));

// ISO-Kalenderwoche (Mo–So, KW 1 enthält den ersten Donnerstag) für ein
// Datum "YYYY-MM-DD". Rein rechnerisch in UTC — unabhängig von Zeitzone und
// Sommerzeit. Die frühere Formel lag in Jahren, die an einem Freitag
// beginnen (2027, 2032), das ganze Jahr um eine Woche daneben.
export const isoWeek = (datum) => {
  const [y, m, d] = String(datum).slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return { jahr: NaN, kw: NaN };
  const date = new Date(Date.UTC(y, m - 1, d));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day); // Donnerstag derselben Woche
  const jahr = date.getUTCFullYear();
  const kw = Math.ceil(((date - Date.UTC(jahr, 0, 1)) / 86400000 + 1) / 7);
  return { jahr, kw };
};

// TZ-sicherer Monats-Check auf YYYY-MM-DD-Strings.
// datum: "2026-04-19" oder "2026-04-19T..." — Zeitanteil wird ignoriert.
// mo: 0-11 (JS-Konvention), jr: vierstellig.
export const isInMonth = (datum, mo, jr) => {
  const ds = (datum || "").slice(0, 10);
  if (ds.length !== 10) return false;
  const tJr = Number(ds.slice(0, 4));
  const tMo = Number(ds.slice(5, 7)) - 1;
  return tMo === mo && tJr === jr;
};

// True, wenn der Stundeneintrag einem echten Mitarbeiter zuzuordnen ist
// (nicht Sub, nicht Sonstige). Defaults ohne personTyp gelten als mitarbeiter.
export const isMitarbeiterEntry = (e) =>
  !!e && (!e.personTyp || e.personTyp === "mitarbeiter");

// Liefert distinct Tage im Range, an denen es Einträge für die Baustelle
// gibt — chronologisch sortiert. Bei vertauschtem von/bis: silent swap
// (mobile-friendlich, kein Error). ISO-Datumsstrings sortieren
// lexikographisch = chronologisch.
export const getReportDates = (
  stundeneintraege,
  baustelleId,
  vonDatum,
  bisDatum,
) => {
  const [von, bis] =
    vonDatum <= bisDatum ? [vonDatum, bisDatum] : [bisDatum, vonDatum];
  const tage = new Set(
    (stundeneintraege || [])
      .filter((e) => e.baustelleId === baustelleId)
      .filter((e) => e.datum >= von && e.datum <= bis)
      .map((e) => e.datum),
  );
  return [...tage].sort();
};

// Aktuelle Woche: Mo (ISO-Konvention) bis So. JS-Default ist
// Sonntag=0 — wir korrigieren auf Montag=0 für die Wochenberechnung.
export const toIso = (d) => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

// Monat weiter/zurück als EIN Zustand {mo, jr}. Früher wurde das Jahr
// innerhalb des Monats-Updaters gesetzt (setJr in setMo) — ein Updater darf
// keine Nebenwirkungen haben; React ruft ihn im Strict Mode doppelt auf, das
// Jahr sprang dann um 2.
export const shiftMonth = ({ mo, jr }, delta) => {
  const d = new Date(jr, mo + delta, 1);
  return { mo: d.getMonth(), jr: d.getFullYear() };
};

// Heutiges Datum in ORTSZEIT als YYYY-MM-DD. new Date().toISOString() liefert
// UTC — zwischen 0 und 1 Uhr (Sommer: 2 Uhr) wäre das noch der Vortag.
export const todayIso = () => toIso(new Date());

export const getCurrentWeekRange = () => {
  const now = new Date();
  const dow = now.getDay(); // 0=So, 1=Mo, ..., 6=Sa
  const offsetToMonday = dow === 0 ? 6 : dow - 1;
  const mo = new Date(now);
  mo.setDate(now.getDate() - offsetToMonday);
  const so = new Date(mo);
  so.setDate(mo.getDate() + 6);
  return { von: toIso(mo), bis: toIso(so) };
};

export const getCurrentMonthRange = () => {
  const now = new Date();
  const von = new Date(now.getFullYear(), now.getMonth(), 1);
  const bis = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { von: toIso(von), bis: toIso(bis) };
};

// Frühester + spätester datum-String einer Baustelle. null wenn keine
// Einträge — Aufrufer muss diesen Fall behandeln (z.B. Quick-Button "Alle"
// macht dann nichts).
export const getBaustelleFullRange = (stundeneintraege, baustelleId) => {
  const tage = (stundeneintraege || [])
    .filter((e) => e.baustelleId === baustelleId)
    .map((e) => e.datum)
    .sort();
  return tage.length > 0
    ? { von: tage[0], bis: tage[tage.length - 1] }
    : null;
};

// Aggregiert Stundeneinträge nach Arbeitszeit (Viertelstunden) → liefert
// [{stunden, anzahl, mannstunden}, ...] absteigend nach mannstunden sortiert.
// 0-Stunden-Einträge werden ignoriert (z.B. wenn Pause > Schichtlänge).
// Genutzt vom Regiebericht: "3 Mann × 8h" statt einzelner Personen-Zeilen.
export const aggregateEinsaetze = (eintraege) => {
  const map = new Map();
  (eintraege || []).forEach((e) => {
    const std = bStdNum(e.beginn, e.ende, e.pause);
    if (!(std > 0)) return;
    // Gruppieren nach dem exakten Viertelstunden-Wert. Früher toFixed(1):
    // 7,75 h wurde zu 7,8 h und "3 Mann × 7,75" zu 23,4 statt 23,25.
    const key = String(std);
    map.set(key, (map.get(key) || 0) + 1);
  });
  return Array.from(map.entries())
    .map(([k, anzahl]) => {
      const stunden = parseFloat(k);
      return { stunden, anzahl, mannstunden: stunden * anzahl };
    })
    .sort((a, b) => b.mannstunden - a.mannstunden);
};

// Datum lang formatieren: "Mo, 03.04.2026"
export const fDat = (d) =>
  new Date(d).toLocaleDateString("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

// Datum kurz formatieren: "03.04."
export const fK = (d) =>
  new Date(d).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });

// Akzeptiert deutsche ("50,5") und englische ("50.5") Dezimaleingabe.
// Leer / ungültig → 0. Negative Werte werden auf 0 geklemmt
// (konsistent mit 3b-02 Non-Negative-Guards).
export const parseDecimal = (v) => {
  if (v === null || v === undefined || v === "") return 0;
  let s = String(v).trim().replace(/\s|€/g, "");
  // "1.234,50": Punkt = Tausender, Komma = Dezimal. Früher wurde daraus 1,234.
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  // "50.000" / "1.234.567": deutsche Tausenderpunkte ohne Komma. (Drei
  // Nachkommastellen kommen bei Geld und Stundensätzen nicht vor.)
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, "");
  // Rest-Müll ("12abc") nicht still als 12 lesen.
  if (!/^\d*\.?\d+$|^\d+\.$/.test(s)) return 0;
  const n = parseFloat(s);
  return Number.isFinite(n) && n >= 0 ? n : 0;
};

// Euro formatieren: "1.234,56 €"
// Ist die Eingabe leer oder eine lesbare Zahl? Formulare lehnen damit
// Tippfehler ab ("45 €/h", "ca. 5000"), statt still 0 oder einen
// Ersatzwert zu speichern.
export const istZahlEingabe = (v) => {
  const s = String(v ?? "").trim();
  if (s === "") return true;
  return parseDecimal(s) > 0 || /^0+([.,]0+)?$/.test(s.replace(/\s|€/g, ""));
};

export const fE = (v) =>
  new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(
    v,
  );

// HTML escapen
export const escHtml = (s) => {
  if (!s) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
};

// Design System — iOS Colors.
// Brand-Farben: Single-Source-of-Truth in src/index.css (--brand-primary/-light/-dark).
// Bei Änderung auch index.html <meta name="theme-color"> und src/index.css anpassen.
export const P = "#7C3AED";
export const PL = "#8B5CF6";
export const PD = "#6D28D9";
export const G = `linear-gradient(135deg, ${PD}, ${P}, ${PL})`;
export const BTN = G;
export const RED = "#FF3B30";
export const GREEN = "#34C759";
// Premium-Kachel-Schatten: feine Kante (Definition auf hellem BG) + weicher
// Ambient-Schatten fuer Tiefe ("iOS-Widget"-Gefuehl statt flach).
export const CS = "0 0 0 0.5px rgba(0,0,0,0.04), 0 2px 12px rgba(0,0,0,0.06)";
export const IC = "ios-input";

// Username generieren
// Buchstaben, die sich nicht in Grundbuchstabe + Akzent zerlegen lassen
// (ł, đ, ø …) — ohne diese Tabelle fielen sie ersatzlos weg
// ("Đorđević" → "orevic").
const SONDER = {
  ł: "l", Ł: "L", đ: "d", Đ: "D", ø: "o", Ø: "O", ı: "i", æ: "ae", Æ: "Ae",
  œ: "oe", Œ: "Oe", þ: "th", Þ: "Th", ð: "d", Ð: "D", ħ: "h", Ħ: "H",
};
const clean = (s) =>
  s
    .replace(/[łŁđĐøØıæÆœŒþÞðÐħĦ]/g, (c) => SONDER[c])
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9-]/g, "");

// Gültiger Benutzername (identisch zur Prüfung in der Datenbank).
export const USERNAME_RE = /^[a-z0-9][a-z0-9._-]{1,30}$/;

export const genUsername = (fullName, existing) => {
  // Erst deutsche Umlaute ausschreiben, dann alle übrigen Akzente entfernen
  // (ç, ë, š, é …) und alles streichen, was im Benutzernamen nicht erlaubt
  // ist — er wird Teil der Anmelde-Adresse (nur a-z, 0-9, Punkt, Bindestrich).
  const cv = (s) =>
    clean(s
      .replace(/ä/g, "ae")
      .replace(/ö/g, "oe")
      .replace(/ü/g, "ue")
      .replace(/ß/g, "ss")
      .replace(/Ä/g, "Ae")
      .replace(/Ö/g, "Oe")
      .replace(/Ü/g, "Ue"));
  const parts = fullName.trim().split(/\s+/);
  if (parts.length < 2) return cv(fullName.trim()).toLowerCase() || "mitarbeiter";
  // Fallbacks, falls nach dem Bereinigen nichts übrig bleibt (z.B. Namen in
  // nicht-lateinischer Schrift) — der Chef kann den Vorschlag ändern.
  const fn = cv(parts[0]).toLowerCase() || "m";
  const ln = cv(parts[parts.length - 1]).toLowerCase() || "mitarbeiter";
  let u = fn[0] + "." + ln;
  if (!existing.includes(u)) return u;
  for (let i = 2; i <= fn.length; i++) {
    u = fn.slice(0, i) + "." + ln;
    if (!existing.includes(u)) return u;
  }
  u = fn + "." + ln;
  let c = 1;
  while (existing.includes(u)) {
    u = fn + "." + ln + c;
    c++;
  }
  return u;
};

// Kryptografisch sicherer 4-stelliger PIN (0000–9999, mit führender Null).
// Modulo-Bias bei Uint32 % 10000 ist < 2^-22 — für User-PINs vernachlässigbar.
export const genPin = () => {
  if (
    typeof crypto === "undefined" ||
    typeof crypto.getRandomValues !== "function"
  ) {
    throw new Error(
      "crypto.getRandomValues not available — cannot generate secure PIN",
    );
  }
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return String(buf[0] % 10000).padStart(4, "0");
};

// Modul-Farben
export const COLORS = {
  baustellen: "#3c3c43",
  stunden: "#3c3c43",
  kalender: "#3c3c43",
  maengel: RED,
  kosten: "#3c3c43",
  bautagebuch: "#3c3c43",
  dokumente: "#3c3c43",
  handwerker: "#3c3c43",
  subunternehmer: "#3c3c43",
  tagesuebersicht: "#3c3c43",
  regieberichte: "#3c3c43",
  material: "#3c3c43",
  profil: "#3c3c43",
  benachrichtigungen: RED,
};
