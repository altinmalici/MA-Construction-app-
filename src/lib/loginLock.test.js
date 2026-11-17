import { describe, it, expect, beforeEach } from "vitest";
import { loadLock, registerFailure, clearLock, KURZE_SPERRE_MS, LANGE_SPERRE_MS } from "./loginLock.js";

const T0 = new Date("2026-11-17T10:00:00Z").getTime();
beforeEach(() => localStorage.clear());

describe("loginLock", () => {
  it("startet leer", () => {
    expect(loadLock(T0)).toEqual({ attempts: 0, lockedUntil: null });
  });

  it("3. Fehlversuch → 30 s Sperre, die ein 'Neuladen' (erneutes Lesen) überlebt", () => {
    registerFailure(T0);
    registerFailure(T0);
    const r = registerFailure(T0);
    expect(r.attempts).toBe(3);
    expect(new Date(r.lockedUntil).getTime()).toBe(T0 + KURZE_SPERRE_MS);
    expect(loadLock(T0 + 1000).lockedUntil).toBe(r.lockedUntil);
    // nach Ablauf frei, der Zähler läuft aber weiter
    expect(loadLock(T0 + KURZE_SPERRE_MS + 1)).toEqual({ attempts: 3, lockedUntil: null });
  });

  it("10. Fehlversuch → 15 Minuten Sperre; danach beginnt der Zähler bei 0", () => {
    let r;
    for (let i = 0; i < 10; i++) r = registerFailure(T0);
    expect(r.lang).toBe(true);
    expect(new Date(r.lockedUntil).getTime()).toBe(T0 + LANGE_SPERRE_MS);
    expect(loadLock(T0 + LANGE_SPERRE_MS - 1000).lockedUntil).not.toBeNull();
    expect(loadLock(T0 + LANGE_SPERRE_MS + 1)).toEqual({ attempts: 0, lockedUntil: null });
  });

  it("erfolgreicher Login löscht den Zähler", () => {
    registerFailure(T0);
    clearLock();
    expect(loadLock(T0)).toEqual({ attempts: 0, lockedUntil: null });
  });

  it("kaputter Speicherinhalt wird wie 'leer' behandelt", () => {
    localStorage.setItem("ma_login_lock_v1", "{kaputt");
    expect(loadLock(T0)).toEqual({ attempts: 0, lockedUntil: null });
  });
});
