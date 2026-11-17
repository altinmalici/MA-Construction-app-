import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../supabase.js", async () => (await import("../../test/supabaseMock.js")).moduleMock());
import { mock } from "../../test/supabaseMock.js";
import { listNummern, vergebeNummern, istNummernFehlt } from "./regiebericht.js";

beforeEach(() => mock.reset());

describe("regiebericht-Nummern", () => {
  it("listNummern liefert Datum → Nummer", async () => {
    mock.responses["regiebericht_nummern.select"] = { data: [{ datum: "2026-11-18", nr: 7 }], error: null };
    expect(await listNummern("b1")).toEqual({ "2026-11-18": 7 });
  });

  it("vergebeNummern ruft die DB-Funktion mit Baustelle und Tagen", async () => {
    mock.responses["rpc.regiebericht_nummern_vergeben"] = { data: [{ tag: "2026-11-18", nummer: 7 }], error: null };
    expect(await vergebeNummern("b1", ["2026-11-18"])).toEqual({ "2026-11-18": 7 });
    expect(mock.rpcCalls[0]).toEqual({ name: "regiebericht_nummern_vergeben", args: { p_baustelle_id: "b1", p_daten: ["2026-11-18"] } });
  });

  it("Fehler werden geworfen", async () => {
    mock.responses["regiebericht_nummern.select"] = { data: null, error: { code: "PGRST205", message: "Could not find the table" } };
    await expect(listNummern("b1")).rejects.toMatchObject({ code: "PGRST205" });
  });

  it("istNummernFehlt erkennt die fehlende Migration, aber keine Netz- oder Rechtefehler", () => {
    expect(istNummernFehlt({ code: "PGRST205" })).toBe(true);
    expect(istNummernFehlt({ code: "PGRST202" })).toBe(true);
    expect(istNummernFehlt({ code: "42P01", message: 'relation "regiebericht_nummern" does not exist' })).toBe(true);
    expect(istNummernFehlt({ code: "42501", message: "Keine Berechtigung" })).toBe(false);
    expect(istNummernFehlt(new TypeError("Failed to fetch"))).toBe(false);
    expect(istNummernFehlt(null)).toBe(false);
  });
});
