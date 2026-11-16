import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

const create = vi.fn();
vi.mock("./api/index.js", () => {
  const empty = async () => [];
  const t = { getAll: empty };
  return {
    users: t, subunternehmer: t, baustellen: t, kalender: t, maengel: t,
    bautagebuch: t, dokumente: t, benachrichtigungen: t, kosten: t,
    stundeneintraege: { getAll: empty, create: (...a) => create(...a) },
    auth: {},
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
