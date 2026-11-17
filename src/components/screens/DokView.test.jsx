import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent, act } from "@testing-library/react";

vi.mock("../../context/AppContext", () => ({ useApp: vi.fn() }));
vi.mock("../../lib/api/dokumente", () => ({ getDocumentUrl: vi.fn() }));
import { useApp } from "../../context/AppContext";
import * as dokumenteApi from "../../lib/api/dokumente";
import DokView from "./DokView.jsx";

const B1 = { id: "b1", kunde: "Huber" };
const DOK = { id: "d1", baustelleId: "b1", name: "Plan.pdf", typ: "dokument", groesse: "1 MB", datum: "2026-11-16", storagePath: "b1/d1-Plan.pdf" };
let show, win;

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  show = vi.fn();
  win = { closed: false, close: vi.fn(), location: { href: "" } };
  vi.spyOn(window, "open").mockImplementation(() => win);
  useApp.mockReturnValue({
    sb: B1, chef: true, show, goBack: vi.fn(),
    data: { baustellen: [B1], dokumente: [DOK] },
    actions: { dokumente: { createWithFile: vi.fn(), removeWithFile: vi.fn(), remove: vi.fn() } },
  });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

const tapDownload = async () => {
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Herunterladen" })); });
};

describe("DokView – Download", () => {
  it("öffnet das Fenster SOFORT im Tipp (vor dem Warten auf die Adresse) und lädt dann die Datei hinein", async () => {
    let resolveUrl;
    dokumenteApi.getDocumentUrl.mockReturnValue(new Promise((r) => { resolveUrl = r; }));
    render(<DokView />);
    fireEvent.click(screen.getByRole("button", { name: "Herunterladen" }));
    expect(window.open).toHaveBeenCalledWith("", "_blank");
    expect(win.location.href).toBe("");
    await act(async () => { resolveUrl("https://signed/url"); });
    expect(win.location.href).toBe("https://signed/url");
  });

  it("Adresse lässt sich nicht holen → leeres Fenster wird geschlossen, deutsche Fehlermeldung", async () => {
    dokumenteApi.getDocumentUrl.mockRejectedValue(new TypeError("Failed to fetch"));
    render(<DokView />);
    await tapDownload();
    expect(win.close).toHaveBeenCalled();
    expect(show).toHaveBeenCalledWith("Download fehlgeschlagen: Keine Verbindung – bitte erneut versuchen.", "error");
  });

  it("Fenster blockiert → Rückfall auf einen Link-Klick", async () => {
    window.open.mockImplementation(() => null);
    dokumenteApi.getDocumentUrl.mockResolvedValue("https://signed/url");
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    render(<DokView />);
    await tapDownload();
    expect(click).toHaveBeenCalledTimes(1);
    expect(show).not.toHaveBeenCalledWith(expect.anything(), "error");
  });
});
