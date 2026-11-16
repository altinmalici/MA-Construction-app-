import { describe, it, expect, beforeEach } from "vitest";
import {
  enqueueStunde,
  getQueue,
  queueSize,
  dequeue,
  clearQueue,
} from "./offlineQueue.js";

beforeEach(() => {
  localStorage.clear();
});

const entry = (id) => ({ id, baustelleId: "b1", datum: "2026-07-04", beginn: "07:00", ende: "16:00" });

describe("offlineQueue", () => {
  it("reiht Eintraege ein und liest sie zurueck", () => {
    expect(enqueueStunde(entry("a"))).toBe(true);
    expect(enqueueStunde(entry("b"))).toBe(true);
    expect(queueSize()).toBe(2);
    expect(getQueue().map((i) => i.id)).toEqual(["a", "b"]);
  });

  it("verhindert Duplikate derselben id (Datensicherheit)", () => {
    enqueueStunde(entry("a"));
    enqueueStunde(entry("a"));
    expect(queueSize()).toBe(1);
  });

  it("lehnt Eintraege ohne id ab", () => {
    expect(enqueueStunde({ baustelleId: "b1" })).toBe(false);
    expect(queueSize()).toBe(0);
  });

  it("entfernt erledigte Eintraege gezielt", () => {
    enqueueStunde(entry("a"));
    enqueueStunde(entry("b"));
    dequeue("a");
    expect(getQueue().map((i) => i.id)).toEqual(["b"]);
  });

  it("persistiert ueber localStorage (ueberlebt Reload)", () => {
    enqueueStunde(entry("a"));
    // Simuliert frischen Modul-Zustand: getQueue liest direkt aus localStorage.
    expect(getQueue()).toHaveLength(1);
    expect(JSON.parse(localStorage.getItem("ma_offline_queue_v1"))).toHaveLength(1);
  });

  it("clearQueue leert alles", () => {
    enqueueStunde(entry("a"));
    clearQueue();
    expect(queueSize()).toBe(0);
  });

  it("bewahrt den vollstaendigen Eintrag auf", () => {
    enqueueStunde(entry("a"));
    expect(getQueue()[0].entry).toMatchObject({ id: "a", baustelleId: "b1", beginn: "07:00" });
  });
});

// Review-Punkt: dauerhaft abgelehnte Einträge
describe("offlineQueue – fehlgeschlagene Einträge", () => {
  let q;
  beforeEach(async () => {
    q = await import("./offlineQueue.js");
    q.clearQueue();
  });

  it("dauerfehlerText erkennt endgültige DB-Ablehnungen, aber keine Netzfehler", () => {
    expect(q.dauerfehlerText({ code: "42501" })).toMatch(/Berechtigung/);
    expect(q.dauerfehlerText({ code: "23503" })).toMatch(/existiert nicht mehr/);
    expect(q.dauerfehlerText({ message: "new row violates row-level security policy" })).toMatch(/Berechtigung/);
    expect(q.dauerfehlerText(new TypeError("Failed to fetch"))).toBeNull();
    expect(q.dauerfehlerText({ code: "23505" })).toBeNull();
    expect(q.dauerfehlerText(null)).toBeNull();
  });

  it("markFailed: Eintrag bleibt gespeichert, zählt aber nicht mehr als wartend", () => {
    q.enqueueStunde({ id: "a" });
    q.enqueueStunde({ id: "b" });
    q.markFailed("a", "Keine Berechtigung");
    expect(q.queueSize()).toBe(2);
    expect(q.getPending().map((i) => i.id)).toEqual(["b"]);
    expect(q.getFailed().map((i) => [i.id, i.failed.grund])).toEqual([["a", "Keine Berechtigung"]]);
  });

  it("retryFailed setzt zurück auf wartend; dequeue verwirft", () => {
    q.enqueueStunde({ id: "a" });
    q.markFailed("a", "x");
    q.retryFailed();
    expect(q.getFailed()).toEqual([]);
    expect(q.getPending().map((i) => i.id)).toEqual(["a"]);
    q.dequeue("a");
    expect(q.queueSize()).toBe(0);
  });

  it("gehoertZu: Mitarbeiter nur eigene, Chef alle, Einträge ohne Besitzer jeder", () => {
    const own = { entry: { mitarbeiterId: "u1" } };
    const other = { entry: { mitarbeiterId: "u2" } };
    const sub = { entry: { mitarbeiterId: null } };
    expect(q.gehoertZu(own, "u1", false)).toBe(true);
    expect(q.gehoertZu(other, "u1", false)).toBe(false);
    expect(q.gehoertZu(other, "u1", true)).toBe(true);
    expect(q.gehoertZu(sub, "u1", false)).toBe(true);
  });
});
