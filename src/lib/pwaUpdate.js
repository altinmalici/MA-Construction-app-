// Service-Worker-Update mit sichtbarem Hinweis.
//
// Früher: registerType "autoUpdate" + skipWaiting. Der neue Service Worker
// übernahm die LAUFENDE alte Seite und räumte deren Dateien aus dem Cache —
// der nächste noch nicht geladene Screen fand seinen Chunk nicht mehr und
// die App zeigte den ganzseitigen Fehlerbildschirm.
// Jetzt: Der neue Service Worker wartet. Die App zeigt "Neue Version
// verfügbar"; erst auf Tipp wird umgeschaltet und neu geladen.

export const UPDATE_EVENT = "ma-update-ready";
const CHECK_INTERVAL_MS = 60 * 60 * 1000;

let applyFn = null;

/** Neue Version aktivieren und Seite neu laden. */
export async function applyUpdate() {
  if (applyFn) await applyFn(true);
  else window.location.reload();
}

/** Beim App-Start einmal aufrufen (nur im Browser, nicht in Tests). */
export async function initPwaUpdate() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  try {
    const { registerSW } = await import("virtual:pwa-register");
    applyFn = registerSW({
      onNeedRefresh() {
        window.dispatchEvent(new CustomEvent(UPDATE_EVENT));
      },
      onRegisteredSW(_url, registration) {
        if (!registration) return;
        // Eine installierte PWA wird selten neu gestartet → regelmäßig und
        // bei Rückkehr in den Vordergrund nach einer neuen Version sehen.
        const check = () => {
          if (navigator.onLine !== false) registration.update().catch(() => {});
        };
        setInterval(check, CHECK_INTERVAL_MS);
        document.addEventListener("visibilitychange", () => {
          if (!document.hidden) check();
        });
      },
    });
  } catch (e) {
    // Dev-Server/Tests: kein Service Worker — kein Fehler.
    console.warn("[pwaUpdate] Service Worker nicht registriert:", e?.message);
  }
}

// ── Lazy-Chunks, die nach einem Deploy nicht mehr existieren ──────────────
const RELOAD_FLAG = "ma_chunk_reload";

/**
 * Wie React.lazy-Import, fängt aber den Fall "Datei gibt es nach einem
 * Deploy nicht mehr" ab: einmal neu laden (holt die aktuelle Version) statt
 * Fehlerbildschirm. Der Merker verhindert eine Reload-Schleife.
 */
export function importWithReload(importer) {
  return async () => {
    try {
      const mod = await importer();
      try {
        sessionStorage.removeItem(RELOAD_FLAG);
      } catch {
        /* egal */
      }
      return mod;
    } catch (e) {
      let already = false;
      try {
        already = sessionStorage.getItem(RELOAD_FLAG) === "1";
        if (!already) sessionStorage.setItem(RELOAD_FLAG, "1");
      } catch {
        already = true; // ohne sessionStorage lieber nicht neu laden
      }
      const offline = typeof navigator !== "undefined" && navigator.onLine === false;
      if (!already && !offline) {
        window.location.reload();
        // Promise offen lassen: die Seite lädt gleich neu.
        return new Promise(() => {});
      }
      throw e;
    }
  };
}
