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
