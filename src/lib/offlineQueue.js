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
    // Signal fuer die UI (Pending-Badge), damit sie sich sofort aktualisiert.
    try {
      window.dispatchEvent(
        new CustomEvent("ma-queue-change", { detail: { size: arr.length } }),
      );
    } catch {
      /* window evtl. nicht verfuegbar (Tests) */
    }
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

/** Alle Eintraege der Queue (aelteste zuerst), auch fehlgeschlagene. */
export function getQueue() {
  return read();
}

/** Anzahl aller Eintraege in der Queue. */
export function queueSize() {
  return read().length;
}

// ---- Dauerhaft fehlgeschlagene Eintraege ---------------------------------
// Lehnt die Datenbank einen Eintrag endgueltig ab (Zuweisung entfernt,
// Baustelle geloescht, ungueltiges Datum), bringt Wiederholen nichts. Der
// Eintrag wird dann als "failed" markiert: Er bleibt in der Queue (kein
// stiller Verlust), wird aber nicht mehr automatisch gesendet, sondern dem
// Nutzer gezeigt — der entscheidet: erneut versuchen oder verwerfen.

const DAUERFEHLER = {
  42501: "Keine Berechtigung (Zuweisung zur Baustelle fehlt?)",
  23503: "Baustelle oder Mitarbeiter existiert nicht mehr",
  23514: "Ein Wert ist nicht zulässig",
  23502: "Ein Pflichtfeld fehlt",
  22007: "Ungültiges Datum",
  22008: "Ungültiges Datum",
  "22P02": "Ungültige Eingabe",
};

/** Text, wenn `err` ein Dauerfehler ist — sonst null (dann: spaeter erneut). */
export function dauerfehlerText(err) {
  if (!err) return null;
  if (err.code && DAUERFEHLER[err.code]) return DAUERFEHLER[err.code];
  if (/row-level security/i.test(String(err.message || ""))) return DAUERFEHLER[42501];
  return null;
}

/** Markiert einen Eintrag als dauerhaft fehlgeschlagen. */
export function markFailed(id, grund) {
  const q = read().map((item) =>
    item.id === id
      ? { ...item, failed: { grund, at: new Date().toISOString() } }
      : item,
  );
  return write(q);
}

/** Fehlgeschlagene Eintraege (fuer die Anzeige). */
export function getFailed() {
  return read().filter((item) => item.failed);
}

/** Eintraege, die noch automatisch gesendet werden. */
export function getPending() {
  return read().filter((item) => !item.failed);
}

/** Setzt fehlgeschlagene Eintraege zurueck auf "wartend" (neuer Versuch). */
export function retryFailed() {
  const q = read().map((item) => {
    if (!item.failed) return item;
    const { failed: _failed, ...rest } = item;
    return rest;
  });
  return write(q);
}

/**
 * Gehoert der Eintrag zu diesem Nutzer? Mitarbeiter senden und sehen nur EIGENE
 * Eintraege; liegen auf einem geteilten Handy Eintraege eines Kollegen in
 * der Queue, warten sie auf dessen Anmeldung (oder die des Chefs).
 */
export function gehoertZu(item, userId, isChef) {
  if (isChef) return true;
  // Einträge ohne Mitarbeiter (Sub/Sonstige) kann nur der Chef anlegen und
  // laut RLS auch nur der Chef senden.
  return !!userId && item?.entry?.mitarbeiterId === userId;
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
