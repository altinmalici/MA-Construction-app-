import { useState, useRef } from "react";
import { Printer } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { bStd, fDat, escHtml, G, BTN, IC, CS } from "../../utils/helpers";
import { ScreenLayout, SigPad } from "../ui";

const RegView = () => {
  const { data, goBack, show, eName } = useApp();
  const [sd, setSd] = useState(new Date().toISOString().split("T")[0]);
  const [bi, sBi] = useState(data.baustellen[0]?.id);
  const [sig, sSig] = useState(null);
  const [edits, setEdits] = useState({});
  const [showPdf, setShowPdf] = useState(false);
  const touchY = useRef(0);
  const bs = data.baustellen.find((b) => b.id === bi);
  const te = data.stundeneintraege.filter(
    (e) => e.baustelleId === bi && e.datum === sd,
  );
  const getVal = (e) => {
    const ed = edits[e.id];
    return {
      beginn: ed?.beginn ?? e.beginn,
      ende: ed?.ende ?? e.ende,
      pause: ed?.pause ?? e.pause,
      bemerkung: ed?.bemerkung ?? "",
    };
  };
  const updEdit = (id, field, val) =>
    setEdits((p) => ({
      ...p,
      [id]: { ...getVal(te.find((e) => e.id === id)), ...p[id], [field]: val },
    }));
  const isEdited = (e) => {
    const ed = edits[e.id];
    if (!ed) return false;
    return (
      ed.beginn !== e.beginn ||
      ed.ende !== e.ende ||
      ed.pause !== e.pause ||
      (ed.bemerkung && ed.bemerkung !== "")
    );
  };
  const fH = (h) => (Number.isInteger(h) ? h + "h" : h.toFixed(1) + "h");
  const gh = te.reduce((s, e) => {
    const v = getVal(e);
    return s + parseFloat(bStd(v.beginn, v.ende, v.pause));
  }, 0);
  const gf = te.reduce((s, e) => s + e.fahrtzeit, 0);
  const pdfHtml = () => {
    let h =
      "<!DOCTYPE html><html><head><title>Regiebericht</title><style>body{font-family:Arial;padding:30px;color:#333;font-size:14px}h1{font-size:18px}table{width:100%;border-collapse:collapse;margin:15px 0}th,td{border:1px solid #ddd;padding:8px;text-align:left;font-size:13px}th{background:#f5f5f5}.sum{background:#f9fafb}</style></head><body>";
    h +=
      '<div style="border-bottom:2px solid #333;padding-bottom:10px;margin-bottom:15px"><span style="background:linear-gradient(135deg,#6D28D9,#7C3AED,#8B5CF6);color:white;font-weight:bold;padding:8px 12px;border-radius:6px;display:inline-block">MA</span> <b style="margin-left:10px">MA CONSTRUCTION</b> – Regiebericht</div>';
    h +=
      "<p><b>Datum:</b> " +
      fDat(sd) +
      "</p><p><b>Baustelle:</b> " +
      escHtml(bs?.kunde) +
      "</p><p><b>Adresse:</b> " +
      escHtml(bs?.adresse) +
      "</p>";
    h +=
      "<table><tr><th>Person</th><th>Zeit</th><th>Stunden</th><th>Tätigkeit</th><th>Material</th></tr>";
    te.forEach((e) => {
      const v = getVal(e);
      const bem = v.bemerkung ? " – " + escHtml(v.bemerkung) : "";
      const std = parseFloat(bStd(v.beginn, v.ende, v.pause));
      h +=
        "<tr><td>" +
        escHtml(eName(e)) +
        (e.personTyp === "sub"
          ? " (Sub)"
          : e.personTyp === "sonstige"
            ? " (Sonstige)"
            : "") +
        "</td><td>" +
        escHtml(v.beginn) +
        "–" +
        escHtml(v.ende) +
        "</td><td>" +
        fH(std) +
        "</td><td>" +
        escHtml(e.arbeit) +
        bem +
        "</td><td>" +
        escHtml(e.material || "–") +
        "</td></tr>";
    });
    h += "</table>";
    h +=
      '<table style="margin-top:10px"><tr class="sum"><td><b>Arbeitsstunden gesamt</b></td><td style="text-align:right"><b>' +
      fH(gh) +
      "</b></td></tr>";
    if (gf > 0)
      h +=
        '<tr><td>Fahrtzeit gesamt</td><td style="text-align:right">' +
        gf +
        " Min</td></tr>";
    h += "</table>";
    h +=
      '<p style="margin-top:30px;color:#888;font-size:12px">Unterschrift Auftraggeber:</p>';
    if (sig)
      h +=
        '<img src="' +
        sig +
        '" style="height:80px;border:1px solid #d1d5db;border-radius:8px;padding:5px"/>';
    else
      h +=
        '<div style="border:2px dashed #ccc;height:60px;border-radius:8px;margin-top:5px"></div>';
    h += "</body></html>";
    return h;
  };
  const print = () => {
    setShowPdf(true);
  };
  const doPrint = () => {
    const w = window.open("", "_blank");
    if (!w) {
      show("Popup-Blocker!", "error");
      return;
    }
    w.document.write(pdfHtml());
    w.document.close();
    setTimeout(() => w.print(), 300);
    show("Druckvorschau geöffnet");
  };

  if (showPdf)
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "white",
          zIndex: 100,
          overflowY: "auto",
        }}
        onTouchStart={(e) => (touchY.current = e.touches[0].clientY)}
        onTouchEnd={(e) => {
          if (e.changedTouches[0].clientY - touchY.current > 80)
            setShowPdf(false);
        }}
      >
        <div style={{ padding: "16px 20px 32px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginBottom: 12,
            }}
          >
            <div
              style={{
                width: 40,
                height: 5,
                borderRadius: 3,
                background: "#c7c7cc",
              }}
            />
          </div>
          <div
            dangerouslySetInnerHTML={{ __html: pdfHtml() }}
            style={{ fontSize: 14 }}
          />
          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <button
              onClick={doPrint}
              style={{
                flex: 1,
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
                border: "none",
                boxShadow: "0 2px 8px rgba(124,58,237,0.35)",
              }}
            >
              <Printer size={18} />
              Drucken
            </button>
            <button
              onClick={() => setShowPdf(false)}
              style={{
                padding: "16px 20px",
                borderRadius: 14,
                color: "#8e8e93",
                fontWeight: 600,
                fontSize: 17,
                background: "rgba(0,0,0,0.05)",
                border: "none",
              }}
            >
              Schließen
            </button>
          </div>
        </div>
      </div>
    );

  return (
    <ScreenLayout title="Regieberichte" onBack={goBack}>
      <div className="space-y-2" style={{ paddingBottom: 32 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <select
            value={bi}
            onChange={(e) => sBi(e.target.value)}
            className={IC}
            style={{
              background: "rgba(118,118,128,0.12)",
              border: "none",
              borderRadius: 12,
            }}
          >
            {data.baustellen.map((b) => (
              <option key={b.id} value={b.id}>
                {b.kunde}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={sd}
            onChange={(e) => setSd(e.target.value)}
            className={IC}
            style={{
              background: "rgba(118,118,128,0.12)",
              border: "none",
              borderRadius: 12,
            }}
          />
        </div>
        {/* Vorschau */}
        <div
          style={{
            background: "white",
            borderRadius: 12,
            padding: 16,
            fontSize: 13,
            boxShadow: CS,
            color: "#000",
          }}
        >
          <div
            className="flex items-center gap-2"
            style={{
              borderBottom: "0.5px solid rgba(0,0,0,0.08)",
              paddingBottom: 8,
              marginBottom: 8,
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                background: G,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span style={{ color: "white", fontWeight: 700, fontSize: 11 }}>
                MA
              </span>
            </div>
            <div>
              <p style={{ fontWeight: 700, fontSize: 13 }}>MA CONSTRUCTION</p>
              <p style={{ color: "#8e8e93", fontSize: 12 }}>Regiebericht</p>
            </div>
          </div>
          <div className="space-y-0.5">
            {[
              ["Datum", fDat(sd)],
              ["Baustelle", bs?.kunde],
              ["Adresse", bs?.adresse],
            ].map(([l, vl]) => (
              <div key={l} className="flex justify-between">
                <span style={{ color: "#8e8e93" }}>{l}:</span>
                <span style={{ fontWeight: 600 }}>{vl}</span>
              </div>
            ))}
          </div>
          <div
            style={{
              borderTop: "0.5px solid rgba(0,0,0,0.08)",
              marginTop: 8,
              paddingTop: 8,
            }}
          >
            <p style={{ fontWeight: 600, marginBottom: 4 }}>Arbeitszeiten:</p>
            {te.length === 0 ? (
              <p style={{ color: "#8e8e93" }}>Keine Einträge</p>
            ) : (
              te.map((e) => {
                const v = getVal(e);
                const edited = isEdited(e);
                const std = parseFloat(bStd(v.beginn, v.ende, v.pause));
                return (
                  <div
                    key={e.id}
                    style={{
                      borderRadius: 8,
                      padding: 8,
                      marginBottom: 4,
                      background: "#f2f2f7",
                    }}
                  >
                    <div
                      className="flex justify-between"
                      style={{ marginBottom: 4 }}
                    >
                      <span style={{ fontWeight: 600 }}>
                        {eName(e)}
                        {e.personTyp === "sub"
                          ? " (Sub)"
                          : e.personTyp === "sonstige"
                            ? " (Sonstige)"
                            : ""}
                      </span>
                      <span style={{ fontWeight: 700 }}>{fH(std)}</span>
                    </div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr 1fr",
                        gap: 4,
                        marginBottom: 4,
                      }}
                    >
                      <input
                        value={v.beginn}
                        onChange={(x) =>
                          updEdit(e.id, "beginn", x.target.value)
                        }
                        inputMode="numeric"
                        placeholder="HH:MM"
                        style={{
                          padding: "10px 12px",
                          borderRadius: 10,
                          border: "none",
                          fontSize: 12,
                          background: "rgba(118,118,128,0.12)",
                          width: "100%",
                          boxSizing: "border-box",
                        }}
                      />
                      <input
                        value={v.ende}
                        onChange={(x) => updEdit(e.id, "ende", x.target.value)}
                        inputMode="numeric"
                        placeholder="HH:MM"
                        style={{
                          padding: "10px 12px",
                          borderRadius: 10,
                          border: "none",
                          fontSize: 12,
                          background: "rgba(118,118,128,0.12)",
                          width: "100%",
                          boxSizing: "border-box",
                        }}
                      />
                      <input
                        value={v.pause}
                        onChange={(x) =>
                          updEdit(e.id, "pause", Number(x.target.value) || 0)
                        }
                        type="number"
                        placeholder="Pause"
                        style={{
                          padding: "10px 12px",
                          borderRadius: 10,
                          border: "none",
                          fontSize: 12,
                          background: "rgba(118,118,128,0.12)",
                          width: "100%",
                          boxSizing: "border-box",
                        }}
                      />
                    </div>
                    <input
                      value={v.bemerkung}
                      onChange={(x) =>
                        updEdit(e.id, "bemerkung", x.target.value)
                      }
                      placeholder="Bemerkung (optional)"
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        borderRadius: 10,
                        border: "none",
                        fontSize: 12,
                        background: "rgba(118,118,128,0.12)",
                        boxSizing: "border-box",
                        marginBottom: 4,
                      }}
                    />
                    <p style={{ color: "#3c3c43" }}>{e.arbeit}</p>
                    {e.material && (
                      <p style={{ color: "#8e8e93" }}>Material: {e.material}</p>
                    )}
                    {edited && (
                      <p
                        style={{ fontSize: 11, color: "#8e8e93", marginTop: 2 }}
                      >
                        Angepasst
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>
          {te.length > 0 && (
            <div
              className="space-y-1"
              style={{
                borderTop: "0.5px solid rgba(0,0,0,0.08)",
                marginTop: 8,
                paddingTop: 8,
              }}
            >
              <div className="flex justify-between">
                <span style={{ color: "#8e8e93" }}>Stunden gesamt</span>
                <span style={{ fontWeight: 700 }}>{fH(gh)}</span>
              </div>
              {gf > 0 && (
                <div className="flex justify-between">
                  <span style={{ color: "#8e8e93" }}>Fahrtzeit</span>
                  <span style={{ fontWeight: 600 }}>{gf} Min</span>
                </div>
              )}
            </div>
          )}
          <div
            style={{
              borderTop: "0.5px solid rgba(0,0,0,0.08)",
              marginTop: 8,
              paddingTop: 8,
            }}
          >
            <p style={{ color: "#8e8e93", marginBottom: 4 }}>
              Unterschrift Auftraggeber:
            </p>
            <SigPad
              sig={sig}
              onSave={(s) => sSig(s)}
              onClear={() => sSig(null)}
            />
          </div>
        </div>
        <button
          onClick={print}
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
            border: "none",
            boxShadow: "0 2px 8px rgba(124,58,237,0.35)",
          }}
        >
          <Printer size={18} />
          Drucken / PDF
        </button>
      </div>
    </ScreenLayout>
  );
};

export default RegView;
