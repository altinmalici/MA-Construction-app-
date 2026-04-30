import { describe, it, expect, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";

// Mock api/index.js — alle getAll() liefern leere Arrays, sonst würde
// useAppData beim Mount Supabase aufrufen.
vi.mock("./api/index.js", () => {
  const empty = async () => [];
  return {
    users: { getAll: empty },
    subunternehmer: { getAll: empty },
    baustellen: { getAll: empty, create: vi.fn(), update: vi.fn(), remove: vi.fn(), updateField: vi.fn(), removeMitarbeiterFromAll: vi.fn(), removeSubFromAll: vi.fn() },
    stundeneintraege: { getAll: empty, create: vi.fn(), update: vi.fn(), remove: vi.fn() },
    kalender: { getAll: empty, create: vi.fn(), update: vi.fn(), remove: vi.fn() },
    maengel: { getAll: empty, create: vi.fn(), updateStatus: vi.fn(), remove: vi.fn() },
    bautagebuch: { getAll: empty, create: vi.fn(), update: vi.fn(), remove: vi.fn() },
    dokumente: { getAll: empty, create: vi.fn(), createWithFile: vi.fn(), remove: vi.fn(), removeWithFile: vi.fn(), getDocumentUrl: vi.fn() },
    benachrichtigungen: { getAll: empty, create: vi.fn(), markAllRead: vi.fn(), remove: vi.fn(), removeAll: vi.fn() },
    kosten: { getAll: empty, create: vi.fn(), remove: vi.fn() },
    auth: {
      login: vi.fn(),
      loginAsUser: vi.fn(),
      loginWithUsername: vi.fn(),
      completeOnboarding: vi.fn(),
      signOut: vi.fn(),
      getCurrentUser: vi.fn(),
      reAuthWithPin: vi.fn(),
      onAuthStateChange: vi.fn(),
    },
    users_extra: {},
  };
});

import { useAppData } from "./useAppData.js";

async function setupHook() {
  const r = renderHook(() => useAppData());
  // Initial loadAll() ist async — eine microtask-flush genügt für leere mocks
  await act(async () => {});
  return r;
}

describe("mergeIncomingRow", () => {
  it("INSERT neu: fügt Row in die Tabelle ein", async () => {
    const { result } = await setupHook();
    act(() => {
      result.current.mergeIncomingRow(
        "stundeneintraege",
        { id: "s1", arbeit: "Test" },
        "INSERT",
      );
    });
    expect(result.current.data.stundeneintraege).toHaveLength(1);
    expect(result.current.data.stundeneintraege[0].id).toBe("s1");
  });

  it("INSERT duplicate: skippt wenn ID schon existiert", async () => {
    const { result } = await setupHook();
    act(() => {
      result.current.mergeIncomingRow("maengel", { id: "m1", titel: "X" }, "INSERT");
    });
    act(() => {
      result.current.mergeIncomingRow("maengel", { id: "m1", titel: "Y (duplicate)" }, "INSERT");
    });
    expect(result.current.data.maengel).toHaveLength(1);
    expect(result.current.data.maengel[0].titel).toBe("X"); // erstes wins
  });

  it("UPDATE existing: ersetzt Row by ID (merge)", async () => {
    const { result } = await setupHook();
    act(() => {
      result.current.mergeIncomingRow(
        "benachrichtigungen",
        { id: "n1", text: "alt", gelesen: false },
        "INSERT",
      );
    });
    act(() => {
      result.current.mergeIncomingRow(
        "benachrichtigungen",
        { id: "n1", gelesen: true },
        "UPDATE",
      );
    });
    expect(result.current.data.benachrichtigungen[0].gelesen).toBe(true);
    // Merge → text bleibt erhalten
    expect(result.current.data.benachrichtigungen[0].text).toBe("alt");
  });

  it("UPDATE missing: macht nichts (kein Add via UPDATE)", async () => {
    const { result } = await setupHook();
    act(() => {
      result.current.mergeIncomingRow(
        "stundeneintraege",
        { id: "ghost", arbeit: "X" },
        "UPDATE",
      );
    });
    expect(result.current.data.stundeneintraege).toHaveLength(0);
  });

  it("DELETE existing: entfernt Row by ID", async () => {
    const { result } = await setupHook();
    act(() => {
      result.current.mergeIncomingRow("maengel", { id: "m1" }, "INSERT");
      result.current.mergeIncomingRow("maengel", { id: "m2" }, "INSERT");
    });
    act(() => {
      result.current.mergeIncomingRow("maengel", { id: "m1" }, "DELETE");
    });
    expect(result.current.data.maengel).toHaveLength(1);
    expect(result.current.data.maengel[0].id).toBe("m2");
  });

  it("DELETE missing: macht nichts (no-op)", async () => {
    const { result } = await setupHook();
    act(() => {
      result.current.mergeIncomingRow("maengel", { id: "ghost" }, "DELETE");
    });
    expect(result.current.data.maengel).toHaveLength(0);
  });

  // ── 6-02b: snake→camel Row-Mapping + updated_at-Dedup ──────────────
  // Self-Review Findings #4 (HIGH) + #2 (MEDIUM)

  it("INSERT mappt snake_case-Keys zu camelCase (Finding #4 HIGH)", async () => {
    const { result } = await setupHook();
    act(() => {
      result.current.mergeIncomingRow(
        "stundeneintraege",
        {
          id: "x1",
          baustelle_id: "b1",
          mitarbeiter_id: "m1",
          created_at: "2026-04-30T10:00:00Z",
        },
        "INSERT",
      );
    });
    const row = result.current.data.stundeneintraege[0];
    // ALLE camelCase-Keys da
    expect(row.id).toBe("x1");
    expect(row.baustelleId).toBe("b1");
    expect(row.mitarbeiterId).toBe("m1");
    expect(row.createdAt).toBe("2026-04-30T10:00:00Z");
    // ALLE snake_case-Keys verschwunden
    expect(row.baustelle_id).toBeUndefined();
    expect(row.mitarbeiter_id).toBeUndefined();
    expect(row.created_at).toBeUndefined();
  });

  it("UPDATE mit älterem updated_at wird verworfen (Finding #2 MEDIUM)", async () => {
    const { result } = await setupHook();
    act(() => {
      result.current.mergeIncomingRow(
        "maengel",
        { id: "x1", titel: "neu", updated_at: "2026-04-30T12:00:00Z" },
        "INSERT",
      );
    });
    act(() => {
      // Älteres Event — out-of-order/replay → verwerfen
      result.current.mergeIncomingRow(
        "maengel",
        { id: "x1", titel: "alt-stale", updated_at: "2026-04-30T10:00:00Z" },
        "UPDATE",
      );
    });
    expect(result.current.data.maengel[0].titel).toBe("neu");
    expect(result.current.data.maengel[0].updatedAt).toBe(
      "2026-04-30T12:00:00Z",
    );
  });

  it("UPDATE mit neuerem updated_at überschreibt (Finding #2 MEDIUM)", async () => {
    const { result } = await setupHook();
    act(() => {
      result.current.mergeIncomingRow(
        "maengel",
        { id: "x1", titel: "alt", updated_at: "2026-04-30T10:00:00Z" },
        "INSERT",
      );
    });
    act(() => {
      result.current.mergeIncomingRow(
        "maengel",
        { id: "x1", titel: "neu", updated_at: "2026-04-30T12:00:00Z" },
        "UPDATE",
      );
    });
    expect(result.current.data.maengel[0].titel).toBe("neu");
    expect(result.current.data.maengel[0].updatedAt).toBe(
      "2026-04-30T12:00:00Z",
    );
  });

  it("UPDATE ohne updated_at: bestehenden Eintrag behalten (sicher-Default)", async () => {
    const { result } = await setupHook();
    act(() => {
      result.current.mergeIncomingRow(
        "maengel",
        {
          id: "x1",
          titel: "fest",
          updated_at: "2026-04-30T12:00:00Z",
        },
        "INSERT",
      );
    });
    act(() => {
      // Eingehend ohne updated_at → wir wissen nicht ob neuer/älter →
      // sicherer Default: bestehenden Stand behalten.
      result.current.mergeIncomingRow(
        "maengel",
        { id: "x1", baustelle_id: "neu-b" },
        "UPDATE",
      );
    });
    expect(result.current.data.maengel[0].titel).toBe("fest");
    expect(result.current.data.maengel[0].updatedAt).toBe(
      "2026-04-30T12:00:00Z",
    );
    // Felder aus dem Skip-Event wurden nicht angewendet
    expect(result.current.data.maengel[0].baustelleId).toBeUndefined();
  });
});
