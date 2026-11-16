// @vitest-environment node
import { describe, it, expect, beforeAll } from 'vitest';
import { makeDb, as, rows, CHEF_AUTH } from './harness.js';

let db;
const q = (s, p) => rows(db, s, p);

beforeAll(async () => {
  db = await makeDb([
    'migration_2026_11_16_01_security_hardening.sql',
    'migration_2026_11_16_03_pin_lookup_sperren.sql',
    'migration_2026_11_16_03_pin_lookup_sperren.sql', // wiederholbar
  ]);
}, 120000);

describe('Globale PIN-Suche ist von aussen gesperrt', () => {
  it('anon und eingeloggte Nutzer koennen lookup_user_by_pin nicht mehr rufen', async () => {
    await expect(as(db, 'anon', null, () => q(`SELECT * FROM lookup_user_by_pin('1998')`))).rejects.toThrow(/permission denied/i);
    await expect(as(db, 'authenticated', CHEF_AUTH, () => q(`SELECT * FROM lookup_user_by_pin('1998')`))).rejects.toThrow(/permission denied/i);
  });

  it('der neue Login-Pfad braucht nur noch get_user_by_auth_id (nach signIn)', async () => {
    const r = await as(db, 'authenticated', CHEF_AUTH, () => q(`SELECT username, role FROM get_user_by_auth_id()`));
    expect(r).toEqual([{ username: 'a.malici', role: 'chef' }]);
  });

  it('Einladungs-Lookup (Erster Zugang) bleibt fuer anon nutzbar', async () => {
    const r = await as(db, 'anon', null, () => q(`SELECT * FROM lookup_user_for_onboarding('gibt.es.nicht', '0000')`));
    expect(r).toEqual([]);
  });
});
