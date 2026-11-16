import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useOfflineSync, OFFLINE_SYNC_INTERVAL_MS } from "./useOfflineSync.js";
import { enqueueStunde, clearQueue } from "./offlineQueue.js";

// Audit 2026-11 D-01: Die Warteschlange wurde nur beim App-Start (ohne
// Sitzung) und beim "online"-Ereignis abgearbeitet — nie nach dem Login.
describe("useOfflineSync", () => {
  let sync;
  beforeEach(() => {
    vi.useFakeTimers();
    clearQueue();
    sync = vi.fn().mockResolvedValue({ synced: 0, remaining: 0 });
  });
  afterEach(() => {
    vi.useRealTimers();
    clearQueue();
    vi.restoreAllMocks();
  });

  const flush = () => act(async () => { await Promise.resolve(); });

  it("ohne eingeloggten Nutzer wird nie synchronisiert", async () => {
    enqueueStunde({ id: "a", mitarbeiterId: "u1" });
    renderHook(() => useOfflineSync({ userId: null, sync }));
    await flush();
    act(() => window.dispatchEvent(new Event("online")));
    await act(async () => { vi.advanceTimersByTime(OFFLINE_SYNC_INTERVAL_MS * 3); });
    expect(sync).not.toHaveBeenCalled();
  });

  it("synchronisiert direkt nach dem Login", async () => {
    enqueueStunde({ id: "a", mitarbeiterId: "u1" });
    const { rerender } = renderHook(({ userId }) => useOfflineSync({ userId, sync }), {
      initialProps: { userId: null },
    });
    await flush();
    expect(sync).not.toHaveBeenCalled();
    rerender({ userId: "u1" });
    await flush();
    expect(sync).toHaveBeenCalledTimes(1);
  });

  it("leere Warteschlange → kein Aufruf", async () => {
    renderHook(() => useOfflineSync({ userId: "u1", sync }));
    await flush();
    await act(async () => { vi.advanceTimersByTime(OFFLINE_SYNC_INTERVAL_MS * 2); });
    expect(sync).not.toHaveBeenCalled();
  });

  it("versucht es erneut: bei 'online', bei Rückkehr in den Vordergrund und per Intervall", async () => {
    enqueueStunde({ id: "a", mitarbeiterId: "u1" });
    renderHook(() => useOfflineSync({ userId: "u1", sync }));
    await flush();
    expect(sync).toHaveBeenCalledTimes(1);

    act(() => window.dispatchEvent(new Event("online")));
    await flush();
    expect(sync).toHaveBeenCalledTimes(2);

    act(() => document.dispatchEvent(new Event("visibilitychange")));
    await flush();
    expect(sync).toHaveBeenCalledTimes(3);

    await act(async () => { vi.advanceTimersByTime(OFFLINE_SYNC_INTERVAL_MS); });
    await flush();
    expect(sync).toHaveBeenCalledTimes(4);
  });

  it("kein paralleler zweiter Lauf, solange einer läuft", async () => {
    enqueueStunde({ id: "a", mitarbeiterId: "u1" });
    let resolve;
    sync.mockImplementation(() => new Promise((r) => { resolve = r; }));
    renderHook(() => useOfflineSync({ userId: "u1", sync }));
    await flush();
    act(() => window.dispatchEvent(new Event("online")));
    act(() => window.dispatchEvent(new Event("online")));
    await flush();
    expect(sync).toHaveBeenCalledTimes(1);
    await act(async () => { resolve({ synced: 1, remaining: 0 }); });
    clearQueue();
    enqueueStunde({ id: "b", mitarbeiterId: "u1" });
    act(() => window.dispatchEvent(new Event("online")));
    await flush();
    expect(sync).toHaveBeenCalledTimes(2);
    // Lauf abschließen — die Sperre gilt modulweit, auch für spätere Tests.
    await act(async () => { resolve({ synced: 0, remaining: 1 }); });
  });

  it("im Hintergrund (document.hidden) löst visibilitychange keinen Lauf aus", async () => {
    enqueueStunde({ id: "a", mitarbeiterId: "u1" });
    renderHook(() => useOfflineSync({ userId: "u1", sync }));
    await flush();
    vi.spyOn(document, "hidden", "get").mockReturnValue(true);
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    await flush();
    expect(sync).toHaveBeenCalledTimes(1);
  });

  it("nach dem Logout: keine weiteren Läufe", async () => {
    enqueueStunde({ id: "a", mitarbeiterId: "u1" });
    const { rerender } = renderHook(({ userId }) => useOfflineSync({ userId, sync }), {
      initialProps: { userId: "u1" },
    });
    await flush();
    rerender({ userId: null });
    act(() => window.dispatchEvent(new Event("online")));
    await act(async () => { vi.advanceTimersByTime(OFFLINE_SYNC_INTERVAL_MS * 2); });
    expect(sync).toHaveBeenCalledTimes(1);
  });

  it("meldet synchronisierte Einträge über onSynced", async () => {
    enqueueStunde({ id: "a", mitarbeiterId: "u1" });
    sync.mockResolvedValue({ synced: 2, remaining: 0 });
    const onSynced = vi.fn();
    renderHook(() => useOfflineSync({ userId: "u1", sync, onSynced }));
    await flush();
    await flush();
    expect(onSynced).toHaveBeenCalledWith({ synced: 2, remaining: 0 });
    expect(sync).toHaveBeenCalledWith({ userId: "u1", isChef: false });
  });

  it("ein Fehler im Sync blockiert spätere Versuche nicht", async () => {
    enqueueStunde({ id: "a", mitarbeiterId: "u1" });
    sync.mockRejectedValueOnce(new Error("offline"));
    renderHook(() => useOfflineSync({ userId: "u1", sync }));
    await flush();
    await flush();
    act(() => window.dispatchEvent(new Event("online")));
    await flush();
    expect(sync).toHaveBeenCalledTimes(2);
  });

  it("offline (navigator.onLine=false) wird gar nicht erst versucht", async () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    enqueueStunde({ id: "a", mitarbeiterId: "u1" });
    renderHook(() => useOfflineSync({ userId: "u1", sync }));
    await flush();
    expect(sync).not.toHaveBeenCalled();
  });
});
