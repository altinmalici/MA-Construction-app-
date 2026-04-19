import { describe, it, expect, vi, afterEach } from "vitest";
import {
  genPin,
  bStd,
  isInMonth,
  isMitarbeiterEntry,
  parseDecimal,
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
