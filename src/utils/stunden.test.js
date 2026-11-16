import { describe, it, expect } from "vitest";
import { pruefeStunde, baueEintrag, snapPause } from "./stunden.js";

const ok = {
  baustelleId: "b1", personTyp: "mitarbeiter", mitarbeiterId: "u1",
  datum: "2026-11-16", beginn: "07:00", ende: "15:30", pause: 30,
};

describe("pruefeStunde (Audit D-15)", () => {
  it("gültiger Eintrag", () => {
    expect(pruefeStunde(ok)).toEqual({ fehler: null, stunden: 8, lang: false });
  });
  it("leeres Datum (iOS-Datumswähler geleert)", () => {
    expect(pruefeStunde({ ...ok, datum: "" }).fehler).toBe("Datum wählen");
  });
  it("Beginn = Ende", () => {
    expect(pruefeStunde({ ...ok, ende: "07:00" }).fehler).toMatch(/gleich/);
  });
  it("Pause frisst die ganze Schicht", () => {
    expect(pruefeStunde({ ...ok, ende: "08:00", pause: 90 }).fehler).toMatch(/Arbeitszeit ist 0/);
  });
  it("geprüft wird mit der Pause, die auch gespeichert wird (15-Minuten-Raster)", () => {
    // 07:00–07:20 mit Pause 8: gespeichert wird Pause 15 → 5 Minuten → 0 h
    expect(pruefeStunde({ ...ok, ende: "07:20", pause: 8 }).fehler).toMatch(/Arbeitszeit ist 0/);
  });
  it("vertauschte Zeiten (16:00–07:00 = 15 h) → Rückfrage statt stillem Speichern", () => {
    const r = pruefeStunde({ ...ok, beginn: "16:00", ende: "07:00", pause: 0 });
    expect(r.fehler).toBeNull();
    expect(r.stunden).toBe(15);
    expect(r.lang).toBe(true);
  });
  it("echte Nachtschicht bis 12 h braucht keine Rückfrage", () => {
    expect(pruefeStunde({ ...ok, beginn: "22:00", ende: "06:00", pause: 30 }).lang).toBe(false);
  });
  it("Pflichtfelder je Personentyp", () => {
    expect(pruefeStunde({ ...ok, baustelleId: "" }).fehler).toBe("Baustelle wählen");
    expect(pruefeStunde({ ...ok, mitarbeiterId: "" }).fehler).toBe("Mitarbeiter wählen");
    expect(pruefeStunde({ ...ok, personTyp: "sub", subId: "" }).fehler).toBe("Subunternehmer wählen");
    expect(pruefeStunde({ ...ok, personTyp: "sonstige", personName: "  " }).fehler).toBe("Name eingeben");
  });
});

describe("snapPause / baueEintrag (15-Minuten-Raster)", () => {
  it("rundet die Pause auf Viertelstunden", () => {
    expect(snapPause(20)).toBe(15);
    expect(snapPause(23)).toBe(30);
    expect(snapPause("40")).toBe(45);
    expect(snapPause("")).toBe(0);
    expect(snapPause(-5)).toBe(0);
    expect(snapPause("abc")).toBe(0);
  });
  it("baut den Eintrag je Personentyp und übernimmt die feste ID", () => {
    const e = baueEintrag({ ...ok, pause: 20, subId: "s1", personName: "X" }, { id: "fix", fotos: ["p"] });
    expect(e).toMatchObject({ id: "fix", fotos: ["p"], pause: 15, mitarbeiterId: "u1", subId: null, personName: "" });
    const s = baueEintrag({ ...ok, personTyp: "sonstige", personName: " Hans " }, { id: "x", fotos: [] });
    expect(s).toMatchObject({ mitarbeiterId: null, subId: null, personName: "Hans" });
  });
});
