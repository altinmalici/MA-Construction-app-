import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { UPDATE_EVENT, applyUpdate } from "../../lib/pwaUpdate.js";

/**
 * Hinweis "Neue Version verfügbar". Erscheint, sobald ein neuer Service
 * Worker bereitsteht. Neu geladen wird erst auf Tipp — nie mitten in einer
 * Eingabe.
 */
export default function UpdatePrompt() {
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const on = () => setReady(true);
    window.addEventListener(UPDATE_EVENT, on);
    return () => window.removeEventListener(UPDATE_EVENT, on);
  }, []);

  if (!ready) return null;
  return (
    <div
      role="status"
      style={{
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
        padding: "8px 14px",
        background: "#ede9fe",
        color: "#4c1d95",
        fontSize: 13,
        fontWeight: 600,
      }}
    >
      <span>Neue Version verfügbar</span>
      <button
        onClick={async () => {
          setBusy(true);
          try {
            await applyUpdate();
          } finally {
            setBusy(false);
          }
        }}
        disabled={busy}
        style={{
          minHeight: 44,
          padding: "0 14px",
          borderRadius: 10,
          border: "none",
          background: "#7C3AED",
          color: "white",
          fontWeight: 600,
          fontSize: 13,
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <RefreshCw size={14} />
        {busy ? "Lädt…" : "Aktualisieren"}
      </button>
    </div>
  );
}
