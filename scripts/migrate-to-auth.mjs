#!/usr/bin/env node
/**
 * MA Construction – Auth Migration Script
 *
 * Erstellt Supabase Auth-User für alle bestehenden public.users
 * und verknüpft sie über auth_id.
 *
 * Voraussetzung: migration_auth.sql muss bereits ausgeführt sein.
 *
 * Ausführung:
 *   SUPABASE_URL=https://xxx.supabase.co SUPABASE_SERVICE_KEY=eyJ... node scripts/migrate-to-auth.mjs
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Fehlende Umgebungsvariablen: SUPABASE_URL und SUPABASE_SERVICE_KEY');
  console.error('   SUPABASE_URL=https://xxx.supabase.co SUPABASE_SERVICE_KEY=eyJ... node scripts/migrate-to-auth.mjs');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function findPin(userId) {
  // Brute-force 4-digit PINs (1000-9999) via check_single_pin RPC
  for (let pin = 1000; pin <= 9999; pin++) {
    const candidate = String(pin);
    const { data, error } = await supabase.rpc('check_single_pin', {
      p_user_id: userId,
      candidate,
    });
    if (error) {
      console.error(`  ⚠️ Fehler bei PIN-Check ${candidate}:`, error.message);
      continue;
    }
    if (data === true) {
      return candidate;
    }
  }
  return null;
}

function generateUsername(name) {
  // "Altin Malici" → "a.malici"
  const parts = name.trim().toLowerCase().split(/\s+/);
  if (parts.length >= 2) {
    return parts[0][0] + '.' + parts[parts.length - 1];
  }
  return parts[0].replace(/[^a-z0-9]/g, '');
}

async function main() {
  console.log('🔄 MA Construction – Auth Migration\n');

  // 1. Alle User ohne auth_id laden
  const { data: users, error: loadErr } = await supabase
    .from('users')
    .select('id, name, username, is_onboarded, onboarding_pin, is_active')
    .is('auth_id', null)
    .order('created_at');

  if (loadErr) {
    console.error('❌ Fehler beim Laden der User:', loadErr.message);
    process.exit(1);
  }

  if (!users || users.length === 0) {
    console.log('✅ Keine User ohne auth_id gefunden. Migration bereits abgeschlossen.');
    return;
  }

  console.log(`📋 ${users.length} User ohne auth_id gefunden:\n`);

  let success = 0;
  let failed = 0;

  for (const user of users) {
    console.log(`--- ${user.name} (${user.id}) ---`);

    // Username sicherstellen
    let username = user.username;
    if (!username) {
      username = generateUsername(user.name);
      console.log(`  📝 Username generiert: ${username}`);

      // Prüfen ob Username schon existiert, ggf. Suffix anhängen
      const { data: existing } = await supabase
        .from('users')
        .select('id')
        .eq('username', username)
        .neq('id', user.id);

      if (existing && existing.length > 0) {
        username = username + Math.floor(Math.random() * 100);
        console.log(`  📝 Username-Konflikt, verwende: ${username}`);
      }

      // Username in DB speichern
      await supabase.from('users').update({ username }).eq('id', user.id);
    }

    const email = username + '@ma-construction.local';

    // PIN ermitteln
    let pin = null;
    if (user.is_onboarded) {
      console.log(`  🔍 Suche PIN (Brute-Force 1000-9999)...`);
      pin = await findPin(user.id);
      if (!pin) {
        console.error(`  ❌ PIN nicht gefunden! User wird übersprungen.`);
        failed++;
        continue;
      }
      console.log(`  ✅ PIN gefunden: ${pin}`);
    } else {
      // Nicht-onboarded: Onboarding-PIN verwenden
      pin = user.onboarding_pin;
      if (!pin) {
        // Fallback: Random PIN setzen
        pin = String(1000 + Math.floor(Math.random() * 9000));
        console.log(`  ⚠️ Kein Onboarding-PIN vorhanden, verwende zufällig: ${pin}`);
      } else {
        console.log(`  📝 Verwende Onboarding-PIN: ${pin}`);
      }
    }

    // Auth User erstellen via Admin API
    console.log(`  🔐 Erstelle Auth User: ${email}`);
    const { data: authUser, error: authErr } = await supabase.auth.admin.createUser({
      email,
      password: pin,
      email_confirm: true,
      user_metadata: { name: user.name },
    });

    if (authErr) {
      // Falls User bereits existiert (z.B. durch vorherigen Lauf)
      if (authErr.message?.includes('already been registered')) {
        console.log(`  ⚠️ Auth User existiert bereits. Suche auth_id...`);
        const { data: { users: authUsers } } = await supabase.auth.admin.listUsers();
        const existing = authUsers?.find(u => u.email === email);
        if (existing) {
          await supabase.from('users').update({ auth_id: existing.id }).eq('id', user.id);
          console.log(`  ✅ auth_id verknüpft: ${existing.id}`);
          success++;
        } else {
          console.error(`  ❌ Auth User nicht gefunden!`);
          failed++;
        }
        continue;
      }
      console.error(`  ❌ Auth User Erstellung fehlgeschlagen:`, authErr.message);
      failed++;
      continue;
    }

    // auth_id in public.users speichern
    const { error: updateErr } = await supabase
      .from('users')
      .update({ auth_id: authUser.user.id })
      .eq('id', user.id);

    if (updateErr) {
      console.error(`  ❌ auth_id Update fehlgeschlagen:`, updateErr.message);
      failed++;
      continue;
    }

    // Inaktive User in Auth bannen
    if (!user.is_active) {
      await supabase.auth.admin.updateUserById(authUser.user.id, {
        ban_duration: '876000h', // ~100 Jahre
      });
      console.log(`  🚫 User ist inaktiv → Auth gebannt`);
    }

    console.log(`  ✅ Auth User erstellt: ${authUser.user.id}`);
    success++;
  }

  console.log(`\n========================================`);
  console.log(`✅ Erfolgreich: ${success}`);
  if (failed > 0) console.log(`❌ Fehlgeschlagen: ${failed}`);
  console.log(`========================================`);

  // Verifizierung
  const { data: remaining } = await supabase
    .from('users')
    .select('id, name')
    .is('auth_id', null);

  if (remaining && remaining.length > 0) {
    console.log(`\n⚠️ ${remaining.length} User haben noch keine auth_id:`);
    remaining.forEach(u => console.log(`   - ${u.name} (${u.id})`));
  } else {
    console.log(`\n🎉 Alle User haben auth_id. Migration erfolgreich!`);
  }
}

main().catch(err => {
  console.error('❌ Unerwarteter Fehler:', err);
  process.exit(1);
});
