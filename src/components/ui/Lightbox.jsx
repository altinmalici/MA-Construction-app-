import { useEffect } from "react";
import { X } from "lucide-react";

/**
 * Leichter Fullscreen-Image-Viewer. Click-outside + ESC schließen,
 * Image selbst stopPropagation — Tap aufs Bild schließt nicht.
 */
const Lightbox = ({ open, url, onClose }) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open || !url) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Foto"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.92)",
        zIndex: 300,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <button
        onClick={onClose}
        aria-label="Schließen"
        style={{
          position: "absolute",
          top: "calc(env(safe-area-inset-top, 0px) + 16px)",
          right: 16,
          width: 44,
          height: 44,
          borderRadius: 22,
          background: "rgba(255,255,255,0.15)",
          color: "white",
          border: "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
        }}
      >
        <X size={22} />
      </button>
      <img
        src={url}
        alt="Foto vergrößert"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: "100%",
          maxHeight: "100%",
          objectFit: "contain",
        }}
      />
    </div>
  );
};

export default Lightbox;
