import { useState, useRef, useEffect, useMemo } from "react";
import { Printer, Share2, X } from "lucide-react";
import { useApp } from "../../context/AppContext";
import {
  fDat,
  escHtml,
  aggregateEinsaetze,
  fStd,
  todayIso,
  getReportDates,
  getCurrentWeekRange,
  getCurrentMonthRange,
  getBaustelleFullRange,
  BTN,
  IC,
  P,
} from "../../utils/helpers";
import { ScreenLayout, SigPad, Card } from "../ui";
import { buildReportHtml } from "../../utils/regiebericht";

const fH = (h) => fStd(h) + " h";

const RegView = () => {
  const { data, goBack, show } = useApp();
  const today = todayIso();
  const [vonDatum, setVonDatum] = useState(today);
  const [bisDatum, setBisDatum] = useState(today);
  // Vorauswahl zur Renderzeit ableiten: Waren die Daten beim Öffnen noch
  // nicht geladen, blieb die Baustelle früher dauerhaft leer.
  // Die Unterschrift gilt nur für die Baustelle und den Zeitraum, für die
  // sie gegeben wurde: Wechselt eines davon, ist sie weg. So kann sie nicht
  // auf dem Bericht einer anderen Baustelle oder eines anderen Tages landen.
  const [sigState, sSigState] = useState({ key: "", sig: null });
  const [biWahl, sBi] = useState("");
  const bi = biWahl || data.baustellen[0]?.id || "";
  const sigKey = `${bi}|${vonDatum}|${bisDatum}`;
  const sig = sigState.key === sigKey ? sigState.sig : null;
  const sSig = (v) => sSigState({ key: sigKey, sig: v });
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
      sig: reportDates.length === 1 ? sig : null,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportDates, bs, firstDate, allBaustelleTage, sig]);

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

    // Eine Unterschrift bestätigt EINEN Bericht. Bei mehreren Tagen wird sie
    // nicht auf alle gedruckt.
    const druckSig = reportDates.length === 1 ? sig : null;
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
        sig: druckSig,
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
      // Kommt "afterprint" nicht (iOS liefert es für iframes nicht
      // zuverlässig), gab der Drucken-Knopf früher 60 s lang stumm nicht
      // nach. Jetzt: freigeben, sobald das Fenster wieder den Fokus hat
      // (Druckdialog geschlossen), spätestens nach 10 s.
      window.addEventListener("focus", cleanup, { once: true });
      setTimeout(cleanup, 10000);
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
          {/* Wisch-nach-unten schließt die Vorschau — nur an der Kopfzeile.
              Früher lag die Geste auf dem ganzen Fenster: Beim Scrollen im
              Bericht schloss es sich bei jeder Abwärtsbewegung über 80 px. */}
          <div
            onTouchStart={(e) => (touchY.current = e.touches[0].clientY)}
            onTouchEnd={(e) => {
              if (e.changedTouches[0].clientY - touchY.current > 80)
                setShowPdf(false);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 16px",
              borderBottom: "0.5px solid rgba(0,0,0,0.1)",
              touchAction: "none",
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
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
          paddingBottom: 32,
        }}
      >
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
          <Card
            padding={24}
            style={{
              textAlign: "center",
              color: "#8e8e93",
              fontSize: 14,
            }}
          >
            Keine Einträge in diesem Zeitraum.
          </Card>
        )}

        {/* Summary Card — nur bei Multi */}
        {reportDates.length > 1 && (
          <Card
            padding={14}
            style={{
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
          </Card>
        )}

        {/* Vorschau — nur erster Bericht */}
        {reportDates.length > 0 && (
          <>
            <Card
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
            <Card>
              <p style={{ color: "#8e8e93", fontSize: 13, marginBottom: 6 }}>
                Unterschrift Auftraggeber:
              </p>
              {reportDates.length > 1 && (
                <p style={{ color: "#b26a00", fontSize: 12, marginBottom: 6 }}>
                  Mehrere Tage gewählt: Die Unterschrift wird nur gedruckt,
                  wenn genau ein Tag ausgewählt ist.
                </p>
              )}
              <SigPad
                sig={sig}
                onSave={(s) => sSig(s)}
                onClear={() => sSig(null)}
              />
            </Card>
          </>
        )}

        <button
          onClick={print}
          disabled={reportDates.length === 0}
          style={{
            width: "100%",
            marginTop: 8,
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
