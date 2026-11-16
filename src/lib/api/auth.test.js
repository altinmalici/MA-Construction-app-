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

// ── Paket 4: Login ist immer an einen Benutzernamen gebunden ──────────────
describe("loginAsUser — Fehler werden unterschieden (Audit A-01)", () => {
  let loginAsUser, LoginError;
  beforeEach(async () => {
    ({ loginAsUser, LoginError } = await import("./auth.js"));
    mockSignOut.mockReset();
    mockSignOut.mockResolvedValue({ error: null });
    mockSignInWithPassword.mockReset();
    mockRpc.mockReset();
  });
  const profile = { id: "u1", name: "Max", role: "mitarbeiter", stundensatz: 40, username: "m.muster", is_onboarded: true };

  it("richtiger PIN → Profil; Anmeldung läuft gegen GENAU diesen Benutzer", async () => {
    mockSignInWithPassword.mockResolvedValue({ error: null });
    mockRpc.mockResolvedValue({ data: [profile], error: null });
    const u = await loginAsUser("m.muster", "1234");
    expect(mockSignInWithPassword).toHaveBeenCalledWith({
      email: "m.muster@ma-construction.local",
      password: "1234",
    });
    expect(u).toMatchObject({ id: "u1", username: "m.muster", isOnboarded: true });
    // keine globale PIN-Suche
    expect(mockRpc).not.toHaveBeenCalledWith("lookup_user_by_pin", expect.anything());
  });

  it("falscher PIN → null (zählt als Fehlversuch)", async () => {
    mockSignInWithPassword.mockResolvedValue({
      error: { status: 400, code: "invalid_credentials", message: "Invalid login credentials" },
    });
    expect(await loginAsUser("m.muster", "0000")).toBeNull();
  });

  it("kein Netz → LoginError 'netz', NICHT null", async () => {
    mockSignInWithPassword.mockResolvedValue({
      error: { name: "AuthRetryableFetchError", status: 0, message: "Failed to fetch" },
    });
    await expect(loginAsUser("m.muster", "1234")).rejects.toMatchObject({ kind: "netz" });
    await expect(loginAsUser("m.muster", "1234")).rejects.toBeInstanceOf(LoginError);
  });

  it("Rate-Limit → 'limit'; gesperrtes Konto → 'gesperrt'", async () => {
    mockSignInWithPassword.mockResolvedValueOnce({ error: { status: 429, message: "Request rate limit reached" } });
    await expect(loginAsUser("m.muster", "1234")).rejects.toMatchObject({ kind: "limit" });
    mockSignInWithPassword.mockResolvedValueOnce({ error: { status: 400, code: "user_banned", message: "User is banned" } });
    await expect(loginAsUser("m.muster", "1234")).rejects.toMatchObject({ kind: "gesperrt" });
  });

  it("Anmeldung ok, aber kein aktives Profil → 'gesperrt' und Sitzung wird beendet", async () => {
    mockSignInWithPassword.mockResolvedValue({ error: null });
    mockRpc.mockResolvedValue({ data: [], error: null });
    await expect(loginAsUser("m.muster", "1234")).rejects.toMatchObject({ kind: "gesperrt" });
    expect(mockSignOut).toHaveBeenCalled();
  });

  it("Benutzername wird getrimmt und kleingeschrieben", async () => {
    mockSignInWithPassword.mockResolvedValue({ error: null });
    mockRpc.mockResolvedValue({ data: [profile], error: null });
    await loginAsUser("  M.Muster ", "1234");
    expect(mockSignInWithPassword.mock.calls[0][0].email).toBe("m.muster@ma-construction.local");
  });
});

describe("globaler PIN-Login ist entfernt (Audit A-06/S-04)", () => {
  it("auth.js exportiert kein login(pin) mehr", async () => {
    const mod = await import("./auth.js");
    expect(mod.login).toBeUndefined();
  });
});

// Audit U-17 / Review: Abmelden ohne Netz. supabase-js ≥ 2.119 lässt die
// Sitzung im Gerät, wenn der Server-Aufruf scheitert.
describe("signOut — funktioniert auch ohne Netz", () => {
  const netErr = { name: "AuthRetryableFetchError", status: 0, message: "Failed to fetch" };
  let signOut, supabase;
  beforeEach(async () => {
    ({ signOut } = await import("./auth.js"));
    ({ supabase } = await import("../supabase.js"));
    mockSignOut.mockReset();
    supabase.auth.getSession.mockReset();
  });

  it("online: ein Aufruf, kein Fallback", async () => {
    mockSignOut.mockResolvedValue({ error: null });
    await signOut();
    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });

  it("offline: lokales Abmelden; der Netzfehler des Widerrufs ist KEIN Fehler", async () => {
    // So verhält sich die Bibliothek offline wirklich: auch der lokale
    // Aufruf meldet den Netzfehler, hat die Sitzung aber schon entfernt.
    mockSignOut.mockResolvedValue({ error: netErr });
    supabase.auth.getSession.mockResolvedValue({ data: { session: null } });
    await expect(signOut()).resolves.toBeUndefined();
    expect(mockSignOut).toHaveBeenNthCalledWith(2, { scope: "local" });
  });

  it("Sitzung lässt sich wirklich nicht entfernen → Fehler", async () => {
    mockSignOut.mockResolvedValue({ error: netErr });
    supabase.auth.getSession.mockResolvedValue({ data: { session: { user: {} } } });
    await expect(signOut()).rejects.toBe(netErr);
  });
});

describe("signOut — lokal statt global, wo es reicht", () => {
  let signOut, supabase;
  beforeEach(async () => {
    ({ signOut } = await import("./auth.js"));
    ({ supabase } = await import("../supabase.js"));
    mockSignOut.mockReset();
    mockSignOut.mockResolvedValue({ error: null });
    supabase.auth.getSession.mockReset();
    supabase.auth.getSession.mockResolvedValue({ data: { session: null } });
  });

  it("localOnly: beendet NICHT die Sitzungen auf anderen Geräten", async () => {
    await signOut({ localOnly: true });
    expect(mockSignOut).toHaveBeenCalledTimes(1);
    expect(mockSignOut).toHaveBeenCalledWith({ scope: "local" });
  });

  it("offline: direkt lokal, kein Warten auf den Server", async () => {
    const spy = vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    await signOut();
    expect(mockSignOut).toHaveBeenCalledTimes(1);
    expect(mockSignOut).toHaveBeenCalledWith({ scope: "local" });
    spy.mockRestore();
  });
});
