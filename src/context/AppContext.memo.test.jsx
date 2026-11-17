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
