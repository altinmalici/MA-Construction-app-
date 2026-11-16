import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup, act } from "@testing-library/react";
import { useKeyboardScroll, KEYBOARD_DELAY_MS } from "./useKeyboardScroll.js";

const Probe = () => {
  useKeyboardScroll();
  return (
    <div>
      <input data-testid="text" />
      <input data-testid="check" type="checkbox" />
      <button data-testid="btn">x</button>
    </div>
  );
};

describe("useKeyboardScroll", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => { cleanup(); vi.useRealTimers(); });

  it("scrollt ein fokussiertes Textfeld nach dem Ausfahren der Tastatur in die Mitte", () => {
    const { getByTestId } = render(<Probe />);
    const el = getByTestId("text");
    el.scrollIntoView = vi.fn();
    act(() => { el.focus(); });
    expect(el.scrollIntoView).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(KEYBOARD_DELAY_MS); });
    expect(el.scrollIntoView).toHaveBeenCalledWith({ block: "center", behavior: "smooth" });
  });

  it("ignoriert Checkboxen und Buttons (keine Tastatur)", () => {
    const { getByTestId } = render(<Probe />);
    const c = getByTestId("check");
    c.scrollIntoView = vi.fn();
    act(() => { c.focus(); vi.advanceTimersByTime(KEYBOARD_DELAY_MS); });
    expect(c.scrollIntoView).not.toHaveBeenCalled();
  });

  it("Fokus inzwischen woanders → kein Scrollen", () => {
    const { getByTestId } = render(<Probe />);
    const el = getByTestId("text");
    el.scrollIntoView = vi.fn();
    act(() => { el.focus(); getByTestId("btn").focus(); vi.advanceTimersByTime(KEYBOARD_DELAY_MS); });
    expect(el.scrollIntoView).not.toHaveBeenCalled();
  });
});
