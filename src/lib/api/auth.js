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
 * signIn + Profil-Load-Pipeline. Konsolidiert die 3 Login-Funktionen.
 * @param {string} email
 * @param {string} password
 * @param {object} [opts]
 * @param {boolean} [opts.silent=false] true → falsche Credentials liefern
 *   null statt Throw (für targeted Login wo "falscher PIN" expected ist).
 */
async function _signInAndLoadProfile(email, password, { silent = false } = {}) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    if (silent) return null;
    throw error;
  }
  return _loadProfile();
}

/**
 * Mode C Login: PIN → lookup → signInWithPassword → Profil
 */
export async function login(pin) {
  // 1. Lookup: PIN → username + auth_id
  const { data: lookupData, error: lookupErr } = await supabase.rpc('lookup_user_by_pin', { pin_input: pin });
  if (lookupErr) throw lookupErr;
  if (!lookupData || lookupData.length === 0) return null;

  const found = lookupData[0];
  const email = found.username + '@ma-construction.local';
  return _signInAndLoadProfile(email, pin);
}

/**
 * Targeted Mode C Login: erwartet Username (vom "Willkommen zurück"-Screen)
 * und versucht direkt signInWithPassword. Schließt aus, dass ein PIN
 * eines anderen Users zufällig auf den falschen Account einloggt.
 * Gibt User-Profil zurück oder null bei falschem PIN.
 */
export async function loginAsUser(username, pin) {
  const email = username + '@ma-construction.local';
  return _signInAndLoadProfile(email, pin, { silent: true });
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
  const email = found.username + '@ma-construction.local';
  return _signInAndLoadProfile(email, onboardingPin);
}

/**
 * Mode B: Onboarding abschließen (neuen PIN setzen).
 * Synct anschließend auth.users.encrypted_password via updateUser, damit die
 * laufende Session sofort gültig bleibt — kein signOut/signIn-Flip mehr,
 * sonst wäre der User bei kurzem Netz-Drop ungewollt komplett ausgeloggt.
 */
export async function completeOnboarding(userId, newPin) {
  const { error } = await supabase.rpc('complete_onboarding_v2', {
    p_user_id: userId,
    p_new_pin: newPin,
  });
  if (error) throw error;

  const { error: updErr } = await supabase.auth.updateUser({ password: newPin });
  if (updErr) throw updErr;
}

/**
 * Logout
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
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
 * Sync der Auth-Session nach PIN-Änderung (z.B. ProfilView).
 * Nutzt updateUser statt signOut+signIn — Session bleibt aktiv, keine
 * Race-Condition mit anderen API-Calls, kein onAuthStateChange-Flip.
 * Der `username`-Parameter bleibt aus Backwards-Compat-Gründen erhalten,
 * wird aber nicht mehr benötigt (updateUser wirkt auf den aktuellen User).
 */
export async function reAuthWithPin(username, newPin) {
  const { error } = await supabase.auth.updateUser({ password: newPin });
  if (error) throw error;
}

/**
 * onAuthStateChange Listener registrieren
 */
export function onAuthStateChange(callback) {
  return supabase.auth.onAuthStateChange(callback);
}
