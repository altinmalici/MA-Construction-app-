import { AlertCircle, Clock, Bell, X } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { RED, CS } from "../../utils/helpers";
import { Empty, ScreenLayout } from "../ui";

const NotifView = () => {
  const { data, actions, show, goBack } = useApp();
  const markAll = async () => {
    try {
      await actions.benachrichtigungen.markAllRead();
    } catch (e) {
      show("Fehler", "error");
    }
  };
  const clearAll = async () => {
    if (confirm("Alle Benachrichtigungen löschen?")) {
      try {
        await actions.benachrichtigungen.removeAll();
        show("Alle gelöscht");
      } catch (e) {
        show("Fehler", "error");
      }
    }
  };
  const delN = async (id) => {
    try {
      await actions.benachrichtigungen.remove(id);
    } catch (e) {
      show("Fehler", "error");
    }
  };
  const ti = { mangel: AlertCircle, stunden: Clock, info: Bell };
  return (
    <ScreenLayout
      title="Mitteilungen"
      onBack={goBack}
      right={
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={markAll}
            style={{
              fontSize: 12,
              color: "#3c3c43",
              background: "none",
              border: "none",
              cursor: "pointer",
            }}
          >
            Alle gelesen
          </button>
          {data.benachrichtigungen.length > 0 && (
            <button
              onClick={clearAll}
              style={{
                fontSize: 12,
                color: RED,
                background: "none",
                border: "none",
                cursor: "pointer",
              }}
            >
              Alle löschen
            </button>
          )}
        </div>
      }
    >
      <div className="space-y-2">
        {data.benachrichtigungen.length === 0 ? (
          <Empty icon={Bell} text="Keine Benachrichtigungen" />
        ) : (
          data.benachrichtigungen.map((n) => {
            const I = ti[n.typ] || Bell;
            const bs = data.baustellen.find((b) => b.id === n.baustelleId);
            return (
              <div
                key={n.id}
                style={{
                  padding: 16,
                  borderRadius: 12,
                  background: n.gelesen ? "#f2f2f7" : "white",
                  boxShadow: n.gelesen ? "none" : CS,
                }}
              >
                <div className="flex items-start gap-3">
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: "rgba(0,0,0,0.06)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <I size={16} style={{ color: "#8e8e93" }} />
                  </div>
                  <div className="flex-1">
                    <p
                      style={{
                        fontSize: 15,
                        color: n.gelesen ? "#8e8e93" : "#000",
                      }}
                    >
                      {n.text}
                    </p>
                    <p style={{ fontSize: 13, color: "#8e8e93" }}>
                      {bs?.kunde || "Unbekannt"} ·{" "}
                      {new Date(n.datum).toLocaleString("de-DE", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <button
                    onClick={() => delN(n.id)}
                    style={{
                      padding: 8,
                      color: "#c7c7cc",
                      background: "none",
                      border: "none",
                      flexShrink: 0,
                    }}
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </ScreenLayout>
  );
};

export default NotifView;
