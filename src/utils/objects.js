// Entfernt Keys mit Wert `undefined` aus einem flachen Objekt.
// Null-Werte, leere Strings, 0, false bleiben erhalten — die sind
// explizit gesetzt und sollen in die DB durchgeschrieben werden.
// Defensiv gegen null/undefined-Input.
export const stripUndefined = (obj) => {
  if (obj === null || typeof obj !== "object") return {};
  const out = {};
  for (const k of Object.keys(obj)) {
    if (obj[k] !== undefined) out[k] = obj[k];
  }
  return out;
};
