import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../supabase.js", async () => (await import("../../test/supabaseMock.js")).moduleMock());
vi.mock("../storage.js", () => ({
  uploadDocument: vi.fn(),
  deleteDocument: vi.fn(),
  getDocumentUrl: vi.fn(),
}));
import { mock } from "../../test/supabaseMock.js";
import { uploadDocument, deleteDocument } from "../storage.js";
import { getAll, createWithFile, removeWithFile, remove } from "./dokumente.js";

const file = { name: "Plan.pdf", size: 2 * 1024 * 1024 };

beforeEach(() => {
  mock.reset();
  uploadDocument.mockReset();
  deleteDocument.mockReset();
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("dokumente.createWithFile", () => {
  it("lädt ERST hoch und legt dann die Zeile gleich mit Pfad an", async () => {
    const order = [];
    uploadDocument.mockImplementation(async (_f, bs, id) => { order.push("upload"); return { path: `${bs}/${id}-Plan.pdf` }; });
    mock.responses["dokumente.insert"] = { data: { id: "x" }, error: null };
    const push = mock.calls.push;
    mock.calls.push = function (c) { if (c.op === "insert") order.push("insert"); return push.call(this, c); };
    let r;
    try {
      r = await createWithFile({ file, baustelleId: "b1" });
    } finally {
      delete mock.calls.push;
    }
    const ins = mock.find("dokumente", "insert");
    expect(order).toEqual(["upload", "insert"]);
    expect(ins.payload).toMatchObject({ baustelle_id: "b1", name: "Plan.pdf", typ: "dokument", groesse: "2.0 MB" });
    // dieselbe, vorab vergebene ID in Pfad, Zeile und Rückgabe
    expect(ins.payload.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(ins.payload.storage_path).toBe(`b1/${ins.payload.id}-Plan.pdf`);
    expect(r).toEqual({ id: ins.payload.id, storagePath: ins.payload.storage_path });
    expect(mock.find("dokumente", "update")).toBeUndefined();
  });

  it("Upload scheitert → es entsteht KEINE Zeile (kein Eintrag ohne Datei)", async () => {
    uploadDocument.mockRejectedValue(new Error("zu groß"));
    await expect(createWithFile({ file, baustelleId: "b1" })).rejects.toThrow("zu groß");
    expect(mock.calls).toHaveLength(0);
  });

  it("Zeile lässt sich nicht anlegen → hochgeladene Datei wird wieder entfernt", async () => {
    uploadDocument.mockResolvedValue({ path: "b1/id-Plan.pdf" });
    mock.responses["dokumente.insert"] = { data: null, error: { code: "42501", message: "rls" } };
    await expect(createWithFile({ file, baustelleId: "b1" })).rejects.toMatchObject({ code: "42501" });
    expect(deleteDocument).toHaveBeenCalledWith("b1/id-Plan.pdf");
  });

  it("…und ein Fehler beim Entfernen überdeckt den eigentlichen Fehler nicht", async () => {
    uploadDocument.mockResolvedValue({ path: "p" });
    deleteDocument.mockRejectedValue(new Error("storage weg"));
    mock.responses["dokumente.insert"] = { data: null, error: { code: "23503", message: "fk" } };
    await expect(createWithFile({ file, baustelleId: "b1" })).rejects.toMatchObject({ code: "23503" });
  });

  it("Netzfehler beim Anlegen (unklar, ob gespeichert) → Datei bleibt, damit kein Eintrag ohne Datei entsteht", async () => {
    uploadDocument.mockResolvedValue({ path: "p" });
    mock.responses["dokumente.insert"] = { data: null, error: { message: "TypeError: Failed to fetch", code: "" } };
    await expect(createWithFile({ file, baustelleId: "b1" })).rejects.toMatchObject({ message: /Failed to fetch/ });
    expect(deleteDocument).not.toHaveBeenCalled();
  });

  it("ohne Datei oder Baustelle: Fehler, kein Upload und kein Datenbank-Zugriff", async () => {
    await expect(createWithFile({ baustelleId: "b1" })).rejects.toThrow(/Datei fehlt/);
    await expect(createWithFile({ file })).rejects.toThrow(/baustelleId fehlt/);
    expect(uploadDocument).not.toHaveBeenCalled();
    expect(mock.calls).toHaveLength(0);
  });
});

describe("dokumente löschen / laden", () => {
  it("removeWithFile: Datei und Zeile; Storage-Fehler blockiert das Löschen der Zeile nicht", async () => {
    deleteDocument.mockRejectedValue(new Error("weg"));
    await removeWithFile("d1", "b1/d1-Plan.pdf");
    expect(deleteDocument).toHaveBeenCalledWith("b1/d1-Plan.pdf");
    expect(mock.find("dokumente", "delete").filters).toContainEqual(["eq", "id", "d1"]);
  });

  it("removeWithFile ohne Pfad (Alt-Eintrag) löscht nur die Zeile; remove ebenso", async () => {
    await removeWithFile("d1", null);
    expect(deleteDocument).not.toHaveBeenCalled();
    await remove("d2");
    expect(mock.all("dokumente", "delete")).toHaveLength(2);
  });

  it("DB-Fehler beim Löschen wird geworfen", async () => {
    mock.responses["dokumente.delete"] = { error: { message: "nein" } };
    await expect(removeWithFile("d1", null)).rejects.toMatchObject({ message: "nein" });
  });

  it("getAll mappt storage_path (null bei Alt-Einträgen)", async () => {
    mock.responses["dokumente.select"] = { data: [{ id: "d1", baustelle_id: "b1", name: "A", typ: "dokument", groesse: "1 KB", datum: "2026-11-16", storage_path: null }], error: null };
    const r = await getAll();
    expect(r[0]).toMatchObject({ id: "d1", baustelleId: "b1", name: "A", storagePath: null });
  });
});
