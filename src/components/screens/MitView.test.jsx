import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent, act } from "@testing-library/react";

vi.mock("../../context/AppContext", () => ({ useApp: vi.fn() }));
import { useApp } from "../../context/AppContext";
import MitView from "./MitView.jsx";

const MAX = { id: "u1", name: "Max Muster", username: "m.muster", role: "mitarbeiter", isActive: true, isOnboarded: true, stundensatz: 40 };
const NEU = { id: "u2", name: "Nora Neu", username: "n.neu", role: "mitarbeiter", isActive: true, isOnboarded: false, stundensatz: 40 };
let users, show;
const mount = (list = [MAX]) => {
  useApp.mockReturnValue({
    data: { users: list, baustellen: [] },
    actions: { users },
    show, goBack: vi.fn(), setEditUser: vi.fn(), nav: vi.fn(),
  });
  render(<MitView />);
};
const click = async (name) => {
  await act(async () => { fireEvent.click(screen.getByRole("button", { name })); });
};

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  show = vi.fn();
  users = {
    createOnboardingToken: vi.fn().mockResolvedValue("c".repeat(48)),
    resetOnboardingPin: vi.fn().mockResolvedValue(),
    repair: vi.fn(), cleanupOrphans: vi.fn(), toggleActive: vi.fn(), remove: vi.fn(),
  };
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("MitView – Einladung", () => {
  it("erzeugt einen Link, OHNE den bisherigen PIN anzufassen", async () => {
    mount();
    await click("Neuer Zugang");
    expect(users.createOnboardingToken).toHaveBeenCalledWith("u1");
    expect(users.resetOnboardingPin).not.toHaveBeenCalled();
    expect(screen.getByText(new RegExp(`einladung=${"c".repeat(48)}`))).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Teilen/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Kopieren/ })).toBeInTheDocument();
  });

  it("Migration fehlt → Rückfrage, dann alter PIN-Reset; Abbrechen ändert nichts", async () => {
    users.createOnboardingToken.mockRejectedValue({ code: "PGRST202", message: "Could not find the function" });
    mount();
    await click("Neuer Zugang");
    expect(screen.getByText("PIN zurücksetzen?")).toBeInTheDocument();
    expect(users.resetOnboardingPin).not.toHaveBeenCalled();
    await click("Abbrechen");
    expect(users.resetOnboardingPin).not.toHaveBeenCalled();
    await click("Neuer Zugang");
    await click("Zurücksetzen");
    expect(users.resetOnboardingPin).toHaveBeenCalledTimes(1);
    const [id, pin, username] = users.resetOnboardingPin.mock.calls[0];
    expect([id, username]).toEqual(["u1", "m.muster"]);
    expect(pin).toMatch(/^\d{4}$/);
    expect(screen.getByText(pin)).toBeInTheDocument();
  });

  it("anderer Fehler → konkrete Meldung, kein stiller PIN-Reset", async () => {
    users.createOnboardingToken.mockRejectedValue({ message: 'Einladung nicht moeglich: Konto ist nicht bereit – bitte zuerst "Zugang reparieren"' });
    mount();
    await click("Neuer Zugang");
    expect(users.resetOnboardingPin).not.toHaveBeenCalled();
    expect(screen.queryByText("PIN zurücksetzen?")).toBeNull();
    expect(show.mock.calls[0][0]).toMatch(/Kein Link erstellt/);
    expect(show.mock.calls[0][1]).toBe("error");
  });
});

describe("MitView – Reparatur", () => {
  it('"Zugang reparieren" nur bei noch nicht eingerichteten Mitarbeitern; meldet, was getan wurde', async () => {
    users.repair.mockResolvedValue("auth_angelegt,identity_angelegt");
    mount([MAX, NEU]);
    expect(screen.getAllByRole("button", { name: "Zugang reparieren" })).toHaveLength(1);
    await click("Zugang reparieren");
    expect(users.repair).toHaveBeenCalledWith("u2");
    expect(show.mock.calls[0][0]).toMatch(/Anmelde-Konto neu angelegt, Identität ergänzt/);
  });

  it("Migration fehlt → verständlicher Hinweis", async () => {
    users.repair.mockRejectedValue({ code: "PGRST202" });
    users.cleanupOrphans.mockRejectedValue({ code: "PGRST202" });
    mount([NEU]);
    await click("Zugang reparieren");
    await click("Verwaiste Konten bereinigen");
    expect(show.mock.calls.map((c) => c[0])).toEqual([
      expect.stringMatching(/Migration 04/),
      expect.stringMatching(/Migration 04/),
    ]);
  });

  it("Bereinigen meldet die Anzahl", async () => {
    users.cleanupOrphans.mockResolvedValue(2);
    mount();
    await click("Verwaiste Konten bereinigen");
    expect(show).toHaveBeenCalledWith("2 verwaiste Konten entfernt");
  });
});
