// @vitest-environment node
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { makeDb, as, rows, addMitarbeiter, CHEF_AUTH } from './harness.js';

const FILE = 'migration_2026_11_18_02_einladung_pin_entfaellt.sql';
const sql = readFileSync(new URL(`../${FILE}`, import.meta.url), 'utf8');
let db;
const q = (s, p) => rows(db, s, p);
const chef = (fn) => as(db, 'authenticated', CHEF_AUTH, fn);
const anon = (fn) => as(db, 'anon', null, fn);
const lookup = (u, pin) => anon(() => q(`SELECT * FROM lookup_user_for_onboarding($1, $2)`, [u, pin]));

beforeAll(async () => {
  db = await makeDb(['migration_2026_11_16_01_security_hardening.sql', 'migration_2026_11_16_04_onboarding.sql', FILE]);
  await db.exec(sql); // wiederholbar
}, 120000);

describe('Einladungs-PIN entfaellt mit dem Link', () => {
  it('ohne Link gilt der Einladungs-PIN wie bisher', async () => {
    await addMitarbeiter(db, 'Ohne Link', 'o.link', '1001');
    expect(await lookup('o.link', '1001')).toHaveLength(1);
  });

  it('sobald ein Link erzeugt wird, ist der Einladungs-PIN ungueltig – der Link funktioniert', async () => {
    const m = await addMitarbeiter(db, 'Mit Link', 'm.link', '1002');
    expect(await lookup('m.link', '1002')).toHaveLength(1);
    const t = await chef(async () => (await q(`SELECT create_onboarding_token($1) AS t`, [m.id]))[0].t);
    expect(await lookup('m.link', '1002')).toHaveLength(0);
    expect((await q(`SELECT onboarding_pin, onboarding_pin_expiry FROM users WHERE id = $1`, [m.id]))[0]).toEqual({ onboarding_pin: null, onboarding_pin_expiry: null });
    expect(await anon(() => q(`SELECT username FROM validate_onboarding_token($1)`, [t]))).toEqual([{ username: 'm.link' }]);
  });

  it('andere Mitarbeiter sind nicht betroffen', async () => {
    expect(await lookup('o.link', '1001')).toHaveLength(1);
  });

  it('ohne die Onboarding-Migration bricht die Datei mit klarer Meldung ab', async () => {
    const leer = await makeDb(['migration_2026_11_16_01_security_hardening.sql']);
    await expect(leer.exec(sql)).rejects.toThrow(/zuerst migration_2026_11_16_04/);
  }, 120000);
});
