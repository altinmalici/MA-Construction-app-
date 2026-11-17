import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent, act } from "@testing-library/react";

vi.mock("../../context/AppContext", () => ({ useApp: vi.fn() }));
vi.mock("../../utils/lohnexport", async (orig) => ({ ...(await orig()), downloadCsv: vi.fn() }));
import { useApp } from "../../context/AppContext";
import { downloadCsv } from "../../utils/lohnexport";
import StundenUebersicht from "./StundenUebersicht.jsx";

const NOW = new Date(2026, 10, 17, 12, 0); // 17.11.2026
const e = (id, over = {}) => ({
  id, baustelleId: "b1", datum: "2026-11-10", beginn: "07:00", ende: "15:15", pause: 30, fahrtzeit: 0,
  arbeit: "Putz", personTyp: "mitarbeiter", mitarbeiterId: "u1", freigegeben: false, fotos: [], ...over,
});
let std, show;
const mount = (eintraege, users = [{ id: "u1", name: "Max Muster", role: "mitarbeiter", stundensatz: 40 }]) => {
  useApp.mockReturnValue({
    chef: true, cu: { id: "c1", name: "Chef", role: "chef", stundensatz: 0 }, show, goBack: vi.fn(),
    actions: { stundeneintraege: std },
    data: { users, baustellen: [{ id: "b1", kunde: "Huber" }], stundeneintraege: eintraege, subunternehmer: [] },
  });
  render(<StundenUebersicht />);
};

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
  show = vi.fn();
  std = { setFreigabe: vi.fn().mockResolvedValue() };
  downloadCsv.mockReset();
});
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe("StundenUebersicht – Summen", () => {
  it("rechnet in Viertelstunden: 2 × 7,75 h = 15,5 h", () => {
    mount([e("1"), e("2", { datum: "2026-11-11" })]);
    expect(screen.getAllByText(/15,5h/).length).toBeGreaterThan(0);
  });

  it("Einträge anderer Monate und Subunternehmer zählen nicht", () => {
    mount([e("1"), e("2", { datum: "2026-10-31" }), e("3", { personTyp: "sub", mitarbeiterId: null, subId: "s1" })]);
    expect(screen.getAllByText(/7,75h/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/15,5h/)).toBeNull();
  });

  it("Stunden eines unbekannten/ehemaligen Nutzers erscheinen in einer eigenen Gruppe (wie im Lohnexport)", () => {
    mount([e("1"), e("2", { mitarbeiterId: "weg" })]);
    expect(screen.getByText("Unbekannt / ehemalig")).toBeInTheDocument();
    expect(screen.getAllByText(/15,5h/).length).toBeGreaterThan(0);
  });

  it("nur auf dem Gerät wartende Einträge (_pending) zählen nicht mit", () => {
    mount([e("1"), e("2", { _pending: "wartet" })]);
    expect(screen.getAllByText(/7,75h/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/15,5h/)).toBeNull();
  });
});

describe("StundenUebersicht – Fahrtzeit", () => {
  it("eingetragene Fahrtzeit zählt zu den Stunden: 7,75 h + 30 min = 8,25 h", () => {
    mount([e("1", { datum: "2026-11-20", fahrtzeit: 30 })]);
    expect(screen.getAllByText(/8,25h/).length).toBeGreaterThan(0);
  });

  it("alter Eintrag (vor dem Stichtag) mit vorbelegten 30 Minuten: unverändert 7,75 h", () => {
    mount([e("1", { fahrtzeit: 30 })]);
    expect(screen.getAllByText(/7,75h/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/8,25h/)).toBeNull();
  });

  it("die Zeile nennt die Fahrtzeit, damit die Summe nachvollziehbar ist", () => {
    mount([e("1", { datum: "2026-11-20", fahrtzeit: 30 })]);
    fireEvent.click(screen.getByText("Max Muster"));
    expect(screen.getByText(/\+ 0,5 h Fahrt/)).toBeInTheDocument();
  });

  it("Bildschirm und Lohnexport stimmen überein", () => {
    mount([e("1", { datum: "2026-11-20", fahrtzeit: 30 })]);
    fireEvent.click(screen.getByRole("button", { name: /Lohnexport November 2026/ }));
    const csv = downloadCsv.mock.calls[0][1];
    expect(csv).toContain("7,75;0,50;8,25;40,00;330,00");
    expect(csv).toContain("GESAMT;7,75;0,50;8,25;;330,00");
  });
});

describe("StundenUebersicht – Freigabe", () => {
  it("gibt genau die Einträge dieses Mitarbeiters in diesem Monat frei", async () => {
    mount([e("1"), e("2", { datum: "2026-11-11" }), e("3", { datum: "2026-10-31" }), e("4", { mitarbeiterId: "u2" })], [
      { id: "u1", name: "Max Muster", role: "mitarbeiter", stundensatz: 40 },
      { id: "u2", name: "Nora Neu", role: "mitarbeiter", stundensatz: 40 },
    ]);
    fireEvent.click(screen.getByText("Max Muster"));
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Monat als abgerechnet freigeben" })); });
    expect(std.setFreigabe).toHaveBeenCalledWith(["1", "2"], true);
    expect(show).toHaveBeenCalledWith("Monat freigegeben");
  });

  it("bereits freigegeben → der Knopf hebt die Freigabe auf", async () => {
    mount([e("1", { freigegeben: true })]);
    fireEvent.click(screen.getByText("Max Muster"));
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: /Freigabe aufheben/ })); });
    expect(std.setFreigabe).toHaveBeenCalledWith(["1"], false);
  });

  it("teilweise freigegeben gilt als NICHT freigegeben", () => {
    mount([e("1", { freigegeben: true }), e("2", { datum: "2026-11-11" })]);
    fireEvent.click(screen.getByText("Max Muster"));
    expect(screen.getByRole("button", { name: "Monat als abgerechnet freigeben" })).toBeInTheDocument();
  });

  it("Fehler beim Freigeben → deutsche Meldung", async () => {
    std.setFreigabe.mockRejectedValue({ code: "42501", message: "rls" });
    mount([e("1")]);
    fireEvent.click(screen.getByText("Max Muster"));
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Monat als abgerechnet freigeben" })); });
    expect(show).toHaveBeenCalledWith("Freigabe nicht gespeichert: Keine Berechtigung für diese Aktion.", "error");
  });
});

describe("StundenUebersicht – Lohnexport", () => {
  it("exportiert die Einträge des Monats mit denselben Stunden wie auf dem Bildschirm", () => {
    mount([e("1"), e("2", { datum: "2026-10-31" }), e("3", { _pending: "wartet" })]);
    fireEvent.click(screen.getByRole("button", { name: /Lohnexport November 2026/ }));
    expect(downloadCsv).toHaveBeenCalledTimes(1);
    const [name, csv] = downloadCsv.mock.calls[0];
    expect(name).toBe("Lohnexport_2026-11.csv");
    expect(csv).toContain("Max Muster;10.11.2026;Huber;Putz;07:00;15:15;30;0;7,75;0,00;7,75;40,00;310,00;Nein");
    expect(csv).not.toContain("31.10.2026");
    expect(csv.match(/10\.11\.2026/g)).toHaveLength(1); // der wartende Eintrag ist nicht dabei
    expect(csv).toContain("GESAMT;7,75;0,00;7,75;;310,00");
  });

  it("ohne Einträge ist der Export-Knopf deaktiviert", () => {
    mount([]);
    expect(screen.getByRole("button", { name: /Lohnexport/ })).toBeDisabled();
  });
});
