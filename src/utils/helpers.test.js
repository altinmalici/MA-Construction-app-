import { describe, it, expect, vi, afterEach } from "vitest";
import {
  genPin,
  bStd,
  isInMonth,
  isMitarbeiterEntry,
  parseDecimal,
  aggregateEinsaetze,
  getReportDates,
  getCurrentWeekRange,
  getCurrentMonthRange,
  getBaustelleFullRange,
} from "./helpers.js";

describe("parseDecimal (Komma + Punkt)", () => {
  it("englischer Punkt: '50.5' → 50.5", () => {
    expect(parseDecimal("50.5")).toBe(50.5);
  });
  it("deutsches Komma: '50,5' → 50.5", () => {
    expect(parseDecimal("50,5")).toBe(50.5);
  });
  it("vier-stelliger Komma-Wert: '50000,50' → 50000.5", () => {
    expect(parseDecimal("50000,50")).toBe(50000.5);
  });
  it("Cent-Wert: '0,01' → 0.01", () => {
    expect(parseDecimal("0,01")).toBe(0.01);
  });
  it("leerer String → 0", () => {
    expect(parseDecimal("")).toBe(0);
  });
  it("null → 0", () => {
    expect(parseDecimal(null)).toBe(0);
  });
  it("undefined → 0", () => {
    expect(parseDecimal(undefined)).toBe(0);
  });
  it("Buchstaben → 0", () => {
    expect(parseDecimal("abc")).toBe(0);
  });
  it("negativer String → 0 (Non-Negative-Guard)", () => {
    expect(parseDecimal("-5")).toBe(0);
  });
  it("Whitespace wird getrimmt: '  12,3  ' → 12.3", () => {
    expect(parseDecimal("  12,3  ")).toBe(12.3);
  });
  it("Number-Input wird durchgereicht: 45 → 45", () => {
    expect(parseDecimal(45)).toBe(45);
  });
  it("Tausenderpunkt + Komma: '1.234,56' → 1.234 (dokumentiert: erstes Komma → Punkt, parseFloat stoppt am zweiten Punkt)", () => {
    expect(parseDecimal("1.234,56")).toBe(1.234);
  });
});

describe("isInMonth (TZ-safe Monats-Check)", () => {
  it("plain YYYY-MM-DD im richtigen Monat → true", () => {
    expect(isInMonth("2026-04-19", 3, 2026)).toBe(true);
  });
  it("ISO mit lokalem Offset, Zeitanteil ignoriert → true", () => {
    expect(isInMonth("2026-04-19T22:30:00+02:00", 3, 2026)).toBe(true);
  });
  it("ISO mit Z (UTC), spät am Tag, Zeitanteil ignoriert → bleibt im April (kein TZ-Shift)", () => {
    expect(isInMonth("2026-04-19T22:30:00Z", 3, 2026)).toBe(true);
  });
  it("falscher Monat → false", () => {
    expect(isInMonth("2026-05-01", 3, 2026)).toBe(false);
  });
  it("falsches Jahr → false", () => {
    expect(isInMonth("2026-04-19", 3, 2025)).toBe(false);
  });
  it("leerer String → false", () => {
    expect(isInMonth("", 3, 2026)).toBe(false);
  });
  it("null → false", () => {
    expect(isInMonth(null, 3, 2026)).toBe(false);
  });
  it("undefined → false", () => {
    expect(isInMonth(undefined, 3, 2026)).toBe(false);
  });
});

describe("isMitarbeiterEntry", () => {
  it("personTyp 'mitarbeiter' → true", () => {
    expect(isMitarbeiterEntry({ personTyp: "mitarbeiter" })).toBe(true);
  });
  it("personTyp fehlt → true (Default)", () => {
    expect(isMitarbeiterEntry({})).toBe(true);
  });
  it("personTyp undefined → true", () => {
    expect(isMitarbeiterEntry({ personTyp: undefined })).toBe(true);
  });
  it("personTyp 'sub' → false", () => {
    expect(isMitarbeiterEntry({ personTyp: "sub" })).toBe(false);
  });
  it("personTyp 'sonstige' → false", () => {
    expect(isMitarbeiterEntry({ personTyp: "sonstige" })).toBe(false);
  });
  it("null → false (defensiv)", () => {
    expect(isMitarbeiterEntry(null)).toBe(false);
  });
});

