import { useState } from "react";
import { Save, UserPlus, CheckCircle } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { genUsername, genPin, parseDecimal, USERNAME_RE, IC, BTN, GREEN, CS } from "../../utils/helpers";
import { ScreenLayout, Spinner, InviteCard } from "../ui";
import { fehlerText } from "../../utils/errors";
import { inviteLink } from "../../utils/invite";
import { ONBOARDING_LINK_MODE } from "../../config";
import { useSaving } from "../../hooks/useSaving";

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
  const { saving, withSaving } = useSaving();
  const ex = editUser ? data.users.find((u) => u.id === editUser.id) : null;
  const [n, setN] = useState(ex?.name || "");
  const [ss, setSs] = useState(String(ex?.stundensatz || 45));
  const [un, setUn] = useState(ex?.username || "");
  // Benutzername folgt dem Namen, solange ein NEUER Mitarbeiter angelegt wird.
  // Sobald der Chef den Benutzernamen von Hand ändert, bleibt er stehen, bis
  // der Name erneut geändert wird.
  const onNameChange = (value) => {
    setN(value);
    if (ex) return;
    if (!value.trim()) {
      setUn("");
      return;
    }
    const existing = data.users.map((u) => u.username).filter(Boolean);
    setUn(genUsername(value.trim(), existing));
  };
  const save = () =>
    withSaving(async () => {
      if (!n.trim()) {
        show("Name nötig", "error");
        return;
      }
      const username = un.trim().toLowerCase();
      if (!ex && !username) {
        show("Benutzername nötig", "error");
        return;
      }
      if (!ex && !USERNAME_RE.test(username)) {
        show(
          "Benutzername: 2–31 Zeichen, nur a–z, 0–9, Punkt und Bindestrich",
          "error",
        );
        return;
      }
      try {
        if (ex) {
          await actions.users.update(ex.id, {
            name: n.trim(),
            stundensatz: parseDecimal(ss) || 45,
          });
          show("Gespeichert");
          setEditUser(null);
          goBack();
        } else {
          const pin = genPin();
          const id = await actions.users.createForOnboarding({
            name: n.trim(),
            username,
            stundensatz: parseDecimal(ss) || 45,
            onboardingPin: pin,
          });
          // Ab hier ist der Mitarbeiter angelegt. Der Einladungs-Link ist
          // die bequemere Variante; gibt es die DB-Funktion noch nicht (oder
          // schlägt sie fehl), bleibt der Einladungs-PIN — die Anlage gilt
          // in jedem Fall als gelungen und der PIN wird angezeigt.
          let link = null;
          if (ONBOARDING_LINK_MODE !== "0" && id) {
            try {
              link = inviteLink(await actions.users.createOnboardingToken(id));
            } catch (linkErr) {
              console.warn("[MitForm] Einladungs-Link nicht verfügbar, nutze PIN:", linkErr?.message);
            }
          }
          setMitSummary({ name: n.trim(), username, pin, link });
        }
      } catch (e) {
        console.error("[MitForm.save]", e);
        const dup = e?.code === "23505" || /duplicate/i.test(e?.message || "");
        // Kennt die App den Benutzernamen nicht, liegt ein altes Auth-Konto
        // ohne Profil im Weg (z.B. nach einem abgebrochenen Löschen).
        const bekannt = data.users.some((u) => u.username === username);
        show(
          dup
            ? bekannt || ex
              ? "Benutzername bereits vergeben"
              : 'Benutzername ist durch ein altes Konto belegt – unter Handwerker "Verwaiste Konten bereinigen" antippen und erneut speichern'
            : `Nicht gespeichert: ${fehlerText(e, "Bitte erneut versuchen.")}`,
          "error",
        );
      }
    });
  const closeSummary = () => {
    setMitSummary(null);
    setEditUser(null);
    goBack();
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
            wurde angelegt – jetzt die Einladung schicken
          </p>
        </div>
        <div style={{ marginBottom: 16 }}>
          <InviteCard info={mitSummary} show={show} />
        </div>
        <button
          onClick={closeSummary}
          style={{
            width: "100%",
            padding: 12,
            minHeight: 44,
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
              onChange={(e) => onNameChange(e.target.value)}
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
              type="text"
              inputMode="decimal"
              pattern="[0-9]*[.,]?[0-9]*"
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
          disabled={saving}
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
            opacity: saving ? 0.6 : 1,
            cursor: saving ? "not-allowed" : "pointer",
          }}
        >
          {saving ? (
            <>
              <Spinner size={18} color="white" />
              Speichere...
            </>
          ) : ex ? (
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
