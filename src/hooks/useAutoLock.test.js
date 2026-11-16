import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAutoLock, HEARTBEAT_MS } from "./useAutoLock.js";

const BG = 120 * 1000;
const IDLE = 15 * 60 * 1000;

describe("useAutoLock", () => {
  let onLock, hidden;
  beforeEach(() => {
    vi.useFakeTimers();
    onLock = vi.fn();
    hidden = false;
    vi.spyOn(document, "hidden", "get").mockImplementation(() => hidden);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  const setHidden = (h) => {
    hidden = h;
    act(() => document.dispatchEvent(new Event("visibilitychange")));
  };
  const mount = (props = {}) =>
    renderHook((p) => useAutoLock(p), {
      initialProps: { enabled: true, onLock, backgroundMs: BG, inactivityMs: IDLE, ...props },
    });
  // Zeit vergeht, während die App eingefroren ist (Timer laufen NICHT).
  const freeze = (ms) => vi.setSystemTime(Date.now() + ms);
  // Zeit vergeht bei aktiver App und der Nutzer tippt regelmäßig.
  const useApp = (ms) => {
    for (let t = 0; t < ms; t += HEARTBEAT_MS) {
      act(() => {
        window.dispatchEvent(new Event("pointerdown"));
        vi.advanceTimersByTime(HEARTBEAT_MS);
      });
    }
  };

  it("sperrt nach >= 120 s im Hintergrund", () => {
    mount();
    setHidden(true);
    freeze(BG);
    setHidden(false);
    expect(onLock).toHaveBeenCalledTimes(1);
  });

  it("sperrt NICHT nach kurzem Hintergrund (119 s)", () => {
    mount();
    setHidden(true);
    freeze(BG - 1000);
    setHidden(false);
    expect(onLock).not.toHaveBeenCalled();
  });

  it("sperrt nicht bei Nutzung im Vordergrund – egal wie lange", () => {
    mount();
    useApp(IDLE * 2);
    expect(onLock).not.toHaveBeenCalled();
  });

  it("fehlendes 'hidden'-Ereignis: eingefrorene Timer werden am Zeitsprung erkannt", () => {
    mount();
    act(() => vi.advanceTimersByTime(HEARTBEAT_MS)); // normaler Takt
    freeze(BG + 1000); // iOS friert die PWA ein, ohne visibilitychange
    act(() => vi.advanceTimersByTime(HEARTBEAT_MS)); // erster Takt nach dem Aufwachen
    expect(onLock).toHaveBeenCalledTimes(1);
  });

  it("sperrt genau einmal, auch wenn mehrere Auslöser zusammenfallen", () => {
    mount();
    setHidden(true);
    freeze(BG * 3);
    setHidden(false);
    act(() => vi.advanceTimersByTime(HEARTBEAT_MS * 3));
    expect(onLock).toHaveBeenCalledTimes(1);
  });

  it("Inaktivität: sperrt nach 15 min ohne Eingabe", () => {
    mount();
    act(() => vi.advanceTimersByTime(IDLE + HEARTBEAT_MS));
    expect(onLock).toHaveBeenCalledTimes(1);
  });

  it("Inaktivität abschaltbar (inactivityMs = 0)", () => {
    mount({ inactivityMs: 0 });
    act(() => vi.advanceTimersByTime(IDLE * 3));
    expect(onLock).not.toHaveBeenCalled();
  });

  it("enabled=false (ausgeloggt/bereits gesperrt): nichts passiert", () => {
    mount({ enabled: false });
    setHidden(true);
    freeze(BG * 2);
    setHidden(false);
    act(() => vi.advanceTimersByTime(IDLE * 2));
    expect(onLock).not.toHaveBeenCalled();
  });

  it("keine Schleife: nach dem Entsperren beginnt die Zählung neu", () => {
    const { rerender } = mount();
    setHidden(true);
    freeze(BG);
    setHidden(false);
    expect(onLock).toHaveBeenCalledTimes(1);
    const props = { onLock, backgroundMs: BG, inactivityMs: IDLE };
    rerender({ ...props, enabled: false }); // gesperrt, PIN-Eingabe dauert
    freeze(10 * 60 * 1000);
    rerender({ ...props, enabled: true }); // entsperrt
    act(() => vi.advanceTimersByTime(HEARTBEAT_MS * 2));
    expect(onLock).toHaveBeenCalledTimes(1);
  });

  it("Login bei bereits verstecktem Tab: Hintergrundzeit zählt ab dann", () => {
    hidden = true;
    mount();
    freeze(BG);
    setHidden(false);
    expect(onLock).toHaveBeenCalledTimes(1);
  });
});
