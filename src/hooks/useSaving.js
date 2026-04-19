import { useState, useCallback, useRef, useEffect } from "react";

/**
 * Zentraler Save-State. Verhindert Doppel-Klicks und gibt Spinner-State her.
 *
 *   const { saving, withSaving } = useSaving();
 *
 *   const save = () => withSaving(async () => {
 *     await actions.foo.create({...});
 *     show("Gespeichert");
 *   });
 *
 *   <button onClick={save} disabled={saving}>
 *     {saving ? <Spinner size={16} /> : "Speichern"}
 *   </button>
 *
 * Re-entrant-safe: zweiter withSaving-Call während saving=true wird
 * ignoriert (silent no-op). Errors werden NICHT verschluckt — der
 * Wrapper re-throwt aus dem try/finally, damit der Aufrufer-catch
 * weiter greift.
 */
export function useSaving() {
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const withSaving = useCallback(async (fn) => {
    if (savingRef.current) return; // bereits am Speichern, ignorieren
    savingRef.current = true;
    setSaving(true);
    try {
      return await fn();
    } finally {
      savingRef.current = false;
      if (mountedRef.current) setSaving(false);
    }
  }, []);

  return { saving, withSaving };
}
