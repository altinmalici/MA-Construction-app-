import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import ErrorBoundary from "./ErrorBoundary";

afterEach(cleanup);

const Boom = () => {
  throw new Error("Testfehler");
};

describe("ErrorBoundary", () => {
  it("rendert Kinder normal, wenn kein Fehler auftritt", () => {
    render(
      <ErrorBoundary>
        <p>Alles gut</p>
      </ErrorBoundary>,
    );
    expect(screen.getByText("Alles gut")).toBeInTheDocument();
  });

  it("zeigt den Fallback-Screen, wenn ein Kind wirft", () => {
    // React loggt den gefangenen Fehler auf console.error — hier unterdrücken.
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );
    expect(screen.getByText("Etwas ist schiefgelaufen")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /neu starten/i }),
    ).toBeInTheDocument();
    spy.mockRestore();
  });
});
