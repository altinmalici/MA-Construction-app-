import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import PendingSyncBadge from "./PendingSyncBadge.jsx";
import { enqueueStunde, clearQueue } from "../../lib/offlineQueue.js";

describe("PendingSyncBadge", () => {
  beforeEach(() => {
    clearQueue();
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
  });
  afterEach(() => {
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
