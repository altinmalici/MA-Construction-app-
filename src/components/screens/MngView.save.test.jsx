import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup, act } from "@testing-library/react";

vi.mock("../../context/AppContext", () => ({ useApp: vi.fn() }));
vi.mock("../../lib/storage", () => ({ uploadPhotos: vi.fn(), cleanupPhotos: vi.fn(), getPhotoUrls: vi.fn().mockResolvedValue({}) }));
import { useApp } from "../../context/AppContext";
import { uploadPhotos, cleanupPhotos } from "../../lib/storage";
import MngView from "./MngView.jsx";

const B1 = { id: "b1", kunde: "Huber", mitarbeiter: ["u1"] };
let maengel, show, addN, reload, photoCb;

const mount = () => {
  useApp.mockReturnValue({
    sb: B1, chef: true, cu: { id: "c1", role: "chef" },
    data: { baustellen: [B1], maengel: [], users: [], subunternehmer: [] },
    actions: { maengel, reload },
    show, goBack: vi.fn(), addN, setSb: vi.fn(), nav: vi.fn(),
    trigPhoto: (cb) => { photoCb = cb; },
  });
  render(<MngView />);
  fireEvent.click(screen.getByRole("button", { name: "Mangel erfassen" }));
};
const titel = (t) => fireEvent.change(screen.getByPlaceholderText(/Titel/), { target: { value: t } });
const save = async () => {
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Erfassen" })); });
};
const addPhoto = () => {
  fireEvent.click(screen.getByRole("button", { name: /Foto/ }));
  act(() => photoCb({ blob: { size: 1234 }, previewDataUrl: "data:image/jpeg;base64,AAA" }));
};

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  uploadPhotos.mockReset();
  uploadPhotos.mockResolvedValue(["b1/maengel/x/p1.jpg"]);
  cleanupPhotos.mockReset();
  show = vi.fn(); addN = vi.fn();
  reload = vi.fn().mockResolvedValue();
  maengel = { create: vi.fn().mockResolvedValue("id"), remove: vi.fn(), updateStatus: vi.fn() };
  useApp.mockReset();
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("MngView – Mangel speichern mit Fotos", () => {
  it("Erfolg: Fotos werden hochgeladen und am Mangel gespeichert", async () => {
    mount(); titel("Riss"); addPhoto();
    await save();
    expect(uploadPhotos).toHaveBeenCalledTimes(1);
    expect(maengel.create.mock.calls[0][0]).toMatchObject({ titel: "Riss", baustelleId: "b1", fotos: ["b1/maengel/x/p1.jpg"] });
    expect(cleanupPhotos).not.toHaveBeenCalled();
    expect(show).toHaveBeenCalledWith("Erfasst");
  });

  it("Server lehnt eindeutig ab → hochgeladene Fotos werden wieder entfernt", async () => {
    maengel.create.mockRejectedValue({ code: "42501", message: "rls" });
    mount(); titel("Riss"); addPhoto();
    await save();
    expect(cleanupPhotos).toHaveBeenCalledWith(["b1/maengel/x/p1.jpg"]);
    expect(show.mock.calls[0][1]).toBe("error");
  });

  it("Netzfehler (unklar, ob gespeichert) → Fotos bleiben; zweiter Versuch nutzt dieselbe ID und dieselben Fotos ohne neuen Upload", async () => {
    maengel.create.mockRejectedValueOnce(new TypeError("Failed to fetch")).mockRejectedValueOnce({ code: "23505", message: "duplicate key" });
    mount(); titel("Riss"); addPhoto();
    await save();
    expect(cleanupPhotos).not.toHaveBeenCalled();
    await save();
    expect(uploadPhotos).toHaveBeenCalledTimes(1);
    const [a, b] = maengel.create.mock.calls.map((c) => c[0]);
    expect(b.id).toBe(a.id);
    expect(b.fotos).toEqual(a.fotos);
    // Duplikat = der erste Versuch kam an → Erfolg, Fotos NICHT löschen, Liste nachladen
    expect(cleanupPhotos).not.toHaveBeenCalled();
    expect(show).toHaveBeenLastCalledWith("Erfasst");
    expect(reload).toHaveBeenCalledWith("maengel");
  });

  it("nach einem Fehler geänderter Inhalt ist ein NEUER Mangel (neue ID) – er geht nicht als 'Duplikat' verloren", async () => {
    maengel.create.mockRejectedValueOnce(new TypeError("Failed to fetch")).mockResolvedValue("id");
    mount(); titel("Riss Wand");
    await save();
    titel("Wasserfleck Decke");
    await save();
    const [a, b] = maengel.create.mock.calls.map((c) => c[0]);
    expect(b.id).not.toBe(a.id);
    expect(b.titel).toBe("Wasserfleck Decke");
  });
});
