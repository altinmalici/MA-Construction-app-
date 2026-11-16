import { useEffect, useRef } from "react";

// Takt, in dem Zeitsprünge (eingefrorene App) und Inaktivität geprüft werden.
export const HEARTBEAT_MS = 5 * 1000;

/**
 * Sperrt die App (PIN-Wiedereingabe), wenn sie
 *  - mindestens `backgroundMs` im Hintergrund war (visibilitychange), ODER
 *  - mindestens `backgroundMs` eingefroren war, ohne dass ein
 *    "hidden"-Ereignis kam (iOS friert PWAs teils kommentarlos ein — erkannt
 *    am Zeitsprung zwischen zwei Takten), ODER
 *  - `inactivityMs` lang ohne Eingabe im Vordergrund offen war (0 = aus).
 *
 * `onLock` wird pro Aktivierung höchstens einmal gerufen. Solange
 * `enabled` false ist (ausgeloggt oder bereits gesperrt), passiert nichts;
 * beim erneuten Aktivieren beginnt die Zählung von vorn — daher keine
 * Sperr-Schleife direkt nach dem Entsperren.
 */
export function useAutoLock({ enabled, onLock, backgroundMs, inactivityMs = 0 }) {
  const onLockRef = useRef(onLock);
  useEffect(() => {
    onLockRef.current = onLock;
  });

  useEffect(() => {
    if (!enabled) return undefined;
    let fired = false;
    let hiddenSince = document.hidden ? Date.now() : null;
    let lastBeat = Date.now();
    let lastInput = Date.now();

    const lock = () => {
      if (fired) return;
      fired = true;
      onLockRef.current?.();
    };

    const onVisibility = () => {
      const now = Date.now();
      if (document.hidden) {
        hiddenSince = now;
        return;
      }
      const since = hiddenSince;
      hiddenSince = null;
      lastBeat = now; // der Zeitsprung ist hiermit schon ausgewertet
      if (since !== null && now - since >= backgroundMs) lock();
    };

    const onInput = () => {
      lastInput = Date.now();
    };

    const beat = () => {
      const now = Date.now();
      const gap = now - lastBeat;
      lastBeat = now;
      if (gap >= backgroundMs) return lock();
      if (inactivityMs > 0 && !document.hidden && now - lastInput >= inactivityMs) lock();
    };

    document.addEventListener("visibilitychange", onVisibility);
    const inputEvents = ["pointerdown", "keydown", "touchstart"];
    inputEvents.forEach((ev) =>
      window.addEventListener(ev, onInput, { capture: true, passive: true }),
    );
    const timer = setInterval(beat, HEARTBEAT_MS);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      inputEvents.forEach((ev) =>
        window.removeEventListener(ev, onInput, { capture: true }),
      );
      clearInterval(timer);
    };
  }, [enabled, backgroundMs, inactivityMs]);
}
