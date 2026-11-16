import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent, act } from "@testing-library/react";

vi.mock("../../context/AppContext", () => ({ useApp: vi.fn() }));
import { useApp } from "../../context/AppContext";
import Einladung from "./Einladung.jsx";

const T = "b".repeat(48);
let auth, completeLogin, onClose;
const mount = async () => {
  useApp.mockReturnValue({ actions: { auth }, completeLogin });
  render(<Einladung token={T} onClose={onClose} />);
  await act(async () => { await vi.advanceTimersByTimeAsync(0); });
};
const typePin = async (pin) => {
  for (const d of pin) fireEvent.click(screen.getByRole("button", { name: d }));
  await act(async () => { await vi.advanceTimersByTimeAsync(400); });
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(console, "error").mockImplementation(() => {});
  completeLogin = vi.fn();
  onClose = vi.fn();
  auth = {
    validateOnboardingToken: vi.fn().mockResolvedValue({ name: "Max Muster", username: "m.muster" }),
    consumeOnboardingToken: vi.fn(),
  };
  window.history.replaceState({}, "", `/?einladung=${T}`);
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  window.history.replaceState({}, "", "/");
});

describe("Einladung (Link)", () => {
  it("begrüßt mit Vornamen und zeigt den Benutzernamen", async () => {
    await mount();
    expect(auth.validateOnboardingToken).toHaveBeenCalledWith(T);
    expect(screen.getByText(/Hallo Max!/)).toBeInTheDocument();
    expect(screen.getByText("m.muster")).toBeInTheDocument();
  });

  it("PIN zweimal gleich → eingelöst, angemeldet, Token aus der Adresse entfernt", async () => {
    const u = { id: "u1", name: "Max Muster", username: "m.muster", isOnboarded: true };
    auth.consumeOnboardingToken.mockResolvedValue(u);
    await mount();
    await typePin("2468");
    expect(screen.getByText("PIN bestätigen")).toBeInTheDocument();
    await typePin("2468");
    expect(auth.consumeOnboardingToken).toHaveBeenCalledWith(T, "2468");
    expect(completeLogin).toHaveBeenCalledWith(u);
    expect(window.location.search).toBe("");
  });

  it("unterschiedliche PINs → nichts gesendet, von vorn", async () => {
    await mount();
    await typePin("2468");
    await typePin("1357");
    expect(auth.consumeOnboardingToken).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toMatch(/stimmen nicht überein/);
    expect(screen.getByText("PIN festlegen")).toBeInTheDocument();
  });

  it("PIN bereits vergeben → Meldung, erneut wählbar", async () => {
    auth.consumeOnboardingToken.mockRejectedValue({ message: "PIN bereits vergeben" });
    await mount();
    await typePin("1998");
    await typePin("1998");
    expect(screen.getByRole("alert").textContent).toBe("PIN bereits vergeben");
    expect(completeLogin).not.toHaveBeenCalled();
    expect(screen.getByText("PIN festlegen")).toBeInTheDocument();
  });

  it("ungültiger/abgelaufener Link → klare Meldung und Weg zur Anmeldung", async () => {
    auth.validateOnboardingToken.mockResolvedValue(null);
    await mount();
    expect(screen.getByText("Einladung nicht gültig")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Zur Anmeldung" }));
    expect(onClose).toHaveBeenCalled();
    expect(window.location.search).toBe("");
  });

  it("kein Netz beim Prüfen → 'Erneut versuchen' prüft noch einmal", async () => {
    auth.validateOnboardingToken.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    await mount();
    expect(screen.getByText("Keine Verbindung")).toBeInTheDocument();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Erneut versuchen" }));
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(auth.validateOnboardingToken).toHaveBeenCalledTimes(2);
    expect(screen.getByText(/Hallo Max!/)).toBeInTheDocument();
  });
});
