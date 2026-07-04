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
