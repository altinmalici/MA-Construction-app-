import { describe, it, expect, vi, afterEach } from "vitest";
import { genPin, bStd } from "./helpers.js";

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
