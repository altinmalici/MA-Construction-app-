import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import ConfirmModal from "./ConfirmModal.jsx";

const noop = () => {};

afterEach(() => cleanup());

describe("ConfirmModal", () => {
  it("a) open=false → nichts im DOM", () => {
    render(
      <ConfirmModal
        open={false}
        title="X"
        onConfirm={noop}
        onCancel={noop}
      />,
    );
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("b) open=true → Title und Buttons sichtbar", () => {
    render(
      <ConfirmModal
        open
        title="Abmelden?"
        message="Weg ist weg."
        confirmLabel="Abmelden"
        cancelLabel="Abbrechen"
        onConfirm={noop}
        onCancel={noop}
      />,
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Abmelden?")).toBeInTheDocument();
    expect(screen.getByText("Weg ist weg.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Abmelden" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Abbrechen" }),
    ).toBeInTheDocument();
  });

  it("c) Click auf Confirm → onConfirm wird gerufen", () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmModal open title="X" onConfirm={onConfirm} onCancel={noop} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Bestätigen" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("d) Click auf Cancel → onCancel wird gerufen", () => {
    const onCancel = vi.fn();
    render(<ConfirmModal open title="X" onConfirm={noop} onCancel={onCancel} />);
    fireEvent.click(screen.getByRole("button", { name: "Abbrechen" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("e) Click auf Backdrop → onCancel wird gerufen, NICHT onConfirm", () => {
    const onCancel = vi.fn();
    const onConfirm = vi.fn();
    render(
      <ConfirmModal
        open
        title="X"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );
    fireEvent.click(screen.getByRole("dialog"));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("f) ESC-Key → onCancel wird gerufen", () => {
    const onCancel = vi.fn();
    render(<ConfirmModal open title="X" onConfirm={noop} onCancel={onCancel} />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("g) Während onConfirm pending → beide Buttons disabled", async () => {
    let resolveConfirm;
    const onConfirm = vi.fn(
      () => new Promise((r) => (resolveConfirm = r)),
    );
    render(
      <ConfirmModal open title="X" onConfirm={onConfirm} onCancel={noop} />,
    );
    const confirmBtn = screen.getByRole("button", { name: "Bestätigen" });
    const cancelBtn = screen.getByRole("button", { name: "Abbrechen" });
    fireEvent.click(confirmBtn);
    // microtask flush so React commits the busy state
    await Promise.resolve();
    expect(confirmBtn).toBeDisabled();
    expect(cancelBtn).toBeDisabled();
    resolveConfirm();
  });

  it("h) destructive=true → Confirm-Button hat rote Farbe", () => {
    render(
      <ConfirmModal
        open
        title="X"
        destructive
        confirmLabel="Löschen"
        onConfirm={noop}
        onCancel={noop}
      />,
    );
    const btn = screen.getByRole("button", { name: "Löschen" });
    expect(btn.style.color.toLowerCase()).toMatch(/rgb\(255,\s*59,\s*48\)|#ff3b30/);
  });

  it("i) Default-Labels sind Bestätigen und Abbrechen", () => {
    render(<ConfirmModal open title="X" onConfirm={noop} onCancel={noop} />);
    expect(screen.getByRole("button", { name: "Bestätigen" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Abbrechen" })).toBeInTheDocument();
  });
});
