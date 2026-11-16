import { describe, it, expect, vi, beforeEach } from "vitest";

// Minimaler Supabase-Mock: jede Tabelle bekommt konfigurierbare Antworten.
const calls = [];
let responses;
const builder = (table) => {
  const b = {
    _op: null,
    insert(payload) { calls.push({ table, op: "insert", payload }); b._op = "insert"; return b; },
    update(payload) { calls.push({ table, op: "update", payload }); b._op = "update"; return b; },
    delete() { calls.push({ table, op: "delete" }); b._op = "delete"; return b; },
    select() { if (!b._op) { calls.push({ table, op: "select" }); b._op = "select"; } return b; },
    order() { return b; },
    eq() { return b; },
    single() { return Promise.resolve(responses[`${table}.${b._op}`] ?? { data: null, error: null }); },
    then(res, rej) {
      return Promise.resolve(responses[`${table}.${b._op}`] ?? { data: [], error: null }).then(res, rej);
    },
  };
  return b;
};
vi.mock("../supabase.js", () => ({ supabase: { from: (t) => builder(t) } }));

const { create, getAll } = await import("./bautagebuch.js");

beforeEach(() => {
  calls.length = 0;
  responses = { "bautagebuch.insert": { data: { id: "bt1" }, error: null } };
});

const base = { baustelleId: "b1", datum: "2026-11-16", arbeiten: "Estrich" };

describe("bautagebuch.create", () => {
  it("schreibt Wetter und Temperatur wie eingegeben – auch 0 °C", async () => {
    await create({ ...base, wetter: "schnee", temperatur: 0, anwesende: [] });
    const ins = calls.find((c) => c.table === "bautagebuch" && c.op === "insert");
    expect(ins.payload.wetter).toBe("schnee");
    expect(ins.payload.temperatur).toBe(0);
  });

  it("erfindet kein Wetter: ohne Angabe wird NULL gespeichert, nicht 'sonnig'/12", async () => {
    await create({ ...base, anwesende: [] });
    const ins = calls.find((c) => c.table === "bautagebuch" && c.op === "insert");
    expect(ins.payload.wetter).toBeNull();
    expect(ins.payload.temperatur).toBeNull();
  });

  it("Fehler beim Haupt-Insert wird geworfen", async () => {
    responses["bautagebuch.insert"] = { data: null, error: { code: "42501", message: "rls" } };
    await expect(create({ ...base, anwesende: [] })).rejects.toMatchObject({ code: "42501" });
  });

  it("Fehler bei den Anwesenden → Hauptzeile wird zurückgenommen, Fehler geworfen", async () => {
    responses["bautagebuch_anwesende.insert"] = { error: { code: "23503", message: "fk" } };
    await expect(create({ ...base, anwesende: ["u1"] })).rejects.toMatchObject({ code: "23503" });
    expect(calls.some((c) => c.table === "bautagebuch" && c.op === "delete")).toBe(true);
  });

  it("gibt die neue ID zurück und legt Anwesende an", async () => {
    const id = await create({ ...base, anwesende: ["u1", "u2"] });
    expect(id).toBe("bt1");
    const anw = calls.find((c) => c.table === "bautagebuch_anwesende" && c.op === "insert");
    expect(anw.payload).toEqual([
      { bautagebuch_id: "bt1", user_id: "u1" },
      { bautagebuch_id: "bt1", user_id: "u2" },
    ]);
  });
});

describe("bautagebuch.getAll", () => {
  it("wirft, wenn die Anwesenden-Abfrage scheitert (statt still ohne Anwesende zu liefern)", async () => {
    responses["bautagebuch.select"] = { data: [{ id: "bt1", baustelle_id: "b1", datum: "2026-11-16" }], error: null };
    responses["bautagebuch_anwesende.select"] = { data: null, error: { message: "boom" } };
    await expect(getAll()).rejects.toMatchObject({ message: "boom" });
  });

  it("mappt Zeilen inkl. Anwesenden; fehlendes Wetter bleibt null", async () => {
    responses["bautagebuch.select"] = {
      data: [{ id: "bt1", baustelle_id: "b1", datum: "2026-11-16", wetter: null, temperatur: 0, arbeiten: "A" }],
      error: null,
    };
    responses["bautagebuch_anwesende.select"] = { data: [{ bautagebuch_id: "bt1", user_id: "u1" }], error: null };
    const r = await getAll();
    expect(r[0]).toMatchObject({ id: "bt1", baustelleId: "b1", wetter: null, temperatur: 0, anwesende: ["u1"] });
  });
});
