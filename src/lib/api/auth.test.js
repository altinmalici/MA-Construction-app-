import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock supabase client BEFORE importing the module-under-test.
const mockSignOut = vi.fn();
const mockSignInWithPassword = vi.fn();
const mockUpdateUser = vi.fn();
const mockRpc = vi.fn();

vi.mock("../supabase.js", () => ({
  supabase: {
    auth: {
      signOut: (...a) => mockSignOut(...a),
      signInWithPassword: (...a) => mockSignInWithPassword(...a),
      updateUser: (...a) => mockUpdateUser(...a),
      getSession: vi.fn(() => Promise.resolve({ data: { session: null } })),
      onAuthStateChange: vi.fn(),
    },
    rpc: (...a) => mockRpc(...a),
  },
}));

const { completeOnboarding, reAuthWithPin } = await import("./auth.js");

describe("completeOnboarding — kein signOut/signIn-Flip mehr", () => {
  beforeEach(() => {
    mockSignOut.mockReset();
    mockSignInWithPassword.mockReset();
    mockUpdateUser.mockReset();
    mockRpc.mockReset();
    // Erste RPC: complete_onboarding_v2 (no error)
    // Zweite RPC: get_user_by_auth_id (returns profile)
    mockRpc
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({
        data: [{ username: "alice" }],
        error: null,
      });
    mockUpdateUser.mockResolvedValue({ data: null, error: null });
  });

  it("a) ruft updateUser mit neuem Passwort", async () => {
    await completeOnboarding("user-id-1", "1234");
    expect(mockUpdateUser).toHaveBeenCalledWith({ password: "1234" });
  });

  it("b) ruft KEIN signOut und KEIN signInWithPassword (Session-Kontinuität)", async () => {
    await completeOnboarding("user-id-1", "1234");
    expect(mockSignOut).not.toHaveBeenCalled();
    expect(mockSignInWithPassword).not.toHaveBeenCalled();
  });

  it("c) wirft Error wenn updateUser fehlschlägt", async () => {
    mockUpdateUser.mockResolvedValue({
      data: null,
      error: new Error("update failed"),
    });
    await expect(completeOnboarding("user-id-1", "1234")).rejects.toThrow(
      /update failed/,
    );
  });

  it("d) wirft Error wenn complete_onboarding_v2 RPC fehlschlägt", async () => {
    mockRpc.mockReset();
    mockRpc.mockResolvedValueOnce({
      data: null,
      error: new Error("rpc broken"),
    });
    await expect(completeOnboarding("user-id-1", "1234")).rejects.toThrow(
      /rpc broken/,
    );
    expect(mockUpdateUser).not.toHaveBeenCalled();
  });
});

describe("reAuthWithPin — kein signOut/signIn-Flip mehr", () => {
  beforeEach(() => {
    mockSignOut.mockReset();
    mockSignInWithPassword.mockReset();
    mockUpdateUser.mockReset();
    mockUpdateUser.mockResolvedValue({ data: null, error: null });
  });

  it("a) ruft updateUser mit neuem Passwort", async () => {
    await reAuthWithPin("alice", "5678");
    expect(mockUpdateUser).toHaveBeenCalledWith({ password: "5678" });
  });

  it("b) ruft KEIN signOut und KEIN signInWithPassword", async () => {
    await reAuthWithPin("alice", "5678");
    expect(mockSignOut).not.toHaveBeenCalled();
    expect(mockSignInWithPassword).not.toHaveBeenCalled();
  });

  it("c) wirft Error wenn updateUser fehlschlägt", async () => {
    mockUpdateUser.mockResolvedValue({
      data: null,
      error: new Error("auth update broken"),
    });
    await expect(reAuthWithPin("alice", "5678")).rejects.toThrow(
      /auth update broken/,
    );
  });
});
