import { describe, it, expect, afterEach } from "vitest";
import { render, screen, act, cleanup } from "@testing-library/react";
import OfflineBanner from "./OfflineBanner";

afterEach(cleanup);

describe("OfflineBanner", () => {
  it("zeigt nichts, wenn online", () => {
    render(<OfflineBanner />);
    expect(screen.queryByText(/Keine Internetverbindung/i)).toBeNull();
  });

  it("erscheint bei 'offline' und verschwindet bei 'online'", () => {
    render(<OfflineBanner />);
    act(() => {
      window.dispatchEvent(new Event("offline"));
    });
    expect(screen.getByText(/Keine Internetverbindung/i)).toBeInTheDocument();
    act(() => {
      window.dispatchEvent(new Event("online"));
    });
    expect(screen.queryByText(/Keine Internetverbindung/i)).toBeNull();
  });
});