describe("bStd (Stunden-Berechnung)", () => {
  it("a) normale Schicht 08:00-16:00 ohne Pause = 8.0h", () => {
    expect(bStd("08:00", "16:00", 0)).toBe("8.0");
  });

  it("b) 08:00-16:00 mit 30min Pause = 7.5h", () => {
    expect(bStd("08:00", "16:00", 30)).toBe("7.5");
  });

  it("c) Mitternachts-Übergang 22:00-02:00 ohne Pause = 4.0h", () => {
    expect(bStd("22:00", "02:00", 0)).toBe("4.0");
  });

  it("d) Nachtschicht 22:00-06:00 mit 30min Pause = 7.5h", () => {
    expect(bStd("22:00", "06:00", 30)).toBe("7.5");
  });

  it("e) Beginn = Ende 00:00-00:00 = 0.0h (Convention)", () => {
    expect(bStd("00:00", "00:00", 0)).toBe("0.0");
  });

  it("f) kleiner Mitternachts-Sprung 23:30-00:30 = 1.0h", () => {
    expect(bStd("23:30", "00:30", 0)).toBe("1.0");
  });

  it("g) 08:00-16:00 mit 60min Pause = 7.0h", () => {
    expect(bStd("08:00", "16:00", 60)).toBe("7.0");
  });

  it("h) Pause > Schicht-Länge → 0.0h (Safety-Cap, kein Negativ-Wert)", () => {
    expect(bStd("08:00", "09:00", 120)).toBe("0.0");
  });
});

describe("genPin (Onboarding-PIN)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("a) liefert einen 4-stelligen String", () => {
    for (let i = 0; i < 50; i++) {
      const pin = genPin();
      expect(pin).toHaveLength(4);
    }
  });

  it("b) besteht ausschließlich aus Ziffern (auch mit führender 0)", () => {
    for (let i = 0; i < 50; i++) {
      const pin = genPin();
      expect(pin).toMatch(/^\d{4}$/);
    }
  });

  it("c) 100 Aufrufe liefern mindestens 90 unterschiedliche Werte", () => {
    const set = new Set();
    for (let i = 0; i < 100; i++) set.add(genPin());
    expect(set.size).toBeGreaterThanOrEqual(90);
  });

  it("d) wirft expliziten Error wenn crypto.getRandomValues nicht verfügbar ist (kein silent Math.random-Fallback)", () => {
    vi.stubGlobal("crypto", undefined);
    expect(() => genPin()).toThrow(/crypto\.getRandomValues/);
  });
});

describe("aggregateEinsaetze (Regiebericht-Aggregation)", () => {
  it("3× 8h-Einsatz → 1 Zeile mit 3 Mann × 8h = 24h", () => {
    const eintraege = [
      { beginn: "07:00", ende: "16:00", pause: 60 },
      { beginn: "07:00", ende: "16:00", pause: 60 },
      { beginn: "07:00", ende: "16:00", pause: 60 },
    ];
    const r = aggregateEinsaetze(eintraege);
    expect(r).toHaveLength(1);
    expect(r[0]).toEqual({ stunden: 8, anzahl: 3, mannstunden: 24 });
  });

  it("gemischt: 2×8h + 2×4h → 2 Zeilen, sortiert nach mannstunden desc", () => {
    const eintraege = [
      { beginn: "07:00", ende: "16:00", pause: 60 }, // 8h
      { beginn: "07:00", ende: "16:00", pause: 60 }, // 8h
      { beginn: "08:00", ende: "12:00", pause: 0 },  // 4h
      { beginn: "08:00", ende: "12:00", pause: 0 },  // 4h
    ];
    const r = aggregateEinsaetze(eintraege);
    expect(r).toHaveLength(2);
    expect(r[0]).toEqual({ stunden: 8, anzahl: 2, mannstunden: 16 });
    expect(r[1]).toEqual({ stunden: 4, anzahl: 2, mannstunden: 8 });
  });

  it("leere Liste → []", () => {
    expect(aggregateEinsaetze([])).toEqual([]);
    expect(aggregateEinsaetze(null)).toEqual([]);
    expect(aggregateEinsaetze(undefined)).toEqual([]);
  });

  it("0-Stunden-Einträge (Pause > Schichtlänge) werden ignoriert", () => {
    const eintraege = [
      { beginn: "08:00", ende: "12:00", pause: 300 }, // 0h (Pause > Schicht)
      { beginn: "08:00", ende: "16:00", pause: 60 },  // 7h
    ];
    const r = aggregateEinsaetze(eintraege);
    expect(r).toHaveLength(1);
    expect(r[0]).toEqual({ stunden: 7, anzahl: 1, mannstunden: 7 });
  });
});

