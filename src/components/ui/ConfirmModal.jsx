import { useEffect, useRef, useState } from "react";
import { RED } from "../../utils/helpers";

const IOS_BLUE = "#007AFF";

/**
 * Generic iOS-style confirm dialog. Designed to replace window.confirm()
 * across the app (Phase 3c). Parent controls `open`; modal does NOT close
 * itself after onConfirm — that lets the parent show errors and keep the
 * dialog visible if the action failed.
 */
export default function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "Bestätigen",
  cancelLabel = "Abbrechen",
  destructive = false,
  onConfirm,
  onCancel,
}) {
  const [busy, setBusy] = useState(false);
  const cancelBtnRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape" && !busy) onCancel?.();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Auto-focus cancel: safer default for destructive-by-mistake taps.
    requestAnimationFrame(() => cancelBtnRef.current?.focus());
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, busy, onCancel]);

  if (!open) return null;

  const titleId = "confirm-modal-title";
  const messageId = message ? "confirm-modal-message" : undefined;

  const handleConfirm = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await onConfirm?.();
    } finally {
      setBusy(false);
    }
  };

  const handleBackdrop = () => {
    if (!busy) onCancel?.();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={messageId}
      onClick={handleBackdrop}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "white",
          borderRadius: 14,
          width: "100%",
          maxWidth: 270,
          boxShadow: "0 12px 32px rgba(0,0,0,0.25)",
          overflow: "hidden",
        }}
      >
        <div style={{ padding: "20px 16px 16px", textAlign: "center" }}>
          <h2
            id={titleId}
            style={{
              fontSize: 17,
              fontWeight: 600,
              color: "#000",
              margin: 0,
              marginBottom: message ? 6 : 0,
            }}
          >
            {title}
          </h2>
          {message && (
            <p
              id={messageId}
              style={{
                fontSize: 13,
                color: "#8e8e93",
                margin: 0,
                lineHeight: 1.35,
              }}
            >
              {message}
            </p>
          )}
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            borderTop: "0.5px solid #c6c6c8",
          }}
        >
          <button
            ref={cancelBtnRef}
            onClick={onCancel}
            disabled={busy}
            style={{
              padding: "12px 0",
              fontSize: 17,
              fontWeight: 400,
              color: IOS_BLUE,
              background: "transparent",
              border: "none",
              borderRight: "0.5px solid #c6c6c8",
              cursor: busy ? "default" : "pointer",
              opacity: busy ? 0.5 : 1,
            }}
          >
            {cancelLabel}
          </button>
          <button
            onClick={handleConfirm}
            disabled={busy}
            style={{
              padding: "12px 0",
              fontSize: 17,
              fontWeight: destructive ? 600 : 400,
              color: destructive ? RED : IOS_BLUE,
              background: "transparent",
              border: "none",
              cursor: busy ? "default" : "pointer",
              opacity: busy ? 0.5 : 1,
            }}
          >
            {busy ? "…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
