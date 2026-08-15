import { useState, useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { queueSize } from "../../lib/offlineQueue.js";

/**
 * Dezenter Hinweis, wenn offline erfasste Stunden noch auf Synchronisierung
 * warten. Wichtig bei Lohn-Daten: der Nutzer sieht, dass nichts unbemerkt
 * haengen bleibt. Erscheint nur ONLINE (offline zeigt bereits der
 * OfflineBanner) und nur wenn tatsaechlich etwas wartet.
 */
export default function PendingSyncBadge() {
  const [count, setCount] = useState(() => queueSize());

  useEffect(() => {
    const update = () => setCount(queueSize());
    update();
    window.addEventListener("ma-queue-change", update);
    window.addEventListener("online", update);
    const t = setInterval(update, 5000); // Fallback-Poll
    return () => {
      window.removeEventListener("ma-queue-change", update);
      window.removeEventListener("online", update);
      clearInterval(t);
    };
  }, []);

  const offline =
    typeof navigator !== "undefined" && navigator.onLine === false;
  if (count <= 0 || offline) return null;

  return (
    <div
      role="status"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 55,
        background: "#eef2ff",
        color: "#4338ca",
        fontSize: 12.5,
        fontWeight: 600,
        padding: "5px 12px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
      }}
    >
      <RefreshCw size={13} />
      {count === 1
        ? "1 Eintrag wird synchronisiert…"
        : `${count} Einträge werden synchronisiert…`}
    </div>
  );
}
