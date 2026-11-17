// Fehlversuchs-Zähler des PIN-Logins, gerätebezogen und dauerhaft.
//
// Früher lag der Zähler nur im React-State: Ein Neuladen der Seite (oder
// ein Tipp auf "Erster Zugang?") setzte ihn zurück, die Sperre war damit
// wirkungslos. Jetzt liegt er im localStorage und überlebt Neuladen und
// App-Neustart. Das ist eine Bremse auf dem Gerät, kein Ersatz für die
// serverseitigen Limits.

const KEY = "ma_login_lock_v1";

export const KURZE_SPERRE_MS = 30 * 1000; // nach je 3 Fehlversuchen
export const LANGE_SPERRE_MS = 15 * 60 * 1000; // nach 10 Fehlversuchen
export const MAX_VERSUCHE = 10;

const leer = () => ({ attempts: 0, lockedUntil: null });

export function loadLock(now = Date.now()) {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "null");
    if (!raw || typeof raw.attempts !== "number") return leer();
    const until = raw.lockedUntil ? new Date(raw.lockedUntil).getTime() : 0;
    const aktiv = until > now;
    // Eine abgelaufene LANGE Sperre beginnt wieder bei 0 Versuchen.
    if (!aktiv && raw.attempts >= MAX_VERSUCHE) return leer();
    return { attempts: raw.attempts, lockedUntil: aktiv ? raw.lockedUntil : null };
  } catch {
    return leer();
  }
}

function save(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* localStorage nicht verfügbar → Sperre gilt nur bis zum Neuladen */
  }
}

/**
 * Einen Fehlversuch verbuchen.
 * @returns {{attempts:number, lockedUntil:string|null, lang:boolean}}
 */
export function registerFailure(now = Date.now()) {
  const attempts = loadLock(now).attempts + 1;
  let lockedUntil = null;
  let lang = false;
  if (attempts >= MAX_VERSUCHE) {
    lockedUntil = new Date(now + LANGE_SPERRE_MS).toISOString();
    lang = true;
  } else if (attempts % 3 === 0) {
    lockedUntil = new Date(now + KURZE_SPERRE_MS).toISOString();
  }
  const state = { attempts, lockedUntil };
  save(state);
  return { ...state, lang };
}

/** Nach erfolgreichem Login. */
export function clearLock() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* egal */
  }
}