describe("getReportDates (Range-Filter)", () => {
  const eintraege = [
    { baustelleId: "A", datum: "2026-04-01" },
    { baustelleId: "A", datum: "2026-04-01" }, // duplicate same day
    { baustelleId: "A", datum: "2026-04-03" },
    { baustelleId: "A", datum: "2026-04-05" },
    { baustelleId: "B", datum: "2026-04-02" }, // andere Baustelle
    { baustelleId: "A", datum: "2026-03-31" }, // außerhalb Range
  ];

  it("liefert distinct Tage chronologisch sortiert", () => {
    expect(
      getReportDates(eintraege, "A", "2026-04-01", "2026-04-05"),
    ).toEqual(["2026-04-01", "2026-04-03", "2026-04-05"]);
  });

  it("Range mit nur 1 Tag liefert max. 1 Element", () => {
    expect(
      getReportDates(eintraege, "A", "2026-04-03", "2026-04-03"),
    ).toEqual(["2026-04-03"]);
  });

  it("Range ohne Treffer → []", () => {
    expect(
      getReportDates(eintraege, "A", "2026-05-01", "2026-05-31"),
    ).toEqual([]);
  });

  it("vertauschte Reihenfolge (Bis < Von) → silent swap", () => {
    expect(
      getReportDates(eintraege, "A", "2026-04-05", "2026-04-01"),
    ).toEqual(["2026-04-01", "2026-04-03", "2026-04-05"]);
  });

  it("ignoriert andere Baustellen", () => {
    expect(
      getReportDates(eintraege, "B", "2026-04-01", "2026-04-05"),
    ).toEqual(["2026-04-02"]);
  });

  it("Jahreswechsel: ISO-Strings sortieren lexikographisch korrekt", () => {
    const e = [
      { baustelleId: "A", datum: "2025-12-31" },
      { baustelleId: "A", datum: "2026-01-02" },
      { baustelleId: "A", datum: "2026-01-05" },
    ];
    expect(getReportDates(e, "A", "2025-12-31", "2026-01-05")).toEqual([
      "2025-12-31",
      "2026-01-02",
      "2026-01-05",
    ]);
  });

  it("leere Eintragsliste → []", () => {
    expect(getReportDates([], "A", "2026-04-01", "2026-04-05")).toEqual([]);
  });
});

describe("getCurrentWeekRange (Mo-So)", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("Mittwoch 15.04.2026 → Mo 13.04. - So 19.04.", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-15T12:00:00"));
    expect(getCurrentWeekRange()).toEqual({
      von: "2026-04-13",
      bis: "2026-04-19",
    });
  });

  it("Montag 13.04.2026 → Mo 13.04. - So 19.04.", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-13T12:00:00"));
    expect(getCurrentWeekRange()).toEqual({
      von: "2026-04-13",
      bis: "2026-04-19",
    });
  });

  it("Sonntag 19.04.2026 → Mo 13.04. - So 19.04.", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-19T12:00:00"));
    expect(getCurrentWeekRange()).toEqual({
      von: "2026-04-13",
      bis: "2026-04-19",
    });
  });

  it("über Monatsgrenze: Mo 30.03. - So 05.04.", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-02T12:00:00"));
    expect(getCurrentWeekRange()).toEqual({
      von: "2026-03-30",
      bis: "2026-04-05",
    });
  });
});

describe("getCurrentMonthRange (1.-letzter)", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("April 2026 (30 Tage) → 01.04. - 30.04.", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-15T12:00:00"));
    expect(getCurrentMonthRange()).toEqual({
      von: "2026-04-01",
      bis: "2026-04-30",
    });
  });

  it("Februar 2026 (28 Tage, kein Schaltjahr) → 01.02. - 28.02.", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-10T12:00:00"));
    expect(getCurrentMonthRange()).toEqual({
      von: "2026-02-01",
      bis: "2026-02-28",
    });
  });

  it("Februar 2024 (Schaltjahr) → 01.02. - 29.02.", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-02-10T12:00:00"));
    expect(getCurrentMonthRange()).toEqual({
      von: "2024-02-01",
      bis: "2024-02-29",
    });
  });

  it("Dezember (31 Tage) → 01.12. - 31.12.", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-12-15T12:00:00"));
    expect(getCurrentMonthRange()).toEqual({
      von: "2026-12-01",
      bis: "2026-12-31",
    });
  });
});

describe("getBaustelleFullRange (frühester-spätester Eintrag)", () => {
  it("liefert frühesten und spätesten datum-String", () => {
    const e = [
      { baustelleId: "A", datum: "2026-04-15" },
      { baustelleId: "A", datum: "2026-01-03" },
      { baustelleId: "A", datum: "2026-03-22" },
      { baustelleId: "B", datum: "2026-05-01" },
    ];
    expect(getBaustelleFullRange(e, "A")).toEqual({
      von: "2026-01-03",
      bis: "2026-04-15",
    });
  });

  it("nur 1 Eintrag → von = bis", () => {
    expect(
      getBaustelleFullRange([{ baustelleId: "A", datum: "2026-04-15" }], "A"),
    ).toEqual({ von: "2026-04-15", bis: "2026-04-15" });
  });

  it("keine Einträge für Baustelle → null", () => {
    expect(getBaustelleFullRange([], "A")).toBeNull();
    expect(
      getBaustelleFullRange([{ baustelleId: "B", datum: "2026-04-15" }], "A"),
    ).toBeNull();
  });
});
