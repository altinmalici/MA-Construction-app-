import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

vi.mock("../../context/AppContext", () => ({ useApp: vi.fn() }));
import { useApp } from "../../context/AppContext";
import MatView from "./MatView.jsx";

afterEach(() => cleanup());

describe("MatView", () => {
  it("zeigt bei Subunternehmer- und Sonstige-Einträgen den Namen statt 'Unbekannt'", () => {
    const eName = (e) => (e.personTyp === "sub" ? "Elektro Huber" : e.personTyp === "sonstige" ? e.personName : "Max");
    useApp.mockReturnValue({
      goBack: vi.fn(),
      eName,
      data: {
        baustellen: [{ id: "b1", kunde: "Maier" }],
        users: [],
        stundeneintraege: [
          { id: "1", baustelleId: "b1", datum: "2026-11-16", material: "Kabel", personTyp: "sub", subId: "s1" },
          { id: "2", baustelleId: "b1", datum: "2026-11-16", material: "Gips", personTyp: "sonstige", personName: "Aushilfe Tom" },
          { id: "3", baustelleId: "b1", datum: "2026-11-16", material: "Fliesen", personTyp: "mitarbeiter", mitarbeiterId: "u1" },
          { id: "4", baustelleId: "b1", datum: "2026-11-16", material: "", personTyp: "mitarbeiter", mitarbeiterId: "u1" },
        ],
      },
    });
    render(<MatView />);
    expect(screen.getByText(/Elektro Huber/)).toBeInTheDocument();
    expect(screen.getByText(/Aushilfe Tom/)).toBeInTheDocument();
    expect(screen.getByText(/Max/)).toBeInTheDocument();
    expect(screen.queryByText(/Unbekannt/)).toBeNull();
  });
});
