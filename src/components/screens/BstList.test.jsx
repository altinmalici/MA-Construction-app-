import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

vi.mock("../../context/AppContext", () => ({
  useApp: vi.fn(),
}));

import { useApp } from "../../context/AppContext";
import BstList from "./BstList.jsx";

afterEach(() => cleanup());

const baseCtx = {
  data: { baustellen: [] },
  sq: "",
  setSq: vi.fn(),
  nav: vi.fn(),
  setSb: vi.fn(),
  setEm: vi.fn(),
  prevV: null,
  goBack: vi.fn(),
};

describe("BstList Role-Gate", () => {
  beforeEach(() => useApp.mockReset());

  it("a) Chef sieht +Button und Anlege-Hinweis im Empty-State", () => {
    useApp.mockReturnValue({
      ...baseCtx,
      cu: { id: "chef", role: "chef", name: "Boss" },
      chef: true,
    });
    render(<BstList />);
    expect(
      screen.getByText(/Tippe auf \+ um eine Baustelle anzulegen/i),
    ).toBeInTheDocument();
  });

  it("b) Mitarbeiter sieht KEINEN +Button — Empty-State sagt 'keine zugewiesen'", () => {
    useApp.mockReturnValue({
      ...baseCtx,
      cu: { id: "u1", role: "mitarbeiter", name: "Max" },
      chef: false,
    });
    render(<BstList />);
    expect(
      screen.getByText(/Dir sind aktuell keine Baustellen zugewiesen/i),
    ).toBeInTheDocument();
    // Empty-State sollte NICHT auf einen +Button verweisen
    expect(screen.queryByText(/Tippe auf \+/i)).toBeNull();
  });
});
