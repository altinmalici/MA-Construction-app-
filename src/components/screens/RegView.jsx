import { useState, useRef, useEffect, useMemo } from "react";
import { Printer, Share2, X } from "lucide-react";
import { useApp } from "../../context/AppContext";
import {
  fDat,
  escHtml,
  aggregateEinsaetze,
  getReportDates,
  getCurrentWeekRange,
  getCurrentMonthRange,
  getBaustelleFullRange,
  BTN,
  IC,
  CS,
  P,
} from "../../utils/helpers";
import { ScreenLayout, SigPad } from "../ui";

const fH = (h) => (Number.isInteger(h) ? h + " h" : h.toFixed(1) + " h");

/**
 * Erzeugt das HTML für EINEN Bericht (1 Tag). Pure-function — nimmt alle
 * Eingaben explizit, damit sie für jeden Tag im Multi-Export frisch
 * berechnet werden können.
 */
function buildReportHtml({ bs, datum, eintraege, berichtNr, forPrint }) {
  const einsaetze = aggregateEinsaetze(eintraege);
  const gesamt = einsaetze.reduce((s, e) => s + e.mannstunden, 0);
  const taetigkeiten = [
    ...new Set(eintraege.map((e) => e.arbeit).filter(Boolean)),
  ];
  const bemerkungen = [
    ...new Set(eintraege.map((e) => e.bemerkung).filter((b) => b && b.trim())),
  ];

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
  h += kvRow("Datum", escHtml(fDat(datum)));
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

  return forPrint
    ? `<div style="padding:22mm 25mm;font-family:Arial,sans-serif;color:#111827;font-size:${fontSize};box-sizing:border-box">${h}</div>`
    : `<div style="font-family:Arial,sans-serif;color:#111827;font-size:${fontSize}">${h}</div>`;
}

