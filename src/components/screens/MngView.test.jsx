import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";

// useApp wird in MngView via destructuring konsumiert — pro Test setzen.
vi.mock("../../context/AppContext", () => ({
  useApp: vi.fn(),
}));

import { useApp } from "../../context/AppContext";
import MngView from "./MngView.jsx";

afterEach(() => cleanup());

const baseCtx = {
  data: {
    baustellen: [
      { id: "b1", kunde: "Müller GmbH", mitarbeiter: ["u1"] },
      { id: "b2", kunde: "Schmidt KG", mitarbeiter: [] },
    ],
    maengel: [
      {
        id: "m1",
        baustelleId: "b1",
        titel: "Wand undicht",
        beschreibung: "",
        prioritaet: "hoch",
        status: "offen",
        fotos: [],
      },
      {
        id: "m2",
        baustelleId: "b2",
        titel: "Boden uneben",
        beschreibung: "",
        prioritaet: "mittel",
        status: "offen",
        fotos: [],
      },
    ],
    subunternehmer: [],
    users: [],
  },
  actions: { maengel: { create: vi.fn(), updateStatus: vi.fn(), remove: vi.fn() } },
  show: vi.fn(),
  goBack: vi.fn(),
  trigPhoto: vi.fn(),
  addN: vi.fn(),
  nav: vi.fn(),
  setSb: vi.fn(),
};

describe("MngView role-based rendering", () => {
  beforeEach(() => useApp.mockReset());

  it("a) Mitarbeiter ohne sb → Blocker mit Hinweistext", () => {
    useApp.mockReturnValue({
      ...baseCtx,
      sb: null,
      chef: false,
      cu: { id: "u1", role: "mitarbeiter", name: "Max" },
    });
    render(<MngView />);
    expect(
      screen.getByText(/Mängel werden pro Baustelle verwaltet/i),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Mangel erfassen")).toBeNull();
  });

  it("b) Mitarbeiter ohne sb → Button navigiert zur Baustellen-Liste", () => {
    const nav = vi.fn();
    useApp.mockReturnValue({
      ...baseCtx,
      nav,
      sb: null,
      chef: false,
      cu: { id: "u1", role: "mitarbeiter", name: "Max" },
    });
    render(<MngView />);
    fireEvent.click(screen.getByRole("button", { name: /Zu meinen Baustellen/i }));
    expect(nav).toHaveBeenCalledWith("bst");
  });

  it("c) Chef ohne sb → Anlegen-Button NICHT sichtbar (read-only Übersicht)", () => {
    useApp.mockReturnValue({
      ...baseCtx,
      sb: null,
      chef: true,
      cu: { id: "chef", role: "chef", name: "Boss" },
    });
    render(<MngView />);
    expect(screen.queryByLabelText("Mangel erfassen")).toBeNull();
    expect(screen.getByText("Mängel-Übersicht")).toBeInTheDocument();
  });

  it("d) Chef ohne sb → Klick auf Mangel-Card setzt sb und navigiert zu bsd", () => {
    const nav = vi.fn();
    const setSb = vi.fn();
    useApp.mockReturnValue({
      ...baseCtx,
      nav,
      setSb,
      sb: null,
      chef: true,
      cu: { id: "chef", role: "chef", name: "Boss" },
    });
    render(<MngView />);
    const card = screen.getByText("Wand undicht").closest("[role='button']");
    expect(card).not.toBeNull();
    fireEvent.click(card);
    expect(setSb).toHaveBeenCalledWith(
      expect.objectContaining({ id: "b1", kunde: "Müller GmbH" }),
    );
    expect(nav).toHaveBeenCalledWith("bsd");
  });

  it("e) Chef mit sb → Anlegen-Button sichtbar, Card NICHT clickable", () => {
    useApp.mockReturnValue({
      ...baseCtx,
      sb: { id: "b1", kunde: "Müller GmbH" },
      chef: true,
      cu: { id: "chef", role: "chef", name: "Boss" },
    });
    render(<MngView />);
    expect(screen.getByLabelText("Mangel erfassen")).toBeInTheDocument();
    // im sb-Modus sind die Cards keine Buttons
    expect(screen.queryByRole("button", { name: /Wand undicht/i })).toBeNull();
  });
});
