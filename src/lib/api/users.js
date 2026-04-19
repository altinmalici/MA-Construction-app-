import { supabase } from '../supabase.js';
import { stripUndefined } from '../../utils/objects.js';

export async function getAll() {
  const { data, error } = await supabase
    .from('users')
    .select('id, name, role, stundensatz, username, is_onboarded, is_active, onboarding_pin_expiry')
    .order('created_at');
  if (error) throw error;
  return data.map(u => ({
    id: u.id,
    name: u.name,
    role: u.role,
    stundensatz: u.stundensatz,
    username: u.username,
    isOnboarded: u.is_onboarded,
    isActive: u.is_active,
    onboardingPinExpiry: u.onboarding_pin_expiry,
  }));
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
