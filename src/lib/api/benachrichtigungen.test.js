import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../supabase.js", async () => (await import("../../test/supabaseMock.js")).moduleMock());
import { mock } from "../../test/supabaseMock.js";
import { getAll, create, markAllRead, remove, removeAll } from "./benachrichtigungen.js";

beforeEach(() => mock.reset());

describe("benachrichtigungen", () => {
  it("getAll: neueste zuerst, Felder gemappt", async () => {
    mock.responses["benachrichtigungen.select"] = { data: [{ id: "n1", typ: "stunden", text: "T", baustelle_id: "b1", datum: "2026-11-16T10:00:00Z", gelesen: false }], error: null };
    expect(await getAll()).toEqual([{ id: "n1", typ: "stunden", text: "T", baustelleId: "b1", datum: "2026-11-16T10:00:00Z", gelesen: false }]);
    expect(mock.find("benachrichtigungen", "select").filters).toContainEqual(["order", "datum", { ascending: false }]);
    // nur die neuesten 200 – die Liste wächst sonst unbegrenzt
    expect(mock.find("benachrichtigungen", "select").filters).toContainEqual(["limit", 200]);
  });

  it("create: ungelesen, Standard-Typ info, Baustelle optional", async () => {
    mock.responses["benachrichtigungen.insert"] = { data: { id: "n1" }, error: null };
    expect(await create({ text: "Hallo", datum: "2026-11-16T10:00:00Z" })).toBe("n1");
    expect(mock.find("benachrichtigungen", "insert").payload).toEqual({
      typ: "info", text: "Hallo", baustelle_id: null, datum: "2026-11-16T10:00:00Z", gelesen: false,
    });
  });

  it("markAllRead trifft nur ungelesene", async () => {
    await markAllRead();
    const c = mock.find("benachrichtigungen", "update");
    expect(c.payload).toEqual({ gelesen: true });
    expect(c.filters).toContainEqual(["eq", "gelesen", false]);
  });

  it("remove trifft eine ID; removeAll hat einen Filter (kein DELETE ohne WHERE)", async () => {
    await remove("n1");
    expect(mock.all("benachrichtigungen", "delete")[0].filters).toContainEqual(["eq", "id", "n1"]);
    await removeAll();
    expect(mock.all("benachrichtigungen", "delete")[1].filters.length).toBeGreaterThan(0);
  });

  it("Fehler werden geworfen", async () => {
    mock.responses["benachrichtigungen.update"] = { error: { code: "42501", message: "rls" } };
    await expect(markAllRead()).rejects.toMatchObject({ code: "42501" });
  });
});
