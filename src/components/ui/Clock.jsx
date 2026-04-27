import { useState, useEffect } from "react";

/**
 * Lokale Status-Bar-Uhr für die Device-Simulation. Tickt minütlich,
 * triggert ausschließlich den eigenen Re-Render — kein App-weiter Re-
 * Render mehr (Audit P-MEDIUM: clockTime im AppContext löste alle 30s
 * eine kaskadierende Re-Render-Welle aus).
 *
 * Format: HH:MM (deutsche Locale).
 */
const Clock = () => {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);
  return (
    <span className="device-time">
      {now.toLocaleTimeString("de-DE", {
        hour: "2-digit",
        minute: "2-digit",
      })}
    </span>
  );
};

export default Clock;
