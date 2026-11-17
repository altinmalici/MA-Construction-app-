import { describe, it, expect, vi, beforeEach } from "vitest";

const upload = vi.fn();
const remove = vi.fn();
vi.mock("./supabase.js", () => ({
  supabase: { storage: { from: () => ({ upload: (...a) => upload(...a), remove: (...a) => remove(...a) }) } },
}));
import { uploadPhotos, cleanupPhotos } from "./storage.js";

const blob = (n) => ({ type: "image/jpeg", n });

beforeEach(() => {
  upload.mockReset();
  remove.mockReset();
  remove.mockResolvedValue({ error: null });
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("uploadPhotos – alles oder nichts", () => {
  it("alle erfolgreich → Pfade in Eingabe-Reihenfolge, nichts wird gelöscht", async () => {
    upload.mockResolvedValue({ error: null });
    const paths = await uploadPhotos([blob(1), blob(2)], "b1", "maengel", "m1");
    expect(paths).toHaveLength(2);
    expect(paths.every((p) => p.startsWith("b1/maengel/m1/") && p.endsWith(".jpg"))).toBe(true);
    expect(remove).not.toHaveBeenCalled();
  });

  it("eines scheitert → die bereits hochgeladenen werden entfernt, Fehler wird geworfen", async () => {
    upload
      .mockResolvedValueOnce({ error: null })
      .mockResolvedValueOnce({ error: { message: "zu groß" } })
      .mockResolvedValueOnce({ error: null });
    await expect(uploadPhotos([blob(1), blob(2), blob(3)], "b1", "maengel", "m1")).rejects.toMatchObject({ message: "zu groß" });
    expect(remove).toHaveBeenCalledTimes(1);
    expect(remove.mock.calls[0][0]).toHaveLength(2);
  });

  it("leere Liste → kein Aufruf", async () => {
    expect(await uploadPhotos([], "b1", "maengel", "m1")).toEqual([]);
    expect(upload).not.toHaveBeenCalled();
  });
});

describe("cleanupPhotos", () => {
  it("wirft nie – auch nicht, wenn Löschen verboten ist (Mitarbeiter)", async () => {
    remove.mockResolvedValue({ error: { message: "new row violates row-level security policy" } });
    await expect(cleanupPhotos(["a", "b"])).resolves.toBeUndefined();
    await expect(cleanupPhotos([])).resolves.toBeUndefined();
    expect(remove).toHaveBeenCalledTimes(1);
  });
});
