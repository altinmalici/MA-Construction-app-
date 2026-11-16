import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { importWithReload } from "./pwaUpdate.js";

describe("importWithReload – Chunk fehlt nach einem Deploy", () => {
  let reload;
  beforeEach(() => {
    sessionStorage.clear();
    reload = vi.fn();
    vi.stubGlobal("location", { ...window.location, reload });
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("erfolgreicher Import wird durchgereicht", async () => {
    const mod = { default: () => null };
    await expect(importWithReload(() => Promise.resolve(mod))()).resolves.toBe(mod);
    expect(reload).not.toHaveBeenCalled();
  });

  it("fehlgeschlagener Import → EINMAL neu laden statt Fehlerbildschirm", async () => {
    const p = importWithReload(() => Promise.reject(new TypeError("Failed to fetch dynamically imported module")))();
    await Promise.resolve();
    await Promise.resolve();
    expect(reload).toHaveBeenCalledTimes(1);
    // Promise bleibt offen (Seite lädt neu) – kein Fehler für die ErrorBoundary
    let settled = false;
    p.then(() => { settled = true; }, () => { settled = true; });
    await Promise.resolve();
    expect(settled).toBe(false);
  });

  it("zweiter Fehlschlag direkt danach → keine Reload-Schleife, Fehler wird geworfen", async () => {
    sessionStorage.setItem("ma_chunk_reload", "1");
    await expect(importWithReload(() => Promise.reject(new Error("weg")))()).rejects.toThrow("weg");
    expect(reload).not.toHaveBeenCalled();
  });

  it("offline → nicht neu laden (würde die laufende App verlieren)", async () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    await expect(importWithReload(() => Promise.reject(new Error("offline")))()).rejects.toThrow("offline");
    expect(reload).not.toHaveBeenCalled();
  });

  it("nach einem erfolgreichen Import ist der Merker wieder frei", async () => {
    sessionStorage.setItem("ma_chunk_reload", "1");
    await importWithReload(() => Promise.resolve({}))();
    expect(sessionStorage.getItem("ma_chunk_reload")).toBeNull();
  });
});
