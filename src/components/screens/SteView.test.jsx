import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent, act } from "@testing-library/react";

vi.mock("../../context/AppContext", () => ({ useApp: vi.fn() }));
vi.mock("../../lib/storage", () => ({ uploadPhotos: vi.fn() }));
import { useApp } from "../../context/AppContext";
import SteView from "./SteView.jsx";
import { uploadPhotos } from "../../lib/storage";
import { clearQueue, getPending } from "../../lib/offlineQueue.js";

const B1 = { id: "b1", kunde: "Huber", mitarbeiter: ["u1"] };
const MAX = { id: "u1", name: "Max", role: "mitarbeiter" };
let std, show, nav, addN;

const ctx = (over = {}) => ({
  sb: null, chef: false, cu: MAX,
  data: { baustellen: [B1], stundeneintraege: [], users: [MAX], subunternehmer: [] },
  actions: { stundeneintraege: std },
  show, nav, goBack: vi.fn(), prevV: null, eName: () => "Max", trigPhoto: vi.fn(), addN,
  ...over,
});
const save = async (label = /Speichern|Aktualisieren/) => {
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: label })); });
};

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
  clearQueue();
  uploadPhotos.mockReset();
  uploadPhotos.mockResolvedValue([]);
  show = vi.fn(); nav = vi.fn(); addN = vi.fn();
  std = {
    create: vi.fn().mockResolvedValue("id"),
    update: vi.fn().mockResolvedValue(),
    remove: vi.fn().mockResolvedValue(),
    setFreigabe: vi.fn().mockResolvedValue(),
    addLocal: vi.fn(),
  };
  useApp.mockReset();
});
afterEach(() => { cleanup(); clearQueue(); vi.restoreAllMocks(); });

