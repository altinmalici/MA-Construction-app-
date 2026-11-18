import { describe, it, expect } from "vitest";
import { fehlerText, istNetzFehler } from "./errors.js";

describe("fehlerText", () => {
  it("RLS-Ablehnung → Berechtigungs-Meldung (über Code und über Text)", () => {
    expect(fehlerText({ code: "42501", message: "x" })).toMatch(/Keine Berechtigung/);
    expect(
      fehlerText({ message: 'new row violates row-level security policy for table "bautagebuch"' }),
    ).toMatch(/Keine Berechtigung/);
  });

  it("Fremdschlüssel, Duplikat, ungültiges Datum", () => {
    expect(fehlerText({ code: "23503" })).toMatch(/existiert nicht mehr/);
    expect(fehlerText({ code: "23505" })).toMatch(/existiert bereits/);
    expect(fehlerText({ code: "22007", message: 'invalid input syntax for type date: ""' })).toMatch(/Datum/);
  });

  it("Netzfehler → Verbindungs-Meldung", () => {
    expect(fehlerText(new TypeError("Failed to fetch"))).toMatch(/Keine Verbindung/);
    expect(fehlerText({ message: "TypeError: Load failed" })).toMatch(/Keine Verbindung/);
    expect(fehlerText(new DOMException("Aborted", "AbortError"))).toMatch(/Keine Verbindung/);
  });

  it("Programmierfehler (TypeError ohne fetch-Text) gilt NICHT als Netzfehler", () => {
    const bug = new TypeError("Cannot read properties of undefined (reading 'id')");
    expect(istNetzFehler(bug)).toBe(false);
    expect(fehlerText(bug, "Fehler")).toBe("Fehler");
  });

  it("eigene deutsche RPC-Meldungen werden durchgereicht", () => {
    expect(fehlerText({ message: "PIN bereits vergeben" })).toBe("PIN bereits vergeben");
    expect(fehlerText({ message: "Nur der Chef darf Nutzer anlegen" })).toBe("Nur der Chef darf Nutzer anlegen");
  });

  it("unbekannte (englische) Rohtexte landen NICHT beim Nutzer", () => {
    expect(fehlerText({ message: "column foo does not exist" }, "Fehler beim Speichern")).toBe("Fehler beim Speichern");
    expect(fehlerText(null, "X")).toBe("X");
  });
});

describe("istNetzFehler", () => {
  it("erkennt fetch-Fehler, aber keine Postgres-Fehler", () => {
    expect(istNetzFehler(new TypeError("Failed to fetch"))).toBe(true);
    expect(istNetzFehler({ code: "42501", message: "permission denied" })).toBe(false);
    expect(istNetzFehler(null)).toBe(false);
  });
});

describe("fehlerText – Meldungen der Onboarding-RPCs", () => {
  it("ASCII-Texte vom Server werden zu ordentlichem Deutsch mit Handlungsanweisung", () => {
    expect(fehlerText({ message: 'Einladung nicht moeglich: Konto ist nicht bereit – bitte zuerst "Zugang reparieren"' }))
      .toMatch(/Konto ist nicht bereit.*Zugang reparieren/);
    expect(fehlerText({ message: "Einladung ungueltig oder abgelaufen" })).toBe("Einladung ungültig oder abgelaufen.");
    expect(fehlerText({ message: "Einladung nicht moeglich: Mitarbeiter ist deaktiviert" })).toMatch(/deaktiviert/);
    // verwaistes Konto → Bereinigen hilft; echter anderer Mitarbeiter → nicht
    expect(fehlerText({ message: "Die Anmelde-Adresse gehoert bereits einem anderen Konto – bitte zuerst verwaiste Konten bereinigen" })).toMatch(/Verwaiste Konten bereinigen/);
    expect(fehlerText({ message: "Die Anmelde-Adresse gehoert bereits einem anderen Mitarbeiter" })).toBe("Der Benutzername gehört bereits einem anderen Mitarbeiter.");
  });
});

describe("Server-Regel: abgeschlossene Baustelle", () => {
  it("zeigt die Meldung des Servers unverändert", async () => {
    const { fehlerText } = await import("./errors.js");
    expect(fehlerText({ code: "P0001", message: "Baustelle ist abgeschlossen – bitte beim Chef melden." })).toBe("Baustelle ist abgeschlossen – bitte beim Chef melden.");
  });
});

