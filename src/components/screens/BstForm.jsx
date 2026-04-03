import { useState } from "react";
import { Check, Save } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { CS, BTN, IC } from "../../utils/helpers";
import { ScreenLayout } from "../ui";

const BstForm = () => {
  const { em, sb, data, actions, show, chef, nav, setSb, setEm, goBack } =
    useApp();
  const ex = em && sb ? data.baustellen.find((b) => b.id === sb.id) : null;
  const [f, sF] = useState({
    kunde: ex?.kunde || "",
    adresse: ex?.adresse || "",
    status: ex?.status || "geplant",
    fortschritt: ex?.fortschritt || 0,
    ansprechpartner: ex?.ansprechpartner || "",
    telefon: ex?.telefon || "",
    zugang: ex?.zugang || "",
    startdatum: ex?.startdatum || "",
    enddatum: ex?.enddatum || "",
    raeume: ex?.details?.raeume || "",
    flaeche: ex?.details?.flaeche || "",
    arbeiten: ex?.details?.arbeiten || "",
    bauleiter: ex?.details?.bauleiter || "",
    budget: ex?.budget || "",
    mitarbeiter: ex?.mitarbeiter || [],
    subunternehmer: ex?.subunternehmer || [],
    rechnungFirma: ex?.details?.rechnungFirma || "",
    rechnungAdresse: ex?.details?.rechnungAdresse || "",
    rechnungEmail: ex?.details?.rechnungEmail || "",
    rechnungUid: ex?.details?.rechnungUid || "",
  });
  const tg = (k, id) =>
    sF((p) => ({
      ...p,
      [k]: p[k].includes(id) ? p[k].filter((x) => x !== id) : [...p[k], id],
    }));
  const save = async () => {
    if (!f.kunde.trim()) {
      show("Name nötig", "error");
      return;
    }
    const bd = {
      ...f,
      budget: f.budget ? Number(f.budget) : 0,
      details: {
        raeume: f.raeume,
        flaeche: f.flaeche,
        arbeiten: f.arbeiten,
        bauleiter: f.bauleiter,
        rechnungFirma: f.rechnungFirma,
        rechnungAdresse: f.rechnungAdresse,
        rechnungEmail: f.rechnungEmail,
        rechnungUid: f.rechnungUid,
      },
    };
    try {
      if (ex) {
        await actions.baustellen.update(ex.id, bd);
        setSb({ ...bd, id: ex.id });
        show("Aktualisiert");
      } else {
        const newId = await actions.baustellen.create(bd);
        setSb({ ...bd, id: newId });
        show("Angelegt");
      }
      setEm(false);
      nav("bsd");
    } catch (e) {
      show("Fehler beim Speichern", "error");
    }
  };
  return (
    <ScreenLayout
      title={ex ? "Bearbeiten" : "Neue Baustelle"}
      onBack={() => {
        setEm(false);
        goBack();
      }}
    >
      {/* Card: Grunddaten */}
      <div
        style={{
          background: "white",
          borderRadius: 12,
          marginBottom: 16,
          overflow: "hidden",
          boxShadow: CS,
        }}
      >
        <div style={{ padding: "12px 16px" }}>
          <label
            style={{
              fontSize: 13,
              color: "#8e8e93",
              display: "block",
              marginBottom: 6,
            }}
          >
            Kunde *
          </label>
          <input
            value={f.kunde}
            onChange={(e) => sF({ ...f, kunde: e.target.value })}
            className={IC}
          />
        </div>
        <div
          style={{
            borderTop: "0.5px solid rgba(0,0,0,0.08)",
            padding: "12px 16px",
          }}
        >
          <label
            style={{
              fontSize: 13,
              color: "#8e8e93",
              display: "block",
              marginBottom: 6,
            }}
          >
            Adresse
          </label>
          <input
            value={f.adresse}
            onChange={(e) => sF({ ...f, adresse: e.target.value })}
            className={IC}
          />
        </div>
        <div
          style={{
            borderTop: "0.5px solid rgba(0,0,0,0.08)",
            padding: "12px 16px",
          }}
        >
          <label
            style={{
              fontSize: 13,
              color: "#8e8e93",
              display: "block",
              marginBottom: 6,
            }}
          >
            Status
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            {["geplant", "aktiv", "fertig", "abgerechnet"].map((s) => (
              <button
                key={s}
                onClick={() => sF({ ...f, status: s })}
                style={{
                  flex: 1,
                  padding: "10px 0",
                  borderRadius: 10,
                  fontSize: 12,
                  fontWeight: 500,
                  border: "none",
                  cursor: "pointer",
                  ...(f.status === s
                    ? { background: BTN, color: "white" }
                    : { background: "#f2f2f7", color: "#8e8e93" }),
                }}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Card: Kontakt */}
      <div
        style={{
          background: "white",
          borderRadius: 12,
          marginBottom: 16,
          overflow: "hidden",
          boxShadow: CS,
        }}
      >
        <div style={{ padding: "12px 16px" }}>
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}
          >
            <div>
              <label
                style={{
                  fontSize: 13,
                  color: "#8e8e93",
                  display: "block",
                  marginBottom: 6,
                }}
              >
                Kontakt
              </label>
              <input
                value={f.ansprechpartner}
                onChange={(e) => sF({ ...f, ansprechpartner: e.target.value })}
                className={IC}
              />
            </div>
            <div>
              <label
                style={{
                  fontSize: 13,
                  color: "#8e8e93",
                  display: "block",
                  marginBottom: 6,
                }}
              >
                Telefon
              </label>
              <input
                value={f.telefon}
                onChange={(e) => sF({ ...f, telefon: e.target.value })}
                className={IC}
              />
            </div>
          </div>
        </div>
        <div
          style={{
            borderTop: "0.5px solid rgba(0,0,0,0.08)",
            padding: "12px 16px",
          }}
        >
          <label
            style={{
              fontSize: 13,
              color: "#8e8e93",
              display: "block",
              marginBottom: 6,
            }}
          >
            Zugang
          </label>
          <input
            value={f.zugang}
            onChange={(e) => sF({ ...f, zugang: e.target.value })}
            className={IC}
          />
        </div>
      </div>

      {/* Card: Zeitraum & Budget */}
      <div
        style={{
          background: "white",
          borderRadius: 12,
          marginBottom: 16,
          overflow: "hidden",
          boxShadow: CS,
        }}
      >
        <div style={{ padding: "12px 16px" }}>
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}
          >
            <div>
              <label
                style={{
                  fontSize: 13,
                  color: "#8e8e93",
                  display: "block",
                  marginBottom: 6,
                }}
              >
                Start
              </label>
              <input
                type="date"
                value={f.startdatum}
                onChange={(e) => sF({ ...f, startdatum: e.target.value })}
                className={IC}
              />
            </div>
            <div>
              <label
                style={{
                  fontSize: 13,
                  color: "#8e8e93",
                  display: "block",
                  marginBottom: 6,
                }}
              >
                Ende
              </label>
              <input
                type="date"
                value={f.enddatum}
                onChange={(e) => sF({ ...f, enddatum: e.target.value })}
                className={IC}
              />
            </div>
          </div>
        </div>
        <div
          style={{
            borderTop: "0.5px solid rgba(0,0,0,0.08)",
            padding: "12px 16px",
          }}
        >
          <label
            style={{
              fontSize: 13,
              color: "#8e8e93",
              display: "block",
              marginBottom: 6,
            }}
          >
            Budget (€)
          </label>
          <input
            type="number"
            value={f.budget}
            onChange={(e) => sF({ ...f, budget: e.target.value })}
            placeholder="z.B. 50000"
            className={IC}
          />
        </div>
      </div>

      {/* Card: Details */}
      <div
        style={{
          background: "white",
          borderRadius: 12,
          marginBottom: 16,
          overflow: "hidden",
          boxShadow: CS,
        }}
      >
        <div style={{ padding: "12px 16px" }}>
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}
          >
            <div>
              <label
                style={{
                  fontSize: 13,
                  color: "#8e8e93",
                  display: "block",
                  marginBottom: 6,
                }}
              >
                Räume
              </label>
              <input
                value={f.raeume}
                onChange={(e) => sF({ ...f, raeume: e.target.value })}
                className={IC}
              />
            </div>
            <div>
              <label
                style={{
                  fontSize: 13,
                  color: "#8e8e93",
                  display: "block",
                  marginBottom: 6,
                }}
              >
                Fläche
              </label>
              <input
                value={f.flaeche}
                onChange={(e) => sF({ ...f, flaeche: e.target.value })}
                className={IC}
              />
            </div>
          </div>
        </div>
        <div
          style={{
            borderTop: "0.5px solid rgba(0,0,0,0.08)",
            padding: "12px 16px",
          }}
        >
          <label
            style={{
              fontSize: 13,
              color: "#8e8e93",
              display: "block",
              marginBottom: 6,
            }}
          >
            Arbeiten
          </label>
          <textarea
            value={f.arbeiten}
            onChange={(e) => sF({ ...f, arbeiten: e.target.value })}
            rows={2}
            className={IC + " resize-none"}
          />
        </div>
      </div>

      {/* Card: Team */}
      <div
        style={{
          background: "white",
          borderRadius: 12,
          marginBottom: 16,
          overflow: "hidden",
          boxShadow: CS,
        }}
      >
        <div style={{ padding: "12px 16px" }}>
          <p
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: "#000",
              marginBottom: 8,
            }}
          >
            Handwerker
          </p>
          {data.users.filter((u) => u.role === "mitarbeiter").length === 0 ? (
            <p style={{ fontSize: 13, color: "#8e8e93" }}>
              Noch keine Handwerker angelegt.{" "}
              <button
                onClick={() => nav("mitf")}
                style={{
                  color: "#3c3c43",
                  textDecoration: "underline",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 13,
                }}
              >
                Jetzt anlegen →
              </button>
            </p>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {data.users
                .filter((u) => u.role === "mitarbeiter")
                .map((u) => (
                  <button
                    key={u.id}
                    onClick={() => tg("mitarbeiter", u.id)}
                    style={{
                      padding: "8px 12px",
                      borderRadius: 10,
                      fontSize: 12,
                      fontWeight: 500,
                      border: "none",
                      cursor: "pointer",
                      ...(f.mitarbeiter.includes(u.id)
                        ? { background: BTN, color: "white" }
                        : { background: "#f2f2f7", color: "#8e8e93" }),
                    }}
                  >
                    {f.mitarbeiter.includes(u.id) && (
                      <Check
                        size={12}
                        style={{ display: "inline", marginRight: 4 }}
                      />
                    )}
                    {u.name}
                  </button>
                ))}
            </div>
          )}
        </div>
        <div
          style={{
            borderTop: "0.5px solid rgba(0,0,0,0.08)",
            padding: "12px 16px",
          }}
        >
          <p
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: "#000",
              marginBottom: 8,
            }}
          >
            Subunternehmer
          </p>
          {data.subunternehmer.length === 0 ? (
            <p style={{ fontSize: 13, color: "#8e8e93" }}>
              Noch keine Subunternehmer angelegt.{" "}
              <button
                onClick={() => nav("sub")}
                style={{
                  color: "#3c3c43",
                  textDecoration: "underline",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 13,
                }}
              >
                Jetzt anlegen →
              </button>
            </p>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {data.subunternehmer.map((s) => (
                <button
                  key={s.id}
                  onClick={() => tg("subunternehmer", s.id)}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 10,
                    fontSize: 12,
                    fontWeight: 500,
                    border: "none",
                    cursor: "pointer",
                    ...(f.subunternehmer.includes(s.id)
                      ? { background: BTN, color: "white" }
                      : { background: "#f2f2f7", color: "#8e8e93" }),
                  }}
                >
                  {f.subunternehmer.includes(s.id) && (
                    <Check
                      size={12}
                      style={{ display: "inline", marginRight: 4 }}
                    />
                  )}
                  {s.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Card: Rechnungsdaten (nur Chef) */}
      {chef && (
        <div
          style={{
            background: "white",
            borderRadius: 12,
            marginBottom: 16,
            overflow: "hidden",
            boxShadow: CS,
          }}
        >
          <div
            style={{
              padding: "12px 16px",
              borderBottom: "0.5px solid rgba(0,0,0,0.08)",
            }}
          >
            <p style={{ fontSize: 15, fontWeight: 600, color: "#000" }}>
              Rechnungsdaten
            </p>
          </div>
          <div style={{ padding: "12px 16px" }}>
            <label
              style={{
                fontSize: 13,
                color: "#8e8e93",
                display: "block",
                marginBottom: 6,
              }}
            >
              Firma / Auftraggeber
            </label>
            <input
              value={f.rechnungFirma}
              onChange={(e) => sF({ ...f, rechnungFirma: e.target.value })}
              className={IC}
            />
          </div>
          <div
            style={{
              borderTop: "0.5px solid rgba(0,0,0,0.08)",
              padding: "12px 16px",
            }}
          >
            <label
              style={{
                fontSize: 13,
                color: "#8e8e93",
                display: "block",
                marginBottom: 6,
              }}
            >
              Rechnungsadresse
            </label>
            <input
              value={f.rechnungAdresse}
              onChange={(e) => sF({ ...f, rechnungAdresse: e.target.value })}
              className={IC}
            />
          </div>
          <div
            style={{
              borderTop: "0.5px solid rgba(0,0,0,0.08)",
              padding: "12px 16px",
            }}
          >
            <label
              style={{
                fontSize: 13,
                color: "#8e8e93",
                display: "block",
                marginBottom: 6,
              }}
            >
              E-Mail
            </label>
            <input
              type="email"
              value={f.rechnungEmail}
              onChange={(e) => sF({ ...f, rechnungEmail: e.target.value })}
              className={IC}
            />
          </div>
          <div
            style={{
              borderTop: "0.5px solid rgba(0,0,0,0.08)",
              padding: "12px 16px",
            }}
          >
            <label
              style={{
                fontSize: 13,
                color: "#8e8e93",
                display: "block",
                marginBottom: 6,
              }}
            >
              UID / Steuernummer (optional)
            </label>
            <input
              value={f.rechnungUid}
              onChange={(e) => sF({ ...f, rechnungUid: e.target.value })}
              className={IC}
            />
          </div>
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
        <Save size={20} />
        {ex ? "Speichern" : "Anlegen"}
      </button>
    </ScreenLayout>
  );
};

export default BstForm;
