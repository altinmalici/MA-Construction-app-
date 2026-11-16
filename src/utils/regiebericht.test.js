import { describe, it, expect } from "vitest";
import { buildReportHtml } from "./regiebericht.js";

const bs = { kunde: "Huber & Söhne", adresse: "Hauptstr. 1" };
const e = (over = {}) => ({ beginn: "07:00", ende: "15:15", pause: 30, arbeit: "Estrich", ...over });
const html = (over = {}) =>
  buildReportHtml({ bs, datum: "2026-11-16", eintraege: [e(), e(), e()], berichtNr: "07", forPrint: true, ...over });

const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==";

describe("Regiebericht", () => {
  it("Mannstunden mit Viertelstunden: 3 Mann × 7,75 h = 23,25 h", () => {
    const h = html();
    expect(h).toContain("7,75 h");
    expect(h).toContain("23,25 h");
    expect(h).not.toContain("7.8");
    expect(h).not.toContain("23.4");
  });

  it("Kundenunterschrift erscheint im Dokument (Druck und Vorschau)", () => {
    expect(html({ sig: PNG })).toContain(`<img src="${PNG}"`);
    expect(html({ sig: PNG, forPrint: false })).toContain(`<img src="${PNG}"`);
  });

  it("ohne Unterschrift bleibt das Feld leer", () => {
    expect(html()).not.toContain("<img");
    expect(html()).toContain("Datum, Name und Unterschrift");
  });

  it("nur echte Bild-Data-URLs werden eingebettet", () => {
    for (const bad of [
      'x" onerror="alert(1)',
      "https://evil.example/x.png",
      "data:text/html;base64,PHNjcmlwdD4=",
      'data:image/png;base64,AAAA" onload="x',
    ]) {
      expect(html({ sig: bad })).not.toContain("<img");
    }
  });

  it("Texte aus der Datenbank werden maskiert", () => {
    const h = buildReportHtml({
      bs: { kunde: "<script>alert(1)</script>", adresse: 'a"b' },
      datum: "2026-11-16",
      eintraege: [e({ arbeit: "<img src=x onerror=1>" })],
      berichtNr: "<b>1</b>",
      forPrint: false,
    });
    expect(h).not.toContain("<script>");
    expect(h).not.toContain("<img src=x");
    expect(h).not.toContain("<b>1</b>");
    expect(h).toContain("&lt;script&gt;");
  });

  it("Tätigkeiten werden ohne Doppelte gelistet; 0-Stunden-Einträge zählen nicht", () => {
    const h = html({ eintraege: [e(), e({ arbeit: "Putz" }), e({ arbeit: "Estrich" }), e({ beginn: "08:00", ende: "08:00", arbeit: "Nix" })] });
    expect(h.match(/Estrich/g)).toHaveLength(1);
    expect(h).toContain("Putz");
    expect(h).toContain("23,25 h");
  });
});
