import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../supabase.js", async () => (await import("../../test/supabaseMock.js")).moduleMock());
vi.mock("../storage.js", () => ({ deletePhotos: vi.fn() }));
import { mock } from "../../test/supabaseMock.js";
import { deletePhotos } from "../storage.js";
import { getAll, create, updateStatus, remove } from "./maengel.js";

beforeEach(() => {
  mock.reset();
  deletePhotos.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("maengel.create / getAll", () => {
  it("create: Standardwerte (mittel, offen, heute) und feste ID für den Foto-Pfad", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 17, 0, 10));
    mock.responses["maengel.insert"] = { data: { id: "m1" }, error: null };
    expect(await create({ id: "m1", baustelleId: "b1", titel: "Riss" })).toBe("m1");
    expect(mock.find("maengel", "insert").payload).toEqual({
      id: "m1", baustelle_id: "b1", titel: "Riss", beschreibung: "", prioritaet: "mittel", status: "offen",
      zustaendig: null, erstellt_am: "2026-11-17", frist: null, fotos: [],
    });
    vi.useRealTimers();
  });

  it("getAll mappt die Felder", async () => {
    mock.responses["maengel.select"] = {
      data: [{ id: "m1", baustelle_id: "b1", titel: "Riss", beschreibung: null, prioritaet: "hoch", status: "offen", zustaendig: null, erstellt_am: "2026-11-16", frist: null, fotos: null }],
      error: null,
    };
    expect(await getAll()).toEqual([
      { id: "m1", baustelleId: "b1", titel: "Riss", beschreibung: "", prioritaet: "hoch", status: "offen", zustaendig: null, erstelltAm: "2026-11-16", frist: null, fotos: [] },
    ]);
  });

  it("updateStatus schreibt nur den Status der einen Zeile", async () => {
    await updateStatus("m1", "erledigt");
    const c = mock.find("maengel", "update");
    expect(c.payload).toEqual({ status: "erledigt" });
    expect(c.filters).toContainEqual(["eq", "id", "m1"]);
  });
});

describe("maengel.remove", () => {
  it("löscht Storage-Fotos (keine alten Base64-Einträge) und dann die Zeile", async () => {
    mock.responses["maengel.select"] = { data: { fotos: ["b1/maengel/m1/a.jpg", "data:image/png;base64,AAA"] }, error: null };
    await remove("m1");
    expect(deletePhotos).toHaveBeenCalledWith(["b1/maengel/m1/a.jpg"]);
    expect(mock.find("maengel", "delete").filters).toContainEqual(["eq", "id", "m1"]);
  });

  it("Foto-Aufräumen scheitert → Mangel wird trotzdem gelöscht", async () => {
    mock.responses["maengel.select"] = { data: { fotos: ["x.jpg"] }, error: null };
    deletePhotos.mockRejectedValue(new Error("storage"));
    await expect(remove("m1")).resolves.toBeUndefined();
    expect(mock.find("maengel", "delete")).toBeTruthy();
  });

  it("Zeile nicht lesbar (z.B. schon gelöscht) → Fehler, kein Lösch-Versuch", async () => {
    mock.responses["maengel.select"] = { data: null, error: { code: "PGRST116", message: "0 rows" } };
    await expect(remove("m1")).rejects.toMatchObject({ code: "PGRST116" });
    expect(mock.find("maengel", "delete")).toBeUndefined();
  });

  it("Löschen der Zeile scheitert → Fehler wird geworfen", async () => {
    mock.responses["maengel.select"] = { data: { fotos: [] }, error: null };
    mock.responses["maengel.delete"] = { error: { code: "42501", message: "rls" } };
    await expect(remove("m1")).rejects.toMatchObject({ code: "42501" });
    expect(deletePhotos).not.toHaveBeenCalled();
  });
});
