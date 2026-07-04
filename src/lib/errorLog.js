import { supabase } from "./supabase.js";

// Leichtgewichtiges Monitoring ohne Fremd-Dienst: Fehler werden in die
// error_log-Tabelle der eigenen Supabase geschrieben (nur der Chef darf sie
// lesen). Damit sieht man Abstuerze, ohne dass jemand anrufen muss.
//
// WICHTIG: Monitoring darf die App NIE zum Absturz bringen — alles
// best-effort, jede eigene Ausnahme wird verschluckt.

const recent = new Set(); // Kurzzeit-Dedup gegen Fehler-Flut

export async function logError(message, extra = {}) {
  try {
    const msg = String(message || "Unbekannter Fehler").slice(0, 2000);
    const key = msg.slice(0, 200);
    if (recent.has(key)) return; // gleiche Meldung nicht mehrfach in Folge
    recent.add(key);
    setTimeout(() => recent.delete(key), 30000);

    let userId = null;
    try {
      const { data } = await supabase.auth.getSession();
      userId = data?.session?.user?.id ?? null;
    } catch {
      /* egal */
    }

    await supabase.from("error_log").insert({
      message: msg,
      stack: extra.stack ? String(extra.stack).slice(0, 4000) : null,
      component_stack: extra.componentStack
        ? String(extra.componentStack).slice(0, 4000)
        : null,
      url: typeof location !== "undefined" ? location.href : null,
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
      user_id: userId,
    });
  } catch {
    /* Monitoring darf nie crashen */
  }
}

// Globale Fehler-Handler registrieren (unbehandelte Exceptions + Promises).
let installed = false;
export function installGlobalErrorLogging() {
  if (installed || typeof window === "undefined") return;
  installed = true;
  window.addEventListener("error", (e) => {
    logError(e?.message || "window.onerror", { stack: e?.error?.stack });
  });
  window.addEventListener("unhandledrejection", (e) => {
    const r = e?.reason;
    logError(r?.message || String(r) || "unhandledrejection", {
      stack: r?.stack,
    });
  });
}
