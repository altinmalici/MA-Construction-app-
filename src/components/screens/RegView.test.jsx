import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";

const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==";
vi.mock("../../context/AppContext", () => ({ useApp: vi.fn() }));
// SigPad (Canvas) durch einen Knopf ersetzen, der eine Unterschrift liefert.
vi.mock("../ui", async (orig) => ({
  ...(await orig()),
  SigPad: ({ sig, onSave, onClear }) => (
    <div>
      <button onClick={() => onSave(PNG)}>unterschreiben</button>
      <button onClick={onClear}>unterschrift-löschen</button>
      <span data-testid="sig-state">{sig ? "unterschrieben" : "leer"}</span>
    </div>
  ),
}));
import { useApp } from "../../context/AppContext";
import RegView from "./RegView.jsx";

const NOW = new Date(2026, 10, 17, 12, 0);
const e = (id, over = {}) => ({
  id, baustelleId: "b1", datum: "2026-11-17", beginn: "07:00", ende: "15:15", pause: 30,
  arbeit: "Estrich", personTyp: "mitarbeiter", mitarbeiterId: "u1", ...over,
});
const mount = (eintraege) => {
  useApp.mockReturnValue({
    goBack: vi.fn(), show: vi.fn(),
    data: {
      baustellen: [{ id: "b1", kunde: "Huber", adresse: "A-Str. 1" }, { id: "b2", kunde: "Maier", adresse: "B-Str. 2" }],
      stundeneintraege: eintraege,
    },
  });
  return render(<RegView />);
};
const preview = (container) => container.innerHTML;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
});
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe("RegView – Bericht", () => {
  it("zeigt für heute die Mannstunden in Viertelstunden: 3 × 7,75 h = 23,25 h", () => {
    const { container } = mount([e("1"), e("2"), e("3")]);
    expect(preview(container)).toContain("23,25 h");
  });

  it("ohne Einträge im Zeitraum gibt es keinen Bericht", () => {
    const { container } = mount([e("1", { datum: "2026-10-01" })]);
    expect(preview(container)).not.toContain("Regiebericht Nr.");
  });
});

describe("RegView – Unterschrift", () => {
  it("erscheint im Bericht eines einzelnen Tages", () => {
    const { container } = mount([e("1")]);
    expect(preview(container)).not.toContain(PNG);
    fireEvent.click(screen.getByText("unterschreiben"));
    expect(preview(container)).toContain(`<img src="${PNG}"`);
  });

  it("Baustelle wechseln → Unterschrift ist weg (landet nicht auf dem Bericht einer anderen Baustelle)", () => {
    const { container } = mount([e("1"), e("2", { baustelleId: "b2" })]);
    fireEvent.click(screen.getByText("unterschreiben"));
    fireEvent.change(container.querySelector("select"), { target: { value: "b2" } });
    expect(screen.getByTestId("sig-state").textContent).toBe("leer");
    expect(preview(container)).not.toContain(PNG);
    expect(preview(container)).toContain("Maier");
  });

  it("Zeitraum ändern → Unterschrift ist weg", () => {
    const { container } = mount([e("1"), e("2", { datum: "2026-11-16" })]);
    fireEvent.click(screen.getByText("unterschreiben"));
    fireEvent.click(screen.getByRole("button", { name: "Woche" }));
    expect(screen.getByTestId("sig-state").textContent).toBe("leer");
    expect(preview(container)).not.toContain(PNG);
  });

  it("mehrere Tage: Hinweis, und die Unterschrift wird nicht in den Bericht übernommen", () => {
    const { container } = mount([e("1"), e("2", { datum: "2026-11-16" })]);
    fireEvent.click(screen.getByRole("button", { name: "Woche" }));
    fireEvent.click(screen.getByText("unterschreiben"));
    expect(screen.getByText(/nur gedruckt,\s*wenn genau ein Tag ausgewählt ist/)).toBeInTheDocument();
    expect(preview(container)).not.toContain(PNG);
  });
});
