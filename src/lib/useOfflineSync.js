import { useEffect, useRef } from "react";
import { getPending, gehoertZu } from "./offlineQueue.js";

// Wie oft bei nicht leerer Warteschlange erneut versucht wird.
export const OFFLINE_SYNC_INTERVAL_MS = 30 * 1000;

/**
 * Arbeitet die Offline-Warteschlange der Stundeneinträge ab.
 *
 * Versucht es, sobald ein Nutzer eingeloggt ist (RLS braucht eine Sitzung),
 * und danach erneut bei: "online"-Ereignis, Rückkehr in den Vordergrund und
 * alle OFFLINE_SYNC_INTERVAL_MS, solange noch etwas wartet. Vor dem Login
 * wird nie synchronisiert — der Insert würde ohne Sitzung an RLS scheitern.
 *
 * @param {object} opts
 * @param {string|null|undefined} opts.userId  eingeloggter Nutzer (sonst inaktiv)
 * @param {boolean} [opts.isChef]  Chef sendet alle Einträge, Mitarbeiter nur eigene
 * @param {(who:{userId:string,isChef:boolean}) => Promise<{synced:number, failed:number, remaining:number}>} opts.sync
 * @param {(res:{synced:number, remaining:number}) => void} [opts.onSynced]
 *        wird gerufen, wenn mindestens ein Eintrag synchronisiert wurde oder
 *        endgültig fehlgeschlagen ist
 */
// Modulweit: verhindert zwei parallele Läufe über dieselbe Warteschlange,
// auch wenn der Effekt bei einem Nutzerwechsel neu startet.
let running = false;

export function useOfflineSync({ userId, isChef = false, sync, onSynced }) {
  // Refs: sync/onSynced werden pro Render neu erzeugt, sollen den Effekt
  // aber nicht neu starten.
  const syncRef = useRef(sync);
  const onSyncedRef = useRef(onSynced);
  useEffect(() => {
    syncRef.current = sync;
    onSyncedRef.current = onSynced;
  });

  useEffect(() => {
    if (!userId) return undefined;
    let cancelled = false;

    const run = async () => {
      if (cancelled || running) return;
      if (typeof navigator !== "undefined" && navigator.onLine === false) return;
      // Nur wenn für DIESEN Nutzer etwas zu senden ist (fehlgeschlagene und
      // fremde Einträge lösen keinen Lauf aus).
      if (!getPending().some((item) => gehoertZu(item, userId, isChef))) return;
      running = true;
      try {
        const res = await syncRef.current({ userId, isChef });
        if (!cancelled && (res?.synced > 0 || res?.failed > 0)) onSyncedRef.current?.(res);
      } catch {
        /* vermutlich wieder offline → nächster Auslöser versucht es erneut */
      } finally {
        running = false;
      }
    };

    const onVisible = () => {
      if (!document.hidden) run();
    };

    run();
    window.addEventListener("online", run);
    // "Alle erneut versuchen" im Sync-Hinweis
    window.addEventListener("ma-queue-retry", run);
    document.addEventListener("visibilitychange", onVisible);
    const timer = setInterval(run, OFFLINE_SYNC_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.removeEventListener("online", run);
      window.removeEventListener("ma-queue-retry", run);
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(timer);
    };
  }, [userId, isChef]);
}
