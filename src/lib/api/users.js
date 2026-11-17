import { supabase } from '../supabase.js';
import { stripUndefined } from '../../utils/objects.js';
import { selectAll, requestWithRetry } from './_request.js';

export async function getAll({ signal } = {}) {
  // 6-04: Retry/Abort/Timeout-Wrapper. RPC-Calls (checkPinExists,
  // resetOnboardingPin, toggleActive, create*) bleiben unwrapped —
  // Brief: nur supabase.from().select() wird gewickelt, keine RPCs.
  // Zwei Quellen (supabase/migration_2026_11_18_03_lohndaten_schutz.sql):
  //  * Tabelle users – Chef: alle Zeilen; Mitarbeiter nach der Migration nur
  //    noch die eigene (vorher alle).
  //  * kollegen_liste() – Namen aller Nutzer ohne Stundensatz. Fehlt die
  //    Funktion (Migration nicht angewandt), reicht die Tabelle wie bisher.
  const [{ data, error }, kollegen] = await Promise.all([
    selectAll(
    () =>
      supabase
        .from('users')
        .select(
          'id, name, role, stundensatz, username, is_onboarded, is_active, onboarding_pin_expiry',
        )
        .order('created_at')
        .order('id'),
    { signal },
    ),
    requestWithRetry(() => supabase.rpc('kollegen_liste'), { signal }),
  ]);
  if (error) throw error;
  if (kollegen?.error && !istRpcFehlt(kollegen.error)) throw kollegen.error;
  const byId = new Map();
  (kollegen?.data || []).forEach(u => {
    byId.set(u.id, { id: u.id, name: u.name, role: u.role, isActive: u.is_active });
  });
  // Zeilen aus der Tabelle sind vollständig und gehen vor.
  data.forEach(u => {
    byId.set(u.id, {
      id: u.id,
      name: u.name,
      role: u.role,
      stundensatz: u.stundensatz,
      username: u.username,
      isOnboarded: u.is_onboarded,
      isActive: u.is_active,
      onboardingPinExpiry: u.onboarding_pin_expiry,
    });
  });
  return [...byId.values()];
}

export async function create({ name, role, pin, stundensatz, username }) {
  // v2: Erstellt auth + public User synchron
  const { data, error } = await supabase.rpc('create_user_with_pin_v2', {
    p_name: name,
    p_role: role,
    p_pin: pin,
    p_stundensatz: stundensatz || 45,
    p_username: username,
  });
  if (error) throw error;
  return data;
}

export async function createForOnboarding({ name, username, stundensatz, onboardingPin }) {
  const expiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase.rpc('create_user_with_auth', {
    p_name: name,
    p_username: username,
    p_stundensatz: stundensatz || 45,
    p_onboarding_pin: onboardingPin,
    p_onboarding_pin_expiry: expiry,
  });
  if (error) throw error;
  return data;
}

export async function update(id, { name, pin, stundensatz } = {}) {
  // If PIN changed, update hash via v2 RPC (auth + public)
  if (pin) {
    const { error: pinErr } = await supabase.rpc('update_user_pin_v2', {
      p_user_id: id,
      p_new_pin: pin,
    });
    if (pinErr) throw pinErr;
  }
  const payload = stripUndefined({ name, stundensatz });
  if (Object.keys(payload).length === 0) {
    // Nothing to write — no-op (avoids unnecessary roundtrip + accidental NULLs).
    return null;
  }
  const { data, error } = await supabase
    .from('users')
    .update(payload)
    .eq('id', id)
    .select('id, name, role, stundensatz')
    .single();
  if (error) throw error;
  return data;
}

export async function remove(id) {
  // v2: Löscht auth + public User synchron
  const { error } = await supabase.rpc('delete_user_with_auth', {
    p_user_id: id,
  });
  if (error) throw error;
}

export async function checkPinExists(pin, excludeUserId = null) {
  const { data, error } = await supabase.rpc('check_pin_exists', {
    pin_input: pin,
    exclude_user_id: excludeUserId,
  });
  if (error) throw error;
  return data;
}

export async function resetOnboardingPin(id, newPin, username = null) {
  const expiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const { error } = await supabase.rpc('reset_onboarding_v2', {
    p_user_id: id,
    p_new_pin: newPin,
    p_expiry: expiry,
    p_username: username,
  });
  if (error) throw error;
}

export async function toggleActive(id, isActive) {
  const { error } = await supabase.rpc('toggle_user_active_v2', {
    p_user_id: id,
    p_is_active: isActive,
  });
  if (error) throw error;
}

// ── Einladungs-Link + Reparatur (migration_2026_11_16_04_onboarding.sql) ──

// true, wenn die aufgerufene DB-Funktion (noch) nicht existiert — also die
// Migration nicht angewandt ist. Dann nutzt die App den alten Ablauf.
export function istRpcFehlt(error) {
  if (!error) return false;
  return (
    error.code === 'PGRST202' ||
    error.code === '42883' ||
    /could not find the function|function .* does not exist/i.test(String(error.message || ''))
  );
}

/** Chef: neuen Einladungs-Link-Token für einen Mitarbeiter erzeugen. */
export async function createOnboardingToken(userId) {
  const { data, error } = await supabase.rpc('create_onboarding_token', { p_user_id: userId });
  if (error) throw error;
  return data;
}

/** Chef: offene Einladungs-Links eines Mitarbeiters ungültig machen. */
export async function revokeOnboardingTokens(userId) {
  const { data, error } = await supabase.rpc('revoke_onboarding_tokens', { p_user_id: userId });
  if (error) throw error;
  return data;
}

/** Chef: Profil und Auth-Konto eines Mitarbeiters in Einklang bringen. */
export async function repairUser(userId) {
  const { data, error } = await supabase.rpc('repair_orphan_user', { p_user_id: userId });
  if (error) throw error;
  return data; // 'ok' oder kommagetrennte Liste der Korrekturen
}

/** Chef: Auth-Konten ohne Profil entfernen. Liefert die Anzahl. */
export async function cleanupOrphanAuthUsers() {
  const { data, error } = await supabase.rpc('cleanup_orphan_auth_users');
  if (error) throw error;
  return data;
}
