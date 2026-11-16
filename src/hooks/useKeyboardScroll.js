import { useEffect } from "react";

// Wartezeit, bis die iOS-Tastatur ausgefahren ist.
export const KEYBOARD_DELAY_MS = 320;

/**
 * Hält das fokussierte Eingabefeld sichtbar, wenn die Bildschirmtastatur
 * erscheint. Die App hat einen festen Rahmen (body scrollt nicht), deshalb
 * schiebt iOS Felder am unteren Rand nicht von selbst über die Tastatur.
 */
export function useKeyboardScroll() {
  useEffect(() => {
    let timer = null;
    const reveal = (el) => {
      if (!el || !el.isConnected || document.activeElement !== el) return;
      el.scrollIntoView?.({ block: "center", behavior: "smooth" });
    };
    const onFocus = (e) => {
      const el = e.target;
      if (!el?.matches?.("input, textarea, select")) return;
      const type = (el.getAttribute("type") || "").toLowerCase();
      if (["checkbox", "radio", "range", "file", "button", "submit"].includes(type)) return;
      clearTimeout(timer);
      timer = setTimeout(() => reveal(el), KEYBOARD_DELAY_MS);
    };
    // Tastatur ändert die sichtbare Höhe → fokussiertes Feld erneut zeigen.
    const onViewport = () => {
      const el = document.activeElement;
      if (el?.matches?.("input, textarea, select")) reveal(el);
    };
    document.addEventListener("focusin", onFocus);
    window.visualViewport?.addEventListener("resize", onViewport);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("focusin", onFocus);
      window.visualViewport?.removeEventListener("resize", onViewport);
    };
  }, []);
}
