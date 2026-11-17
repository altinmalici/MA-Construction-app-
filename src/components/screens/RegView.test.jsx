import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent, act } from "@testing-library/react";

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
vi.mock("../../lib/api/regiebericht", async (orig) => ({
  ...(await orig()),
  listNummern: vi.fn(),
  vergebeNummern: vi.fn(),
}));
vi.mock("../../lib/supabase.js", () => ({ supabase: {} }));
import { useApp } from "../../context/AppContext";
import * as regApi from "../../lib/api/regiebericht";
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
  localStorage.clear();
  // Standard: Migration für feste Nummern fehlt → bisherige Zählung
  regApi.listNummern.mockReset().mockRejectedValue({ code: "PGRST205", message: "Could not find the table" });
  regApi.vergebeNummern.mockReset().mockRejectedValue({ code: "PGRST202" });
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

describe("RegView – Bericht-Nummer", () => {
  const flush = () => act(async () => {});
  const druckHtml = () => document.querySelector("iframe")?.contentDocument?.documentElement?.innerHTML || "";
  const drucken = async () => {
    // unterer Knopf öffnet die Vorschau, dort wird gedruckt
    if (!screen.queryByRole("button", { name: "Drucken" })) {
      fireEvent.click(screen.getByRole("button", { name: "Drucken / PDF" }));
    }
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Drucken" })); });
  };
  let show;
  const mountMit = (eintraege) => {
    show = vi.fn();
    useApp.mockReturnValue({
      goBack: vi.fn(), show,
      data: { baustellen: [{ id: "b1", kunde: "Huber", adresse: "A-Str. 1" }], stundeneintraege: eintraege },
    });
    return render(<RegView />);
  };
  afterEach(() => document.querySelectorAll("iframe").forEach((f) => f.remove()));

  it("die Zeile An-/Abfahrt gibt es nicht mehr", async () => {
    const { container } = mountMit([e("1")]);
    await flush();
    expect(preview(container)).not.toContain("An-/Abfahrt");
    expect(preview(container)).not.toContain("Fahrten");
  });

  it("ohne Migration: bisherige Zählung (Position des Tages), Drucken funktioniert", async () => {
    const { container } = mountMit([e("1"), e("0", { datum: "2026-11-10" })]);
    await flush();
    expect(preview(container)).toContain("Regiebericht Nr. 02");
    await drucken();
    expect(druckHtml()).toContain("Regiebericht Nr. 02");
    expect(show).not.toHaveBeenCalledWith(expect.anything(), "error");
  });

  it("mit Migration: vergebene Nummer wird gezeigt – unabhängig von der Position", async () => {
    regApi.listNummern.mockResolvedValue({ "2026-11-17": 7 });
    const { container } = mountMit([e("1"), e("0", { datum: "2026-11-10" })]);
    await flush();
    expect(regApi.listNummern).toHaveBeenCalledWith("b1");
    expect(preview(container)).toContain("Regiebericht Nr. 07");
    await drucken();
    expect(regApi.vergebeNummern).not.toHaveBeenCalled(); // Nummer schon bekannt → geht auch offline
    expect(druckHtml()).toContain("Regiebericht Nr. 07");
  });

  it("mit Migration, Tag noch ohne Nummer: Vorschau kündigt an, Drucken vergibt sie", async () => {
    regApi.listNummern.mockResolvedValue({});
    regApi.vergebeNummern.mockResolvedValue({ "2026-11-17": 12 });
    const { container } = mountMit([e("1")]);
    await flush();
    expect(preview(container)).toContain("wird beim Drucken vergeben");
    await drucken();
    expect(regApi.vergebeNummern).toHaveBeenCalledWith("b1", ["2026-11-17"]);
    expect(druckHtml()).toContain("Regiebericht Nr. 12");
    expect(preview(container)).toContain("Regiebericht Nr. 12");
  });

  it("mit Migration, keine Verbindung beim Vergeben: kein Druck mit geratener Nummer, deutsche Meldung", async () => {
    regApi.listNummern.mockResolvedValue({});
    regApi.vergebeNummern.mockRejectedValue(new TypeError("Failed to fetch"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    mountMit([e("1")]);
    await flush();
    await drucken();
    expect(document.querySelector("iframe")).toBeNull();
    expect(show).toHaveBeenCalledWith("Bericht-Nummer nicht vergeben: Keine Verbindung – bitte erneut versuchen.", "error");
    // danach ist der Knopf nicht blockiert
    regApi.vergebeNummern.mockResolvedValue({ "2026-11-17": 3 });
    await drucken();
    expect(druckHtml()).toContain("Regiebericht Nr. 03");
  });

  it("Gerät ohne Verbindung, das feste Nummern noch nie gesehen hat: bisherige Zählung (wie vor der Migration)", async () => {
    regApi.listNummern.mockRejectedValue(new TypeError("Failed to fetch"));
    const { container } = mountMit([e("1")]);
    await flush();
    expect(preview(container)).toContain("Regiebericht Nr. 01");
  });

  it("Gerät ohne Verbindung, das feste Nummern schon kennt: keine geratene Nummer", async () => {
    localStorage.setItem("ma_regnr_fest_v1", "1");
    regApi.listNummern.mockRejectedValue(new TypeError("Failed to fetch"));
    const { container } = mountMit([e("1")]);
    await flush();
    expect(preview(container)).not.toContain("Regiebericht Nr. 01");
    expect(preview(container)).toContain("Regiebericht Nr. —");
  });
});
