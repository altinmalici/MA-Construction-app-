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

  it("lädt seitenweise (mehr als 1000 Zeilen kommen vollständig an)", async () => {
    const page = (n) => ({ data: Array.from({ length: n }, (_, i) => ({ id: `s${i}`, name: "X" })), error: null });
    mock.responses["subunternehmer.select"] = [page(1000), page(3)];
    expect(await getAll()).toHaveLength(1003);
    const calls = mock.all("subunternehmer", "select");
    expect(calls.map((c) => c.filters.find((f) => f[0] === "range").slice(1))).toEqual([[0, 999], [1000, 1999]]);
    // eindeutige Reihenfolge, sonst könnten Zeilen zwischen den Seiten verrutschen
    expect(calls[0].filters.filter((f) => f[0] === "order").map((f) => f[1])).toEqual(["created_at", "id"]);
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
