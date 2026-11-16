import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent, act } from "@testing-library/react";

vi.mock("../../context/AppContext", () => ({ useApp: vi.fn() }));
import { useApp } from "../../context/AppContext";
import MitForm from "./MitForm.jsx";

let users, show, setMitSummary;
const mount = (over = {}) => {
  useApp.mockReturnValue({
    editUser: null, setEditUser: vi.fn(), data: { users: [] }, actions: { users },
    show, goBack: vi.fn(), setMitSummary, mitSummary: null, ...over,
  });
  render(<MitForm />);
};
const fill = (name) => fireEvent.change(screen.getByPlaceholderText("Vor- und Nachname"), { target: { value: name } });
const save = async () => {
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: /Anlegen|Speichern/ })); });
};

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  show = vi.fn();
  setMitSummary = vi.fn();
  users = {
    createForOnboarding: vi.fn().mockResolvedValue("new-id"),
    createOnboardingToken: vi.fn().mockResolvedValue("d".repeat(48)),
  };
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("MitForm – neuer Mitarbeiter", () => {
  it("Benutzername wird aus dem Namen gebildet – ohne Akzente/Sonderzeichen", () => {
    mount();
    fill("Besnik Çela");
    expect(screen.getByDisplayValue("b.cela")).toBeInTheDocument();
    fill("Jörg Müller-Weiß");
    expect(screen.getByDisplayValue("j.mueller-weiss")).toBeInTheDocument();
  });

  it("legt an und zeigt Link UND Einladungs-PIN-Daten in der Zusammenfassung", async () => {
    mount();
    fill("Max Muster");
    await save();
    expect(users.createForOnboarding).toHaveBeenCalledTimes(1);
    expect(users.createOnboardingToken).toHaveBeenCalledWith("new-id");
    const s = setMitSummary.mock.calls[0][0];
    expect(s).toMatchObject({ name: "Max Muster", username: "m.muster" });
    expect(s.pin).toMatch(/^\d{4}$/);
    expect(s.link).toContain(`einladung=${"d".repeat(48)}`);
    expect(show).not.toHaveBeenCalledWith(expect.anything(), "error");
  });

  it("Link-Funktion fehlt/scheitert → Anlage gilt trotzdem, PIN wird gezeigt (kein Zombie)", async () => {
    users.createOnboardingToken.mockRejectedValue({ code: "PGRST202" });
    mount();
    fill("Max Muster");
    await save();
    const s = setMitSummary.mock.calls[0][0];
    expect(s.link).toBeNull();
    expect(s.pin).toMatch(/^\d{4}$/);
    expect(show).not.toHaveBeenCalledWith(expect.anything(), "error");
  });

  it("Anlage scheitert → konkrete Meldung, keine Zusammenfassung", async () => {
    users.createForOnboarding.mockRejectedValue({ message: "Nur der Chef darf Nutzer anlegen" });
    mount();
    fill("Max Muster");
    await save();
    expect(setMitSummary).not.toHaveBeenCalled();
    expect(show).toHaveBeenCalledWith("Nicht gespeichert: Nur der Chef darf Nutzer anlegen", "error");
  });

  it("Duplikat ohne bekanntes Profil → Hinweis auf verwaistes Konto", async () => {
    users.createForOnboarding.mockRejectedValue({ code: "23505", message: 'duplicate key value violates unique constraint "users_email_partial_key"' });
    mount();
    fill("Max Muster");
    await save();
    expect(show.mock.calls[0][0]).toMatch(/altes Konto belegt/);
  });

  it("Duplikat mit bekanntem Profil → 'bereits vergeben'", async () => {
    users.createForOnboarding.mockRejectedValue({ code: "23505", message: "duplicate key" });
    mount({ data: { users: [{ id: "x", username: "max" }] } });
    fill("Max Muster");
    fireEvent.change(screen.getByDisplayValue("m.muster"), { target: { value: "max" } });
    await save();
    expect(show).toHaveBeenCalledWith("Benutzername bereits vergeben", "error");
  });
});
