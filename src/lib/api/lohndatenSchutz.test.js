// Laden von Nutzern und Baustellen vor und nach
// supabase/migration_2026_11_18_03_lohndaten_schutz.sql.
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../supabase.js", async () => (await import("../../test/supabaseMock.js")).moduleMock());
import { mock } from "../../test/supabaseMock.js";
import * as users from "./users.js";
import * as baustellen from "./baustellen.js";

const FEHLT = { data: null, error: { code: "PGRST202", message: "Could not find the function" } };
const uRow = (id, name, over = {}) => ({
  id, name, role: "mitarbeiter", stundensatz: 40, username: name.toLowerCase(), is_onboarded: true, is_active: true, onboarding_pin_expiry: null, ...over,
});
const bRow = (id, over = {}) => ({ id, kunde: "K" + id, status: "aktiv", created_at: `2026-01-0${id}`, budget: 5000, details: { raeume: "Bad", rechnungFirma: "X" }, ...over });

beforeEach(() => {
  mock.reset();
  mock.responses["baustellen_mitarbeiter.select"] = { data: [], error: null };
  mock.responses["baustellen_subunternehmer.select"] = { data: [], error: null };
});

describe("users.getAll", () => {
  it("vor der Migration (Funktion fehlt): Tabelle wie bisher", async () => {
    mock.responses["users.select"] = { data: [uRow("u1", "Max"), uRow("u2", "Nora")], error: null };
    mock.responses["rpc.kollegen_liste"] = FEHLT;
    const r = await users.getAll();
    expect(r.map((u) => [u.id, u.stundensatz])).toEqual([["u1", 40], ["u2", 40]]);
  });

  it("nach der Migration, Mitarbeiter: eigene Zeile vollständig, Kollegen nur mit Namen – ohne Stundensatz", async () => {
    mock.responses["users.select"] = { data: [uRow("u1", "Max")], error: null };
    mock.responses["rpc.kollegen_liste"] = {
      data: [
        { id: "c1", name: "Chef", role: "chef", is_active: true },
        { id: "u1", name: "Max", role: "mitarbeiter", is_active: true },
        { id: "u2", name: "Nora", role: "mitarbeiter", is_active: false },
      ],
      error: null,
    };
    const r = await users.getAll();
    expect(r.map((u) => u.id)).toEqual(["c1", "u1", "u2"]);
    expect(r[1]).toMatchObject({ stundensatz: 40, username: "max", isOnboarded: true });
    expect(r[2]).toEqual({ id: "u2", name: "Nora", role: "mitarbeiter", isActive: false });
    expect(r[0].stundensatz).toBeUndefined();
  });

  it("nach der Migration, Chef: alle Zeilen vollständig (Tabelle geht vor)", async () => {
    mock.responses["users.select"] = { data: [uRow("u1", "Max"), uRow("u2", "Nora", { stundensatz: 55 })], error: null };
    mock.responses["rpc.kollegen_liste"] = { data: [{ id: "u1", name: "Max", role: "mitarbeiter", is_active: true }, { id: "u2", name: "Nora", role: "mitarbeiter", is_active: true }], error: null };
    const r = await users.getAll();
    expect(r.map((u) => u.stundensatz)).toEqual([40, 55]);
  });

  it("anderer Fehler der Funktion (z.B. Netz) wird nicht verschluckt", async () => {
    mock.responses["users.select"] = { data: [uRow("u1", "Max")], error: null };
    mock.responses["rpc.kollegen_liste"] = { data: null, error: { message: "TypeError: Failed to fetch" } };
    await expect(users.getAll()).rejects.toMatchObject({ message: expect.stringContaining("Failed to fetch") });
  });
});

describe("baustellen.getAll", () => {
  it("vor der Migration: Tabelle wie bisher", async () => {
    mock.responses["baustellen.select"] = { data: [bRow(1), bRow(2)], error: null };
    mock.responses["rpc.meine_baustellen"] = FEHLT;
    const r = await baustellen.getAll();
    expect(r.map((b) => [b.id, b.budget])).toEqual([[1, 5000], [2, 5000]]);
  });

  it("nach der Migration, Mitarbeiter: Baustellen aus der Funktion – ohne Budget und Rechnungsdaten", async () => {
    mock.responses["baustellen.select"] = { data: [], error: null };
    mock.responses["rpc.meine_baustellen"] = { data: [{ id: 2, kunde: "K2", status: "aktiv", created_at: "2026-01-02", details: { raeume: "Bad" } }], error: null };
    mock.responses["baustellen_mitarbeiter.select"] = { data: [{ baustelle_id: 2, user_id: "u1" }], error: null };
    const r = await baustellen.getAll();
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ id: 2, kunde: "K2", budget: 0, details: { raeume: "Bad" }, mitarbeiter: ["u1"] });
  });

  it("nach der Migration, Chef: vollständige Zeilen, keine Doppelten, Reihenfolge nach Anlage", async () => {
    mock.responses["baustellen.select"] = { data: [bRow(1), bRow(2)], error: null };
    mock.responses["rpc.meine_baustellen"] = { data: [{ id: 2, kunde: "K2", created_at: "2026-01-02", details: {} }], error: null };
    const r = await baustellen.getAll();
    expect(r.map((b) => [b.id, b.budget, b.details.rechnungFirma])).toEqual([[1, 5000, "X"], [2, 5000, "X"]]);
  });

  it("anderer Fehler der Funktion wird nicht verschluckt", async () => {
    mock.responses["baustellen.select"] = { data: [], error: null };
    mock.responses["rpc.meine_baustellen"] = { data: null, error: { code: "42501", message: "permission denied" } };
    await expect(baustellen.getAll()).rejects.toMatchObject({ code: "42501" });
  });
});
