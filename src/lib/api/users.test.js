import { describe, it, expect, vi, beforeEach } from "vitest";

// Capture the actual payload passed into supabase.from('users').update().
let capturedPayload;
let capturedTable;
const mockRpc = vi.fn();
const mockSingle = vi.fn(() => Promise.resolve({ data: { id: "u1" }, error: null }));
const mockSelect = vi.fn(() => ({ single: mockSingle }));
const mockEq = vi.fn(() => ({ select: mockSelect }));
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
    rpc: (...a) => mockRpc(...a),
  },
}));

const { update } = await import("./users.js");

describe("users.update — undefined-Felder werden gefiltert", () => {
  beforeEach(() => {
    capturedPayload = undefined;
    capturedTable = undefined;
    mockRpc.mockReset();
    mockUpdate.mockClear();
    mockFrom.mockClear();
    mockEq.mockClear();
    mockSelect.mockClear();
    mockSingle.mockClear();
    mockRpc.mockResolvedValue({ data: null, error: null });
  });

  it("a) update(id, { pin }) → kein from(users).update Call (kein name/stundensatz im Update)", async () => {
    await update("u1", { pin: "1234" });
    expect(mockRpc).toHaveBeenCalledWith("update_user_pin_v2", {
      p_user_id: "u1",
      p_new_pin: "1234",
    });
    // Payload {} wäre leer → kein DB-Roundtrip nötig
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("b) update(id, { name, stundensatz }) → genau diese Felder im Payload, kein pin", async () => {
    await update("u1", { name: "Altin", stundensatz: 50 });
    expect(mockUpdate).toHaveBeenCalledTimes(1);
    expect(capturedPayload).toEqual({ name: "Altin", stundensatz: 50 });
    expect(capturedTable).toBe("users");
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("c) update(id, { stundensatz: null }) → null wird durchgereicht (intentional)", async () => {
    await update("u1", { stundensatz: null });
    expect(mockUpdate).toHaveBeenCalledTimes(1);
    expect(capturedPayload).toEqual({ stundensatz: null });
  });

  it("d) update(id, {}) → no-op, kein DB-Call und kein RPC", async () => {
    await update("u1", {});
    expect(mockRpc).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("e) Supabase-Error wird weitergereicht", async () => {
    mockSingle.mockResolvedValueOnce({
      data: null,
      error: new Error("db fail"),
    });
    await expect(update("u1", { name: "X" })).rejects.toThrow(/db fail/);
  });
});
