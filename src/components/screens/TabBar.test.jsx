import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";

vi.mock("../../context/AppContext", () => ({ useApp: vi.fn() }));
import { useApp } from "../../context/AppContext";
import TabBar from "./TabBar.jsx";

let ctx;
beforeEach(() => {
  ctx = {
    v: "bsd", chef: true, setHistory: vi.fn(), setVRaw: vi.fn(), setSb: vi.fn(),
    tryLeave: vi.fn((fn) => fn()),
  };
  useApp.mockReturnValue(ctx);
});
afterEach(() => cleanup());

describe("TabBar", () => {
  it("Tab-Wechsel setzt die zuletzt geöffnete Baustelle zurück", () => {
    render(<TabBar />);
    fireEvent.click(screen.getByRole("button", { name: "Kalender" }));
    expect(ctx.setSb).toHaveBeenCalledWith(null);
    expect(ctx.setHistory).toHaveBeenCalledWith([]);
    expect(ctx.setVRaw).toHaveBeenCalledWith("kal");
  });

  it("Ausnahme Stunden: die Baustelle bleibt als Vorauswahl", () => {
    render(<TabBar />);
    fireEvent.click(screen.getByRole("button", { name: "Stunden" }));
    expect(ctx.setSb).not.toHaveBeenCalled();
    expect(ctx.setVRaw).toHaveBeenCalledWith("ste");
  });

  it("läuft über tryLeave: bei ungespeichertem Formular passiert ohne Bestätigung nichts", () => {
    ctx.tryLeave = vi.fn(); // Nachfrage offen, Aktion (noch) nicht ausgeführt
    useApp.mockReturnValue(ctx);
    render(<TabBar />);
    fireEvent.click(screen.getByRole("button", { name: "Kalender" }));
    expect(ctx.tryLeave).toHaveBeenCalledTimes(1);
    expect(ctx.setVRaw).not.toHaveBeenCalled();
    expect(ctx.setSb).not.toHaveBeenCalled();
  });
});
