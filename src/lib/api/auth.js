import { supabase } from '../supabase.js';

/**
 * Map RPC-Profil-Row → konsumierter User-Shape (camelCase).
 * Single Source of Truth für die Profil-Form, damit alle Login-Pfade
 * konsistente Felder zurückgeben.
 */
function _mapProfile(u) {
  return {
    id: u.id,
    name: u.name,
    role: u.role,
    stundensatz: u.stundensatz,
    username: u.username,
    isOnboarded: u.is_onboarded,
  };
}

/**
 * Profil aus aktiver Session laden (get_user_by_auth_id RPC).
 * Wirft bei RPC-Error, returnt null bei leerer Antwort.
 */
async function _loadProfile() {
  const { data: profile, error } = await supabase.rpc('get_user_by_auth_id');
  if (error) throw error;
  if (!profile || profile.length === 0) return null;
  return _mapProfile(profile[0]);
}

/**
 * Login-Fehler, der KEIN falscher PIN ist. `kind`:
 *  - "netz"        keine Verbindung / Server nicht erreichbar
 *  - "limit"       zu viele Versuche (Rate-Limit von Supabase Auth)
 *  - "gesperrt"    Konto deaktiviert oder ohne aktives Profil
 *  - "konto"       Einladung gültig, aber das Auth-Konto passt nicht dazu
 *  - "unbekannt"   alles andere
 * Die UI zeigt dafür eine eigene Meldung und zählt KEINEN Fehlversuch.
 */
export class LoginError extends Error {
  constructor(kind, cause) {
    super(`Login fehlgeschlagen (${kind})`);
    this.name = 'LoginError';
    this.kind = kind;
    this.cause = cause;
  }
}

// Ordnet einen Fehler von signInWithPassword ein.
function _classifySignInError(error) {
  const msg = String(error?.message || '');
  if (error?.code === 'user_banned' || /banned/i.test(msg)) return 'gesperrt';
  if (error?.code === 'invalid_credentials' || /invalid login credentials/i.test(msg)) return 'falsch';
  if (error?.status === 429 || /rate limit/i.test(msg)) return 'limit';
  if (
    !error?.status ||
    error.status >= 500 ||
    error?.name === 'AuthRetryableFetchError' ||
    /failed to fetch|load failed|network/i.test(msg)
  ) {
    return 'netz';
  }
  return 'unbekannt';
}

const _email = (username) =>
  String(username || '').trim().toLowerCase() + '@ma-construction.local';

/**
 * signIn + Profil-Load-Pipeline.
 * @returns Profil, oder null bei FALSCHEM PIN. Alles andere wirft LoginError
 *   (früher wurde jeder Fehler — auch "kein Netz" — als falscher PIN gewertet
 *   und zählte auf die Sperre).
 */
async function _signInAndLoadProfile(email, password) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    const kind = _classifySignInError(error);
    if (kind === 'falsch') return null;
    throw new LoginError(kind, error);
  }
  let profile;
  try {
    profile = await _loadProfile();
  } catch (e) {
    throw new LoginError('netz', e);
  }
  if (!profile) {
    // Auth-Konto ok, aber kein aktives Profil (deaktiviert/gelöscht):
    // Sitzung nicht stehen lassen.
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch {
      /* best effort */
    }
    throw new LoginError('gesperrt');
  }
  return profile;
}

/**
 * PIN-Login, IMMER an einen Benutzernamen gebunden ("Willkommen zurück" oder
 * Eingabe auf neuem Gerät). Es gibt bewusst keine globale PIN-Suche mehr:
 * die frühere RPC lookup_user_by_pin verriet zu einem PIN den Benutzernamen
 * und konnte bei doppelt vergebenem PIN den falschen Account einloggen.
 * @returns Profil oder null bei falschem PIN; wirft LoginError sonst.
 */
export async function loginAsUser(username, pin) {
  return _signInAndLoadProfile(_email(username), pin);
}

