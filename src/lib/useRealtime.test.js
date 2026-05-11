import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";

const onMock = vi.fn();
const subscribeMock = vi.fn();
const removeChannelMock = vi.fn();
const channelMock = vi.fn(() => {
  const ch = { on: onMock, subscribe: subscribeMock };
  // Chain: channel.on(...).subscribe()
  onMock.mockReturnValue(ch);
  subscribeMock.mockReturnValue(ch);
  return ch;
});

vi.mock("./supabase.js", () => ({
  supabase: {
    channel: (...args) => channelMock(...args),
    removeChannel: (...args) => removeChannelMock(...args),
  },
}));

import { useRealtime } from "./useRealtime.js";

describe("useRealtime", () => {
  beforeEach(() => {
    onMock.mockClear();
    subscribeMock.mockClear();
    removeChannelMock.mockClear();
    channelMock.mockClear();
  });

  it("subscribed beim Mount, removeChannel beim Unmount", () => {
    const onInsert = vi.fn();
    const { unmount } = renderHook(() =>
      useRealtime("stundeneintraege", { onInsert }),
    );
    expect(channelMock).toHaveBeenCalledTimes(1);
    expect(onMock).toHaveBeenCalledTimes(1);
    expect(subscribeMock).toHaveBeenCalledTimes(1);
    unmount();
    expect(removeChannelMock).toHaveBeenCalledTimes(1);
  });

  it("subscribed NICHT wenn enabled=false", () => {
    renderHook(() =>
      useRealtime("maengel", { onInsert: vi.fn() }, { enabled: false }),
    );
    expect(channelMock).not.toHaveBeenCalled();
  });

  it("reicht INSERT-Events an onInsert weiter", () => {
    const onInsert = vi.fn();
    renderHook(() => useRealtime("stundeneintraege", { onInsert }));
    // payload-Handler ist 3. arg von .on('postgres_changes', config, handler)
    const handler = onMock.mock.calls[0][2];
    handler({ eventType: "INSERT", new: { id: "u1", arbeit: "Test" } });
    expect(onInsert).toHaveBeenCalledWith({ id: "u1", arbeit: "Test" });
  });

  it("reicht UPDATE-Events an onUpdate (mit new + old)", () => {
    const onUpdate = vi.fn();
    renderHook(() => useRealtime("maengel", { onUpdate }));
    const handler = onMock.mock.calls[0][2];
    handler({
      eventType: "UPDATE",
      new: { id: "m1", status: "erledigt" },
      old: { id: "m1", status: "offen" },
    });
    expect(onUpdate).toHaveBeenCalledWith(
      { id: "m1", status: "erledigt" },
      { id: "m1", status: "offen" },
    );
  });

  it("reicht DELETE-Events an onDelete (mit old)", () => {
    const onDelete = vi.fn();
    renderHook(() => useRealtime("benachrichtigungen", { onDelete }));
    const handler = onMock.mock.calls[0][2];
    handler({ eventType: "DELETE", old: { id: "n1" } });
    expect(onDelete).toHaveBeenCalledWith({ id: "n1" });
  });

  it("setzt filter-Option in config", () => {
    renderHook(() =>
      useRealtime(
        "stundeneintraege",
        { onInsert: vi.fn() },
        { filter: "baustelle_id=eq.abc" },
      ),
    );
    const config = onMock.mock.calls[0][1];
    expect(config.filter).toBe("baustelle_id=eq.abc");
    expect(config.table).toBe("stundeneintraege");
  });
});
