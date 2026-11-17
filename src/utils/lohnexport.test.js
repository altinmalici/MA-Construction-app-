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
  { mitarbeiterId: "u1", datum: "2026-07-03", baustelleId: "b1", arbeit: "Fliesen", beginn: "07:00", ende: "16:00", pause: 30, fahrtzeit: 30, h: 8.5, freigegeben: true },
  { mitarbeiterId: "u1", datum: "2026-07-04", baustelleId: "b2", arbeit: "", beginn: "08:00", ende: "12:00", pause: 0, fahrtzeit: 0, h: 4, freigegeben: false },
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
    expect(csv).toContain("8,50;0,00;8,50;45,00;382,50"); // Fahrtzeit 30 vor dem Stichtag zählt nicht
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

  it("fuehrt die Freigegeben-Spalte (Ja/Nein)", () => {
    const csv = build();
    expect(csv).toContain("Freigegeben");
    expect(csv).toContain("382,50;Ja"); // freigegeben: true
    expect(csv).toContain("180,00;Nein"); // freigegeben: false
  });

  it("summiert pro Mitarbeiter und Gesamt", () => {
    const csv = build();
    // Max: 8,5 + 4 = 12,5 h ; 382,5 + 180 = 562,5
    expect(csv).toContain("Max Mustermann;12,50;0,00;12,50;45,00;562,50");
    // Anna: 8,5 h x 40 = 340
    expect(csv).toContain("Anna Beispiel;8,50;0,00;8,50;40,00;340,00");
    // GESAMT: 21 h ; 902,50
    expect(csv).toContain("GESAMT;21,00;0,00;21,00;;902,50");
  });
});

describe("CSV-Sicherheit und Konsistenz (Audit D-13, D-11)", () => {
  it("Formel-Injektion: Texte mit = + - @ am Anfang werden entschärft", async () => {
    const { csvCell } = await import("./lohnexport.js");
    expect(csvCell("=SUMME(A1:A9)")).toBe("'=SUMME(A1:A9)");
    expect(csvCell("+49 170 123")).toBe("'+49 170 123");
    expect(csvCell("@cmd")).toBe("'@cmd");
    expect(csvCell("-Rückbau Wand")).toBe("'-Rückbau Wand");
    expect(csvCell('=HYPERLINK("x";"y")')).toBe(`"'=HYPERLINK(""x"";""y"")"`);
  });

  it("vom Export formatierte Zahlen und normale Texte bleiben unverändert", async () => {
    const { csvCell } = await import("./lohnexport.js");
    expect(csvCell("-12,50")).toBe("-12,50");
    expect(csvCell("1.234,56")).toBe("1.234,56");
    expect(csvCell("Estrich")).toBe("Estrich");
    expect(csvCell(null)).toBe("");
  });

  it("Zeilenumbruch und Anführungszeichen in der Tätigkeit zerreißen die Zeile nicht", async () => {
    const { csvRow } = await import("./lohnexport.js");
    expect(csvRow(["a", 'Wand "Nord"\nverputzt', "b"])).toBe('a;"Wand ""Nord""\nverputzt";b');
  });

  it("Lohn-CSV rechnet mit denselben Viertelstunden wie die App", async () => {
    const { buildLohnCsv } = await import("./lohnexport.js");
    const { bStdNum } = await import("./helpers.js");
    const csv = buildLohnCsv({
      entries: [{ mitarbeiterId: "u1", baustelleId: "b1", datum: "2026-11-16", beginn: "07:00", ende: "15:10", pause: 30, arbeit: "=1+1" }],
      hoursOf: (e) => bStdNum(e.beginn, e.ende, e.pause),
      userById: new Map([["u1", { name: "Max", stundensatz: 40 }]]),
      baustelleById: new Map([["b1", { kunde: "Huber" }]]),
      monthLabel: "November 2026",
    });
    expect(csv).toContain("7,75;40,00;310,00");
    expect(csv).toContain("'=1+1");
  });
});

describe("Fahrtzeit wird bezahlt, wenn sie eingetragen ist", () => {
  const build = async (entries) => {
    const { buildLohnCsv } = await import("./lohnexport.js");
    const { bStdNum } = await import("./helpers.js");
    return buildLohnCsv({
      entries,
      hoursOf: (e) => bStdNum(e.beginn, e.ende, e.pause),
      userById: new Map([["u1", { name: "Max", stundensatz: 40 }]]),
      baustelleById: new Map([["b1", { kunde: "Huber" }]]),
      monthLabel: "November 2026",
    });
  };
  const e = (over) => ({ mitarbeiterId: "u1", baustelleId: "b1", datum: "2026-12-01", beginn: "07:00", ende: "15:00", pause: 0, arbeit: "Putz", ...over });

  it("eigene Spalten: Arbeitszeit, Fahrtzeit, Stunden gesamt – der Betrag rechnet mit der Summe", async () => {
    const csv = await build([e({ fahrtzeit: 30 })]);
    expect(csv).toContain("Arbeitszeit (Std);Fahrtzeit (Std);Stunden gesamt;Stundensatz (EUR);Betrag (EUR)");
    // 8 h Arbeit + 0,5 h Fahrt = 8,5 h × 40 € = 340 €
    expect(csv).toContain("07:00;15:00;0;30;8,00;0,50;8,50;40,00;340,00");
  });

  it("Fahrtzeit 0 oder leer = nichts", async () => {
    const csv = await build([e({ fahrtzeit: 0 }), e({ datum: "2026-12-02", fahrtzeit: undefined })]);
    expect(csv).toContain("8,00;0,00;8,00;40,00;320,00");
    expect(csv).toContain("GESAMT;16,00;0,00;16,00;;640,00");
  });

  it("Zusammenfassung und Gesamt enthalten die Fahrtzeit", async () => {
    const csv = await build([e({ fahrtzeit: 30 }), e({ datum: "2026-12-02", fahrtzeit: 45 })]);
    expect(csv).toContain("Max;16,00;1,25;17,25;40,00;690,00");
    expect(csv).toContain("GESAMT;16,00;1,25;17,25;;690,00");
  });

  it("Fahrtzeit wird auf Viertelstunden gerundet (20 min → 0,25 h)", async () => {
    const { fahrtStd, lohnStd } = await import("./helpers.js");
    const d = "2026-12-01";
    expect(fahrtStd({ datum: d, fahrtzeit: 20 })).toBe(0.25);
    expect(fahrtStd({ datum: d, fahrtzeit: 0 })).toBe(0);
    expect(fahrtStd({ datum: d, fahrtzeit: -10 })).toBe(0);
    expect(fahrtStd({ datum: d })).toBe(0);
    expect(fahrtStd({})).toBe(0);
    expect(lohnStd({ datum: d, beginn: "07:00", ende: "15:00", pause: 0, fahrtzeit: 30 })).toBe(8.5);
  });

  it("Stichtag: alte Einträge (vorbelegte 30 Minuten) bleiben unbezahlt – auch im Export", async () => {
    const { fahrtStd, FAHRTZEIT_BEZAHLT_AB } = await import("./helpers.js");
    expect(FAHRTZEIT_BEZAHLT_AB).toBe("2026-11-18");
    expect(fahrtStd({ datum: "2026-11-17", fahrtzeit: 30 })).toBe(0);
    expect(fahrtStd({ datum: "2026-11-18", fahrtzeit: 30 })).toBe(0.5);
    const csv = await build([e({ datum: "2026-11-17", fahrtzeit: 30 })]);
    expect(csv).toContain("8,00;0,00;8,00;40,00;320,00");
  });
});
