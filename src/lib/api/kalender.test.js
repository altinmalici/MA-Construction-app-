import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../supabase.js", async () => (await import("../../test/supabaseMock.js")).moduleMock());
import { mock } from "../../test/supabaseMock.js";
import { getAll, create, update, remove } from "./kalender.js";

beforeEach(() => mock.reset());

describe("kalender.getAll", () => {
  it("fügt die Mitarbeiter-Zuordnungen an", async () => {
    mock.responses["kalender.select"] = { data: [{ id: "t1", datum: "2026-11-16", baustelle_id: "b1", titel: "Abnahme" }, { id: "t2", datum: "2026-11-17", baustelle_id: null, titel: "Frei" }], error: null };
    mock.responses["kalender_mitarbeiter.select"] = { data: [{ kalender_id: "t1", user_id: "u1" }, { kalender_id: "t1", user_id: "u2" }], error: null };
    expect(await getAll()).toEqual([
      { id: "t1", datum: "2026-11-16", baustelleId: "b1", titel: "Abnahme", mitarbeiter: ["u1", "u2"] },
      { id: "t2", datum: "2026-11-17", baustelleId: null, titel: "Frei", mitarbeiter: [] },
    ]);
  });

  it("Fehler bei den Zuordnungen wird geworfen (nicht: Termine ohne Mitarbeiter)", async () => {
    mock.responses["kalender.select"] = { data: [{ id: "t1" }], error: null };
    mock.responses["kalender_mitarbeiter.select"] = { data: null, error: { message: "boom" } };
    await expect(getAll()).rejects.toMatchObject({ message: "boom" });
  });
});

describe("kalender.create", () => {
  const termin = { datum: "2026-11-16", baustelleId: "b1", titel: "Abnahme", mitarbeiter: ["u1", "u2"] };

  it("legt Termin und Zuordnungen an", async () => {
    mock.responses["kalender.insert"] = { data: { id: "t1" }, error: null };
    expect(await create(termin)).toBe("t1");
    expect(mock.find("kalender", "insert").payload).toEqual({ datum: "2026-11-16", baustelle_id: "b1", titel: "Abnahme" });
    expect(mock.find("kalender_mitarbeiter", "insert").payload).toEqual([
      { kalender_id: "t1", user_id: "u1" }, { kalender_id: "t1", user_id: "u2" },
    ]);
  });

  it("Zuordnung scheitert → Termin wird zurückgenommen und der Fehler geworfen", async () => {
    mock.responses["kalender.insert"] = { data: { id: "t1" }, error: null };
    mock.responses["kalender_mitarbeiter.insert"] = { error: { code: "23503", message: "fk" } };
    await expect(create(termin)).rejects.toMatchObject({ code: "23503" });
    expect(mock.find("kalender", "delete").filters).toContainEqual(["eq", "id", "t1"]);
  });

  it("ohne Mitarbeiter keine Zuordnungs-Abfrage; ohne Baustelle NULL", async () => {
    mock.responses["kalender.insert"] = { data: { id: "t1" }, error: null };
    await create({ datum: "2026-11-16", titel: "Büro", mitarbeiter: [] });
    expect(mock.find("kalender", "insert").payload.baustelle_id).toBeNull();
    expect(mock.find("kalender_mitarbeiter", "insert")).toBeUndefined();
  });
});

describe("kalender.update / remove", () => {
  it("Teil-Update schreibt nur übergebene Felder und lässt Zuordnungen in Ruhe", async () => {
    await update("t1", { titel: "Neu" });
    expect(mock.find("kalender", "update").payload).toEqual({ titel: "Neu" });
    expect(mock.all("kalender_mitarbeiter", "delete")).toHaveLength(0);
  });

  it("mitarbeiter: [] entfernt ausdrücklich alle Zuordnungen", async () => {
    await update("t1", { mitarbeiter: [] });
    expect(mock.find("kalender", "update")).toBeUndefined();
    expect(mock.find("kalender_mitarbeiter", "delete").filters).toContainEqual(["eq", "kalender_id", "t1"]);
    expect(mock.find("kalender_mitarbeiter", "insert")).toBeUndefined();
  });

  it("neue Mitarbeiter-Liste ersetzt die alte", async () => {
    await update("t1", { mitarbeiter: ["u3"] });
    expect(mock.find("kalender_mitarbeiter", "insert").payload).toEqual([{ kalender_id: "t1", user_id: "u3" }]);
  });

  it("remove trifft genau die ID", async () => {
    await remove("t1");
    expect(mock.find("kalender", "delete").filters).toContainEqual(["eq", "id", "t1"]);
  });
});