describe("SteView – Speichern", () => {
  it("Mitarbeiter mit EINER Baustelle: sie ist automatisch gewählt, Eintrag gehört ihm", async () => {
    useApp.mockReturnValue(ctx());
    render(<SteView />);
    await save();
    expect(std.create).toHaveBeenCalledTimes(1);
    expect(std.create.mock.calls[0][0]).toMatchObject({
      baustelleId: "b1", mitarbeiterId: "u1", personTyp: "mitarbeiter", beginn: "07:00", ende: "16:00", pause: 0, fahrtzeit: 0,
    });
    expect(std.create.mock.calls[0][0].id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("schwacher Empfang (online, aber Anfrage scheitert) → Eintrag landet in der Warteschlange", async () => {
    std.create.mockRejectedValue(new TypeError("Failed to fetch"));
    useApp.mockReturnValue(ctx());
    render(<SteView />);
    await save();
    const q = getPending();
    expect(q).toHaveLength(1);
    expect(q[0].entry).toMatchObject({ baustelleId: "b1", mitarbeiterId: "u1" });
    expect(q[0].id).toBe(std.create.mock.calls[0][0].id); // gleiche ID wie der Versuch
    expect(std.addLocal).toHaveBeenCalledTimes(1);
    expect(show.mock.calls[0][0]).toMatch(/Kein Empfang – gespeichert/);
    expect(show.mock.calls[0][1]).toBeUndefined(); // kein Fehler-Toast
  });

  it("offline → Warteschlange, kein Serveraufruf", async () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    useApp.mockReturnValue(ctx());
    render(<SteView />);
    await save();
    expect(std.create).not.toHaveBeenCalled();
    expect(getPending()).toHaveLength(1);
  });

  it("Server lehnt ab (kein Netzfehler) → Fehlermeldung, NICHT in die Warteschlange, zweiter Versuch mit derselben ID", async () => {
    std.create.mockRejectedValue({ code: "42501", message: "new row violates row-level security policy" });
    useApp.mockReturnValue(ctx());
    render(<SteView />);
    await save();
    expect(getPending()).toHaveLength(0);
    expect(show).toHaveBeenCalledWith("Nicht gespeichert: Keine Berechtigung für diese Aktion.", "error");
    await save();
    expect(std.create.mock.calls[1][0].id).toBe(std.create.mock.calls[0][0].id);
  });

  it("Duplikat-Antwort (erster Versuch kam doch an) gilt als Erfolg", async () => {
    std.create.mockRejectedValue({ code: "23505", message: "duplicate key" });
    useApp.mockReturnValue(ctx());
    render(<SteView />);
    await save();
    expect(show).not.toHaveBeenCalledWith(expect.anything(), "error");
    expect(screen.getByText("Gespeichert!")).toBeInTheDocument();
  });

  it("leeres Datum wird abgefangen", async () => {
    useApp.mockReturnValue(ctx());
    const { container } = render(<SteView />);
    fireEvent.change(container.querySelector('input[type="date"]'), { target: { value: "" } });
    await save();
    expect(std.create).not.toHaveBeenCalled();
    expect(show).toHaveBeenCalledWith("Datum wählen", "error");
  });

  it("Pause rastet beim Verlassen des Feldes auf 15 Minuten ein", () => {
    useApp.mockReturnValue(ctx());
    const { container } = render(<SteView />);
    const pause = container.querySelector('input[step="15"]');
    fireEvent.change(pause, { target: { value: "20" } });
    fireEvent.blur(pause);
    expect(pause.value).toBe("15");
  });
});

describe("SteView – Pause und Fahrtzeit starten bei 0", () => {
  const felder = (container) => {
    const nums = [...container.querySelectorAll('input[type="number"]')];
    return { pause: nums.find((i) => i.getAttribute("step") === "15"), fahrt: nums.find((i) => i.getAttribute("step") !== "15") };
  };

  it("neuer Eintrag (Mitarbeiter): beide Felder zeigen 0, nichts ist vorausgefüllt", () => {
    useApp.mockReturnValue(ctx());
    const { container } = render(<SteView />);
    const { pause, fahrt } = felder(container);
    expect(pause.value).toBe("0");
    expect(fahrt.value).toBe("0");
    expect(screen.getByText(/\+ 0min Fahrt/)).toBeInTheDocument();
  });

  it("neuer Eintrag (Chef): ebenfalls 0 / 0", () => {
    useApp.mockReturnValue(ctx({ chef: true, cu: { id: "c1", name: "Chef", role: "chef" }, sb: B1 }));
    const { container } = render(<SteView />);
    const { pause, fahrt } = felder(container);
    expect(pause.value).toBe("0");
    expect(fahrt.value).toBe("0");
  });

  it("unverändert gespeichert → Pause 0 und Fahrt 0 gehen an den Server; 07:00–16:00 sind volle 9 h", async () => {
    useApp.mockReturnValue(ctx());
    render(<SteView />);
    expect(screen.getByText(/^9h/)).toBeInTheDocument();
    await save();
    expect(std.create.mock.calls[0][0]).toMatchObject({ pause: 0, fahrtzeit: 0 });
  });

  it("Offline-Warteschlange: der Eintrag trägt Pause 0 und Fahrt 0", async () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    useApp.mockReturnValue(ctx());
    render(<SteView />);
    await save();
    expect(getPending()[0].entry).toMatchObject({ pause: 0, fahrtzeit: 0 });
  });

  it("eingegebene Werte werden übernommen (0 ist nur der Startwert)", async () => {
    useApp.mockReturnValue(ctx());
    const { container } = render(<SteView />);
    const { pause, fahrt } = felder(container);
    fireEvent.change(pause, { target: { value: "45" } });
    fireEvent.change(fahrt, { target: { value: "20" } });
    await save();
    expect(std.create.mock.calls[0][0]).toMatchObject({ pause: 45, fahrtzeit: 20 });
  });

  it("Antippen markiert den Feldinhalt (aus '0' wird beim Tippen nicht '045')", () => {
    useApp.mockReturnValue(ctx());
    const { container } = render(<SteView />);
    const { pause, fahrt } = felder(container);
    for (const el of [pause, fahrt]) {
      el.select = vi.fn();
      fireEvent.focus(el);
      expect(el.select).toHaveBeenCalledTimes(1);
    }
  });

  it("nach dem Speichern steht das Formular wieder auf 0 / 0 (nicht auf den zuletzt eingegebenen Werten)", async () => {
    vi.useFakeTimers();
    useApp.mockReturnValue(ctx());
    const { container } = render(<SteView />);
    let f = felder(container);
    fireEvent.change(f.pause, { target: { value: "45" } });
    fireEvent.change(f.fahrt, { target: { value: "20" } });
    await save();
    expect(std.create.mock.calls[0][0]).toMatchObject({ pause: 45, fahrtzeit: 20 });
    await act(async () => { await vi.advanceTimersByTimeAsync(1300); });
    f = felder(container);
    expect(f.pause.value).toBe("0");
    expect(f.fahrt.value).toBe("0");
    vi.useRealTimers();
  });

  it("Bearbeiten abbrechen → neuer Eintrag startet bei 0 / 0, nicht mit den Werten des alten", () => {
    const alt = {
      id: "e1", baustelleId: "b1", datum: "2026-11-10", beginn: "07:00", ende: "16:00", pause: 30,
      fahrtzeit: 30, arbeit: "Putz", material: "", fotos: [], personTyp: "mitarbeiter", mitarbeiterId: "u1", freigegeben: false,
    };
    useApp.mockReturnValue(ctx({
      chef: true, cu: { id: "c1", name: "Chef", role: "chef" }, sb: B1,
      data: { baustellen: [B1], stundeneintraege: [alt], users: [MAX], subunternehmer: [] },
    }));
    const { container } = render(<SteView />);
    fireEvent.click(screen.getByRole("button", { name: /Einträge \(1\)/ }));
    fireEvent.click(screen.getByRole("button", { name: /Bearbeiten/ }));
    expect(felder(container).pause.value).toBe("30");
    fireEvent.click(screen.getByRole("button", { name: /Abbrechen – neuen Eintrag erstellen/ }));
    const f = felder(container);
    expect(f.pause.value).toBe("0");
    expect(f.fahrt.value).toBe("0");
  });

  it("bestehender Eintrag behält beim Bearbeiten seine gespeicherten Werte", async () => {
    const alt = {
      id: "e1", baustelleId: "b1", datum: "2026-11-10", beginn: "07:00", ende: "16:00", pause: 30,
      fahrtzeit: 30, arbeit: "Putz", material: "", fotos: [], personTyp: "mitarbeiter", mitarbeiterId: "u1", freigegeben: false,
    };
    useApp.mockReturnValue(ctx({
      chef: true, cu: { id: "c1", name: "Chef", role: "chef" }, sb: B1,
      data: { baustellen: [B1], stundeneintraege: [alt], users: [MAX], subunternehmer: [] },
    }));
    const { container } = render(<SteView />);
    fireEvent.click(screen.getByRole("button", { name: /Einträge \(1\)/ }));
    fireEvent.click(screen.getByRole("button", { name: /Bearbeiten/ }));
    const { pause, fahrt } = felder(container);
    expect(pause.value).toBe("30");
    expect(fahrt.value).toBe("30");
    await save(/Aktualisieren/);
    expect(std.update.mock.calls[0][1]).toMatchObject({ pause: 30, fahrtzeit: 30 });
  });
});

describe("SteView – Chef bearbeitet", () => {
  const entry = (over = {}) => ({
    id: "e1", baustelleId: "b1", datum: "2026-11-10", beginn: "07:00", ende: "16:00", pause: 30,
    fahrtzeit: 0, arbeit: "Putz", material: "", fotos: [], personTyp: "mitarbeiter", mitarbeiterId: "u1",
    freigegeben: false, ...over,
  });
  const chefCtx = (e) => ctx({
    chef: true, cu: { id: "c1", name: "Chef", role: "chef" }, sb: B1,
    data: { baustellen: [B1], stundeneintraege: [e], users: [MAX], subunternehmer: [] },
  });
  const openEdit = () => {
    fireEvent.click(screen.getByRole("button", { name: /Einträge \(1\)/ }));
    fireEvent.click(screen.getByRole("button", { name: /Bearbeiten/ }));
  };

  it("freigegebener Eintrag: Ändern nur nach Rückfrage, Freigabe wird zurückgenommen", async () => {
    useApp.mockReturnValue(chefCtx(entry({ freigegeben: true })));
    render(<SteView />);
    openEdit();
    await save(/Aktualisieren/);
    expect(std.update).not.toHaveBeenCalled();
    expect(screen.getByText("Freigegebenen Eintrag ändern?")).toBeInTheDocument();
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Ändern" })); });
    expect(std.update).toHaveBeenCalledTimes(1);
    // Freigabe wird im SELBEN Schreibvorgang zurückgenommen
    expect(std.update.mock.calls[0][2]).toEqual({ resetFreigabe: true });
    expect(std.setFreigabe).not.toHaveBeenCalled();
  });

  it("nicht freigegebener Eintrag: keine Rückfrage, Freigabe unberührt", async () => {
    useApp.mockReturnValue(chefCtx(entry()));
    render(<SteView />);
    openEdit();
    await save(/Aktualisieren/);
    expect(std.update).toHaveBeenCalledTimes(1);
    expect(std.update.mock.calls[0][2]).toEqual({ resetFreigabe: false });
    expect(std.setFreigabe).not.toHaveBeenCalled();
  });

  it("alter Eintrag mit Pause 20: nur die Tätigkeit ändern lässt die Pause bei 20", async () => {
    useApp.mockReturnValue(chefCtx(entry({ pause: 20 })));
    render(<SteView />);
    openEdit();
    fireEvent.change(screen.getByDisplayValue("Putz"), { target: { value: "Putz innen" } });
    await save(/Aktualisieren/);
    expect(std.update.mock.calls[0][1]).toMatchObject({ pause: 20, arbeit: "Putz innen" });
  });

  it("…auch wenn das Pause-Feld nur angetippt und wieder verlassen wird", async () => {
    useApp.mockReturnValue(chefCtx(entry({ pause: 20 })));
    const { container } = render(<SteView />);
    openEdit();
    const pause = container.querySelector('input[step="15"]');
    fireEvent.focus(pause);
    fireEvent.blur(pause);
    expect(pause.value).toBe("20");
    await save(/Aktualisieren/);
    expect(std.update.mock.calls[0][1]).toMatchObject({ pause: 20 });
  });

  it("…wird die Pause geändert, rastet sie auf 15 Minuten ein", async () => {
    useApp.mockReturnValue(chefCtx(entry({ pause: 20 })));
    const { container } = render(<SteView />);
    openEdit();
    fireEvent.change(container.querySelector('input[step="15"]'), { target: { value: "25" } });
    await save(/Aktualisieren/);
    expect(std.update.mock.calls[0][1]).toMatchObject({ pause: 30 });
  });

  it("Netzfehler beim BEARBEITEN wird nicht als neuer Eintrag in die Warteschlange gelegt", async () => {
    std.update.mockRejectedValue(new TypeError("Failed to fetch"));
    useApp.mockReturnValue(chefCtx(entry()));
    render(<SteView />);
    openEdit();
    await save(/Aktualisieren/);
    expect(getPending()).toHaveLength(0);
    expect(show.mock.calls[0][0]).toMatch(/Nicht gespeichert: Keine Verbindung/);
  });
});
