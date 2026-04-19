// Stunden berechnen: Beginn, Ende, Pause → Dezimalstunden.
// Nachtschicht-tauglich: wenn Ende <= Beginn (z.B. 22:00→02:00), wird die
// Differenz auf den Folgetag bezogen (+24h). Math.max(0, …) verhindert
// negative Stunden, falls Pause > Schichtlänge ist.
export const bStd = (b, e, p) => {
  if (!b || !e) return "0.0";
  const [bH, bM] = b.split(":").map(Number);
  const [eH, eM] = e.split(":").map(Number);
  const rawDiff = eH * 60 + eM - (bH * 60 + bM);
  const diff = rawDiff < 0 ? rawDiff + 1440 : rawDiff;
  return Math.max(0, (diff - (p || 0)) / 60).toFixed(1);
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

// Euro formatieren: "1.234,56 €"
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

// Design System — iOS Colors
export const P = "#7C3AED";
export const PL = "#8B5CF6";
export const PD = "#6D28D9";
export const G = `linear-gradient(135deg, ${PD}, ${P}, ${PL})`;
export const BTN = G;
export const RED = "#FF3B30";
export const GREEN = "#34C759";
export const CS = "0 1px 3px rgba(0,0,0,0.08), 0 0 0 0.5px rgba(0,0,0,0.04)";
export const IC = "ios-input";

// Username generieren
export const genUsername = (fullName, existing) => {
  const cv = (s) =>
    s
      .replace(/ä/g, "ae")
      .replace(/ö/g, "oe")
      .replace(/ü/g, "ue")
      .replace(/ß/g, "ss")
      .replace(/Ä/g, "Ae")
      .replace(/Ö/g, "Oe")
      .replace(/Ü/g, "Ue");
  const parts = fullName.trim().split(/\s+/);
  if (parts.length < 2) return cv(fullName.trim()).toLowerCase();
  const fn = cv(parts[0]).toLowerCase();
  const ln = cv(parts[parts.length - 1]).toLowerCase();
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
