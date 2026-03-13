import { supabase } from '../supabase.js';

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

export async function create({ name, role, pin, stundensatz }) {
  // Hash the PIN server-side via RPC
  const { data, error } = await supabase.rpc('create_user_with_pin', {
    user_name: name,
    user_role: role,
    user_pin: pin,
    user_stundensatz: stundensatz || 45,
  });
  if (error) throw error;
  return data;
}

export async function createForOnboarding({ name, username, stundensatz, onboardingPin }) {
  const expiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase.rpc('create_user_for_onboarding', {
    p_name: name,
    p_username: username,
    p_stundensatz: stundensatz || 45,
    p_onboarding_pin: onboardingPin,
    p_onboarding_pin_expiry: expiry,
  });
  if (error) throw error;
  return data;
}

export async function update(id, { name, pin, stundensatz }) {
  // If PIN changed, update hash via RPC
  if (pin) {
    const { error: pinErr } = await supabase.rpc('update_user_pin', {
      user_id: id,
      new_pin: pin,
    });
    if (pinErr) throw pinErr;
  }
  const { data, error } = await supabase
    .from('users')
    .update({ name, stundensatz })
    .eq('id', id)
    .select('id, name, role, stundensatz')
    .single();
  if (error) throw error;
  return data;
}

export async function remove(id) {
  const { error } = await supabase.from('users').delete().eq('id', id);
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
  const { error } = await supabase.rpc('reset_onboarding_pin', {
    p_user_id: id,
    p_new_pin: newPin,
    p_onboarding_pin_expiry: expiry,
    p_username: username,
  });
  if (error) throw error;
}

export async function toggleActive(id, isActive) {
  const { error } = await supabase
    .from('users')
    .update({ is_active: isActive })
    .eq('id', id);
  if (error) throw error;
}
