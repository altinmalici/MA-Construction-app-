import { useState, useEffect } from "react";
import { RefreshCw, AlertTriangle, X } from "lucide-react";
import {
  getPending,
  getFailed,
  gehoertZu,
  retryFailed,
  dequeue,
} from "../../lib/offlineQueue.js";

const snapshot = () => ({ pending: getPending(), failed: getFailed() });

/**
 * Zeigt, was mit offline erfassten Stunden los ist — bei Lohn-Daten darf
 * nichts unbemerkt hängen bleiben:
 *  - wartend:  wird automatisch gesendet (nur online sichtbar; offline zeigt
 *              bereits der OfflineBanner)
 *  - fremd:    gehört einem Kollegen an diesem Gerät, wartet auf dessen
 *              Anmeldung (oder die des Chefs)
 *  - abgelehnt: die Datenbank hat den Eintrag endgültig abgelehnt → antippen,
 *              Grund lesen, erneut versuchen oder verwerfen
 */
export default function PendingSyncBadge({ userId, isChef = false, baustellen = [] }) {
  const [state, setState] = useState(snapshot);
  const [online, setOnline] = useState(
    () => typeof navigator === "undefined" || navigator.onLine !== false,
  );
  const [open, setOpen] = useState(false);
  const [confirmId, setConfirmId] = useState(null);

  useEffect(() => {
    const update = () => {
      setState(snapshot());
      setOnline(typeof navigator === "undefined" || navigator.onLine !== false);
    };
    update();
    window.addEventListener("ma-queue-change", update);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    const t = setInterval(update, 5000); // Fallback-Poll
    return () => {
      window.removeEventListener("ma-queue-change", update);
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
      clearInterval(t);
    };
  }, []);

  const failed = state.failed;
  const mine = state.pending.filter((i) => gehoertZu(i, userId, isChef));
  const fremd = state.pending.length - mine.length;

  const bar = {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 55,
    fontSize: 12.5,
    fontWeight: 600,
    padding: "5px 12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    border: "none",
    width: "100%",
  };

  const bsName = (id) => baustellen.find((b) => b.id === id)?.kunde || "Baustelle";

  if (failed.length > 0) {
    return (
      <>
        <button
          onClick={() => setOpen(true)}
          style={{ ...bar, background: "#fff1f0", color: "#c62828", minHeight: 44, cursor: "pointer" }}
        >
          <AlertTriangle size={14} />
          {failed.length === 1
            ? "1 Eintrag nicht synchronisiert – antippen"
            : `${failed.length} Einträge nicht synchronisiert – antippen`}
        </button>
        {open && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Nicht synchronisierte Einträge"
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 1200,
              background: "#f2f2f7",
              display: "flex",
              flexDirection: "column",
              padding: "calc(var(--safe-top, 0px) + 16px) 20px calc(var(--safe-bottom, 0px) + 16px)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: "#000" }}>Nicht synchronisiert</h2>
              <button
                onClick={() => {
                  setOpen(false);
                  setConfirmId(null);
                }}
                aria-label="Schließen"
                style={{ width: 44, height: 44, border: "none", background: "none", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                <X size={22} />
              </button>
            </div>
            <p style={{ fontSize: 14, color: "#3c3c43", marginBottom: 12 }}>
              Diese offline erfassten Stunden hat der Server abgelehnt. Sie sind
              noch auf diesem Gerät gespeichert. Bitte dem Chef Bescheid geben
              oder nach Klärung erneut versuchen.
            </p>
            <div style={{ flex: 1, minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
              {failed.map((item) => (
                <div key={item.id} style={{ background: "white", borderRadius: 12, padding: 14 }}>
                  <p style={{ fontSize: 15, fontWeight: 600, color: "#000" }}>
                    {bsName(item.entry?.baustelleId)} · {item.entry?.datum || "ohne Datum"}
                  </p>
                  <p style={{ fontSize: 13, color: "#3c3c43" }}>
                    {item.entry?.beginn}–{item.entry?.ende}
                    {item.entry?.arbeit ? ` · ${item.entry.arbeit}` : ""}
                  </p>
                  <p style={{ fontSize: 13, color: "#c62828", marginTop: 4 }}>
                    Grund: {item.failed?.grund}
                  </p>
                  {confirmId === item.id ? (
                    <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                      <button
                        onClick={() => {
                          dequeue(item.id);
                          setConfirmId(null);
                        }}
                        style={{ flex: 1, minHeight: 44, borderRadius: 10, border: "none", background: "#FF3B30", color: "white", fontWeight: 600, fontSize: 14 }}
                      >
                        Endgültig verwerfen
                      </button>
                      <button
                        onClick={() => setConfirmId(null)}
                        style={{ flex: 1, minHeight: 44, borderRadius: 10, border: "none", background: "rgba(0,0,0,0.06)", color: "#000", fontWeight: 600, fontSize: 14 }}
                      >
                        Behalten
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmId(item.id)}
                      style={{ marginTop: 10, minHeight: 44, padding: "0 14px", borderRadius: 10, border: "none", background: "rgba(0,0,0,0.06)", color: "#c62828", fontWeight: 600, fontSize: 14 }}
                    >
                      Verwerfen
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              onClick={() => {
                // Zurück auf "wartend" → der nächste Sync-Lauf versucht es neu.
                retryFailed();
                setOpen(false);
                setConfirmId(null);
                window.dispatchEvent(new Event("ma-queue-retry"));
              }}
              style={{ marginTop: 12, minHeight: 50, borderRadius: 14, border: "none", background: "#7C3AED", color: "white", fontWeight: 600, fontSize: 16 }}
            >
              Alle erneut versuchen
            </button>
          </div>
        )}
      </>
    );
  }

  if (!online) return null;

  if (mine.length > 0) {
    return (
      <div role="status" style={{ ...bar, background: "#eef2ff", color: "#4338ca" }}>
        <RefreshCw size={13} />
        {mine.length === 1
          ? "1 Eintrag wird synchronisiert…"
          : `${mine.length} Einträge werden synchronisiert…`}
      </div>
    );
  }

  if (fremd > 0) {
    return (
      <div role="status" style={{ ...bar, background: "#fff8e1", color: "#8a5a00" }}>
        <RefreshCw size={13} />
        {fremd === 1
          ? "1 Eintrag eines Kollegen wartet auf dessen Anmeldung"
          : `${fremd} Einträge von Kollegen warten auf deren Anmeldung`}
      </div>
    );
  }

  return null;
}