/**
 * Mode A Login: Username + Onboarding-PIN → lookup → signInWithPassword
 */
export async function loginWithUsername(username, onboardingPin) {
  const { data: lookupData, error: lookupErr } = await supabase.rpc('lookup_user_for_onboarding', {
    username_input: username,
    onboarding_pin_input: onboardingPin,
  });
  if (lookupErr) throw lookupErr;
  if (!lookupData || lookupData.length === 0) return null;

  const found = lookupData[0];
  const profile = await _signInAndLoadProfile(_email(found.username), onboardingPin);
  // Einladung ist gültig, aber die Anmeldung mit demselben PIN scheitert:
  // public.users und auth.users sind nicht synchron (Zombie-Konto).
  if (!profile) throw new LoginError('konto');
  return profile;
}

/**
 * Mode B: Onboarding abschließen (neuen PIN setzen).
 * complete_onboarding_v2 setzt auth.users.encrypted_password UND
 * public.users.pin_hash in einer Transaktion — die laufende Session bleibt
 * dabei gültig (GoTrue invalidiert Sessions bei DB-seitigem Passwort-Update
 * nicht). WICHTIG: Hier darf KEIN supabase.auth.updateUser({password})
 * folgen — GoTrues Passwort-Policy verlangt min. 6 Zeichen und lehnt den
 * 4-stelligen PIN mit 422 weak_password ab, was das Onboarding nach
 * bereits erfolgtem DB-Update scheitern ließ (Einladungs-Code verbrannt).
 */
export async function completeOnboarding(userId, newPin) {
  const { error } = await supabase.rpc('complete_onboarding_v2', {
    p_user_id: userId,
    p_new_pin: newPin,
  });
  if (error) throw error;
}

/**
 * Einladungs-Link prüfen. Liefert {name, username, expiresAt} oder null,
 * wenn der Link ungültig, abgelaufen oder schon eingelöst ist.
 */
export async function validateOnboardingToken(token) {
  const { data, error } = await supabase.rpc('validate_onboarding_token', { p_token: token });
  if (error) throw error;
  if (!data || data.length === 0) return null;
  return { name: data[0].name, username: data[0].username, expiresAt: data[0].expires_at };
}

/**
 * Einladungs-Link einlösen: setzt den eigenen PIN und meldet direkt an.
 * Wirft bei ungültigem Link / vergebenem PIN (deutsche Meldung vom Server).
 * @returns Profil des angemeldeten Nutzers
 */
export async function consumeOnboardingToken(token, newPin) {
  const { data: username, error } = await supabase.rpc('consume_onboarding_token', {
    p_token: token,
    p_new_pin: newPin,
  });
  if (error) throw error;
  const profile = await _signInAndLoadProfile(_email(username), newPin);
  // PIN wurde eben gesetzt — scheitert die Anmeldung trotzdem, ist das Konto
  // nicht synchron.
  if (!profile) throw new LoginError('konto');
  return profile;
}

/**
 * Logout
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (!error) return;
  // Ohne Netz scheitert das serverseitige Abmelden, und supabase-js (ab
  // 2.119) lässt die Sitzung dann im Gerät. scope:'local' entfernt sie
  // zuerst lokal (und feuert SIGNED_OUT) und meldet erst danach den
  // Netzfehler des Widerrufs — der ist hier egal. Fehler ist es nur, wenn
  // danach immer noch eine Sitzung da ist.
  await supabase.auth.signOut({ scope: 'local' });
  const { data } = await supabase.auth.getSession();
  if (data?.session) throw error;
}

/**
 * Aktuelle Session prüfen (App-Start)
 * Gibt User-Profil zurück wenn Session gültig, sonst null
 */
export async function getCurrentUser() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;
  try {
    return await _loadProfile();
  } catch {
    return null;
  }
}

/**
 * onAuthStateChange Listener registrieren
 */
export function onAuthStateChange(callback) {
  return supabase.auth.onAuthStateChange(callback);
}
