import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../supabase.js", async () => (await import("../../test/supabaseMock.js")).moduleMock());
import { mock } from "../../test/supabaseMock.js";
import { getAll, create, markAllRead, remove, removeAll } from "./benachrichtigungen.js";

const FEHLT = { data: null, error: { code: "PGRST202", message: "Could not find the function" } };
const ROW = { id: "n1", typ: "stunden", text: "T", baustelle_id: "b1", datum: "2026-11-16T10:00:00Z", gelesen: false };
const MAPPED = { id: "n1", typ: "stunden", text: "T", baustelleId: "b1", datum: "2026-11-16T10:00:00Z", gelesen: false };

beforeEach(() => mock.reset());

describe("benachrichtigungen – vor der Migration (Funktionen fehlen)", () => {
  beforeEach(() => {
    mock.responses["rpc.meine_benachrichtigungen"] = FEHLT;
    mock.responses["rpc.benachrichtigungen_alle_gelesen"] = FEHLT;
  });

  it("getAll: Tabelle wie bisher – neueste zuerst, höchstens 200", async () => {
    mock.responses["benachrichtigungen.select"] = { data: [ROW], error: null };
    expect(await getAll()).toEqual([MAPPED]);
    expect(mock.find("benachrichtigungen", "select").filters).toContainEqual(["order", "datum", { ascending: false }]);
    expect(mock.find("benachrichtigungen", "select").filters).toContainEqual(["limit", 200]);
  });

  it("markAllRead: gemeinsames Häkchen wie bisher, nur ungelesene", async () => {
    await markAllRead();
    const c = mock.find("benachrichtigungen", "update");
    expect(c.payload).toEqual({ gelesen: true });
    expect(c.filters).toContainEqual(["eq", "gelesen", false]);
  });

  it("Fehler des alten Wegs werden geworfen", async () => {
    mock.responses["benachrichtigungen.update"] = { error: { code: "42501", message: "rls" } };
    await expect(markAllRead()).rejects.toMatchObject({ code: "42501" });
  });
});

describe("benachrichtigungen – nach der Migration", () => {
  it("getAll nutzt meine_benachrichtigungen (eigenes gelesen) und fragt die Tabelle nicht mehr ab", async () => {
    mock.responses["rpc.meine_benachrichtigungen"] = { data: [{ ...ROW, gelesen: true }], error: null };
    expect(await getAll()).toEqual([{ ...MAPPED, gelesen: true }]);
    expect(mock.find("benachrichtigungen", "select")).toBeUndefined();
  });

  it("markAllRead setzt nur MEIN gelesen – kein Update des gemeinsamen Häkchens", async () => {
    await markAllRead();
    expect(mock.rpcCalls.map((c) => c.name)).toEqual(["benachrichtigungen_alle_gelesen"]);
    expect(mock.find("benachrichtigungen", "update")).toBeUndefined();
  });

  it("andere Fehler (Netz, Rechte) werden geworfen, nicht still auf den alten Weg umgeleitet", async () => {
    mock.responses["rpc.meine_benachrichtigungen"] = { data: null, error: { code: "42501", message: "permission denied" } };
    await expect(getAll()).rejects.toMatchObject({ code: "42501" });
    mock.responses["rpc.benachrichtigungen_alle_gelesen"] = { data: null, error: { code: "42501", message: "permission denied" } };
    await expect(markAllRead()).rejects.toMatchObject({ code: "42501" });
    expect(mock.find("benachrichtigungen", "update")).toBeUndefined();
  });
});

describe("benachrichtigungen – unabhängig von der Migration", () => {
  it("create: eigene ID, ungelesen, Standard-Typ info – ohne die Zeile zurückzulesen", async () => {
    const id = await create({ text: "Hallo", datum: "2026-11-16T10:00:00Z" });
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
    const c = mock.find("benachrichtigungen", "insert");
    expect(c.payload).toEqual({ id, typ: "info", text: "Hallo", baustelle_id: null, datum: "2026-11-16T10:00:00Z", gelesen: false });
    expect(c.filters || []).not.toContainEqual(expect.arrayContaining(["select"]));
  });

  it("create: Fehler wird geworfen", async () => {
    mock.responses["benachrichtigungen.insert"] = { error: { code: "42501", message: "rls" } };
    await expect(create({ text: "x" })).rejects.toMatchObject({ code: "42501" });
  });

  it("remove trifft eine ID; removeAll hat einen Filter (kein DELETE ohne WHERE)", async () => {
    await remove("n1");
    expect(mock.all("benachrichtigungen", "delete")[0].filters).toContainEqual(["eq", "id", "n1"]);
    await removeAll();
    expect(mock.all("benachrichtigungen", "delete")[1].filters.length).toBeGreaterThan(0);
  });
});
