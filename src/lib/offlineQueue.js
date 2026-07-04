// Offline-Warteschlange fuer Stundeneintraege.
//
// Baustellen haben oft schlechten Empfang. Schlaegt ein Speichern wegen
// fehlender Verbindung fehl, landet der Eintrag hier (localStorage) und wird
// automatisch synchronisiert, sobald wieder Netz da ist.
//
// SICHERHEIT gegen Datenverlust/Duplikate:
// - Jeder Eintrag traegt eine feste, client-seitig vergebene UUID → ein
//   erneuter Insert derselben ID ist idempotent (Primaerschluessel-Konflikt
//   wird beim Sync als "schon synchronisiert" behandelt).
// - Eintraege werden ERST aus der Queue entfernt, wenn der Insert bestaetigt
//   ist (oder als Duplikat erkannt wurde). Nie vorher.
//
// Bewusst NICHT offline: neue Fotos (brauchen Upload/Netz). Eintraege mit
// bereits hochgeladenen Foto-Pfaden sind ok.

const KEY = "ma_offline_queue_v1";

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function write(arr) {
  try {
    localStorage.setItem(KEY, JSON.stringify(arr));
    return true;
  } catch {
    // localStorage voll/nicht verfuegbar → false, Aufrufer meldet Fehler.
    return false;
  }
}

/**
 * Legt einen Stundeneintrag in die Warteschlange.
 * @param {object} entry  Der Eintrag inkl. fester `id` (UUID).
 * @returns {boolean} true wenn gespeichert.
 */
export function enqueueStunde(entry) {
  if (!entry || !entry.id) return false;
  const q = read();
  // Dedup: gleiche id nicht doppelt einreihen.
  if (q.some((item) => item.entry?.id === entry.id)) return true;
  q.push({ id: entry.id, entry, queuedAt: new Date().toISOString() });
  return write(q);
}

/** Alle wartenden Eintraege (aelteste zuerst). */
export function getQueue() {
  return read();
}

/** Anzahl wartender Eintraege. */
export function queueSize() {
  return read().length;
}

/** Entfernt einen erledigten Eintrag aus der Queue. */
export function dequeue(id) {
  const q = read().filter((item) => item.id !== id);
  return write(q);
}

/** Leert die gesamte Queue (nur fuer Tests/Reset). */
export function clearQueue() {
  return write([]);
}
