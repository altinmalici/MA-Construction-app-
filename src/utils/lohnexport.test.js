import { describe, it, expect } from "vitest";
import { buildLohnCsv } from "./lohnexport.js";

const userById = new Map([
  ["u1", { name: "Max Mustermann", stundensatz: 45 }],
  ["u2", { name: "Anna Beispiel", stundensatz: 40 }],
]);
const baustelleById = new Map([
  ["b1", { kunde: "Muster GmbH" }],
  ["b2", { kunde: "Bau; AG" }], // Semikolon im Namen → muss escaped werden
]);

const entries = [
  { mitarbeiterId: "u1", datum: "2026-07-03", baustelleId: "b1", arbeit: "Fliesen", beginn: "07:00", ende: "16:00", pause: 30, fahrtzeit: 30, h: 8.5 },
  { mitarbeiterId: "u1", datum: "2026-07-04", baustelleId: "b2", arbeit: "", beginn: "08:00", ende: "12:00", pause: 0, fahrtzeit: 0, h: 4 },
  { mitarbeiterId: "u2", datum: "2026-07-03", baustelleId: "b1", arbeit: "Estrich", beginn: "07:00", ende: "15:36", pause: 0, fahrtzeit: 0, h: 8.6 },
];

const build = () =>
  buildLohnCsv({
    entries,
    hoursOf: (e) => e.h,
    userById,
    baustelleById,
    monthLabel: "Juli 2026",
  });

describe("buildLohnCsv", () => {
  it("beginnt mit UTF-8-BOM und nutzt CRLF-Zeilenenden", () => {
    const csv = build();
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toContain("\r\n");
  });

  it("enthaelt Kopf, Mitarbeiter und deutsches Datumsformat", () => {
    const csv = build();
    expect(csv).toContain("Lohn-/Stundenexport;Juli 2026");
    expect(csv).toContain("Max Mustermann");
    expect(csv).toContain("03.07.2026");
  });

  it("rechnet Betrag = Stunden x Stundensatz mit Komma-Dezimal", () => {
    const csv = build();
    // 8,5 h x 45 = 382,50
    expect(csv).toContain("8,50;45,00;382,50");
    // 4 h x 45 = 180,00
    expect(csv).toContain("4,00;45,00;180,00");
  });

  it("rundet auf Viertelstunde (8,6 -> 8,5)", () => {
    const csv = build();
    // 8,6 h -> 8,5 h x 40 = 340,00
    expect(csv).toContain("8,50;40,00;340,00");
  });

  it("escaped Semikolon im Baustellennamen", () => {
    const csv = build();
    expect(csv).toContain('"Bau; AG"');
  });

  it("summiert pro Mitarbeiter und Gesamt", () => {
    const csv = build();
    // Max: 8,5 + 4 = 12,5 h ; 382,5 + 180 = 562,5
    expect(csv).toContain("Max Mustermann;12,50;45,00;562,50");
    // Anna: 8,5 h x 40 = 340
    expect(csv).toContain("Anna Beispiel;8,50;40,00;340,00");
    // GESAMT: 21 h ; 902,50
    expect(csv).toContain("GESAMT;21,00;;902,50");
  });
});
