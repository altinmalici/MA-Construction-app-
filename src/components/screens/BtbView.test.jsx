import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent, act } from "@testing-library/react";

vi.mock("../../context/AppContext", () => ({ useApp: vi.fn() }));
import { useApp } from "../../context/AppContext";
import BtbView from "./BtbView.jsx";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const B1 = { id: "b1", kunde: "Huber", status: "aktiv", mitarbeiter: ["u1"] };
const B2 = { id: "b2", kunde: "Maier", status: "aktiv", mitarbeiter: [] };

let create, show;
const ctx = (over = {}) => ({
  sb: null,
  chef: true,
  cu: { id: "chef", role: "chef" },
  data: { baustellen: [B1], bautagebuch: [], users: [{ id: "u1", name: "Max", role: "mitarbeiter" }] },
  actions: { bautagebuch: { create, remove: vi.fn() } },
  show,
  goBack: vi.fn(),
  ...over,
});

const openForm = () => fireEvent.click(screen.getByRole("button", { name: "Eintrag erstellen" }));
const fillArbeiten = (t = "Estrich gegossen") =>
  fireEvent.change(screen.getByPlaceholderText("Arbeiten *"), { target: { value: t } });
const clickSave = async () => {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /Speichern/ }));
  });
};

beforeEach(() => {
  // Fehlerpfade loggen bewusst auf console.error — im Test stumm schalten.
  vi.spyOn(console, "error").mockImplementation(() => {});
  create = vi.fn().mockResolvedValue("bt1");
  show = vi.fn();
  useApp.mockReset();
});

describe("BtbView – Speichern", () => {
  it("bekannter Fehler: Screen vor dem Laden der Daten geöffnet, dann EINE Baustelle → speichert", async () => {
    // 1. Render ohne Baustellen (Daten noch unterwegs)
    useApp.mockReturnValue(ctx({ data: { baustellen: [], bautagebuch: [], users: [] } }));
    const { rerender } = render(<BtbView />);
    // 2. Daten kommen an
    useApp.mockReturnValue(ctx());
    rerender(<BtbView />);
    openForm();
    fillArbeiten();
    await clickSave();
    expect(create).toHaveBeenCalledTimes(1);
    expect(create.mock.calls[0][0]).toMatchObject({ baustelleId: "b1", arbeiten: "Estrich gegossen" });
    expect(show).toHaveBeenCalledWith("Gespeichert");
  });

  it("zeigt bei einer einzigen Baustelle an, wohin gespeichert wird", () => {
    useApp.mockReturnValue(ctx());
    render(<BtbView />);
    openForm();
    expect(screen.getByText("Huber")).toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: "Baustelle" })).toBeNull();
  });

  it("mehrere Baustellen: Auswahl ist Pflicht, nichts wird still vorbelegt", async () => {
    useApp.mockReturnValue(ctx({ data: { baustellen: [B1, B2], bautagebuch: [], users: [] } }));
    render(<BtbView />);
    openForm();
    fillArbeiten();
    await clickSave();
    expect(create).not.toHaveBeenCalled();
    expect(show).toHaveBeenCalledWith("Baustelle wählen", "error");
    fireEvent.change(screen.getByRole("combobox", { name: "Baustelle" }), { target: { value: "b2" } });
    await clickSave();
    expect(create.mock.calls[0][0].baustelleId).toBe("b2");
  });

  it("aus einer Baustelle heraus geöffnet → diese Baustelle", async () => {
    useApp.mockReturnValue(ctx({ sb: B2, data: { baustellen: [B1, B2], bautagebuch: [], users: [] } }));
    render(<BtbView />);
    openForm();
    fillArbeiten();
    await clickSave();
    expect(create.mock.calls[0][0].baustelleId).toBe("b2");
  });

  it("leeres Datum wird abgefangen statt als DB-Fehler zu enden", async () => {
    useApp.mockReturnValue(ctx());
    render(<BtbView />);
    openForm();
    fillArbeiten();
    fireEvent.change(screen.getByLabelText("Datum"), { target: { value: "" } });
    await clickSave();
    expect(create).not.toHaveBeenCalled();
    expect(show).toHaveBeenCalledWith("Datum wählen", "error");
  });

  it("Wetter und 0 °C werden übergeben; ohne Angabe null", async () => {
    useApp.mockReturnValue(ctx());
    render(<BtbView />);
    openForm();
    fillArbeiten();
    await clickSave();
    expect(create.mock.calls[0][0]).toMatchObject({ wetter: null, temperatur: null });
    openForm();
    fillArbeiten("Tag 2");
    fireEvent.change(screen.getByLabelText("Wetter"), { target: { value: "schnee" } });
    fireEvent.change(screen.getByLabelText("Temperatur in Grad Celsius"), { target: { value: "0" } });
    await clickSave();
    expect(create.mock.calls[1][0]).toMatchObject({ wetter: "schnee", temperatur: 0 });
  });

  it("Fehler vom Server → klare deutsche Meldung, Formular bleibt offen mit Eingaben", async () => {
    create.mockRejectedValue({ code: "42501", message: 'new row violates row-level security policy for table "bautagebuch"' });
    useApp.mockReturnValue(ctx());
    render(<BtbView />);
    openForm();
    fillArbeiten();
    await clickSave();
    expect(show).toHaveBeenCalledWith(
      "Eintrag nicht gespeichert: Keine Berechtigung für diese Aktion.",
      "error",
    );
    expect(screen.getByPlaceholderText("Arbeiten *").value).toBe("Estrich gegossen");
  });

  it("Netzfehler → Verbindungs-Meldung", async () => {
    create.mockRejectedValue(new TypeError("Failed to fetch"));
    useApp.mockReturnValue(ctx());
    render(<BtbView />);
    openForm();
    fillArbeiten();
    await clickSave();
    expect(show.mock.calls[0][0]).toMatch(/Keine Verbindung/);
  });
});

describe("BtbView – Liste und Rollen", () => {
  it("Mitarbeiter: kein +, und der Leertext verweist nicht auf +", () => {
    useApp.mockReturnValue(ctx({ chef: false, cu: { id: "u1", role: "mitarbeiter" } }));
    render(<BtbView />);
    expect(screen.queryByRole("button", { name: "Eintrag erstellen" })).toBeNull();
    expect(screen.queryByText(/Tippe auf \+/)).toBeNull();
    expect(screen.getByText(/führt der Chef/)).toBeInTheDocument();
  });

  it("sortiert nach Datum (neueste zuerst), nicht nach Anlage-Reihenfolge", () => {
    const e = (id, datum, arbeiten) => ({ id, baustelleId: "b1", datum, arbeiten, anwesende: [], wetter: null, temperatur: null });
    useApp.mockReturnValue(ctx({
      data: {
        baustellen: [B1], users: [],
        bautagebuch: [e("1", "2026-11-10", "Mitte"), e("2", "2026-11-12", "Neu"), e("3", "2026-11-01", "Alt")],
      },
    }));
    render(<BtbView />);
    const texts = screen.getAllByText(/^(Neu|Mitte|Alt)$/).map((n) => n.textContent);
    expect(texts).toEqual(["Neu", "Mitte", "Alt"]);
  });
});
