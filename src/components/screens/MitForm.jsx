import { useState, useEffect } from "react";
import { Save, UserPlus, CheckCircle } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { genUsername, genPin, IC, BTN, GREEN, CS } from "../../utils/helpers";
import { ScreenLayout } from "../ui";

const MitForm = () => {
  const {
    editUser,
    setEditUser,
    data,
    actions,
    show,
    goBack,
    setMitSummary,
    mitSummary,
  } = useApp();
  const ex = editUser ? data.users.find((u) => u.id === editUser.id) : null;
  const [n, setN] = useState(ex?.name || "");
  const [ss, setSs] = useState(String(ex?.stundensatz || 45));
  const [un, setUn] = useState(ex?.username || "");
  useEffect(() => {
    if (ex || !n.trim()) {
      if (!ex) setUn("");
      return;
    }
    const existing = data.users.map((u) => u.username).filter(Boolean);
    setUn(genUsername(n.trim(), existing));
  }, [n]);
  const save = async () => {
    if (!n.trim()) {
      show("Name nötig", "error");
      return;
    }
    if (!ex && !un.trim()) {
      show("Benutzername nötig", "error");
      return;
    }
    try {
      if (ex) {
        await actions.users.update(ex.id, {
          name: n.trim(),
          stundensatz: Number(ss) || 45,
        });
        show("Gespeichert");
        setEditUser(null);
        goBack();
      } else {
        const pin = genPin();
        await actions.users.createForOnboarding({
          name: n.trim(),
          username: un.trim().toLowerCase(),
          stundensatz: Number(ss) || 45,
          onboardingPin: pin,
        });
        setMitSummary({
          name: n.trim(),
          username: un.trim().toLowerCase(),
          pin,
        });
      }
    } catch (e) {
      show(
        e.message?.includes("duplicate") || e.code === "23505"
          ? "Benutzername bereits vergeben"
          : "Fehler beim Speichern",
        "error",
      );
    }
  };
  const closeSummary = () => {
    setMitSummary(null);
    setEditUser(null);
    goBack();
  };
  const shareWA = () => {
    const text = `Hallo ${mitSummary.name}!\n\nDein Zugang zur MA Construction App:\n\nBenutzername: ${mitSummary.username}\nEinmal-PIN: ${mitSummary.pin}\n\nGültig für 7 Tage.\n\nApp: ${window.location.origin}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`);
  };

  if (mitSummary)
    return (
      <ScreenLayout title="Mitarbeiter angelegt" onBack={closeSummary}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 20,
              background: `${GREEN}15`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 12px",
            }}
          >
            <CheckCircle size={28} style={{ color: GREEN }} />
          </div>
          <p style={{ fontSize: 20, fontWeight: 600, color: "#000" }}>
            {mitSummary.name}
          </p>
          <p style={{ fontSize: 15, color: "#8e8e93" }}>
            wurde erfolgreich angelegt
          </p>
        </div>
        <div
          style={{
            background: "white",
            borderRadius: 12,
            padding: 16,
            boxShadow: CS,
            marginBottom: 16,
          }}
        >
          <div style={{ background: "#f2f2f7", borderRadius: 10, padding: 16 }}>
            <p style={{ fontSize: 13, color: "#8e8e93", marginBottom: 4 }}>
              Benutzername
            </p>
            <p
              style={{
                fontSize: 17,
                fontWeight: 600,
                color: "#000",
                marginBottom: 12,
              }}
            >
              {mitSummary.username}
            </p>
            <p style={{ fontSize: 13, color: "#8e8e93", marginBottom: 4 }}>
              Einmal-PIN
            </p>
            <p
              style={{
                fontSize: 28,
                fontWeight: 700,
                color: "#000",
                letterSpacing: 4,
              }}
            >
              {mitSummary.pin}
            </p>
            <p style={{ fontSize: 12, color: "#8e8e93", marginTop: 8 }}>
              Gültig für 7 Tage
            </p>
          </div>
        </div>
        <button
          onClick={shareWA}
          style={{
            width: "100%",
            padding: "16px 24px",
            borderRadius: 14,
            color: "white",
            fontWeight: 600,
            fontSize: 17,
            background: "#25D366",
            border: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            marginBottom: 12,
            boxShadow: "0 2px 8px rgba(37,211,102,0.35)",
          }}
        >
          Per WhatsApp senden
        </button>
        <button
          onClick={closeSummary}
          style={{
            width: "100%",
            padding: 12,
            fontSize: 15,
            color: "#8e8e93",
            background: "none",
            border: "none",
          }}
        >
          Fertig
        </button>
      </ScreenLayout>
    );

  return (
    <ScreenLayout
      title={ex ? "Handwerker bearbeiten" : "Neuer Handwerker"}
      onBack={() => {
        setEditUser(null);
        goBack();
      }}
    >
      <div className="space-y-2">
        <div
          style={{
            background: "white",
            borderRadius: 12,
            overflow: "hidden",
            boxShadow: CS,
            marginBottom: 16,
          }}
        >
          <div style={{ padding: "12px 16px" }}>
            <label
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: "#8e8e93",
                textTransform: "uppercase",
                letterSpacing: 0.4,
                display: "block",
                marginBottom: 6,
              }}
            >
              Name *
            </label>
            <input
              value={n}
              onChange={(e) => setN(e.target.value)}
              placeholder="Vor- und Nachname"
              className={IC}
              style={{ background: "rgba(118,118,128,0.12)", border: "none" }}
            />
          </div>
          {!ex && (
            <div
              style={{
                borderTop: "0.5px solid rgba(0,0,0,0.08)",
                padding: "12px 16px",
              }}
            >
              <label
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: "#8e8e93",
                  textTransform: "uppercase",
                  letterSpacing: 0.4,
                  display: "block",
                  marginBottom: 6,
                }}
              >
                Benutzername *
              </label>
              <input
                value={un}
                onChange={(e) =>
                  setUn(e.target.value.toLowerCase().replace(/[^a-z0-9.]/g, ""))
                }
                placeholder="wird automatisch erstellt"
                className={IC}
                style={{ background: "rgba(118,118,128,0.12)", border: "none" }}
                autoCapitalize="none"
              />
              <p style={{ fontSize: 12, color: "#8e8e93", marginTop: 4 }}>
                Wird automatisch aus dem Namen erstellt
              </p>
            </div>
          )}
          <div
            style={{
              borderTop: "0.5px solid rgba(0,0,0,0.08)",
              padding: "12px 16px",
            }}
          >
            <label
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: "#8e8e93",
                textTransform: "uppercase",
                letterSpacing: 0.4,
                display: "block",
                marginBottom: 6,
              }}
            >
              Stundensatz (€/h)
            </label>
            <input
              type="number"
              value={ss}
              onChange={(e) => setSs(e.target.value)}
              placeholder="45"
              className={IC}
              style={{ background: "rgba(118,118,128,0.12)", border: "none" }}
            />
          </div>
        </div>
        {!ex && (
          <div
            style={{
              background: "rgba(0,0,0,0.04)",
              borderRadius: 12,
              padding: 14,
              marginBottom: 16,
            }}
          >
            <p style={{ fontSize: 13, color: "#3c3c43", fontWeight: 500 }}>
              Nach dem Anlegen erhältst du einen Einladungs-PIN zum Versenden
              per WhatsApp.
            </p>
          </div>
        )}
        <button
          onClick={save}
          style={{
            width: "100%",
            padding: "16px 24px",
            borderRadius: 14,
            color: "white",
            fontWeight: 600,
            fontSize: 17,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            background: BTN,
            boxShadow: "0 2px 8px rgba(124,58,237,0.35)",
            border: "none",
          }}
        >
          {ex ? (
            <>
              <Save size={18} />
              Speichern
            </>
          ) : (
            <>
              <UserPlus size={18} />
              Anlegen
            </>
          )}
        </button>
      </div>
    </ScreenLayout>
  );
};

export default MitForm;
