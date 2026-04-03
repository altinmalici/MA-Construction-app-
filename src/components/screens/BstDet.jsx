import {
  ChevronLeft,
  Edit3,
  Trash2,
  Clock,
  AlertCircle,
  Paperclip,
  ClipboardList,
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import { P, CS, BTN, RED, fK, bStd } from "../../utils/helpers";
import { ScreenLayout, PBar, Bdg } from "../ui";

const BstDet = () => {
  const { sb, data, chef, goBack, actions, show, nav, setEm, eName } =
    useApp();
  const b = sb;
  if (!b) return null;
  const fr = data.baustellen.find((x) => x.id === b.id) || b;
  const ei = data.stundeneintraege.filter((e) => e.baustelleId === b.id);
  const mg = data.maengel.filter((m) => m.baustelleId === b.id);
  const del = async () => {
    if (confirm("Löschen?")) {
      try {
        await actions.baustellen.remove(b.id);
        show("Gelöscht");
        nav("bst");
      } catch (e) {
        show("Fehler beim Löschen", "error");
      }
    }
  };
  return (
    <ScreenLayout>
      {/* Nav-Bar */}
      <div
        style={{
          paddingBottom: 8,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <button
          onClick={goBack}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            color: P,
            background: "none",
            border: "none",
          }}
        >
          <ChevronLeft size={20} />
          <span style={{ fontSize: 17 }}>Zurück</span>
        </button>
        {chef && (
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={() => {
                setEm(true);
                nav("bsf");
              }}
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                background: "rgba(0,0,0,0.05)",
                border: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Edit3 size={18} style={{ color: "#3c3c43" }} />
            </button>
            <button
              onClick={del}
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                background: "rgba(0,0,0,0.05)",
                border: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Trash2 size={18} style={{ color: "#3c3c43" }} />
            </button>
          </div>
        )}
      </div>
      {/* Titel + restlicher Inhalt */}
      <h1
        style={{
          fontSize: 28,
          fontWeight: 700,
          color: "#000",
          letterSpacing: "-0.5px",
          marginBottom: 16,
        }}
      >
        {fr.kunde}
      </h1>
      {/* Fortschritt */}
      <div
        style={{
          background: "white",
          borderRadius: 12,
          padding: 16,
          marginBottom: 16,
          boxShadow: CS,
        }}
      >
        <div
          className="flex justify-between items-center"
          style={{ marginBottom: 8 }}
        >
          <span style={{ fontSize: 13, color: "#8e8e93" }}>Baufortschritt</span>
          <span style={{ fontSize: 15, fontWeight: 700, color: "#000" }}>
            {fr.fortschritt || 0}%
          </span>
        </div>
        <PBar value={fr.fortschritt || 0} />
        {chef && (
          <input
            type="range"
            min="0"
            max="100"
            value={fr.fortschritt || 0}
            onChange={async (e) => {
              const val = Number(e.target.value);
              try {
                await actions.baustellen.update(b.id, { fortschritt: val });
              } catch (err) {
                show("Fehler", "error");
              }
            }}
            style={{
              width: "100%",
              marginTop: 8,
              accentColor: "#7C3AED",
            }}
          />
        )}
      </div>
      {/* Info */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 8,
          marginBottom: 16,
        }}
      >
        <div
          style={{
            background: "white",
            borderRadius: 12,
            padding: 16,
            boxShadow: CS,
          }}
        >
          <p style={{ fontSize: 13, color: "#8e8e93", marginBottom: 6 }}>
            Kontakt
          </p>
          <p style={{ fontSize: 13, color: "#3c3c43" }}>
            {fr.ansprechpartner || "-"}
          </p>
          <p style={{ fontSize: 13, color: "#3c3c43", marginTop: 2 }}>
            {fr.telefon || "-"}
          </p>
        </div>
        <div
          style={{
            background: "white",
            borderRadius: 12,
            padding: 16,
            boxShadow: CS,
          }}
        >
          <p style={{ fontSize: 13, color: "#8e8e93", marginBottom: 6 }}>
            Zugang
          </p>
          <p style={{ fontSize: 13, color: "#3c3c43" }}>{fr.zugang || "-"}</p>
        </div>
      </div>
      {/* Quick Actions */}
      <div
        style={{
          background: "white",
          borderRadius: 12,
          padding: 8,
          boxShadow: CS,
          marginBottom: 16,
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 8,
        }}
      >
        {[
          { i: Clock, l: "Stunden", a: () => nav("ste"), cl: "#3c3c43" },
          {
            i: AlertCircle,
            l: "Mängel",
            a: () => nav("mng"),
            c: mg.filter((m) => m.status !== "erledigt").length,
            cl: "#3c3c43",
          },
          { i: Paperclip, l: "Doku", a: () => nav("dok"), cl: "#3c3c43" },
          {
            i: ClipboardList,
            l: "Tagebuch",
            a: () => nav("btb"),
            cl: "#3c3c43",
          },
        ].map(({ i: I, l, a, c, cl }) => (
          <button
            key={l}
            onClick={a}
            style={{
              padding: 12,
              borderRadius: 12,
              background: "transparent",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
              border: "none",
              position: "relative",
            }}
          >
            <I size={16} style={{ color: cl }} />
            <span style={{ fontSize: 12, color: "#8e8e93" }}>{l}</span>
            {c > 0 && (
              <span
                style={{
                  position: "absolute",
                  top: -4,
                  right: -4,
                  width: 18,
                  height: 18,
                  borderRadius: 9,
                  background: RED,
                  color: "white",
                  fontSize: 11,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 600,
                }}
              >
                {c}
              </span>
            )}
          </button>
        ))}
      </div>
      {/* Details */}
      <div
        style={{
          background: "white",
          borderRadius: 12,
          padding: 16,
          marginBottom: 16,
          boxShadow: CS,
        }}
      >
        <p
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "#8e8e93",
            textTransform: "uppercase",
            letterSpacing: 0.5,
            marginBottom: 8,
          }}
        >
          Details
        </p>
        <div className="space-y-1" style={{ fontSize: 13 }}>
          {[
            ["Räume", fr.details?.raeume],
            ["Fläche", fr.details?.flaeche],
            [
              "Zeitraum",
              `${fr.startdatum ? fK(fr.startdatum) : "?"} – ${fr.enddatum ? fK(fr.enddatum) : "?"}`,
            ],
          ].map(([l, vl]) => (
            <div key={l} className="flex justify-between">
              <span style={{ color: "#8e8e93" }}>{l}</span>
              <span style={{ color: "#000" }}>{vl || "-"}</span>
            </div>
          ))}
          <div
            style={{
              paddingTop: 6,
              marginTop: 6,
              borderTop: "0.5px solid rgba(0,0,0,0.08)",
              color: "#8e8e93",
            }}
          >
            Arbeiten:{" "}
            <span style={{ color: "#000" }}>{fr.details?.arbeiten || "-"}</span>
          </div>
        </div>
      </div>
      {/* Team */}
      <div
        style={{
          background: "white",
          borderRadius: 12,
          padding: 16,
          marginBottom: 16,
          boxShadow: CS,
        }}
      >
        <p
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "#8e8e93",
            textTransform: "uppercase",
            letterSpacing: 0.5,
            marginBottom: 8,
          }}
        >
          Team
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {(fr.mitarbeiter || []).map((id) => {
            const u = data.users.find((x) => x.id === id);
            return u ? <Bdg key={id} text={u.name} /> : null;
          })}
          {(fr.subunternehmer || []).map((id) => {
            const s = data.subunternehmer.find((x) => x.id === id);
            return s ? <Bdg key={id} text={s.name} /> : null;
          })}
        </div>
      </div>
      {/* Rechnungsdaten (nur Chef) */}
      {chef && (
        <div
          style={{
            background: "white",
            borderRadius: 12,
            padding: 16,
            marginBottom: 16,
            boxShadow: CS,
          }}
        >
          <p
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "#8e8e93",
              textTransform: "uppercase",
              letterSpacing: 0.5,
              marginBottom: 8,
            }}
          >
            Rechnungsdaten
          </p>
          <div className="space-y-2">
            {[
              ["Firma", fr.details?.rechnungFirma],
              ["Adresse", fr.details?.rechnungAdresse],
              ["E-Mail", fr.details?.rechnungEmail],
              ["UID / Steuernr.", fr.details?.rechnungUid],
            ].map(([l, vl]) => (
              <div key={l}>
                <p
                  style={{
                    fontSize: 13,
                    color: "#8e8e93",
                    marginBottom: 2,
                  }}
                >
                  {l}
                </p>
                <p style={{ fontSize: 13, color: "#000" }}>{vl || "–"}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* Einträge */}
      <div
        style={{
          background: "white",
          borderRadius: 12,
          padding: 16,
          marginBottom: 16,
          boxShadow: CS,
        }}
      >
        <p
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "#8e8e93",
            textTransform: "uppercase",
            letterSpacing: 0.5,
            marginBottom: 8,
          }}
        >
          Einträge ({ei.length})
        </p>
        {ei.length === 0 ? (
          <p style={{ fontSize: 13, color: "#8e8e93" }}>Keine</p>
        ) : (
          ei
            .slice(-3)
            .reverse()
            .map((e) => (
              <div
                key={e.id}
                style={{
                  padding: "10px 12px",
                  borderRadius: 10,
                  background: "white",
                  boxShadow: CS,
                  marginBottom: 6,
                  fontSize: 13,
                }}
              >
                <div className="flex justify-between">
                  <span style={{ color: "#000" }}>
                    {eName(e)}
                    {e.personTyp === "sub" && (
                      <span style={{ color: "#8e8e93", marginLeft: 4 }}>
                        (Sub)
                      </span>
                    )}
                    {e.personTyp === "sonstige" && (
                      <span style={{ color: "#8e8e93", marginLeft: 4 }}>
                        (Sonstige)
                      </span>
                    )}
                  </span>
                  <span style={{ color: "#8e8e93" }}>{fK(e.datum)}</span>
                </div>
                <p style={{ color: "#8e8e93", marginTop: 2 }}>{e.arbeit}</p>
                <p style={{ color: "#000", fontWeight: 600, marginTop: 2 }}>
                  {bStd(e.beginn, e.ende, e.pause)}h
                </p>
              </div>
            ))
        )}
      </div>
      <button
        onClick={() => nav("ste")}
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
        <Clock size={20} />
        Stunden eintragen
      </button>
    </ScreenLayout>
  );
};

export default BstDet;
