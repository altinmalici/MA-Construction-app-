import { INVITE_PARAM } from "../config.js";

// Einladungs-Link für ein Token. Zeigt auf die App selbst; Login.jsx erkennt
// ihn und öffnet "PIN festlegen". Das Token steht im FRAGMENT (#…): Der
// Browser schickt es nicht an den Server, es landet also weder in
// Server-Logs noch im Fehler-Log der App.
export const inviteLink = (token, origin = window.location.origin) =>
  `${origin}/#${INVITE_PARAM}=${encodeURIComponent(token)}`;

// Token aus der aktuellen Adresse lesen (oder null). Akzeptiert Fragment
// und – für ältere/abgetippte Links – den Query-Parameter.
export const readInviteToken = (
  hash = window.location.hash,
  search = window.location.search,
) => {
  try {
    const t =
      new URLSearchParams(String(hash || "").replace(/^#/, "")).get(INVITE_PARAM) ||
      new URLSearchParams(search || "").get(INVITE_PARAM);
    return t && /^[0-9a-f]{48}$/.test(t) ? t : null;
  } catch {
    return null;
  }
};

// Parameter aus der Adresszeile entfernen (Token soll nicht im Verlauf oder
// in einem Lesezeichen/Home-Bildschirm-Icon stehen bleiben).
export const clearInviteParam = () => {
  try {
    const url = new URL(window.location.href);
    url.searchParams.delete(INVITE_PARAM);
    const frag = new URLSearchParams(url.hash.replace(/^#/, ""));
    frag.delete(INVITE_PARAM);
    const rest = frag.toString();
    window.history.replaceState({}, "", url.pathname + url.search + (rest ? `#${rest}` : ""));
  } catch {
    /* egal */
  }
};

/**
 * Nachrichtentext für den Mitarbeiter.
 * Mit `link`: ein Tipp genügt, kein PIN zum Abtippen.
 * Ohne `link` (alter Ablauf): Benutzername + Einladungs-PIN.
 */
export function buildInviteText({ name, username, pin, link, origin = window.location.origin }) {
  const vorname = String(name || "").trim().split(/\s+/)[0] || "";
  if (link) {
    return [
      `Hallo ${vorname}!`,
      "",
      "Dein Zugang zur MA Construction App. Link öffnen und eigenen 4-stelligen PIN festlegen:",
      link,
      "",
      `Dein Benutzername: ${username}`,
      "Der Link funktioniert nur einmal und nur für kurze Zeit. Bitte nicht weiterleiten.",
    ].join("\n");
  }
  return [
    `Hallo ${vorname}!`,
    "",
    "Dein Zugang zur MA Construction App:",
    "",
    `Benutzername: ${username}`,
    `Einladungs-PIN: ${pin}`,
    "",
    'In der App auf "Erster Zugang?" tippen. Gültig für 7 Tage.',
    "",
    `App: ${origin}`,
  ].join("\n");
}

/**
 * Teilt den Text über das System-Menü (WhatsApp, SMS, Mail …).
 * @returns "shared" | "copied" | "cancelled" | "failed"
 */
export async function shareInvite(text) {
  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share({ text });
      return "shared";
    } catch (e) {
      // Nutzer hat das Menü geschlossen → nichts weiter tun.
      if (e?.name === "AbortError") return "cancelled";
      // sonst: auf Kopieren ausweichen
    }
  }
  return (await copyText(text)) ? "copied" : "failed";
}

export async function copyText(text) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* Fallback unten */
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

export const whatsappUrl = (text) => `https://wa.me/?text=${encodeURIComponent(text)}`;