const RegView = () => {
  const { data, goBack, show } = useApp();
  const today = new Date().toISOString().split("T")[0];
  const [vonDatum, setVonDatum] = useState(today);
  const [bisDatum, setBisDatum] = useState(today);
  const [bi, sBi] = useState(data.baustellen[0]?.id || "");
  const [sig, sSig] = useState(null);
  const [showPdf, setShowPdf] = useState(false);
  const touchY = useRef(0);

  const bs = data.baustellen.find((b) => b.id === bi);

  // Alle Tage dieser Baustelle (chronologisch) — Basis für berichtNrFor
  const allBaustelleTage = useMemo(() => {
    if (!bi) return [];
    return [
      ...new Set(
        data.stundeneintraege
          .filter((e) => e.baustelleId === bi)
          .map((e) => e.datum),
      ),
    ].sort();
  }, [data.stundeneintraege, bi]);

  const berichtNrFor = (datum) => {
    const idx = allBaustelleTage.indexOf(datum);
    return idx >= 0 ? String(idx + 1).padStart(2, "0") : "—";
  };

  const reportDates = useMemo(
    () => getReportDates(data.stundeneintraege, bi, vonDatum, bisDatum),
    [data.stundeneintraege, bi, vonDatum, bisDatum],
  );

  // Eintrags-Summe über alle Tage im Range (für Summary-Card)
  const rangeGesamt = useMemo(() => {
    let sum = 0;
    reportDates.forEach((d) => {
      const te = data.stundeneintraege.filter(
        (e) => e.baustelleId === bi && e.datum === d,
      );
      aggregateEinsaetze(te).forEach((x) => (sum += x.mannstunden));
    });
    return sum;
  }, [reportDates, data.stundeneintraege, bi]);

  // Quick-Buttons
  const applyHeute = () => {
    setVonDatum(today);
    setBisDatum(today);
  };
  const applyWoche = () => {
    const { von, bis } = getCurrentWeekRange();
    setVonDatum(von);
    setBisDatum(bis);
  };
  const applyMonat = () => {
    const { von, bis } = getCurrentMonthRange();
    setVonDatum(von);
    setBisDatum(bis);
  };
  const applyAlle = () => {
    const r = getBaustelleFullRange(data.stundeneintraege, bi);
    if (!r) {
      show("Keine Einträge für diese Baustelle", "error");
      return;
    }
    setVonDatum(r.von);
    setBisDatum(r.bis);
  };

  const firstDate = reportDates[0] || today;
  const firstDateEintraege = data.stundeneintraege.filter(
    (e) => e.baustelleId === bi && e.datum === firstDate,
  );

  // Vorschau-HTML (nur erster Tag bei Multi)
  const previewHtml = useMemo(() => {
    if (reportDates.length === 0) return null;
    return buildReportHtml({
      bs,
      datum: firstDate,
      eintraege: firstDateEintraege,
      berichtNr: berichtNrFor(firstDate),
      forPrint: false,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportDates, bs, firstDate, allBaustelleTage]);

  const multiReportTitle = () => {
    if (reportDates.length === 0) return "Regiebericht";
    if (reportDates.length === 1) {
      return `Regiebericht ${bs?.kunde || ""} ${fDat(reportDates[0])}`;
    }
    return `Regieberichte ${bs?.kunde || ""} ${fDat(reportDates[0])} - ${fDat(
      reportDates[reportDates.length - 1],
    )}`;
  };

  const print = () => {
    if (reportDates.length === 0) {
      show("Keine Einträge zum Drucken", "error");
      return;
    }
    setShowPdf(true);
  };

  // Druckt Multi-Bericht-HTML in Hidden-Iframe (iOS-PWA-tauglich).
  const printingRef = useRef(false);
  const doPrint = async () => {
    if (printingRef.current) return;
    if (reportDates.length === 0) return;
    printingRef.current = true;

    const sections = reportDates.map((datum, idx) => {
      const eintraege = data.stundeneintraege.filter(
        (e) => e.baustelleId === bi && e.datum === datum,
      );
      const one = buildReportHtml({
        bs,
        datum,
        eintraege,
        berichtNr: berichtNrFor(datum),
        forPrint: true,
      });
      const pageBreak =
        idx < reportDates.length - 1
          ? '<div style="page-break-after:always"></div>'
          : "";
      return one + pageBreak;
    });

    const html = `<!DOCTYPE html><html><head><title>${escHtml(multiReportTitle())}</title>
      <style>
        @page { size: A4 portrait; margin: 0; }
        body { margin: 0; font-family: Arial, sans-serif; color: #111827 }
      </style>
    </head><body>${sections.join("")}</body></html>`;

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
      setTimeout(cleanup, 60000);
    }, 200);
  };

  const doShare = async () => {
    const title = multiReportTitle();
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: `${title} — ${reportDates.length} Bericht${reportDates.length === 1 ? "" : "e"}, ${fH(rangeGesamt)} Mannstunden`,
        });
      } catch {
        /* User abgebrochen */
      }
    } else {
      doPrint();
    }
  };

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
              {reportDates.length > 1
                ? `${reportDates.length} Berichte`
                : "Regiebericht"}
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
            dangerouslySetInnerHTML={{ __html: previewHtml || "" }}
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
              {reportDates.length > 1
                ? `Drucken (${reportDates.length})`
                : "Drucken"}
            </button>
          </div>
        </div>
      </div>
    );

  const quickBtn = (label, onClick) => (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        padding: "8px 0",
        borderRadius: 100,
        fontSize: 13,
        fontWeight: 500,
        background: "rgba(118,118,128,0.12)",
        color: "#3c3c43",
        border: "none",
        minHeight: 36,
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );

  return (
    <ScreenLayout title="Regieberichte" onBack={goBack}>
      <div className="space-y-2" style={{ paddingBottom: 32 }}>
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

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <div>
            <p style={{ fontSize: 11, color: "#8e8e93", marginBottom: 2 }}>
              Von
            </p>
            <input
              type="date"
              value={vonDatum}
              onChange={(e) => setVonDatum(e.target.value)}
              className={IC}
              style={{
                background: "rgba(118,118,128,0.12)",
                border: "none",
                borderRadius: 12,
                width: "100%",
              }}
            />
          </div>
          <div>
            <p style={{ fontSize: 11, color: "#8e8e93", marginBottom: 2 }}>
              Bis
            </p>
            <input
              type="date"
              value={bisDatum}
              onChange={(e) => setBisDatum(e.target.value)}
              className={IC}
              style={{
                background: "rgba(118,118,128,0.12)",
                border: "none",
                borderRadius: 12,
                width: "100%",
              }}
            />
          </div>
        </div>

        <div style={{ display: "flex", gap: 6 }}>
          {quickBtn("Heute", applyHeute)}
          {quickBtn("Woche", applyWoche)}
          {quickBtn("Monat", applyMonat)}
          {quickBtn("Alle", applyAlle)}
        </div>

        {/* Empty State */}
        {reportDates.length === 0 && (
          <div
            style={{
              background: "white",
              borderRadius: 12,
              padding: 24,
              boxShadow: CS,
              textAlign: "center",
              color: "#8e8e93",
              fontSize: 14,
            }}
          >
            Keine Einträge in diesem Zeitraum.
          </div>
        )}

        {/* Summary Card — nur bei Multi */}
        {reportDates.length > 1 && (
          <div
            style={{
              background: "white",
              borderRadius: 12,
              padding: 14,
              boxShadow: CS,
              display: "flex",
              flexDirection: "column",
              gap: 2,
            }}
          >
            <div
              style={{ fontSize: 22, fontWeight: 700, color: P, lineHeight: 1 }}
            >
              {reportDates.length} Berichte
            </div>
            <div style={{ fontSize: 13, color: "#3c3c43" }}>
              {fDat(reportDates[0])} – {fDat(reportDates[reportDates.length - 1])}
            </div>
            <div style={{ fontSize: 13, color: "#8e8e93", marginTop: 2 }}>
              Gesamt: {fH(rangeGesamt)} Mannstunden
            </div>
          </div>
        )}

        {/* Vorschau — nur erster Bericht */}
        {reportDates.length > 0 && (
          <>
            <div
              style={{
                background: "white",
                borderRadius: 12,
                padding: 16,
                boxShadow: CS,
              }}
              dangerouslySetInnerHTML={{ __html: previewHtml || "" }}
            />
            {reportDates.length > 1 && (
              <p
                style={{
                  textAlign: "center",
                  color: "#8e8e93",
                  fontSize: 13,
                  padding: "4px 0",
                }}
              >
                + {reportDates.length - 1} weitere Bericht
                {reportDates.length - 1 === 1 ? "" : "e"} beim Drucken
              </p>
            )}
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
              <SigPad
                sig={sig}
                onSave={(s) => sSig(s)}
                onClear={() => sSig(null)}
              />
            </div>
          </>
        )}

        <button
          onClick={print}
          disabled={reportDates.length === 0}
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
            opacity: reportDates.length === 0 ? 0.5 : 1,
            cursor: reportDates.length === 0 ? "not-allowed" : "pointer",
          }}
        >
          <Printer size={18} />
          {reportDates.length > 1
            ? `Drucken (${reportDates.length} Berichte)`
            : "Drucken / PDF"}
        </button>
      </div>
    </ScreenLayout>
  );
};

export default RegView;
