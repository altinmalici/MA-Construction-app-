import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, act, fireEvent } from "@testing-library/react";

vi.mock("../../lib/storage", () => ({ getPhotoUrls: vi.fn() }));
import { getPhotoUrls } from "../../lib/storage";
import PhotoGrid from "./PhotoGrid.jsx";

const flush = () => act(async () => { await Promise.resolve(); await Promise.resolve(); });

beforeEach(() => {
  getPhotoUrls.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("PhotoGrid", () => {
  it("zeigt Storage-Fotos, sobald die URLs da sind", async () => {
    getPhotoUrls.mockResolvedValue({ "b1/a.jpg": "https://x/a" });
    render(<PhotoGrid fotos={["b1/a.jpg"]} />);
    await flush();
    expect(screen.getByAltText("Foto 1").getAttribute("src")).toBe("https://x/a");
  });

  it("Signieren scheitert (kein Netz) → 'nicht ladbar' statt endlosem Spinner", async () => {
    getPhotoUrls.mockRejectedValue(new TypeError("Failed to fetch"));
    render(<PhotoGrid fotos={["b1/a.jpg", "b1/b.jpg"]} />);
    await flush();
    expect(screen.getAllByRole("img", { name: /nicht ladbar/ })).toHaveLength(2);
  });

  it("ein einzelnes Foto fehlt im Ergebnis (Datei gelöscht) → nur dieses ist 'nicht ladbar'", async () => {
    getPhotoUrls.mockResolvedValue({ "b1/a.jpg": "https://x/a" });
    render(<PhotoGrid fotos={["b1/a.jpg", "b1/weg.jpg"]} />);
    await flush();
    expect(screen.getByAltText("Foto 1")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Foto 2 nicht ladbar" })).toBeInTheDocument();
  });

  it("Empfang kommt zurück → es wird erneut versucht und das Foto erscheint", async () => {
    getPhotoUrls.mockRejectedValueOnce(new TypeError("Failed to fetch")).mockResolvedValue({ "b1/a.jpg": "https://x/a" });
    render(<PhotoGrid fotos={["b1/a.jpg"]} />);
    await flush();
    expect(screen.getByRole("img", { name: /nicht ladbar/ })).toBeInTheDocument();
    act(() => { window.dispatchEvent(new Event("online")); });
    await flush();
    expect(screen.getByAltText("Foto 1").getAttribute("src")).toBe("https://x/a");
  });

  it("Fehler beim Nachladen eines neuen Fotos lässt bereits gezeigte Fotos stehen", async () => {
    getPhotoUrls.mockResolvedValueOnce({ "b1/a.jpg": "https://x/a" }).mockRejectedValue(new TypeError("Failed to fetch"));
    const { rerender } = render(<PhotoGrid fotos={["b1/a.jpg"]} />);
    await flush();
    rerender(<PhotoGrid fotos={["b1/a.jpg", "b1/neu.jpg"]} />);
    await flush();
    expect(screen.getByAltText("Foto 1")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Foto 2 nicht ladbar" })).toBeInTheDocument();
  });

  it("neues Array mit denselben Pfaden (Nachladen der Daten) signiert nicht erneut", async () => {
    getPhotoUrls.mockResolvedValue({ "b1/a.jpg": "https://x/a" });
    const { rerender } = render(<PhotoGrid fotos={["b1/a.jpg"]} />);
    await flush();
    rerender(<PhotoGrid fotos={["b1/a.jpg"]} />);
    await flush();
    expect(getPhotoUrls).toHaveBeenCalledTimes(1);
  });

  it("Tipp auf ein Foto erreicht die umgebende Karte nicht", async () => {
    getPhotoUrls.mockResolvedValue({ "b1/a.jpg": "https://x/a" });
    const onCard = vi.fn();
    render(<div onClick={onCard}><PhotoGrid fotos={["b1/a.jpg"]} /></div>);
    await flush();
    fireEvent.click(screen.getByAltText("Foto 1"));
    expect(onCard).not.toHaveBeenCalled();
  });

  it("lokal gewählte Fotos (noch nicht hochgeladen) werden sofort angezeigt", () => {
    render(<PhotoGrid fotos={[{ blob: {}, previewDataUrl: "data:image/jpeg;base64,AAA" }]} />);
    expect(screen.getByAltText("Foto 1").getAttribute("src")).toMatch(/^data:image/);
    expect(getPhotoUrls).not.toHaveBeenCalled();
  });
});
