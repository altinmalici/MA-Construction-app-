import { useState } from "react";
import { Plus, User, Trash2, Edit3, Users, X } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { fE, genUsername, genPin, BTN, RED, GREEN, CS } from "../../utils/helpers";
import { Empty, Bdg, ScreenLayout } from "../ui";

const MitView = () => {
  const { data, actions, show, goBack, setEditUser, nav } =
    useApp();
  const ma = data.users.filter((u) => u.role === "mitarbeiter");
  const [resetInfo, setResetInfo] = useState(null);
  const getStatus = (u) => {
    if (!u.isActive) return { color: RED, text: "Deaktiviert" };
    if (!u.isOnboarded) {
      const exp =
        u.onboardingPinExpiry && new Date(u.onboardingPinExpiry) < new Date();
      return exp
        ? { color: RED, text: "PIN abgelaufen" }
        : { color: "#FF9500", text: "Eingeladen" };
    }
    return { color: GREEN, text: "Aktiv" };
  };
  const resetPin = async (m) => {
    const pin = genPin();
    let username = m.username;
    if (!username) {
      const existing = data.users.map((u) => u.username).filter(Boolean);
      username = genUsername(m.name, existing);
    }
    try {
      await actions.users.resetOnboardingPin(m.id, pin, username);
      setResetInfo({ name: m.name, username, pin });
      show("Neuer PIN erstellt");
    } catch (e) {
      show("Fehler", "error");
    }
  };
  const toggleActive = async (m) => {
    try {
      await actions.users.toggleActive(m.id, !m.isActive);
      show(m.isActive ? "Deaktiviert" : "Aktiviert");
    } catch (e) {
      show("Fehler", "error");
    }
  };
  const del = async (id) => {
    if (confirm("Endgültig löschen?")) {
      try {
        await actions.users.remove(id);
        show("Gelöscht");
      } catch (e) {
        show("Fehler", "error");
      }
    }
  };
  const shareWA = (info) => {
    const text = `Hallo ${info.name}!\n\nDein Zugang zur MA Construction App:\n\nBenutzername: ${info.username}\nEinladungs-PIN: ${info.pin}\n\nGültig für 7 Tage.\n\nApp: ${window.location.origin}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`);
  };
  return (
    <ScreenLayout
      title="Handwerker"
      onBack={goBack}
      right={
        <button
          onClick={() => {
            setEditUser(null);
            nav("mitf");
          }}
          style={{
            padding: 8,
            borderRadius: 10,
            color: "white",
            background: BTN,
            border: "none",
            cursor: "pointer",
          }}
        >
          <Plus size={18} />
        </button>
      }
    >
      {resetInfo && (
        <div
          style={{
            background: "white",
            borderRadius: 12,
            padding: 16,
            boxShadow: CS,
            marginBottom: 12,
          }}
        >
          <div
            className="flex items-center justify-between"
            style={{ marginBottom: 8 }}
          >
            <p style={{ fontSize: 15, fontWeight: 600, color: "#000" }}>
              Neuer Einladungs-PIN
            </p>
            <button
              onClick={() => setResetInfo(null)}
              style={{
                background: "none",
                border: "none",
                color: "#8e8e93",
                padding: 4,
              }}
            >
              <X size={16} />
            </button>
          </div>
          <div
            style={{
              background: "#f2f2f7",
              borderRadius: 10,
              padding: 12,
              marginBottom: 12,
            }}
          >
            <p style={{ fontSize: 13, color: "#8e8e93" }}>Benutzername</p>
            <p
              style={{
                fontSize: 17,
                fontWeight: 600,
                color: "#000",
                marginBottom: 8,
              }}
            >
              {resetInfo.username}
            </p>
            <p style={{ fontSize: 13, color: "#8e8e93" }}>PIN</p>
            <p
              style={{
                fontSize: 28,
                fontWeight: 700,
                color: "#000",
                letterSpacing: 4,
              }}
            >
              {resetInfo.pin}
            </p>
          </div>
          <button
            onClick={() => shareWA(resetInfo)}
            style={{
              width: "100%",
              padding: "12px 16px",
              borderRadius: 12,
              color: "white",
              fontWeight: 600,
              fontSize: 15,
              background: "#25D366",
              border: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            Per WhatsApp senden
          </button>
        </div>
      )}
      <div className="space-y-2">
        {ma.length === 0 ? (
          <Empty icon={Users} text="Noch keine Handwerker angelegt" />
        ) : (
          ma.map((m) => {
            const bs = data.baustellen.filter((b) =>
              (b.mitarbeiter || []).includes(m.id),
            );
            const st = getStatus(m);
            return (
              <div
                key={m.id}
                style={{
                  padding: 16,
                  borderRadius: 12,
                  background: "white",
                  boxShadow: CS,
                  opacity: m.isActive ? 1 : 0.6,
                }}
              >
                <div
                  className="flex items-center gap-3"
                  style={{ marginBottom: 8 }}
                >
                  <div style={{ position: "relative" }}>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        background: "rgba(0,0,0,0.06)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <User size={16} style={{ color: "#3c3c43" }} />
                    </div>
                    <div
                      style={{
                        position: "absolute",
                        bottom: -2,
                        right: -2,
                        width: 10,
                        height: 10,
                        borderRadius: 5,
                        background: st.color,
                        border: "2px solid white",
                      }}
                    />
                  </div>
                  <div className="flex-1">
                    <p style={{ fontSize: 15, color: "#000" }}>{m.name}</p>
                    <p style={{ fontSize: 13, color: "#8e8e93" }}>
                      {m.username ? `@${m.username}` : ""}
                      {m.username ? " · " : ""}
                      {fE(m.stundensatz || 45)}/h
                    </p>
                  </div>
                  <Bdg text={st.text} color={st.color} />
                </div>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 4,
                    marginBottom: 8,
                  }}
                >
                  {bs.length === 0 ? (
                    <span style={{ fontSize: 13, color: "#8e8e93" }}>
                      Keine Baustellen
                    </span>
                  ) : (
                    bs.map((b) => <Bdg key={b.id} text={b.kunde} />)
                  )}
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: 6,
                    borderTop: "0.5px solid rgba(0,0,0,0.08)",
                    paddingTop: 8,
                    flexWrap: "wrap",
                  }}
                >
                  <button
                    onClick={() => {
                      setEditUser(m);
                      nav("mitf");
                    }}
                    style={{
                      flex: 1,
                      padding: "8px 12px",
                      borderRadius: 10,
                      fontSize: 13,
                      fontWeight: 600,
                      color: "#3c3c43",
                      background: "rgba(0,0,0,0.06)",
                      border: "none",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 4,
                    }}
                  >
                    <Edit3 size={14} />
                    Bearbeiten
                  </button>
                  {m.isActive && (
                    <button
                      onClick={() => resetPin(m)}
                      style={{
                        flex: 1,
                        padding: "8px 12px",
                        borderRadius: 10,
                        fontSize: 13,
                        fontWeight: 600,
                        color: "#FF9500",
                        background: "#FF950012",
                        border: "none",
                      }}
                    >
                      PIN zurücksetzen
                    </button>
                  )}
                  <button
                    onClick={() => toggleActive(m)}
                    style={{
                      padding: "8px 12px",
                      borderRadius: 10,
                      fontSize: 13,
                      fontWeight: 600,
                      color: m.isActive ? RED : GREEN,
                      background: m.isActive ? `${RED}12` : `${GREEN}12`,
                      border: "none",
                    }}
                  >
                    {m.isActive ? "Deaktivieren" : "Aktivieren"}
                  </button>
                  <button
                    onClick={() => del(m.id)}
                    style={{
                      padding: "8px",
                      borderRadius: 10,
                      color: "#c7c7cc",
                      background: "none",
                      border: "none",
                    }}
                  >
                    <Trash2 size={14} />
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

export default MitView;
