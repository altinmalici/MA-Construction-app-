import { describe, it, expect, vi, beforeEach } from "vitest";

let capturedTable;
let capturedPayload;
const mockEq = vi.fn(() => Promise.resolve({ error: null }));
const mockUpdate = vi.fn((payload) => {
  capturedPayload = payload;
  return { eq: mockEq };
});
const mockFrom = vi.fn((table) => {
  capturedTable = table;
  return { update: mockUpdate };
});

vi.mock("../supabase.js", () => ({
  supabase: {
    from: (...a) => mockFrom(...a),
    rpc: vi.fn(),
  },
}));

const { updateField, BAUSTELLE_UPDATABLE_FIELDS } = await import(
  "./baustellen.js"
);

describe("baustellen.updateField — Whitelist", () => {
  beforeEach(() => {
    capturedTable = undefined;
    capturedPayload = undefined;
    mockUpdate.mockClear();
    mockFrom.mockClear();
    mockEq.mockClear();
    mockEq.mockImplementation(() => Promise.resolve({ error: null }));
  });

  it("a) status durchläuft", async () => {
    await updateField("b1", "status", "aktiv");
    expect(capturedTable).toBe("baustellen");
    expect(capturedPayload).toEqual({ status: "aktiv" });
    expect(mockEq).toHaveBeenCalledWith("id", "b1");
  });

  it("b) fortschritt durchläuft", async () => {
    await updateField("b1", "fortschritt", 50);
    expect(capturedPayload).toEqual({ fortschritt: 50 });
  });

  it("c) hacked_field wirft Error mit 'whitelist'-Hinweis, kein DB-Call", async () => {
    await expect(updateField("b1", "hacked_field", "x")).rejects.toThrow(
      /whitelist|allowed/i,
    );
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("d) __proto__ wirft Error (prototype-pollution-Paranoia)", async () => {
    await expect(updateField("b1", "__proto__", { evil: 1 })).rejects.toThrow();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("e) Error-Message listet die erlaubten Felder", async () => {
    let err;
    try {
      await updateField("b1", "kunde", "ACME");
    } catch (e) {
      err = e;
    }
    expect(err).toBeDefined();
    for (const f of BAUSTELLE_UPDATABLE_FIELDS) {
      expect(err.message).toContain(f);
    }
  });

  it("f) Whitelist ist immutable (Object.freeze)", () => {
    expect(Object.isFrozen(BAUSTELLE_UPDATABLE_FIELDS)).toBe(true);
  });

  it("g) Supabase-Error wird weitergereicht", async () => {
    mockEq.mockResolvedValueOnce({ error: new Error("db down") });
    await expect(updateField("b1", "status", "aktiv")).rejects.toThrow(
      /db down/,
    );
  });
});

// Audit 2026-11 U-01: Der Fortschritts-Regler rief update(id, {fortschritt})
// auf. update() schrieb daraufhin ALLE Spalten mit Standardwerten und
// synchronisierte leere Zuweisungen → Baustelle geleert, Team entfernt.
describe("baustellen.update — überschreibt nichts, was nicht übergeben wurde", () => {
  let supabase, update;
  beforeEach(async () => {
    ({ supabase } = await import("../supabase.js"));
    ({ update } = await import("./baustellen.js"));
    capturedPayload = undefined;
    mockUpdate.mockClear();
    mockEq.mockClear();
    mockEq.mockImplementation(() => Promise.resolve({ error: null }));
    supabase.rpc.mockReset();
    supabase.rpc.mockResolvedValue({ error: null });
  });

  it("Teil-Update schreibt nur die übergebenen Felder", async () => {
    await update("b1", { fortschritt: 60 });
    expect(capturedPayload).toEqual({ fortschritt: 60 });
  });

  it("Teil-Update fasst die Team-Zuweisungen NICHT an", async () => {
    await update("b1", { fortschritt: 60 });
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it("volles Formular: alle Felder + Zuweisungen werden geschrieben", async () => {
    await update("b1", {
      kunde: "Huber", adresse: "", status: "aktiv", fortschritt: 0,
      ansprechpartner: "", telefon: "", zugang: "", startdatum: "", enddatum: "",
      budget: 0, details: {}, mitarbeiter: ["u1"], subunternehmer: [],
    });
    expect(capturedPayload).toEqual({
      kunde: "Huber", adresse: "", status: "aktiv", fortschritt: 0,
      ansprechpartner: "", telefon: "", zugang: "", startdatum: null, enddatum: null,
      budget: 0, details: {},
    });
    expect(supabase.rpc).toHaveBeenCalledWith("sync_baustelle_junctions", {
      p_baustelle_id: "b1", p_mitarbeiter_ids: ["u1"], p_sub_ids: [],
    });
  });

  it("leere Listen bedeuten ausdrücklich: alle Zuweisungen entfernen", async () => {
    await update("b1", { mitarbeiter: [], subunternehmer: [] });
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(supabase.rpc).toHaveBeenCalledTimes(1);
  });

  it("nur EINE der beiden Listen → Fehler statt stillem Löschen der anderen", async () => {
    await expect(update("b1", { mitarbeiter: ["u1"] })).rejects.toThrow(/beide/i);
    expect(supabase.rpc).not.toHaveBeenCalled();
  });
});
