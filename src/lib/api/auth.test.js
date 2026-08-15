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

const { completeOnboarding } = await import("./auth.js");

describe("completeOnboarding — nur RPC, kein Client-Auth-Call", () => {
  beforeEach(() => {
    mockSignOut.mockReset();
    mockSignInWithPassword.mockReset();
    mockUpdateUser.mockReset();
    mockRpc.mockReset();
    mockRpc.mockResolvedValueOnce({ data: null, error: null });
  });

  it("a) ruft complete_onboarding_v2 mit User-ID und neuem PIN", async () => {
    await completeOnboarding("user-id-1", "1234");
    expect(mockRpc).toHaveBeenCalledWith("complete_onboarding_v2", {
      p_user_id: "user-id-1",
      p_new_pin: "1234",
    });
  });

  it("b) ruft KEIN updateUser — GoTrue-Policy (min. 6 Zeichen) lehnt 4-stellige PINs mit 422 weak_password ab", async () => {
    await completeOnboarding("user-id-1", "1234");
    expect(mockUpdateUser).not.toHaveBeenCalled();
  });

  it("c) ruft KEIN signOut und KEIN signInWithPassword (Session-Kontinuität)", async () => {
    await completeOnboarding("user-id-1", "1234");
    expect(mockSignOut).not.toHaveBeenCalled();
    expect(mockSignInWithPassword).not.toHaveBeenCalled();
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
  });
});
