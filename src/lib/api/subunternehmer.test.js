import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../supabase.js", async () => (await import("../../test/supabaseMock.js")).moduleMock());
import { mock } from "../../test/supabaseMock.js";
import { getAll, create, remove } from "./subunternehmer.js";

beforeEach(() => mock.reset());

describe("subunternehmer", () => {
  it("getAll füllt fehlende Felder mit leerem Text", async () => {
    mock.responses["subunternehmer.select"] = { data: [{ id: "s1", name: "Elektro Huber", gewerk: null, telefon: null }], error: null };
    expect(await getAll()).toEqual([{ id: "s1", name: "Elektro Huber", gewerk: "", telefon: "" }]);
  });

  it("create gibt die ID zurück und schreibt leere statt fehlender Felder", async () => {
    mock.responses["subunternehmer.insert"] = { data: { id: "s1" }, error: null };
    expect(await create({ name: "Elektro Huber" })).toBe("s1");
    expect(mock.find("subunternehmer", "insert").payload).toEqual({ name: "Elektro Huber", gewerk: "", telefon: "" });
  });

  it("Fehler werden geworfen; remove trifft genau die ID", async () => {
    mock.responses["subunternehmer.insert"] = { data: null, error: { code: "42501", message: "rls" } };
    await expect(create({ name: "X" })).rejects.toMatchObject({ code: "42501" });
    mock.responses["subunternehmer.select"] = { data: null, error: { message: "boom" } };
    await expect(getAll()).rejects.toMatchObject({ message: "boom" });
    await remove("s1");
    expect(mock.find("subunternehmer", "delete").filters).toContainEqual(["eq", "id", "s1"]);
  });
});
