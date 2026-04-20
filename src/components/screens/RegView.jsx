import { useState, useRef, useEffect, useMemo } from "react";
import { Printer, Share2, X } from "lucide-react";
import { useApp } from "../../context/AppContext";
import {
  fDat,
  escHtml,
  aggregateEinsaetze,
  BTN,
  IC,
  CS,
} from "../../utils/helpers";
import { ScreenLayout, SigPad } from "../ui";

const RegView = () => {
  const { data, goBack, show } = useApp();
  const [sd, setSd] = useState(new Date().toISOString().split("T")[0]);
  const [bi, sBi] = useState(data.baustellen[0]?.id || "");
  const [sig, sSig] = useState(null);
  const [showPdf, setShowPdf] = useState(false);
  const touchY = useRef(0);

  const bs = data.baustellen.find((b) => b.id === bi);
  const te = data.stundeneintraege.filter(
    (e) => e.baustelleId === bi && e.datum === sd,
  );

  // Bericht-Nr.: chronologischer Index aller Tage mit Einträgen für diese
  // Baustelle, 2-stellig mit führender Null. "—" wenn das Datum (noch)
  // keine Einträge hat.
  const berichtNr = useMemo(() => {
    if (!bi) return "—";
    const tage = [
      ...new Set(
        data.stundeneintraege
          .filter((e) => e.baustelleId === bi)
          .map((e) => e.datum),
      ),
    ].sort();
    const idx = tage.indexOf(sd);
    return idx >= 0 ? String(idx + 1).padStart(2, "0") : "—";
  }, [data.stundeneintraege, bi, sd]);

  const einsaetze = aggregateEinsaetze(te);
  const gesamt = einsaetze.reduce((s, e) => s + e.mannstunden, 0);
  const taetigkeiten = [...new Set(te.map((e) => e.arbeit).filter(Boolean))];
  // Bemerkungs-Feld kommt aus zukünftigem DB-Erweiterung — aktuell leer,
  // Block bleibt im Code für Future-Proofing wenn das Feld dazukommt.
  const bemerkungen = [
    ...new Set(te.map((e) => e.bemerkung).filter((b) => b && b.trim())),
  ];

  const fH = (h) => (Number.isInteger(h) ? h + " h" : h.toFixed(1) + " h");

  // Reusable HTML-Block fürs PDF wie auch die On-Screen-Vorschau. Nutzt
  // inline-Styles, damit das Markup self-contained durch ein <iframe> mit
  // window.print() läuft.
  const reportHtml = (opts = {}) => {
    const { forPrint = false } = opts;
    const wrapPad = forPrint ? "22mm 25mm" : "20px";
    const fontSize = forPrint ? "11pt" : "12px";
    const sectionTitle = (t) =>
      `<h2 style="color:#6D28D9;font-size:${forPrint ? "10pt" : "12px"};font-weight:700;margin:18px 0 6px 0;text-transform:uppercase;letter-spacing:0.3px">${t}</h2>`;

    const kvRow = (label, value) =>
      `<tr><td style="padding:5px 0;color:#6B7280;width:35%;border-bottom:1px solid #E5E7EB;font-size:${forPrint ? "9.5pt" : "11px"}">${escHtml(label)}</td><td style="padding:5px 0;color:#111827;font-weight:500;border-bottom:1px solid #E5E7EB;font-size:${forPrint ? "9.5pt" : "11px"}">${value}</td></tr>`;

    let h = "";

    // === HEADER ===
    h += `<div style="display:flex;align-items:center;justify-content:space-between;padding-bottom:10px;border-bottom:1.5pt solid #7C3AED">
      <div style="background:#7C3AED;color:white;font-weight:700;width:14mm;height:10mm;display:flex;align-items:center;justify-content:center;border-radius:6px;font-size:${forPrint ? "11pt" : "12px"};letter-spacing:1px">MA</div>
      <div style="text-align:right">
        <div style="font-weight:700;font-size:${forPrint ? "11pt" : "13px"};color:#111827;letter-spacing:0.5px">MA CONSTRUCTION</div>
        <div style="color:#6B7280;font-size:${forPrint ? "9pt" : "10px"};margin-top:2px">Regiebericht Nr. ${escHtml(berichtNr)}</div>
      </div>
    </div>`;

    // === STAMMDATEN ===
    h += sectionTitle("Stammdaten");
    h += `<table style="width:100%;border-collapse:collapse">`;
    h += kvRow("Baustelle", escHtml(bs?.kunde || "—"));
    h += kvRow("Bauherr", escHtml(bs?.bauherr || bs?.kunde || "—"));
    h += kvRow("Adresse", escHtml(bs?.adresse || "—"));
    h += kvRow("Datum", escHtml(fDat(sd)));
    h += kvRow("Bericht-Nr.", escHtml(berichtNr));
    h += `</table>`;

    // === ARBEITSEINSATZ ===
    h += sectionTitle("Arbeitseinsatz");
    if (einsaetze.length === 0) {
      h += `<p style="color:#6B7280;font-size:${forPrint ? "9.5pt" : "11px"};margin:6px 0">Keine Einträge.</p>`;
    } else {
      h += `<table style="width:100%;border-collapse:collapse;border:0.3pt solid #D1D5DB">
        <thead>
          <tr style="background:#F5F3FF">
            <th style="text-align:left;padding:8px;color:#6D28D9;font-size:${forPrint ? "9pt" : "11px"};font-weight:700;border:0.3pt solid #D1D5DB">Einsatz</th>
            <th style="text-align:left;padding:8px;color:#6D28D9;font-size:${forPrint ? "9pt" : "11px"};font-weight:700;border:0.3pt solid #D1D5DB">Std/Mann</th>
            <th style="text-align:right;padding:8px;color:#6D28D9;font-size:${forPrint ? "9pt" : "11px"};font-weight:700;border:0.3pt solid #D1D5DB">Mannstunden</th>
          </tr>
        </thead>
        <tbody>`;
      einsaetze.forEach((e) => {
        h += `<tr>
          <td style="padding:8px;color:#111827;font-size:${forPrint ? "9.5pt" : "11px"};border:0.3pt solid #D1D5DB">${e.anzahl} Mann</td>
          <td style="padding:8px;color:#111827;font-size:${forPrint ? "9.5pt" : "11px"};border:0.3pt solid #D1D5DB">${fH(e.stunden)}</td>
          <td style="padding:8px;color:#111827;font-size:${forPrint ? "9.5pt" : "11px"};border:0.3pt solid #D1D5DB;text-align:right">${fH(e.mannstunden)}</td>
        </tr>`;
      });
      h += `<tr style="background:#F5F3FF;border-top:0.5pt solid #7C3AED">
          <td style="padding:8px;font-weight:700;color:#111827;font-size:${forPrint ? "9.5pt" : "11px"};border:0.3pt solid #D1D5DB">Gesamt</td>
          <td style="padding:8px;border:0.3pt solid #D1D5DB"></td>
          <td style="padding:8px;font-weight:700;color:#111827;font-size:${forPrint ? "9.5pt" : "11px"};border:0.3pt solid #D1D5DB;text-align:right">${fH(gesamt)}</td>
        </tr>`;
      h += `</tbody></table>`;
    }

    // === TÄTIGKEITEN ===
    if (taetigkeiten.length > 0) {
      h += sectionTitle("Ausgeführte Tätigkeiten");
      h += `<ul style="list-style:none;padding:0;margin:0">`;
      taetigkeiten.forEach((t) => {
        h += `<li style="padding:3px 0;color:#111827;font-size:${forPrint ? "10pt" : "11px"}">•&nbsp;&nbsp;${escHtml(t)}</li>`;
      });
      h += `</ul>`;
    }

    // === FAHRTEN ===
    h += sectionTitle("Fahrten");
    h += `<table style="width:100%;border-collapse:collapse">`;
    h += kvRow("An-/Abfahrt", "1×");
    h += `</table>`;

    // === BEMERKUNGEN ===
    if (bemerkungen.length > 0) {
      h += sectionTitle("Bemerkungen");
      h += `<ul style="list-style:none;padding:0;margin:0">`;
      bemerkungen.forEach((b) => {
        h += `<li style="padding:3px 0;color:#111827;font-size:${forPrint ? "10pt" : "11px"}">•&nbsp;&nbsp;${escHtml(b)}</li>`;
      });
      h += `</ul>`;
    }

    // === UNTERSCHRIFT ===
    h += `<div style="margin-top:${forPrint ? "18mm" : "30px"}">
      <div style="width:${forPrint ? "156mm" : "100%"};height:${forPrint ? "22mm" : "70px"};border:0.5pt solid #D1D5DB;background:white;border-radius:4px"></div>
      <div style="margin-top:6px;color:#6B7280;font-size:${forPrint ? "8pt" : "10px"}">Datum, Name und Unterschrift</div>
    </div>`;

    // === FOOTER ===
    if (forPrint) {
      h += `<div style="position:fixed;bottom:8mm;left:0;right:0;text-align:center;color:#6B7280;font-size:8pt">MA Construction</div>`;
    } else {
      h += `<div style="margin-top:24px;text-align:center;color:#6B7280;font-size:10px">MA Construction</div>`;
    }

    if (forPrint) {
      return `<!DOCTYPE html><html><head><title>Regiebericht ${escHtml(berichtNr)}</title>
        <style>
          @page { size: A4 portrait; margin: 0; }
          body { font-family: Arial, sans-serif; padding: ${wrapPad}; color:#111827; font-size:${fontSize}; margin:0 }
        </style>
      </head><body>${h}</body></html>`;
    }
    return `<div style="font-family:Arial,sans-serif;color:#111827;font-size:${fontSize}">${h}</div>`;
  };

  const print = () => {
    setShowPdf(true);
  };

  // Druckt nur den Bericht (nicht die App-UI). Hidden iframe statt window.open
  // — letzteres lässt sich auf iOS in der PWA praktisch nicht mehr schließen.
  const printingRef = useRef(false);
  const doPrint = async () => {
    if (printingRef.current) return;
    printingRef.current = true;

    const html = reportHtml({ forPrint: true });
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);
    const win = iframe.contentWindow;
    win.document.open();
    win.document.write(html);
    win.document.close();
    let cleaned = false;
    const cleanup = () => {
      if (cleaned) return;
      cleaned = true;
      setTimeout(() => {
        if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
        printingRef.current = false;
      }, 500);
    };
    win.onafterprint = cleanup;
    setTimeout(() => {
      try {
        win.focus();
        win.print();
      } catch {
        cleanup();
        show("Drucken nicht möglich", "error");
        return;
      }
      // Fallback falls onafterprint nicht feuert (Safari).
      setTimeout(cleanup, 60000);
    }, 200);
  };

  const doShare = async () => {
    const title = `Regiebericht ${fDat(sd)}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: `${title} — ${bs?.kunde || ""}\nGesamt: ${fH(gesamt)}`,
        });
      } catch {
        /* User abgebrochen */
      }
    } else {
      doPrint();
    }
  };

  // ESC schließt Modal
  useEffect(() => {
    if (!showPdf) return;
    const onKey = (e) => {
      if (e.key === "Escape") setShowPdf(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [showPdf]);

  if (showPdf)
    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Regiebericht-Vorschau"
        onClick={() => setShowPdf(false)}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.5)",
          zIndex: 100,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 16,
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          onTouchStart={(e) => (touchY.current = e.touches[0].clientY)}
          onTouchEnd={(e) => {
            if (e.changedTouches[0].clientY - touchY.current > 80)
              setShowPdf(false);
          }}
          style={{
            background: "white",
            borderRadius: 16,
            width: "100%",
            maxWidth: 600,
            maxHeight: "90vh",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            boxShadow: "0 10px 40px rgba(0,0,0,0.25)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 16px",
              borderBottom: "0.5px solid rgba(0,0,0,0.1)",
            }}
          >
            <span style={{ fontWeight: 600, fontSize: 17, color: "#000" }}>
              Regiebericht
            </span>
            <button
              onClick={() => setShowPdf(false)}
              aria-label="Schließen"
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                background: "rgba(0,0,0,0.06)",
                border: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <X size={20} style={{ color: "#3c3c43" }} />
            </button>
          </div>
          <div
            style={{ overflowY: "auto", padding: "16px 20px", flex: 1 }}
            dangerouslySetInnerHTML={{ __html: reportHtml() }}
          />
          <div
            style={{
              display: "flex",
              gap: 8,
              padding: "12px 16px",
              borderTop: "0.5px solid rgba(0,0,0,0.1)",
              background: "white",
            }}
          >
            <button
              onClick={doShare}
              style={{
                flex: 1,
                padding: "14px 20px",
                borderRadius: 12,
                color: "#3c3c43",
                fontWeight: 600,
                fontSize: 16,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                background: "rgba(0,0,0,0.06)",
                border: "none",
              }}
            >
              <Share2 size={18} />
              Teilen
            </button>
            <button
              onClick={doPrint}
              style={{
                flex: 1,
                padding: "14px 20px",
                borderRadius: 12,
                color: "white",
                fontWeight: 600,
                fontSize: 16,
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
        {/* Vorschau — gleiches Layout wie PDF, kleiner skaliert */}
        <div
          style={{
            background: "white",
            borderRadius: 12,
            padding: 16,
            boxShadow: CS,
          }}
          dangerouslySetInnerHTML={{ __html: reportHtml() }}
        />
        {/* Unterschrift on-screen (für direkten Touch-Capture) */}
        <div
          style={{
            background: "white",
            borderRadius: 12,
            padding: 16,
            boxShadow: CS,
          }}
        >
          <p style={{ color: "#8e8e93", fontSize: 13, marginBottom: 6 }}>
            Unterschrift Auftraggeber:
          </p>
          <SigPad sig={sig} onSave={(s) => sSig(s)} onClear={() => sSig(null)} />
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
