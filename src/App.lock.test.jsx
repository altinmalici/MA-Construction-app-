import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, act } from "@testing-library/react";

// Durchlauf-Test über App + AppContext: Login → Sperre → Entsperren.
// Die Datenschicht ist gemockt; geprüft wird das Zusammenspiel.
const MAX = { id: "u1", name: "Max Muster", username: "m.muster", role: "mitarbeiter", isOnboarded: true };
const CHEF = { id: "c1", name: "Altin Malici", username: "a.malici", role: "chef", isOnboarded: true };
const B1 = { id: "b1", kunde: "Huber", adresse: "", status: "aktiv", fortschritt: 0, mitarbeiter: ["u1"], subunternehmer: [], details: {} };

const h = vi.hoisted(() => ({ authCb: null, loginAsUser: null, signOut: null, getAll: {} }));

vi.mock("./lib/api/index.js", () => {
  const list = (name) => ({ getAll: (...a) => h.getAll[name](...a) });
  return {
    auth: {
      getCurrentUser: () => Promise.resolve(null),
      onAuthStateChange: (cb) => {
        h.authCb = cb;
        return { data: { subscription: { unsubscribe() {} } } };
      },
      loginAsUser: (...a) => h.loginAsUser(...a),
      signOut: (...a) => h.signOut(...a),
    },
    users: list("users"),
    subunternehmer: list("subunternehmer"),
    baustellen: list("baustellen"),
    stundeneintraege: list("stundeneintraege"),
    kalender: list("kalender"),
    maengel: list("maengel"),
    bautagebuch: list("bautagebuch"),
    dokumente: list("dokumente"),
    benachrichtigungen: list("benachrichtigungen"),
    kosten: list("kosten"),
  };
});
vi.mock("./lib/useRealtime.js", () => ({ useRealtime: () => {} }));

import App from "./App.jsx";
import { BACKGROUND_LOCK_MS } from "./config.js";

const TABLES = ["users", "subunternehmer", "baustellen", "stundeneintraege", "kalender", "maengel", "bautagebuch", "dokumente", "benachrichtigungen", "kosten"];
let hidden;

const tick = (ms = 0) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });
const typePin = async (pin) => {
  for (const d of pin) fireEvent.click(screen.getByRole("button", { name: d }));
  await tick(300);
};
const background = async (ms) => {
  hidden = true;
  act(() => document.dispatchEvent(new Event("visibilitychange")));
  vi.setSystemTime(Date.now() + ms);
  hidden = false;
  act(() => document.dispatchEvent(new Event("visibilitychange")));
  await tick();
};
const lockDialog = () => screen.queryByRole("dialog", { name: "App gesperrt" });

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  hidden = false;
  vi.spyOn(document, "hidden", "get").mockImplementation(() => hidden);
  TABLES.forEach((t) => { h.getAll[t] = vi.fn().mockResolvedValue([]); });
  h.getAll.users.mockResolvedValue([MAX, CHEF]);
  h.getAll.baustellen.mockResolvedValue([B1]);
  h.loginAsUser = vi.fn().mockResolvedValue(MAX);
  h.signOut = vi.fn().mockImplementation(async () => { h.authCb?.("SIGNED_OUT"); });
  localStorage.setItem("ma_construction_last_user", JSON.stringify({ name: MAX.name, username: MAX.username }));
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const loginAndOpenProfil = async () => {
  render(<App />);
  await tick();
  expect(screen.getByText("Willkommen zurück")).toBeInTheDocument();
  await typePin("1234");
  await tick();
  // Tab "Profil" öffnen und in den Bearbeiten-Modus → Formular mit Eingabe
  fireEvent.click(screen.getByRole("button", { name: "Profil" }));
  // ProfilView ist ein Lazy-Chunk: Import abwarten.
  await act(async () => { await vi.dynamicImportSettled(); });
  await tick();
  fireEvent.click(screen.getByRole("button", { name: /Bearbeiten/ }));
  const name = screen.getByDisplayValue("Max Muster");
  fireEvent.change(name, { target: { value: "Max Mustermann" } });
};

describe("Auto-Lock als Overlay", () => {
  it("vor dem Login wird nichts geladen; nach dem Login genau einmal", async () => {
    render(<App />);
    await tick();
    expect(h.getAll.baustellen).not.toHaveBeenCalled();
    await typePin("1234");
    await tick();
    expect(h.getAll.baustellen).toHaveBeenCalledTimes(1);
  });

  it("120 s Hintergrund → PIN-Abfrage liegt ÜBER dem Screen, Eingaben bleiben", async () => {
    await loginAndOpenProfil();
    expect(lockDialog()).toBeNull();
    await background(BACKGROUND_LOCK_MS);
    expect(lockDialog()).not.toBeNull();
    // Formular ist noch da (nicht entfernt) und trägt die Eingabe
    expect(screen.getByDisplayValue("Max Mustermann")).toBeInTheDocument();
    // TabBar ist weg, solange gesperrt
    expect(screen.queryByRole("button", { name: "Profil" })).toBeNull();
  });

  it("richtiger PIN entsperrt: gleicher Screen, Eingabe erhalten, keine erneute Sperre", async () => {
    await loginAndOpenProfil();
    await background(BACKGROUND_LOCK_MS);
    await typePin("1234");
    await tick();
    expect(h.loginAsUser).toHaveBeenLastCalledWith("m.muster", "1234");
    expect(lockDialog()).toBeNull();
    expect(screen.getByDisplayValue("Max Mustermann")).toBeInTheDocument();
    // weiterarbeiten (Eingaben) → bleibt entsperrt
    for (let i = 0; i < 6; i++) {
      fireEvent.pointerDown(window);
      await tick(5000);
    }
    expect(lockDialog()).toBeNull();
  });

  it("falscher PIN entsperrt nicht", async () => {
    await loginAndOpenProfil();
    await background(BACKGROUND_LOCK_MS);
    h.loginAsUser.mockResolvedValue(null);
    await typePin("0000");
    expect(lockDialog()).not.toBeNull();
  });

  it("kurzer Hintergrund (60 s) sperrt nicht", async () => {
    await loginAndOpenProfil();
    await background(60 * 1000);
    expect(lockDialog()).toBeNull();
  });

  it('gesperrt + "Nicht Max?" → abgemeldet, Daten verworfen, Login mit Benutzername', async () => {
    await loginAndOpenProfil();
    await background(BACKGROUND_LOCK_MS);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Nicht Max?" }));
    });
    await tick();
    expect(h.signOut).toHaveBeenCalled();
    expect(lockDialog()).toBeNull();
    expect(screen.queryByDisplayValue("Max Mustermann")).toBeNull();
    expect(screen.getByLabelText("Benutzername")).toBeInTheDocument();
    // anderer Nutzer meldet sich an → Dashboard, frische Daten
    h.loginAsUser.mockResolvedValue(CHEF);
    fireEvent.change(screen.getByLabelText("Benutzername"), { target: { value: "a.malici" } });
    await typePin("1998");
    await tick();
    expect(h.loginAsUser).toHaveBeenLastCalledWith("a.malici", "1998");
    expect(h.getAll.baustellen).toHaveBeenCalledTimes(2);
    expect(screen.queryByDisplayValue("Max Mustermann")).toBeNull();
  });
});
