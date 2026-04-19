import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// requireEnv ist die exportierte pure Validierungs-Funktion.
import { requireEnv } from "./supabase.js";

describe("requireEnv", () => {
  it("a) wirft mit klarem Hinweis wenn VITE_SUPABASE_URL fehlt", () => {
    expect(() => requireEnv("VITE_SUPABASE_URL", undefined)).toThrow(
      /VITE_SUPABASE_URL/,
    );
    expect(() => requireEnv("VITE_SUPABASE_URL", "")).toThrow(
      /VITE_SUPABASE_URL/,
    );
    expect(() => requireEnv("VITE_SUPABASE_URL", "   ")).toThrow(
      /VITE_SUPABASE_URL/,
    );
  });

  it("b) wirft mit klarem Hinweis wenn VITE_SUPABASE_ANON_KEY fehlt", () => {
    expect(() => requireEnv("VITE_SUPABASE_ANON_KEY", undefined)).toThrow(
      /VITE_SUPABASE_ANON_KEY/,
    );
    expect(() => requireEnv("VITE_SUPABASE_ANON_KEY", null)).toThrow(
      /VITE_SUPABASE_ANON_KEY/,
    );
  });

  it("c) wirft wenn URL nicht mit https:// beginnt", () => {
    expect(() =>
      requireEnv("VITE_SUPABASE_URL", "http://insecure.example.com", {
        prefix: "https://",
      }),
    ).toThrow(/https:\/\//);
    expect(() =>
      requireEnv("VITE_SUPABASE_URL", "wss://wrong.example.com", {
        prefix: "https://",
      }),
    ).toThrow(/https:\/\//);
  });

  it("d) gibt den Wert zurück wenn alles ok ist", () => {
    expect(
      requireEnv("VITE_SUPABASE_URL", "https://abc.supabase.co", {
        prefix: "https://",
      }),
    ).toBe("https://abc.supabase.co");
    expect(requireEnv("VITE_SUPABASE_ANON_KEY", "eyJhbGciOi.fake.token")).toBe(
      "eyJhbGciOi.fake.token",
    );
  });

  it("e) Error-Message enthält Debug-Hinweis auf .env / Vercel settings", () => {
    let err;
    try {
      requireEnv("VITE_SUPABASE_URL", undefined);
    } catch (e) {
      err = e;
    }
    expect(err).toBeDefined();
    // Hinweis muss .env ODER Vercel settings nennen, damit der Entwickler
    // sofort weiß wo er nachschauen muss.
    expect(err.message).toMatch(/\.env|Vercel/i);
  });
});

describe("supabase module integration", () => {
  beforeEach(() => {
    vi.resetModules();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("d-integration) Modul lädt sauber wenn beide Env-Vars valide gesetzt sind", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://test.supabase.co");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "test-anon-key-12345");
    const mod = await import("./supabase.js");
    expect(mod.supabase).toBeDefined();
    expect(typeof mod.supabase.from).toBe("function");
  });

  it("integration) Modul wirft beim Import wenn URL fehlt", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "test-anon-key-12345");
    await expect(import("./supabase.js")).rejects.toThrow(/VITE_SUPABASE_URL/);
  });
});
