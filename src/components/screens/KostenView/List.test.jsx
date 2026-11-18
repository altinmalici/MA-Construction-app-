import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, act } from "@testing-library/react";

vi.mock("../../../context/AppContext", () => ({ useApp: vi.fn() }));
import { useApp } from "../../../context/AppContext";
import KostenList from "./List.jsx";

afterEach(() => cleanup());

const std = (over) => ({ datum: "2026-11-16", beginn: "07:00", ende: "15:00", pause: 0, personTyp: "mitarbeiter", mitarbeiterId: "u1", ...over });
const ctx = () => ({
  goBack: vi.fn(), show: vi.fn(), addN: vi.fn(), cu: { id: "c1", role: "chef" },
  actions: { kosten: { create: vi.fn() } },
  data: {
    users: [{ id: "u1", name: "Max", stundensatz: 50 }],
    baustellen: [
      { id: "a", kunde: "Aktiv GmbH", status: "aktiv", budget: 1000, mitarbeiter: [] },
      { id: "f", kunde: "Fertig KG", status: "fertig", budget: 5000, mitarbeiter: [] },
    ],
    stundeneintraege: [
      std({ id: "1", baustelleId: "a" }), // 8 h × 50 = 400
      std({ id: "2", baustelleId: "f" }), // 8 h × 50 = 400
      std({ id: "3", baustelleId: "a", personTyp: "sub", mitarbeiterId: null, subId: "s1" }), // zählt nicht
    ],
    kosten: [{ id: "k1", baustelleId: "a", kategorie: "material", beschreibung: "Fliesen", betrag: 1100, datum: "2026-11-16" }],
  },
});

describe("KostenView/List – Kacheln", () => {
  it("Stunden zählen nur Mitarbeiter-Einträge (keine Subunternehmer)", () => {
    useApp.mockReturnValue(ctx());
    render(<KostenList onSelectBs={vi.fn()} />);
    expect(screen.getByText("16h")).toBeInTheDocument();
    expect(screen.queryByText("24h")).toBeNull();
  });

  it("Budget-Anteil zeigt Überschreitungen statt bei 100 % zu enden", () => {
    useApp.mockReturnValue(ctx());
    render(<KostenList onSelectBs={vi.fn()} />);
    // Baustelle a: 400 Lohn + 1100 Material = 1500 von 1000 → 150 %
    expect(screen.getByText("150%")).toBeInTheDocument();
  });

  it("mit Filter beziehen sich alle drei Kacheln auf die gezeigten Baustellen", () => {
    useApp.mockReturnValue(ctx());
    render(<KostenList onSelectBs={vi.fn()} />);
    // erster Treffer = Filter-Chip (der zweite ist die Baustellen-Karte "Fertig KG")
    fireEvent.click(screen.getAllByRole("button", { name: /^Fertig/i })[0]);
    // "8h" steht in der Kachel und in der Karte der Baustelle; "16h" (beide
    // Baustellen zusammen) darf nirgends mehr stehen.
    expect(screen.getAllByText("8h").length).toBeGreaterThan(0);
    expect(screen.queryByText("16h")).toBeNull();
    // Kosten und Budget nur der fertigen Baustelle: 400 € von 5.000 €
    expect(screen.getAllByText(/400,00/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/5\.000,00/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/6\.000,00/)).toBeNull();
  });

  it("eingetragene Fahrtzeit zählt zu Stunden und Lohnkosten", () => {
    const c = ctx();
    c.data.stundeneintraege = [std({ id: "1", baustelleId: "a", datum: "2026-12-01", fahrtzeit: 60 })]; // 8 h + 1 h
    c.data.kosten = [];
    useApp.mockReturnValue(c);
    render(<KostenList onSelectBs={vi.fn()} />);
    expect(screen.getAllByText("9h").length).toBeGreaterThan(0);
    // 9 h × 50 € = 450 €
    expect(screen.getAllByText(/450,00/).length).toBeGreaterThan(0);
  });

  it("„+ Kosten“ aus einer abgerechneten Baustelle: sie ist nicht vorbelegt und es wird nichts auf sie gespeichert", async () => {
    const c = ctx();
    c.data.baustellen = [...c.data.baustellen, { id: "r", kunde: "Abgerechnet AG", status: "abgerechnet", budget: 0, mitarbeiter: [] }];
    c.actions = { ...(c.actions || {}), kosten: { create: vi.fn() } };
    useApp.mockReturnValue(c);
    const { container } = render(<KostenList onSelectBs={vi.fn()} prefillBs="r" />);
    const select = container.querySelector("select");
    expect(select.value).toBe("");
    expect([...select.querySelectorAll("option")].map((o) => o.textContent)).not.toContain("Abgerechnet AG");
    expect(select.querySelector('optgroup[label="Abgeschlossen"]').textContent).toContain("Fertig KG");
    fireEvent.change(screen.getByPlaceholderText(/Beschreibung/i), { target: { value: "Fliesen" } });
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: /Speichern|Hinzufügen|Kosten erfassen/ })); });
    expect(c.actions.kosten.create).not.toHaveBeenCalled();
    expect(c.show).toHaveBeenCalledWith(expect.stringContaining("Baustelle wählen"), "error");
  });
});
