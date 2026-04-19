import { describe, it, expect, vi, afterEach } from "vitest";
import { genPin } from "./helpers.js";

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
