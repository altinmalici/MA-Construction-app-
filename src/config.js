// Zentrale Schalter und Zeiten der App.

// Sperre (PIN-Wiedereingabe), wenn die App so lange im Hintergrund war.
export const BACKGROUND_LOCK_MS = 120 * 1000;

// Sperre, wenn die App so lange OFFEN, aber unbenutzt war (z.B. Handy liegt
// entsperrt auf der Baustelle). 0 = abgeschaltet. Die Sperre legt sich nur
// über den aktuellen Screen — Eingaben in Formularen bleiben erhalten.
export const INACTIVITY_LOCK_MS = 15 * 60 * 1000;
