import { describe, it, expect, vi } from "vitest";
import { requestWithRetry } from "./_request.js";

describe("requestWithRetry", () => {
  it("liefert das Ergebnis bei sofortigem Erfolg", async () => {
    const queryFn = vi.fn().mockResolvedValue({ data: [{ id: 1 }], error: null });
    const r = await requestWithRetry(queryFn);
    expect(r).toEqual({ data: [{ id: 1 }], error: null });
    expect(queryFn).toHaveBeenCalledTimes(1);
  });

  it("retried bei Network-Fehler bis zum Erfolg", async () => {
    const networkErr = Object.assign(new Error("fetch failed"), {
      name: "TypeError",
    });
    const queryFn = vi
      .fn()
      .mockRejectedValueOnce(networkErr)
      .mockRejectedValueOnce(networkErr)
      .mockResolvedValueOnce({ data: "ok", error: null });
    const r = await requestWithRetry(queryFn, { retryDelayMs: 1 });
    expect(r.data).toBe("ok");
    expect(queryFn).toHaveBeenCalledTimes(3);
  });

  it("wirft nach max retries weiter", async () => {
    const queryFn = vi.fn().mockRejectedValue(
      Object.assign(new Error("network down"), { name: "TypeError" }),
    );
    await expect(
      requestWithRetry(queryFn, { retries: 2, retryDelayMs: 1 }),
    ).rejects.toThrow(/network down/);
    expect(queryFn).toHaveBeenCalledTimes(3); // initial + 2 retries
  });

  it("retried NICHT bei Logic-Errors aus dem Result-Object (z.B. RLS)", async () => {
    const queryFn = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "RLS denied", code: "42501" },
    });
    const r = await requestWithRetry(queryFn, { retryDelayMs: 1 });
    expect(r.error.message).toBe("RLS denied");
    expect(queryFn).toHaveBeenCalledTimes(1);
  });

  it("bricht ab via externes AbortSignal", async () => {
    const controller = new AbortController();
    const queryFn = vi.fn(
      () => new Promise((resolve) => setTimeout(() => resolve({ data: "x" }), 200)),
    );
    const promise = requestWithRetry(queryFn, { signal: controller.signal });
    setTimeout(() => controller.abort(), 20);
    await expect(promise).rejects.toThrow(/abort/i);
  });

  it("Timeout bricht ab und wirft", async () => {
    const queryFn = vi.fn(
      () => new Promise((resolve) => setTimeout(() => resolve({ data: "x" }), 500)),
    );
    await expect(
      requestWithRetry(queryFn, { timeoutMs: 30, retries: 0 }),
    ).rejects.toThrow(/timeout|abort/i);
  });
});

describe("requestWithRetry – Netzfehler als { error } (Audit U-07)", () => {
  const netErr = { message: "TypeError: Failed to fetch", details: "", hint: "", code: "" };

  it("wiederholt, wenn supabase-js den Netzfehler ZURÜCKGIBT statt zu werfen", async () => {
    const fn = vi.fn()
      .mockResolvedValueOnce({ data: null, error: netErr })
      .mockResolvedValueOnce({ data: [1], error: null });
    const r = await requestWithRetry(fn, { retryDelayMs: 1 });
    expect(fn).toHaveBeenCalledTimes(2);
    expect(r).toEqual({ data: [1], error: null });
  });

  it("gibt nach den Versuchen den Fehler zurück (wirft nicht)", async () => {
    const fn = vi.fn().mockResolvedValue({ data: null, error: netErr });
    const r = await requestWithRetry(fn, { retries: 2, retryDelayMs: 1 });
    expect(fn).toHaveBeenCalledTimes(3);
    expect(r.error).toBe(netErr);
  });

  it("fachliche Fehler (RLS, Constraint) werden NICHT wiederholt", async () => {
    const fn = vi.fn().mockResolvedValue({ data: null, error: { code: "42501", message: "permission denied" } });
    await requestWithRetry(fn, { retryDelayMs: 1 });
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe("selectAll – seitenweises Laden (Audit U-05)", () => {
  const pages = (sizes) => {
    const calls = [];
    const build = () => ({
      range: (from, to) => {
        calls.push([from, to]);
        const n = sizes[calls.length - 1] ?? 0;
        return Promise.resolve({ data: Array.from({ length: n }, (_, i) => ({ id: from + i })), error: null });
      },
    });
    return { build, calls };
  };

  it("lädt mehr als 1000 Zeilen vollständig – die neuesten gehen nicht verloren", async () => {
    const { selectAll } = await import("./_request.js");
    const { build, calls } = pages([1000, 1000, 250]);
    const { data, error } = await selectAll(build);
    expect(error).toBeNull();
    expect(data).toHaveLength(2250);
    expect(data.at(-1).id).toBe(2249);
    expect(calls).toEqual([[0, 999], [1000, 1999], [2000, 2999]]);
  });

  it("eine Seite reicht bei wenig Daten; genau volle Seite → eine Leerabfrage", async () => {
    const { selectAll } = await import("./_request.js");
    const a = pages([12]);
    expect((await selectAll(a.build)).data).toHaveLength(12);
    expect(a.calls).toHaveLength(1);
    const b = pages([1000, 0]);
    expect((await selectAll(b.build)).data).toHaveLength(1000);
    expect(b.calls).toHaveLength(2);
  });

  it("Fehler auf einer späteren Seite → Fehler, keine halbe Liste", async () => {
    const { selectAll } = await import("./_request.js");
    let n = 0;
    const build = () => ({
      range: () => Promise.resolve(++n === 1
        ? { data: Array.from({ length: 1000 }, () => ({})), error: null }
        : { data: null, error: { code: "42501", message: "x" } }),
    });
    const r = await selectAll(build);
    expect(r.data).toBeNull();
    expect(r.error.code).toBe("42501");
  });
});
