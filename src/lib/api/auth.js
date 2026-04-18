import { supabase } from '../supabase.js';

/**
 * Mode C Login: PIN → lookup → signInWithPassword → Profil
 */
export async function login(pin) {
  // 1. Lookup: PIN → username + auth_id
  const { data: lookupData, error: lookupErr } = await supabase.rpc('lookup_user_by_pin', { pin_input: pin });
  if (lookupErr) throw lookupErr;
  if (!lookupData || lookupData.length === 0) return null;

  const found = lookupData[0];

  // Wenn User nicht onboarded ist, geben wir das zurück (Mode B)
  // Wir müssen trotzdem signIn machen, damit die Session existiert
  const email = found.username + '@ma-construction.local';

  // 2. signInWithPassword
  const { error: signInErr } = await supabase.auth.signInWithPassword({
    email,
    password: pin,
  });
  if (signInErr) throw signInErr;

  // 3. Profil laden via RPC
  const { data: profile, error: profileErr } = await supabase.rpc('get_user_by_auth_id');
  if (profileErr) throw profileErr;
  if (!profile || profile.length === 0) return null;

  const user = profile[0];
  return {
    id: user.id,
    name: user.name,
    role: user.role,
    stundensatz: user.stundensatz,
    username: user.username,
    isOnboarded: user.is_onboarded,
  };
}

/**
 * Targeted Mode C Login: erwartet Username (vom "Willkommen zurück"-Screen)
 * und versucht direkt signInWithPassword. Schließt aus, dass ein PIN
 * eines anderen Users zufällig auf den falschen Account einloggt.
 * Gibt User-Profil zurück oder null bei falschem PIN.
 */
export async function loginAsUser(username, pin) {
  const email = username + '@ma-construction.local';
  const { error: signInErr } = await supabase.auth.signInWithPassword({
    email,
    password: pin,
  });
  if (signInErr) return null;

  const { data: profile, error: profileErr } = await supabase.rpc('get_user_by_auth_id');
  if (profileErr || !profile || profile.length === 0) return null;

  const user = profile[0];
  return {
    id: user.id,
    name: user.name,
    role: user.role,
    stundensatz: user.stundensatz,
    username: user.username,
    isOnboarded: user.is_onboarded,
  };
}

/**
 * Mode A Login: Username + Onboarding-PIN → lookup → signInWithPassword
 */
export async function loginWithUsername(username, onboardingPin) {
  // 1. Lookup: Username + Onboarding-PIN → auth_id
  const { data: lookupData, error: lookupErr } = await supabase.rpc('lookup_user_for_onboarding', {
    username_input: username,
    onboarding_pin_input: onboardingPin,
  });
  if (lookupErr) throw lookupErr;
  if (!lookupData || lookupData.length === 0) return null;

  const found = lookupData[0];
  const email = found.username + '@ma-construction.local';

  // 2. signInWithPassword (Passwort = Onboarding-PIN)
  const { error: signInErr } = await supabase.auth.signInWithPassword({
    email,
    password: onboardingPin,
  });
  if (signInErr) throw signInErr;

  // 3. Profil laden
  const { data: profile, error: profileErr } = await supabase.rpc('get_user_by_auth_id');
  if (profileErr) throw profileErr;
  if (!profile || profile.length === 0) return null;

  const user = profile[0];
  return {
    id: user.id,
    name: user.name,
    role: user.role,
    stundensatz: user.stundensatz,
    username: user.username,
  };
}

/**
 * Mode B: Onboarding abschließen (neuen PIN setzen)
 * Danach re-auth mit neuem PIN
 */
export async function completeOnboarding(userId, newPin) {
  const { error } = await supabase.rpc('complete_onboarding_v2', {
    p_user_id: userId,
    p_new_pin: newPin,
  });
  if (error) throw error;

  // Re-auth: Session mit neuem Passwort auffrischen
  // Wir brauchen den Username des Users
  const { data: profile } = await supabase.rpc('get_user_by_auth_id');
  if (profile && profile.length > 0) {
    const email = profile[0].username + '@ma-construction.local';
    // Erst ausloggen, dann mit neuem PIN einloggen
    await supabase.auth.signOut();
    const { error: reAuthErr } = await supabase.auth.signInWithPassword({
      email,
      password: newPin,
    });
    if (reAuthErr) throw reAuthErr;
  }
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

  const { data: profile, error } = await supabase.rpc('get_user_by_auth_id');
  if (error || !profile || profile.length === 0) return null;

  const user = profile[0];
  return {
    id: user.id,
    name: user.name,
    role: user.role,
    stundensatz: user.stundensatz,
    username: user.username,
    isOnboarded: user.is_onboarded,
  };
}

/**
 * Re-Auth nach PIN-Änderung (für ProfilView)
 */
export async function reAuthWithPin(username, newPin) {
  const email = username + '@ma-construction.local';
  // SignOut + SignIn mit neuem PIN
  await supabase.auth.signOut();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: newPin,
  });
  if (error) throw error;
}

/**
 * onAuthStateChange Listener registrieren
 */
export function onAuthStateChange(callback) {
  return supabase.auth.onAuthStateChange(callback);
}
