import { supabase } from '../supabase.js';

export async function login(pin) {
  const { data, error } = await supabase.rpc('login_with_pin', { pin_input: pin });
  if (error) throw error;
  if (!data || data.length === 0) return null;
  const user = data[0];
  return { id: user.id, name: user.name, role: user.role, stundensatz: user.stundensatz, username: user.username, isOnboarded: user.is_onboarded };
}

export async function loginWithUsername(username, onboardingPin) {
  const { data, error } = await supabase.rpc('login_with_username', {
    username_input: username,
    onboarding_pin_input: onboardingPin,
  });
  if (error) throw error;
  if (!data || data.length === 0) return null;
  const user = data[0];
  return { id: user.id, name: user.name, role: user.role, stundensatz: user.stundensatz, username: user.username };
}

export async function completeOnboarding(userId, newPin) {
  const { error } = await supabase.rpc('complete_onboarding', {
    p_user_id: userId,
    p_new_pin: newPin,
  });
  if (error) throw error;
}
