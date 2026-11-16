import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, cleanup } from "@testing-library/react";
import PendingSyncBadge from "./PendingSyncBadge.jsx";
import { enqueueStunde, clearQueue } from "../../lib/offlineQueue.js";

describe("PendingSyncBadge", () => {
  beforeEach(() => {
    clearQueue();
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
  });
  afterEach(() => {
    // Erst unmounten: clearQueue() feuert "ma-queue-change" und wuerde sonst
    // einen State-Update ausserhalb von act() ausloesen.
    cleanup();
    clearQueue();
    vi.restoreAllMocks();
  });

  it("rendert nichts bei leerer Queue", () => {
    render(<PendingSyncBadge />);
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("zeigt Anzahl wartender Einträge und reagiert auf Queue-Änderung", () => {
    render(<PendingSyncBadge />);
    act(() => {
      enqueueStunde({ id: "t-1", datum: "2026-08-15" });
    });
    expect(screen.getByRole("status").textContent).toContain(
      "1 Eintrag wird",
    );
    act(() => {
      enqueueStunde({ id: "t-2", datum: "2026-08-15" });
    });
    expect(screen.getByRole("status").textContent).toContain("2 Einträge");
  });

  it("rendert nichts wenn offline (OfflineBanner übernimmt)", () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    render(<PendingSyncBadge />);
    act(() => {
      enqueueStunde({ id: "t-3", datum: "2026-08-15" });
    });
    expect(screen.queryByRole("status")).toBeNull();
  });
});

describe("PendingSyncBadge – abgelehnte und fremde Einträge", () => {
  beforeEach(() => {
    clearQueue();
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
  });
  afterEach(() => {
    cleanup();
    clearQueue();
    vi.restoreAllMocks();
  });

  it("abgelehnter Eintrag: Hinweis ist antippbar, zeigt Grund, Verwerfen nur nach Rückfrage", async () => {
    const { markFailed, queueSize } = await import("../../lib/offlineQueue.js");
    const { fireEvent } = await import("@testing-library/react");
    enqueueStunde({ id: "f1", datum: "2026-11-16", beginn: "07:00", ende: "15:00", baustelleId: "b1", mitarbeiterId: "u1" });
    markFailed("f1", "Keine Berechtigung (Zuweisung zur Baustelle fehlt?)");
    render(<PendingSyncBadge userId="u1" baustellen={[{ id: "b1", kunde: "Huber" }]} />);
    fireEvent.click(screen.getByRole("button", { name: /1 Eintrag nicht synchronisiert/ }));
    expect(screen.getByText(/Huber · 2026-11-16/)).toBeInTheDocument();
    expect(screen.getByText(/Grund: Keine Berechtigung/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Verwerfen" }));
    expect(queueSize()).toBe(1); // noch da
    fireEvent.click(screen.getByRole("button", { name: "Behalten" }));
    expect(queueSize()).toBe(1);
    fireEvent.click(screen.getByRole("button", { name: "Verwerfen" }));
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "Endgültig verwerfen" }));
    });
    expect(queueSize()).toBe(0);
  });

  it('"Alle erneut versuchen" setzt zurück auf wartend und stößt den Sync an', async () => {
    const { markFailed, getPending } = await import("../../lib/offlineQueue.js");
    const { fireEvent } = await import("@testing-library/react");
    enqueueStunde({ id: "f1", mitarbeiterId: "u1" });
    markFailed("f1", "x");
    const retry = vi.fn();
    window.addEventListener("ma-queue-retry", retry);
    render(<PendingSyncBadge userId="u1" />);
    fireEvent.click(screen.getByRole("button", { name: /nicht synchronisiert/ }));
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "Alle erneut versuchen" }));
    });
    expect(getPending().map((i) => i.id)).toEqual(["f1"]);
    expect(retry).toHaveBeenCalledTimes(1);
    window.removeEventListener("ma-queue-retry", retry);
  });

  it("abgelehnte Einträge werden auch offline angezeigt", async () => {
    const { markFailed } = await import("../../lib/offlineQueue.js");
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    enqueueStunde({ id: "f1", mitarbeiterId: "u1" });
    markFailed("f1", "x");
    render(<PendingSyncBadge userId="u1" />);
    expect(screen.getByRole("button", { name: /nicht synchronisiert/ })).toBeInTheDocument();
  });

  it("Eintrag eines Kollegen: eigener Hinweis statt endlosem 'wird synchronisiert'", () => {
    enqueueStunde({ id: "o1", mitarbeiterId: "u2" });
    render(<PendingSyncBadge userId="u1" isChef={false} />);
    expect(screen.getByRole("status").textContent).toMatch(/Kollegen wartet auf dessen Anmeldung/);
  });
});
