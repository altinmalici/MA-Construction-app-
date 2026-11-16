import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, act } from "@testing-library/react";

vi.mock("../../lib/pwaUpdate.js", () => ({
  UPDATE_EVENT: "ma-update-ready",
  applyUpdate: vi.fn().mockResolvedValue(),
}));
import { applyUpdate } from "../../lib/pwaUpdate.js";
import UpdatePrompt from "./UpdatePrompt.jsx";

afterEach(() => cleanup());

describe("UpdatePrompt", () => {
  it("unsichtbar, solange keine neue Version bereitsteht", () => {
    const { container } = render(<UpdatePrompt />);
    expect(container.textContent).toBe("");
  });

  it("zeigt den Hinweis und aktualisiert erst auf Tipp", async () => {
    render(<UpdatePrompt />);
    act(() => { window.dispatchEvent(new CustomEvent("ma-update-ready")); });
    expect(screen.getByText("Neue Version verfügbar")).toBeInTheDocument();
    expect(applyUpdate).not.toHaveBeenCalled();
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: /Aktualisieren/ })); });
    expect(applyUpdate).toHaveBeenCalledTimes(1);
  });
});
