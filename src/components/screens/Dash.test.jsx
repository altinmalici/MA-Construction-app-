import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";

vi.mock("../../context/AppContext", () => ({
  useApp: vi.fn(),
}));

import { useApp } from "../../context/AppContext";
import Dash from "./Dash.jsx";

afterEach(() => cleanup());

const baseData = {
  baustellen: [
    { id: "b1", kunde: "Müller GmbH", status: "aktiv", mitarbeiter: ["u1"] },
    { id: "b2", kunde: "Schmidt KG", status: "aktiv", mitarbeiter: [] },
  ],
  stundeneintraege: [],
  maengel: [
    {
      id: "m1",
      baustelleId: "b1",
      titel: "Wand undicht",
      prioritaet: "hoch",
      status: "offen",
    },
    {
      id: "m2",
      baustelleId: "b2",
      titel: "Boden kaputt",
      prioritaet: "hoch",
      status: "offen",
    },
    {
      id: "m3",
      baustelleId: "b1",
      titel: "Schon erledigt",
      prioritaet: "hoch",
      status: "erledigt",
    },
  ],
  kalender: [],
  bautagebuch: [],
};

const baseCtx = {
  data: baseData,
  unread: 0,
  nav: vi.fn(),
  setSb: vi.fn(),
  setEm: vi.fn(),
};

describe("Dash Mängel-Liste für Mitarbeiter", () => {
  beforeEach(() => useApp.mockReset());

  it("a) Mitarbeiter sieht Section 'Offene Mängel'", () => {
    useApp.mockReturnValue({
      ...baseCtx,
      cu: { id: "u1", role: "mitarbeiter", name: "Max Mustermann" },
      chef: false,
    });
    render(<Dash />);
    expect(screen.getByText("Offene Mängel")).toBeInTheDocument();
  });

  it("b) Mitarbeiter sieht nur Mängel von Baustellen, denen er zugewiesen ist", () => {
    useApp.mockReturnValue({
      ...baseCtx,
      cu: { id: "u1", role: "mitarbeiter", name: "Max" },
      chef: false,
    });
    render(<Dash />);
    // u1 ist nur auf b1 → m1 sichtbar, m2 (auf b2) NICHT
    expect(screen.getByText("Wand undicht")).toBeInTheDocument();
    expect(screen.queryByText("Boden kaputt")).toBeNull();
    // erledigte Mängel niemals sichtbar
    expect(screen.queryByText("Schon erledigt")).toBeNull();
  });

  it("c) Mitarbeiter ohne offene Mängel → Empty-State", () => {
    useApp.mockReturnValue({
      ...baseCtx,
      data: { ...baseData, maengel: [] },
      cu: { id: "u1", role: "mitarbeiter", name: "Max" },
      chef: false,
    });
    render(<Dash />);
    expect(
      screen.getByText(/Keine offenen Mängel auf deinen Baustellen/i),
    ).toBeInTheDocument();
  });

  it("d) Klick auf Mangel-Eintrag → setSb + nav('bsd')", () => {
    const setSb = vi.fn();
    const nav = vi.fn();
    useApp.mockReturnValue({
      ...baseCtx,
      setSb,
      nav,
      cu: { id: "u1", role: "mitarbeiter", name: "Max" },
      chef: false,
    });
    render(<Dash />);
    fireEvent.click(screen.getByText("Wand undicht"));
    expect(setSb).toHaveBeenCalledWith(
      expect.objectContaining({ id: "b1", kunde: "Müller GmbH" }),
    );
    expect(nav).toHaveBeenCalledWith("bsd");
  });

  it("e) Chef sieht KEINE 'Offene Mängel'-Section (hat eigene Widget-Kachel)", () => {
    useApp.mockReturnValue({
      ...baseCtx,
      cu: { id: "chef", role: "chef", name: "Boss" },
      chef: true,
    });
    render(<Dash />);
    expect(screen.queryByText("Offene Mängel")).toBeNull();
  });

  it("f) Mitarbeiter sieht KEINEN 'Mangel melden'-Quick-Action mehr", () => {
    useApp.mockReturnValue({
      ...baseCtx,
      cu: { id: "u1", role: "mitarbeiter", name: "Max" },
      chef: false,
    });
    render(<Dash />);
    expect(
      screen.queryByRole("button", { name: /Mangel melden/i }),
    ).toBeNull();
  });
});
