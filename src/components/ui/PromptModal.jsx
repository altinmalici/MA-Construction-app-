import { useState, useEffect, useRef } from "react";
import { BTN } from "../../utils/helpers";

/**
 * Generic iOS-style prompt dialog (Text-Eingabe statt Boolean).
 * Designed to replace window.prompt(). Aktuell nirgends genutzt — bereit
 * für Phase 4 (echter Datei-Upload-Dialog), Geschwister von ConfirmModal.
 */
export default function PromptModal({
  open,
  title,
  message,
  placeholder = "",
  defaultValue = "",
  confirmLabel = "OK",
  cancelLabel = "Abbrechen",
  onConfirm,
  onCancel,
}) {
  const [value, setValue] = useState(defaultValue);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) setValue(defaultValue);
  }, [open, defaultValue]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onCancel?.();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => inputRef.current?.focus());
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onCancel]);

  if (!open) return null;

  const submit = () => {
    if (value.trim()) onConfirm?.(value.trim());
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onCancel}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        zIndex: 200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "white",
          borderRadius: 14,
          padding: 20,
          width: "100%",
          maxWidth: 340,
          boxShadow: "0 10px 40px rgba(0,0,0,0.25)",
        }}
      >
        {title && (
          <h3
            style={{
              fontSize: 17,
              fontWeight: 700,
              color: "#000",
              marginBottom: 6,
              textAlign: "center",
            }}
          >
            {title}
          </h3>
        )}
        {message && (
          <p
            style={{
              fontSize: 14,
              color: "#3c3c43",
              marginBottom: 14,
              textAlign: "center",
            }}
          >
            {message}
          </p>
        )}
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
          style={{
            width: "100%",
            padding: "12px 14px",
            borderRadius: 10,
            border: "1px solid rgba(0,0,0,0.1)",
            fontSize: 15,
            marginBottom: 16,
            boxSizing: "border-box",
          }}
        />
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1,
              padding: "12px 0",
              borderRadius: 10,
              background: "rgba(0,0,0,0.05)",
              color: "#3c3c43",
              fontWeight: 600,
              fontSize: 15,
              border: "none",
              minHeight: 44,
              cursor: "pointer",
            }}
          >
            {cancelLabel}
          </button>
          <button
            onClick={submit}
            disabled={!value.trim()}
            style={{
              flex: 1,
              padding: "12px 0",
              borderRadius: 10,
              background: BTN,
              color: "white",
              fontWeight: 600,
              fontSize: 15,
              border: "none",
              minHeight: 44,
              opacity: value.trim() ? 1 : 0.5,
              cursor: value.trim() ? "pointer" : "not-allowed",
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
