import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent, act } from "@testing-library/react";

vi.mock("../../context/AppContext", () => ({ useApp: vi.fn() }));
import { useApp } from "../../context/AppContext";
import Login from "./Login.jsx";

const LAST = "ma_construction_last_user";
let auth, completeLogin;

const ctx = (over = {}) => ({
  actions: { auth, users: { checkPinExists: vi.fn().mockResolvedValue(false) } },
  completeLogin,
  sessionUser: null,
  ...over,
});

// Tippt 4 Ziffern; nach der 4. löst Login per setTimeout(150) die Prüfung aus.
const typePin = async (pin) => {
  for (const d of pin) fireEvent.click(screen.getByRole("button", { name: d }));
  await act(async () => {
    await vi.advanceTimersByTimeAsync(200);
  });
};

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  completeLogin = vi.fn();
  auth = {
    loginAsUser: vi.fn(),
    loginWithUsername: vi.fn(),
    completeOnboarding: vi.fn(),
    getCurrentUser: vi.fn(),
    signOut: vi.fn().mockResolvedValue(undefined),
  };
  useApp.mockReset();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const MAX = { id: "u1", name: "Max Muster", username: "m.muster", role: "mitarbeiter", isOnboarded: true };

describe('"Willkommen zurück" – PIN ist an den gemerkten Nutzer gebunden', () => {
  beforeEach(() => {
    localStorage.setItem(LAST, JSON.stringify({ name: "Max Muster", username: "m.muster" }));
  });

  it("prüft den PIN gegen GENAU diesen Benutzernamen – keine globale Suche", async () => {
    auth.loginAsUser.mockResolvedValue(MAX);
    useApp.mockReturnValue(ctx());
    render(<Login />);
    expect(screen.getByText("Willkommen zurück")).toBeInTheDocument();
    expect(screen.queryByLabelText("Benutzername")).toBeNull();
    await typePin("1234");
    expect(auth.loginAsUser).toHaveBeenCalledWith("m.muster", "1234");
    expect(auth.login).toBeUndefined();
    expect(completeLogin).toHaveBeenCalledWith(MAX);
  });

  it("PIN eines ANDEREN Nutzers loggt hier niemanden ein", async () => {
    // loginAsUser('m.muster', <PIN des Chefs>) → falsche Kombination → null
    auth.loginAsUser.mockResolvedValue(null);
    useApp.mockReturnValue(ctx());
    render(<Login />);
    await typePin("1998");
    expect(auth.loginAsUser).toHaveBeenCalledWith("m.muster", "1998");
    expect(completeLogin).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toMatch(/Falscher PIN/);
  });

  it("kein Netz ist KEIN Fehlversuch: eigene Meldung, keine Sperre nach 3×", async () => {
    auth.loginAsUser.mockRejectedValue({ kind: "netz" });
    useApp.mockReturnValue(ctx());
    render(<Login />);
    for (let i = 0; i < 4; i++) await typePin("1234");
    expect(screen.getByRole("alert").textContent).toMatch(/Keine Verbindung/);
    expect(screen.getByRole("alert").textContent).not.toMatch(/Gesperrt/);
    expect(screen.getByRole("button", { name: "1" })).not.toBeDisabled();
  });

  it("3 falsche PINs → 30 s gesperrt, danach wieder frei", async () => {
    auth.loginAsUser.mockResolvedValue(null);
    useApp.mockReturnValue(ctx());
    render(<Login />);
    for (let i = 0; i < 3; i++) await typePin("0000");
    expect(screen.getByRole("alert").textContent).toMatch(/Gesperrt/);
    expect(screen.getByRole("button", { name: "1" })).toBeDisabled();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(31000);
    });
    expect(screen.getByRole("button", { name: "1" })).not.toBeDisabled();
  });

  it("deaktiviertes Konto → klare Meldung", async () => {
    auth.loginAsUser.mockRejectedValue({ kind: "gesperrt" });
    useApp.mockReturnValue(ctx());
    render(<Login />);
    await typePin("1234");
    expect(screen.getByRole("alert").textContent).toMatch(/Konto deaktiviert/);
  });

  it('"Nicht Max?" meldet IMMER ab und vergisst den Nutzer', async () => {
    useApp.mockReturnValue(ctx());
    render(<Login />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Nicht Max?" }));
    });
    expect(auth.signOut).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(LAST)).toBeNull();
    expect(screen.getByLabelText("Benutzername")).toBeInTheDocument();
  });
});

describe("Gesperrte App (Sitzung aktiv) – entsperrt nur der eingeloggte Nutzer", () => {
  it("nutzt den Sitzungs-Nutzer, auch wenn im Gerät ein anderer gemerkt ist", async () => {
    localStorage.setItem(LAST, JSON.stringify({ name: "Alt Nutzer", username: "a.alt" }));
    auth.loginAsUser.mockResolvedValue(MAX);
    useApp.mockReturnValue(ctx({ sessionUser: { name: "Max Muster", username: "m.muster" } }));
    render(<Login />);
    await typePin("1234");
    expect(auth.loginAsUser).toHaveBeenCalledWith("m.muster", "1234");
  });
});

describe("Neues Gerät – Benutzername + PIN", () => {
  it("ohne Benutzernamen wird nichts geprüft", async () => {
    useApp.mockReturnValue(ctx());
    render(<Login />);
    await typePin("1234");
    expect(auth.loginAsUser).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toMatch(/Benutzernamen eingeben/);
  });

  it("meldet mit eingegebenem Benutzernamen an (getrimmt, klein)", async () => {
    auth.loginAsUser.mockResolvedValue(MAX);
    useApp.mockReturnValue(ctx());
    render(<Login />);
    fireEvent.change(screen.getByLabelText("Benutzername"), { target: { value: "  M.Muster " } });
    await typePin("1234");
    expect(auth.loginAsUser).toHaveBeenCalledWith("m.muster", "1234");
    expect(completeLogin).toHaveBeenCalledWith(MAX);
  });

  it("falsche Kombination verrät nicht, ob Name oder PIN falsch war", async () => {
    auth.loginAsUser.mockResolvedValue(null);
    useApp.mockReturnValue(ctx());
    render(<Login />);
    fireEvent.change(screen.getByLabelText("Benutzername"), { target: { value: "gibt.es.nicht" } });
    await typePin("1234");
    expect(screen.getByRole("alert").textContent).toMatch(/Benutzername oder PIN falsch/);
  });

  it("noch nicht eingerichteter Nutzer landet beim PIN-Erstellen, nicht in der App", async () => {
    auth.loginAsUser.mockResolvedValue({ ...MAX, isOnboarded: false });
    useApp.mockReturnValue(ctx());
    render(<Login />);
    fireEvent.change(screen.getByLabelText("Benutzername"), { target: { value: "m.muster" } });
    await typePin("4711");
    expect(completeLogin).not.toHaveBeenCalled();
    expect(screen.getByText("PIN erstellen")).toBeInTheDocument();
  });
});
