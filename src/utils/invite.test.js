import { describe, it, expect, vi, afterEach } from "vitest";
import { inviteLink, readInviteToken, buildInviteText, shareInvite } from "./invite.js";

const T = "a".repeat(48);
afterEach(() => vi.restoreAllMocks());

describe("Einladungs-Link", () => {
  it("baut und liest den Link", () => {
    const link = inviteLink(T, "https://app.example");
    // Token steht im Fragment → wird nicht an den Server gesendet
    expect(link).toBe(`https://app.example/#einladung=${T}`);
    expect(new URL(link).search).toBe("");
    expect(readInviteToken(new URL(link).hash, "")).toBe(T);
    // ältere Schreibweise als Query-Parameter wird weiter verstanden
    expect(readInviteToken("", `?einladung=${T}`)).toBe(T);
  });
  it("ignoriert kaputte Tokens", () => {
    expect(readInviteToken("#einladung=kurz", "")).toBeNull();
    expect(readInviteToken("#einladung=" + "Z".repeat(48), "")).toBeNull();
    expect(readInviteToken("", "")).toBeNull();
  });
});

describe("buildInviteText", () => {
  it("mit Link: Vorname, Link, Benutzername – kein PIN", () => {
    const t = buildInviteText({ name: "Max Muster", username: "m.muster", pin: "4711", link: "https://x/?einladung=abc" });
    expect(t).toContain("Hallo Max!");
    expect(t).toContain("https://x/?einladung=abc");
    expect(t).toContain("m.muster");
    expect(t).not.toContain("4711");
  });
  it("ohne Link: Benutzername + Einladungs-PIN + Hinweis auf 'Erster Zugang?'", () => {
    const t = buildInviteText({ name: "Max Muster", username: "m.muster", pin: "4711", origin: "https://app" });
    expect(t).toContain("Einladungs-PIN: 4711");
    expect(t).toContain("Erster Zugang?");
    expect(t).toContain("https://app");
  });
});

describe("shareInvite", () => {
  it("nutzt das System-Teilen-Menü, wenn vorhanden", async () => {
    const share = vi.fn().mockResolvedValue();
    vi.stubGlobal("navigator", { share });
    expect(await shareInvite("hallo")).toBe("shared");
    expect(share).toHaveBeenCalledWith({ text: "hallo" });
    vi.unstubAllGlobals();
  });
  it("Menü geschlossen → nichts kopieren", async () => {
    const writeText = vi.fn();
    vi.stubGlobal("navigator", {
      share: vi.fn().mockRejectedValue(Object.assign(new Error("x"), { name: "AbortError" })),
      clipboard: { writeText },
    });
    expect(await shareInvite("hallo")).toBe("cancelled");
    expect(writeText).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
  it("ohne Teilen-Menü → Zwischenablage", async () => {
    const writeText = vi.fn().mockResolvedValue();
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    expect(await shareInvite("hallo")).toBe("copied");
    expect(writeText).toHaveBeenCalledWith("hallo");
    vi.unstubAllGlobals();
  });
});
