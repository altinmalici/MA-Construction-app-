import { fDat, escHtml, aggregateEinsaetze, fStd } from "./helpers.js";

// HTML des Regieberichts. Eigenes Modul (statt in RegView.jsx), damit es
// ohne React testbar ist: Escaping, Mannstunden, Unterschrift.

const fH = (h) => fStd(h) + " h";

/**
 * Erzeugt das HTML für EINEN Bericht (1 Tag). Pure-function — nimmt alle
 * Eingaben explizit, damit sie für jeden Tag im Multi-Export frisch
 * berechnet werden können.
 */
export function buildReportHtml({ bs, datum, eintraege, berichtNr, forPrint, sig }) {
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
  // Die auf dem Gerät gezeichnete Unterschrift (PNG-Data-URL vom SigPad)
  // gehört auf das Dokument. Früher blieb das Feld im Druck immer leer.
  // Nur echte Bild-Data-URLs zulassen (kein fremdes HTML/URL einschleusen).
  const sigOk = typeof sig === "string" && /^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(sig);
  const sigImg = sigOk
    ? `<img src="${sig}" alt="Unterschrift" style="max-width:100%;max-height:100%;object-fit:contain" />`
    : "";
  h += `<div style="margin-top:${forPrint ? "18mm" : "30px"}">
    <div style="width:${forPrint ? "156mm" : "100%"};height:${forPrint ? "22mm" : "70px"};border:0.5pt solid #D1D5DB;background:white;border-radius:4px;display:flex;align-items:center;justify-content:center;overflow:hidden">${sigImg}</div>
    <div style="margin-top:6px;color:#6B7280;font-size:${forPrint ? "8pt" : "10px"}">Datum, Name und Unterschrift</div>
  </div>`;

  return forPrint
    ? `<div style="padding:22mm 25mm;font-family:Arial,sans-serif;color:#111827;font-size:${fontSize};box-sizing:border-box">${h}</div>`
    : `<div style="font-family:Arial,sans-serif;color:#111827;font-size:${fontSize}">${h}</div>`;
}

