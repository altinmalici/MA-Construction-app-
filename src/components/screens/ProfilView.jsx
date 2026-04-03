import { useState } from "react";
import { Save, LogOut } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { bStd, P, G, RED, GREEN, CS, IC } from "../../utils/helpers";
import { ScreenLayout, Bdg } from "../ui";

const ProfilView = () => {
  const {
    cu,
    setCu,
    data,
    actions,
    show,
    chef,
    goBack,
    prevV,
    setHistory,
    setVRaw,
  } = useApp();
  const [editMode, setEditMode] = useState(false);
  const [name, setName] = useState(cu?.name || "");
  const [pin, setPin] = useState("");
  if (!cu) return null;
  const meineStd = data.stundeneintraege.filter(
    (e) => e.mitarbeiterId === cu.id,
  );
  const totalH = meineStd.reduce(
    (s, e) => s + parseFloat(bStd(e.beginn, e.ende, e.pause)),
    0,
  );
  const meineBs = chef
    ? data.baustellen
    : data.baustellen.filter((b) => b.mitarbeiter.includes(cu.id));

  const save = async () => {
    if (!name.trim()) {
      show("Name nötig", "error");
      return;
    }
    if (pin && !/^\d{4}$/.test(pin)) {
      show("PIN: 4 Ziffern", "error");
      return;
    }
    try {
      if (pin) {
        const pinTaken = await actions.users.checkPinExists(pin, cu.id);
        if (pinTaken) {
          show("PIN vergeben", "error");
          return;
        }
      }
      await actions.users.update(cu.id, {
        name: name.trim(),
        pin: pin || null,
        stundensatz: cu.stundensatz,
      });
      // Re-auth wenn PIN geändert wurde
      if (pin && cu.username) {
        try {
          await actions.auth.reAuthWithPin(cu.username, pin);
        } catch (e) {
          console.error('Re-auth nach PIN-Änderung fehlgeschlagen:', e);
        }
      }
      setCu((p) => ({ ...p, name: name.trim() }));
      setEditMode(false);
      setPin("");
      show("Gespeichert");
    } catch (e) {
      show("Fehler beim Speichern", "error");
    }
  };

  return (
    <ScreenLayout
      title={chef ? "Mein Profil" : "Profil"}
      large={!chef}
      onBack={chef ? goBack : prevV ? goBack : undefined}
      right={
        !editMode && (
          <button
            onClick={() => setEditMode(true)}
            style={{
              color: "#3c3c43",
              fontSize: 17,
              background: "none",
              border: "none",
            }}
          >
            Bearbeiten
          </button>
        )
      }
    >
      <div
        style={{ flex: 1, display: "flex", flexDirection: "column", gap: 20 }}
      >
        {/* Avatar & Name */}
        <div
          style={{
            background: "white",
            borderRadius: 12,
            padding: 20,
            boxShadow: CS,
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              background: G,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 12px",
            }}
          >
            <span style={{ color: "white", fontSize: 22, fontWeight: 700 }}>
              {cu.name
                .split(" ")
                .map((w) => w[0])
                .join("")
                .toUpperCase()}
            </span>
          </div>
          {editMode ? (
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={IC}
              style={{
                textAlign: "center",
                fontSize: 17,
                fontWeight: 600,
                background: "rgba(118,118,128,0.12)",
                border: "none",
                borderRadius: 10,
              }}
            />
          ) : (
            <p style={{ fontSize: 20, fontWeight: 600, color: "#000" }}>
              {cu.name}
            </p>
          )}
          <p style={{ fontSize: 13, color: "#8e8e93", marginTop: 4 }}>
            {chef ? "Bauleiter" : "Handwerker"}
          </p>
        </div>

        {/* Statistiken */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 8,
          }}
        >
          <div
            style={{
              background: "white",
              borderRadius: 12,
              padding: 14,
              boxShadow: CS,
              textAlign: "center",
            }}
          >
            <p style={{ fontSize: 24, fontWeight: 700, color: "#000" }}>
              {totalH.toFixed(0)}h
            </p>
            <p style={{ fontSize: 12, color: "#8e8e93" }}>Stunden</p>
          </div>
          <div
            style={{
              background: "white",
              borderRadius: 12,
              padding: 14,
              boxShadow: CS,
              textAlign: "center",
            }}
          >
            <p style={{ fontSize: 24, fontWeight: 700, color: "#000" }}>
              {meineStd.length}
            </p>
            <p style={{ fontSize: 12, color: "#8e8e93" }}>Einträge</p>
          </div>
          <div
            style={{
              background: "white",
              borderRadius: 12,
              padding: 14,
              boxShadow: CS,
              textAlign: "center",
            }}
          >
            <p style={{ fontSize: 24, fontWeight: 700, color: "#000" }}>
              {meineBs.length}
            </p>
            <p style={{ fontSize: 12, color: "#8e8e93" }}>Baustellen</p>
          </div>
        </div>

        {/* Einstellungen */}
        <div
          style={{
            background: "white",
            borderRadius: 12,
            overflow: "hidden",
            boxShadow: CS,
          }}
        >
          <div
            style={{
              padding: "14px 16px",
              borderBottom: "0.5px solid rgba(0,0,0,0.08)",
            }}
          >
            <p
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "#8e8e93",
                textTransform: "uppercase",
                letterSpacing: 0.5,
                marginBottom: 0,
              }}
            >
              Einstellungen
            </p>
          </div>
          <div>
            <div
              className="flex items-center justify-between"
              style={{
                padding: "12px 16px",
                borderBottom: "0.5px solid rgba(0,0,0,0.08)",
              }}
            >
              <div>
                <p style={{ fontSize: 15, color: "#000" }}>PIN</p>
                <p style={{ fontSize: 13, color: "#8e8e93" }}>Zugangs-Code</p>
              </div>
              {editMode ? (
                <input
                  maxLength={4}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                  placeholder="Neuer PIN"
                  style={{
                    width: 100,
                    textAlign: "right",
                    padding: "8px 12px",
                    borderRadius: 10,
                    background: "rgba(118,118,128,0.12)",
                    border: "none",
                    fontSize: 15,
                    color: "#000",
                    outline: "none",
                  }}
                />
              ) : (
                <p
                  style={{
                    fontSize: 15,
                    color: "#8e8e93",
                    fontFamily: "monospace",
                  }}
                >
                  ****
                </p>
              )}
            </div>
            <div
              className="flex items-center justify-between"
              style={{ padding: "12px 16px" }}
            >
              <div>
                <p style={{ fontSize: 15, color: "#000" }}>Rolle</p>
                <p style={{ fontSize: 13, color: "#8e8e93" }}>Berechtigung</p>
              </div>
              <Bdg text={chef ? "Bauleiter" : "Handwerker"} />
            </div>
          </div>
        </div>

        {/* Baustellen */}
        <div
          style={{
            background: "white",
            borderRadius: 12,
            overflow: "hidden",
            boxShadow: CS,
          }}
        >
          <div
            style={{
              padding: "14px 16px",
              borderBottom: "0.5px solid rgba(0,0,0,0.08)",
            }}
          >
            <p
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "#8e8e93",
                textTransform: "uppercase",
                letterSpacing: 0.5,
                marginBottom: 0,
              }}
            >
              {chef ? "Alle Baustellen" : "Meine Baustellen"}
            </p>
          </div>
          <div>
            {meineBs.length === 0 ? (
              <p
                style={{ padding: "12px 16px", fontSize: 13, color: "#8e8e93" }}
              >
                Keine Baustellen zugewiesen
              </p>
            ) : (
              meineBs.map((b, i) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between"
                  style={{
                    padding: "12px 16px",
                    borderTop: i > 0 ? "0.5px solid rgba(0,0,0,0.08)" : "none",
                  }}
                >
                  <div>
                    <p style={{ fontSize: 15, color: "#000" }}>{b.kunde}</p>
                    <p style={{ fontSize: 13, color: "#8e8e93" }}>
                      {b.adresse}
                    </p>
                  </div>
                  <Bdg
                    text={b.status}
                    color={
                      b.status === "aktiv"
                        ? GREEN
                        : b.status === "geplant"
                          ? P
                          : "#8e8e93"
                    }
                  />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Buttons */}
        {editMode ? (
          <div className="space-y-2">
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
                background: G,
                boxShadow: "0 2px 8px rgba(124,58,237,0.35)",
                border: "none",
              }}
            >
              <Save size={18} />
              Speichern
            </button>
            <button
              onClick={() => {
                setEditMode(false);
                setName(cu.name);
                setPin("");
              }}
              style={{
                width: "100%",
                padding: 12,
                fontSize: 15,
                color: "#8e8e93",
                background: "none",
                border: "none",
              }}
            >
              Abbrechen
            </button>
          </div>
        ) : (
          <>
            <div style={{ flex: 1 }} />
            <button
              onClick={async () => {
                try {
                  await actions.auth.signOut();
                } catch {}
                setCu(null);
                setHistory([]);
                setVRaw("login");
              }}
              style={{
                width: "100%",
                padding: "16px 24px",
                borderRadius: 14,
                color: RED,
                fontWeight: 600,
                fontSize: 17,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                background: "none",
                border: "none",
              }}
            >
              <LogOut size={18} />
              Abmelden
            </button>
          </>
        )}
      </div>
    </ScreenLayout>
  );
};

export default ProfilView;
