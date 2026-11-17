import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../supabase.js", async () => (await import("../../test/supabaseMock.js")).moduleMock());
import { mock } from "../../test/supabaseMock.js";
import { getAll, create, remove } from "./kosten.js";

beforeEach(() => mock.reset());

describe("kosten", () => {
  it("getAll: Betrag kommt als Zahl an (Postgres liefert NUMERIC als Text)", async () => {
    mock.responses["kosten.select"] = {
      data: [{ id: "k1", baustelle_id: "b1", kategorie: "material", beschreibung: "Fliesen", betrag: "1234.50", datum: "2026-11-16", ersteller: "c1" }],
      error: null,
    };
    expect(await getAll()).toEqual([
      { id: "k1", baustelleId: "b1", kategorie: "material", beschreibung: "Fliesen", betrag: 1234.5, datum: "2026-11-16", ersteller: "c1" },
    ]);
  });

  it("create: Standardwerte für Kategorie, Datum (heute, Ortszeit) und Ersteller", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 17, 0, 20));
    mock.responses["kosten.insert"] = { data: { id: "k1" }, error: null };
    expect(await create({ baustelleId: "b1", beschreibung: "Kleber", betrag: 12.5 })).toBe("k1");
    expect(mock.find("kosten", "insert").payload).toEqual({
      baustelle_id: "b1", kategorie: "material", beschreibung: "Kleber", betrag: 12.5, datum: "2026-11-17", ersteller: null,
    });
    vi.useRealTimers();
  });

  it("create/remove werfen Fehler; remove trifft genau die ID", async () => {
    mock.responses["kosten.insert"] = { data: null, error: { code: "42501", message: "rls" } };
    await expect(create({ baustelleId: "b1", beschreibung: "x", betrag: 1 })).rejects.toMatchObject({ code: "42501" });
    await remove("k1");
    expect(mock.find("kosten", "delete").filters).toContainEqual(["eq", "id", "k1"]);
  });
});
