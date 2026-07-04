import { useState, useEffect } from "react";
import { WifiOff } from "lucide-react";

/**
 * Dünner Hinweis-Balken bei fehlender Internetverbindung.
 *
 * Auf der Baustelle mit schlechtem Empfang lädt/speichert die App sonst
 * scheinbar "einfach nicht" — ohne Erklärung. Der Balken macht den Zustand
 * sichtbar. Verwaltet seinen eigenen Status (kein Context nötig) und rendert
 * nur, wenn wirklich offline.
 */
export default function OfflineBanner() {
  const [offline, setOffline] = useState(
    typeof navigator !== "undefined" && navigator.onLine === false,
  );
  useEffect(() => {
    const goOnline = () => setOffline(false);
    const goOffline = () => setOffline(true);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      role="status"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 60,
        background: "#ff9500",
        color: "white",
        fontSize: 13,
        fontWeight: 600,
        padding: "6px 12px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
      }}
    >
      <WifiOff size={14} />
      Keine Internetverbindung
    </div>
  );
}
