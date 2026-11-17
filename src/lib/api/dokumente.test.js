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
  it("legt Zeile an, lädt hoch und trägt den Pfad ein", async () => {
    mock.responses["dokumente.insert"] = { data: { id: "d1" }, error: null };
    uploadDocument.mockResolvedValue({ path: "b1/d1-Plan.pdf" });
    expect(await createWithFile({ file, baustelleId: "b1" })).toEqual({ id: "d1", storagePath: "b1/d1-Plan.pdf" });
    expect(mock.find("dokumente", "insert").payload).toMatchObject({ baustelle_id: "b1", name: "Plan.pdf", typ: "dokument", groesse: "2.0 MB" });
    expect(uploadDocument).toHaveBeenCalledWith(file, "b1", "d1");
    expect(mock.find("dokumente", "update").payload).toEqual({ storage_path: "b1/d1-Plan.pdf" });
  });

  it("Upload scheitert → Zeile wird zurückgenommen, Fehler geworfen", async () => {
    mock.responses["dokumente.insert"] = { data: { id: "d1" }, error: null };
    uploadDocument.mockRejectedValue(new Error("zu groß"));
    await expect(createWithFile({ file, baustelleId: "b1" })).rejects.toThrow("zu groß");
    expect(mock.find("dokumente", "delete").filters).toContainEqual(["eq", "id", "d1"]);
  });

  it("Pfad lässt sich nicht eintragen → Zeile wird zurückgenommen", async () => {
    mock.responses["dokumente.insert"] = { data: { id: "d1" }, error: null };
    uploadDocument.mockResolvedValue({ path: "p" });
    mock.responses["dokumente.update"] = { error: { code: "42501", message: "rls" } };
    await expect(createWithFile({ file, baustelleId: "b1" })).rejects.toMatchObject({ code: "42501" });
    expect(mock.find("dokumente", "delete")).toBeTruthy();
  });

  it("ohne Datei oder Baustelle: Fehler, kein Datenbank-Zugriff", async () => {
    await expect(createWithFile({ baustelleId: "b1" })).rejects.toThrow(/Datei fehlt/);
    await expect(createWithFile({ file })).rejects.toThrow(/baustelleId fehlt/);
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
