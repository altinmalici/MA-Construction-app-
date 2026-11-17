import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent, act } from "@testing-library/react";

vi.mock("../../context/AppContext", () => ({ useApp: vi.fn() }));
vi.mock("../../lib/api/dokumente", () => ({ getDocumentUrl: vi.fn() }));
import { useApp } from "../../context/AppContext";
import * as dokumenteApi from "../../lib/api/dokumente";
import DokView from "./DokView.jsx";

const B1 = { id: "b1", kunde: "Huber" };
const DOK = { id: "d1", baustelleId: "b1", name: "Plan.pdf", typ: "dokument", groesse: "1 MB", datum: "2026-11-16", storagePath: "b1/d1-Plan.pdf" };
let show;

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  show = vi.fn();
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
  it("holt eine signierte Adresse und öffnet sie über einen Link ohne Zugriff auf das App-Fenster (noopener)", async () => {
    dokumenteApi.getDocumentUrl.mockResolvedValue("https://signed/url");
    let link = null;
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function () { link = this; });
    render(<DokView />);
    await tapDownload();
    expect(dokumenteApi.getDocumentUrl).toHaveBeenCalledWith("b1/d1-Plan.pdf", 60);
    expect(click).toHaveBeenCalledTimes(1);
    expect(link.href).toBe("https://signed/url");
    expect(link.rel).toBe("noopener noreferrer");
    expect(show).not.toHaveBeenCalledWith(expect.anything(), "error");
  });

  it("Adresse lässt sich nicht holen → deutsche Fehlermeldung statt Rohtext", async () => {
    dokumenteApi.getDocumentUrl.mockRejectedValue(new TypeError("Failed to fetch"));
    render(<DokView />);
    await tapDownload();
    expect(show).toHaveBeenCalledWith("Download fehlgeschlagen: Keine Verbindung – bitte erneut versuchen.", "error");
  });
});
