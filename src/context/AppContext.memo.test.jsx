import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, act } from "@testing-library/react";

// Der Context-Wert darf sich NICHT ändern, wenn nur ein Toast erscheint.
const h = vi.hoisted(() => ({ authCb: null }));
vi.mock("../lib/api/index.js", () => {
  const list = { getAll: async () => [] };
  return {
    auth: {
      getCurrentUser: () => Promise.resolve(null),
      onAuthStateChange: (cb) => { h.authCb = cb; return { data: { subscription: { unsubscribe() {} } } }; },
      signOut: async () => {},
    },
    users: list, subunternehmer: list, baustellen: list, stundeneintraege: list, kalender: list,
    maengel: list, bautagebuch: list, dokumente: list, benachrichtigungen: list, kosten: list,
  };
});
vi.mock("../lib/useRealtime.js", () => ({ useRealtime: () => {} }));

import { AppProvider, useApp } from "./AppContext.jsx";

let renders, api;
// Mess-Sonde: zählt Renders und hält den letzten Context-Wert fest.
const record = (ctx) => {
  api = ctx;
  renders++;
};
const Probe = () => {
  const ctx = useApp();
  record(ctx);
  return <span data-testid="v">{ctx.v}:{ctx.history.join(",")}</span>;
};
const mount = async () => {
  render(<AppProvider><Probe /></AppProvider>);
  await act(async () => { await Promise.resolve(); await Promise.resolve(); });
};

beforeEach(() => { renders = 0; localStorage.clear(); });
afterEach(() => cleanup());

describe("AppContext – Context-Wert ist memoisiert", () => {
  it("ein Toast rendert die Konsumenten nicht neu", async () => {
    await mount();
    const before = renders;
    const ctxBefore = api;
    act(() => { api.show("Hallo"); });
    expect(screen.getByText("Hallo")).toBeInTheDocument();
    expect(renders).toBe(before);
    expect(api).toBe(ctxBefore);
  });

  it("nav/goBack/show/setVRaw bleiben über Renders dieselben Funktionen", async () => {
    await mount();
    const { nav, goBack, show, setVRaw, setHistory } = api;
    act(() => { api.setSq("x"); });
    expect(api.nav).toBe(nav);
    expect(api.goBack).toBe(goBack);
    expect(api.show).toBe(show);
    expect(api.setVRaw).toBe(setVRaw);
    expect(api.setHistory).toBe(setHistory);
  });
});

describe("AppContext – Navigation (ausgeloggt führt jeder View zurück zum Login)", () => {
  it("Verlauf-Operationen arbeiten auf dem aktuellen Stand, auch mehrfach hintereinander", async () => {
    await mount();
    // Mehrere Aufrufe in EINEM Batch: frühere Fassung las v/history aus dem
    // Render und hätte hier veraltete Werte benutzt.
    act(() => {
      api.setHistory(["a", "b"]);
      api.setHistory((hst) => [...hst, "c"]);
    });
    expect(api.history).toEqual(["a", "b", "c"]);
    expect(api.prevV).toBe("c");
    act(() => { api.setHistory([]); });
    expect(api.history).toEqual([]);
  });
});

// Die Nachfrage erscheint nur für einen angemeldeten, nicht gesperrten Nutzer.
const login = () =>
  act(async () => {
    api.completeLogin({ id: "u1", name: "Max", username: "m.muster", role: "mitarbeiter" });
    await Promise.resolve();
  });

describe("AppContext – Schutz vor Verlassen mit ungespeicherten Eingaben", () => {
  it("ohne angemeldetes Formular wird die Aktion sofort ausgeführt", async () => {
    await mount();
    const action = vi.fn();
    act(() => { api.tryLeave(action); });
    expect(action).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Änderungen verwerfen?")).toBeNull();
  });

  it("ungespeicherte Eingaben → Nachfrage; 'Weiter bearbeiten' führt die Aktion NICHT aus", async () => {
    const { fireEvent } = await import("@testing-library/react");
    await mount();
    await login();
    const action = vi.fn();
    act(() => { api.setLeaveGuard(() => true); api.tryLeave(action); });
    expect(screen.getByText("Änderungen verwerfen?")).toBeInTheDocument();
    expect(action).not.toHaveBeenCalled();
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Weiter bearbeiten" })); });
    expect(action).not.toHaveBeenCalled();
    expect(screen.queryByText("Änderungen verwerfen?")).toBeNull();
  });

  it("'Verwerfen' führt die Aktion aus und meldet das Formular ab", async () => {
    const { fireEvent } = await import("@testing-library/react");
    await mount();
    await login();
    const action = vi.fn();
    act(() => { api.setLeaveGuard(() => true); api.tryLeave(action); });
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Verwerfen" })); });
    expect(action).toHaveBeenCalledTimes(1);
    const second = vi.fn();
    act(() => { api.tryLeave(second); });
    expect(second).toHaveBeenCalledTimes(1);
  });

  it("Formular ohne Änderungen (Guard liefert false) → keine Nachfrage", async () => {
    await mount();
    const action = vi.fn();
    act(() => { api.setLeaveGuard(() => false); api.tryLeave(action); });
    expect(action).toHaveBeenCalledTimes(1);
  });

  it("erfolgreicher Login setzt den Fehlversuchs-Zähler des Geräts zurück (auch über den Einladungs-Link)", async () => {
    localStorage.setItem("ma_login_lock_v1", JSON.stringify({ attempts: 2, lockedUntil: null }));
    await mount();
    await act(async () => { api.completeLogin({ id: "u1", name: "Max", username: "m.muster", role: "mitarbeiter" }); });
    expect(localStorage.getItem("ma_login_lock_v1")).toBeNull();
  });

  it("offene Nachfrage verschwindet beim Abmelden und wird nicht später ausgeführt", async () => {
    await mount();
    await login();
    const action = vi.fn();
    act(() => { api.setLeaveGuard(() => true); api.tryLeave(action); });
    expect(screen.getByText("Änderungen verwerfen?")).toBeInTheDocument();
    act(() => { h.authCb("SIGNED_OUT"); });
    expect(screen.queryByText("Änderungen verwerfen?")).toBeNull();
    expect(action).not.toHaveBeenCalled();
  });
});
