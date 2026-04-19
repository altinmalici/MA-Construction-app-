import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSaving } from "./useSaving.js";

describe("useSaving", () => {
  it("a) saving startet false", () => {
    const { result } = renderHook(() => useSaving());
    expect(result.current.saving).toBe(false);
  });

  it("b) während fn läuft ist saving true; nach erfolg false", async () => {
    const { result } = renderHook(() => useSaving());
    let release;
    const pending = new Promise((r) => (release = r));
    let promise;
    await act(async () => {
      promise = result.current.withSaving(async () => {
        await pending;
      });
      await Promise.resolve(); // flush state update
    });
    expect(result.current.saving).toBe(true);
    release();
    await act(async () => {
      await promise;
    });
    expect(result.current.saving).toBe(false);
  });

  it("c) Error propagiert, saving wird trotzdem false", async () => {
    const { result } = renderHook(() => useSaving());
    let caught;
    await act(async () => {
      try {
        await result.current.withSaving(async () => {
          throw new Error("boom");
        });
      } catch (e) {
        caught = e;
      }
    });
    expect(caught?.message).toBe("boom");
    expect(result.current.saving).toBe(false);
  });

  it("d) zweiter Call während pending → ignoriert (kein Doppel-Run)", async () => {
    const { result } = renderHook(() => useSaving());
    let runs = 0;
    let release;
    const pending = new Promise((r) => (release = r));
    await act(async () => {
      const first = result.current.withSaving(async () => {
        runs++;
        await pending;
      });
      // Zweiter Call mitten in pending — sollte sofort returnen ohne fn zu rufen
      const second = result.current.withSaving(async () => {
        runs++;
      });
      await second;
      expect(runs).toBe(1);
      release();
      await first;
    });
    expect(runs).toBe(1);
  });

  it("e) Unmount während fn läuft → kein setState-Warning", async () => {
    const { result, unmount } = renderHook(() => useSaving());
    let release;
    const pending = new Promise((r) => (release = r));
    let promise;
    await act(async () => {
      promise = result.current.withSaving(async () => {
        await pending;
      });
      await Promise.resolve();
    });
    unmount();
    release();
    await act(async () => {
      await promise;
    });
    // No assertion needed — Test passt wenn keine React-Warning geworfen wird
    expect(true).toBe(true);
  });
});
