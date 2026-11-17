import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../supabase.js", async () => (await import("../../test/supabaseMock.js")).moduleMock());
import { mock } from "../../test/supabaseMock.js";
import { getAll, create, update, remove, setFreigabe } from "./stundeneintraege.js";

beforeEach(() => mock.reset());

const entry = {
  id: "e1", baustelleId: "b1", datum: "2026-11-16", beginn: "07:00", ende: "15:30", pause: 30,
  fahrtzeit: 20, arbeit: "Putz", material: "Gips", fotos: ["p1"], personTyp: "mitarbeiter",
  mitarbeiterId: "u1", subId: null, personName: "",
};

describe("stundeneintraege.create", () => {
  it("schreibt die Zeile in snake_case und gibt die ID zurück", async () => {
    mock.responses["stundeneintraege.insert"] = { data: { id: "e1" }, error: null };
    expect(await create(entry)).toBe("e1");
    expect(mock.find("stundeneintraege", "insert").payload).toEqual({
      id: "e1", baustelle_id: "b1", datum: "2026-11-16", beginn: "07:00", ende: "15:30", pause: 30,
      fahrtzeit: 20, arbeit: "Putz", material: "Gips", fotos: ["p1"], person_typ: "mitarbeiter",
      mitarbeiter_id: "u1", sub_id: null, person_name: "",
    });
  });

  it("schreibt KEIN 'freigegeben' und keine UI-Felder (z.B. _pending) mit", async () => {
    mock.responses["stundeneintraege.insert"] = { data: { id: "e1" }, error: null };
    await create({ ...entry, freigegeben: true, _pending: "wartet" });
    const p = mock.find("stundeneintraege", "insert").payload;
    expect(p).not.toHaveProperty("freigegeben");
    expect(p).not.toHaveProperty("_pending");
  });

  it("ohne ID vergibt die Datenbank sie", async () => {
    mock.responses["stundeneintraege.insert"] = { data: { id: "neu" }, error: null };
    const { id: _id, ...ohne } = entry;
    expect(await create(ohne)).toBe("neu");
    expect(mock.find("stundeneintraege", "insert").payload).not.toHaveProperty("id");
  });

  it("Fehler (z.B. RLS, Duplikat) wird geworfen – mit Code für die Offline-Logik", async () => {
    mock.responses["stundeneintraege.insert"] = { data: null, error: { code: "23505", message: "duplicate key" } };
    await expect(create(entry)).rejects.toMatchObject({ code: "23505" });
  });
});

describe("stundeneintraege.getAll", () => {
  it("mappt Zeilen; fehlendes 'freigegeben' (Spalte noch nicht da) wird false", async () => {
    mock.responses["stundeneintraege.select"] = {
      data: [{ id: "e1", baustelle_id: "b1", datum: "2026-11-16", beginn: "07:00", ende: "15:00", pause: 30,
        fahrtzeit: null, arbeit: "A", material: null, fotos: null, person_typ: null, mitarbeiter_id: "u1", sub_id: null, person_name: null }],
      error: null,
    };
    expect(await getAll()).toEqual([{
      id: "e1", baustelleId: "b1", datum: "2026-11-16", beginn: "07:00", ende: "15:00", pause: 30,
      fahrtzeit: 0, arbeit: "A", material: "", fotos: [], personTyp: "mitarbeiter", mitarbeiterId: "u1",
      subId: null, personName: "", freigegeben: false,
    }]);
  });

  it("lädt seitenweise: mehr als 1000 Einträge kommen vollständig an", async () => {
    const page = (n, off) => ({ data: Array.from({ length: n }, (_, i) => ({ id: `e${off + i}`, baustelle_id: "b1" })), error: null });
    mock.responses["stundeneintraege.select"] = [page(1000, 0), page(1000, 1000), page(7, 2000)];
    const r = await getAll();
    expect(r).toHaveLength(2007);
    expect(r.at(-1).id).toBe("e2006");
    const ranges = mock.all("stundeneintraege", "select").map((c) => c.filters.find((f) => f[0] === "range").slice(1));
    expect(ranges).toEqual([[0, 999], [1000, 1999], [2000, 2999]]);
  });

  it("Fehler wird geworfen", async () => {
    mock.responses["stundeneintraege.select"] = { data: null, error: { code: "42501", message: "x" } };
    await expect(getAll()).rejects.toMatchObject({ code: "42501" });
  });
});

describe("stundeneintraege.update / remove / setFreigabe", () => {
  it("update trifft genau die ID", async () => {
    await update("e1", entry);
    const c = mock.find("stundeneintraege", "update");
    expect(c.filters).toContainEqual(["eq", "id", "e1"]);
    expect(c.payload.ende).toBe("15:30");
    expect(c.payload).not.toHaveProperty("freigegeben");
  });

  it("remove trifft genau die ID; Fehler wird geworfen", async () => {
    await remove("e1");
    expect(mock.find("stundeneintraege", "delete").filters).toContainEqual(["eq", "id", "e1"]);
    mock.responses["stundeneintraege.delete"] = { error: { message: "nein" } };
    await expect(remove("e1")).rejects.toMatchObject({ message: "nein" });
  });

  it("setFreigabe setzt NUR das Flag für die übergebenen IDs", async () => {
    await setFreigabe(["e1", "e2"], true);
    const c = mock.find("stundeneintraege", "update");
    expect(c.payload).toEqual({ freigegeben: true });
    expect(c.filters).toContainEqual(["in", "id", ["e1", "e2"]]);
  });

  it("setFreigabe ohne IDs macht keinen Aufruf (sonst würde alles getroffen)", async () => {
    await setFreigabe([], true);
    await setFreigabe(null, true);
    expect(mock.calls).toHaveLength(0);
  });
});
