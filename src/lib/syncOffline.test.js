import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

const create = vi.fn();
const hasSession = vi.fn();
vi.mock("./api/index.js", () => {
  const empty = async () => [];
  const t = { getAll: empty };
  return {
    users: t, subunternehmer: t, baustellen: t, kalender: t, maengel: t,
    bautagebuch: t, dokumente: t, benachrichtigungen: t, kosten: t,
    stundeneintraege: { getAll: empty, create: (...a) => create(...a) },
    auth: { hasSession: (...a) => hasSession(...a) },
  };
});

import { useAppData } from "./useAppData.js";
import { enqueueStunde, clearQueue, getPending, getFailed, queueSize } from "./offlineQueue.js";

const sync = async (who) => {
  const { result } = renderHook(() => useAppData());
  let res;
  await act(async () => {
    res = await result.current.actions.stundeneintraege.syncOffline(who);
  });
  return res;
};
const e = (id, mitarbeiterId = "u1") => ({ id, mitarbeiterId, baustelleId: "b1", datum: "2026-11-16" });

beforeEach(() => {
  clearQueue();
  create.mockReset();
  hasSession.mockReset();
  hasSession.mockResolvedValue(true);
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
});

describe("syncOffline", () => {
  it("Erfolg → Eintrag ist aus der Queue", async () => {
    enqueueStunde(e("a"));
    create.mockResolvedValue("a");
    expect(await sync({ userId: "u1" })).toMatchObject({ synced: 1, failed: 0, remaining: 0 });
    expect(queueSize()).toBe(0);
  });

  it("Duplikat (23505) gilt als bereits synchronisiert", async () => {
    enqueueStunde(e("a"));
    create.mockRejectedValue({ code: "23505", message: "duplicate key" });
    expect(await sync({ userId: "u1" })).toMatchObject({ synced: 1 });
    expect(queueSize()).toBe(0);
  });

  it("Netzfehler → bleibt wartend, wird NICHT als fehlgeschlagen markiert", async () => {
    enqueueStunde(e("a"));
    create.mockRejectedValue(new TypeError("Failed to fetch"));
    expect(await sync({ userId: "u1" })).toMatchObject({ synced: 0, failed: 0, remaining: 1 });
    expect(getPending()).toHaveLength(1);
    expect(getFailed()).toHaveLength(0);
  });

  it("endgültige Ablehnung (RLS) → markiert, nicht gelöscht, kein weiterer Versuch", async () => {
    enqueueStunde(e("a"));
    enqueueStunde(e("b"));
    create.mockRejectedValueOnce({ code: "42501", message: "rls" }).mockResolvedValueOnce("b");
    expect(await sync({ userId: "u1" })).toMatchObject({ synced: 1, failed: 1, remaining: 0 });
    expect(getFailed().map((i) => i.id)).toEqual(["a"]);
    expect(queueSize()).toBe(1);
    create.mockClear();
    await sync({ userId: "u1" });
    expect(create).not.toHaveBeenCalled();
  });

  it("ohne Sitzung wird NICHT gesendet und nichts als abgelehnt markiert", async () => {
    enqueueStunde(e("a"));
    hasSession.mockResolvedValue(false);
    expect(await sync({ userId: "u1" })).toMatchObject({ synced: 0, failed: 0, remaining: 1 });
    expect(create).not.toHaveBeenCalled();
    expect(getFailed()).toHaveLength(0);
  });

  it("Sitzung geht mitten im Lauf verloren → 42501 zählt nicht als Ablehnung", async () => {
    enqueueStunde(e("a"));
    enqueueStunde(e("b"));
    hasSession.mockResolvedValueOnce(true).mockResolvedValue(false);
    create.mockRejectedValue({ code: "42501", message: "new row violates row-level security policy" });
    expect(await sync({ userId: "u1" })).toMatchObject({ synced: 0, failed: 0, remaining: 2 });
    expect(create).toHaveBeenCalledTimes(1); // nach dem ersten Fehler abgebrochen
    expect(getFailed()).toHaveLength(0);
  });

  it("Einträge ohne Mitarbeiter (Sub/Sonstige) sendet nur der Chef", async () => {
    enqueueStunde({ id: "s", mitarbeiterId: null, baustelleId: "b1" });
    create.mockResolvedValue("s");
    await sync({ userId: "u1", isChef: false });
    expect(create).not.toHaveBeenCalled();
    await sync({ userId: "c1", isChef: true });
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("Mitarbeiter sendet nur EIGENE Einträge; fremde bleiben wartend", async () => {
    enqueueStunde(e("mine", "u1"));
    enqueueStunde(e("other", "u2"));
    create.mockResolvedValue("x");
    await sync({ userId: "u1", isChef: false });
    expect(create).toHaveBeenCalledTimes(1);
    expect(create.mock.calls[0][0].id).toBe("mine");
    expect(getPending().map((i) => i.id)).toEqual(["other"]);
  });

  it("Chef sendet alle", async () => {
    enqueueStunde(e("mine", "c1"));
    enqueueStunde(e("other", "u2"));
    create.mockResolvedValue("x");
    await sync({ userId: "c1", isChef: true });
    expect(create).toHaveBeenCalledTimes(2);
    expect(queueSize()).toBe(0);
  });

  it("offline → kein Versuch", async () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    enqueueStunde(e("a"));
    await sync({ userId: "u1" });
    expect(create).not.toHaveBeenCalled();
    expect(getPending()).toHaveLength(1);
  });
});

describe("wartende Einträge bleiben nach dem Nachladen sichtbar (Audit D-06)", () => {
  it("mitWartenden hängt Warteschlangen-Einträge an und markiert sie", async () => {
    const { mitWartenden } = await import("./useAppData.js");
    const { markFailed } = await import("./offlineQueue.js");
    enqueueStunde(e("w1"));
    enqueueStunde(e("f1"));
    enqueueStunde(e("s1"));
    markFailed("f1", "x");
    const r = mitWartenden([{ id: "s1", datum: "2026-11-16" }, { id: "s2" }]);
    expect(r.map((x) => [x.id, x._pending])).toEqual([
      ["s1", undefined], // schon auf dem Server → nicht doppelt
      ["s2", undefined],
      ["w1", "wartet"],
      ["f1", "abgelehnt"],
    ]);
  });

  it("leere Warteschlange → Liste unverändert (gleiche Referenz)", async () => {
    const { mitWartenden } = await import("./useAppData.js");
    const list = [{ id: "s1" }];
    expect(mitWartenden(list)).toBe(list);
  });
});
