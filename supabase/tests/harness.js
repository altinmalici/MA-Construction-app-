// Test-Geruest fuer die SQL-Migrationen.
//
// Startet ein Wegwerf-Postgres im Arbeitsspeicher (PGlite, WASM) mit einem
// Supabase-aehnlichen Geruest (Rollen anon/authenticated, auth- und
// storage-Schema, auth.uid()) und spielt die Migrationen aus supabase/ in der
// Reihenfolge aus docs/SETUP.md ein. Die echte Datenbank wird NIE beruehrt.
//
// Grenzen: GoTrue selbst laeuft nicht (kein signInWithPassword); geprueft
// werden Policies, Grants und RPCs. Die Standard-Rechte fuer neue Tabellen
// (ALTER DEFAULT PRIVILEGES unten) bilden den Supabase-Standard nach — ob das
// Live-Projekt davon abweicht, zeigt nur ein Blick ins Dashboard.
import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const CHEF_AUTH = '11111111-1111-1111-1111-111111111111';
export const BASE = [
  'schema.sql','migration_login_rebuild.sql','migration_auth.sql','migration_rls.sql',
  'migration_cleanup.sql','migration_check_pin_exists_hardening.sql','migration_storage_buckets.sql',
  'migration_dokumente_storage_path.sql','migration_sync_baustelle_junctions.sql',
  'migration_security_guards.sql','migration_hardening.sql','migration_stunden_freigabe.sql',
  'migration_pin_throttle.sql','migration_error_log.sql','migration_onboarding_pin_hash.sql',
];

const PRELUDE = `
CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN BYPASSRLS;
CREATE SCHEMA extensions; CREATE SCHEMA auth; CREATE SCHEMA storage;
CREATE EXTENSION pgcrypto WITH SCHEMA extensions;
ALTER DATABASE postgres SET search_path = "$user", public, extensions;
SET search_path = "$user", public, extensions;
GRANT USAGE ON SCHEMA public, extensions, auth, storage TO anon, authenticated;
CREATE TABLE auth.users (
  id uuid PRIMARY KEY, instance_id uuid, email text UNIQUE, encrypted_password text,
  email_confirmed_at timestamptz, aud text, role text, raw_app_meta_data jsonb, raw_user_meta_data jsonb,
  created_at timestamptz, updated_at timestamptz, banned_until timestamptz, last_sign_in_at timestamptz,
  confirmation_token text, recovery_token text, email_change text, email_change_token_new text,
  email_change_token_current text, phone_change text, phone_change_token text, reauthentication_token text);
CREATE TABLE auth.identities (
  id uuid PRIMARY KEY, user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE, provider_id text, provider text,
  identity_data jsonb, last_sign_in_at timestamptz, created_at timestamptz, updated_at timestamptz);
CREATE TABLE auth.sessions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE);
CREATE TABLE auth.refresh_tokens (id bigserial PRIMARY KEY, user_id text, session_id uuid REFERENCES auth.sessions(id) ON DELETE CASCADE);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
CREATE TABLE storage.buckets (id text PRIMARY KEY, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
CREATE TABLE storage.objects (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), bucket_id text, name text);
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
-- Supabase-Standard: neue Objekte in public sind fuer anon/authenticated voll freigegeben.
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated;
`;

const DIR = fileURLToPath(new URL('..', import.meta.url));

export async function makeDb(extra = [], dir = DIR) {
  const db = new PGlite({ extensions: { pgcrypto } });
  await db.exec(PRELUDE);
  for (const f of [...BASE, ...extra]) {
    try { await db.exec(readFileSync(join(dir, f), 'utf8')); }
    catch (e) { throw new Error(`[${f}] ${e.message}`); }
    // Entspricht scripts/migrate-to-auth.mjs: Seed-Chef bekommt ein Auth-Konto.
    if (f === 'migration_auth.sql') await db.exec(`
      INSERT INTO auth.users(id,email,encrypted_password,email_confirmed_at,
        confirmation_token,recovery_token,email_change,email_change_token_new,
        email_change_token_current,phone_change,phone_change_token,reauthentication_token)
      VALUES ('${CHEF_AUTH}','a.malici@ma-construction.local', crypt('1998', gen_salt('bf')), now(),
        '','','','','','','','');
      UPDATE users SET auth_id='${CHEF_AUTH}' WHERE username='a.malici';`);
  }
  return db;
}

// Fuehrt fn als Rolle mit gesetzter auth.uid() aus (wie ein PostgREST-Request).
export async function as(db, role, authId, fn) {
  await db.exec(`SET ROLE ${role}; SELECT set_config('request.jwt.claim.sub', '${authId ?? ''}', false);`);
  try { return await fn(); }
  finally { await db.exec(`RESET ROLE; SELECT set_config('request.jwt.claim.sub', '', false);`); }
}

// Kurzform: Zeilen einer Abfrage.
export const rows = async (db, sql, params) => (await db.query(sql, params)).rows;

// Legt als Chef einen eingeladenen Mitarbeiter an und gibt {id, authId} zurueck.
export async function addMitarbeiter(db, name, username, pin = '4711') {
  const id = await as(db, 'authenticated', CHEF_AUTH, async () =>
    (await rows(db, `SELECT create_user_with_auth($1,$2,40,$3, now() + interval '7 days') AS id`, [name, username, pin]))[0].id);
  const authId = (await rows(db, 'SELECT auth_id FROM users WHERE id = $1', [id]))[0].auth_id;
  return { id, authId };
}
