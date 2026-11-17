// @vitest-environment node
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { makeDb, as, rows, CHEF_AUTH } from './harness.js';

const FILE = 'migration_2026_11_17_error_log_limit.sql';
const sql = readFileSync(new URL(`../${FILE}`, import.meta.url), 'utf8');
let db;
const q = (s, p) => rows(db, s, p);
const anon = (fn) => as(db, 'anon', null, fn);
const insert = (msg) => anon(() => q(`INSERT INTO error_log (message, url) VALUES ($1, $2)`, [msg, 'https://x']));
const count = async () => (await q(`SELECT count(*)::int AS n FROM error_log`))[0].n;

beforeAll(async () => {
  db = await makeDb(['migration_2026_11_16_01_security_hardening.sql', FILE]);
  await db.exec(sql); // wiederholbar
}, 120000);

describe('error_log: Schutz vor Fuellen von aussen', () => {
  it('normales Melden funktioniert weiter (ohne Anmeldung), Chef kann lesen', async () => {
    await insert('Testfehler');
    expect(await count()).toBe(1);
    const r = await as(db, 'authenticated', CHEF_AUTH, () => q(`SELECT message FROM error_log`));
    expect(r).toEqual([{ message: 'Testfehler' }]);
  });

  it('ueberlange Texte werden gekuerzt, der Zeitstempel kommt vom Server', async () => {
    await anon(() =>
      q(`INSERT INTO error_log (message, stack, user_agent, created_at) VALUES ($1, $2, $3, '2001-01-01')`, [
        'm'.repeat(5000), 's'.repeat(9000), 'u'.repeat(900),
      ]),
    );
    const r = (await q(`SELECT length(message) AS m, length(stack) AS s, length(user_agent) AS u, created_at > now() - interval '1 minute' AS frisch FROM error_log ORDER BY created_at DESC LIMIT 1`))[0];
    expect(r).toEqual({ m: 2000, s: 4000, u: 500, frisch: true });
  });

  it('mehr als 200 Eintraege pro Stunde werden still verworfen – ohne Fehler fuer den Aufrufer', async () => {
    const vorher = await count();
    for (let i = 0; i < 230; i++) await insert(`Flut ${i}`);
    const nachher = await count();
    expect(nachher).toBe(200); // 2 aus den Tests oben + 198 weitere
    expect(nachher).toBeGreaterThan(vorher);
  });

  it('Eintraege aelter als 90 Tage werden beim naechsten Schreiben entfernt', async () => {
    await q(`UPDATE rpc_throttle SET count = 0 WHERE key = 'errorlog:*'`);
    await q(`ALTER TABLE error_log DISABLE TRIGGER trg_error_log_guard`);
    await q(`INSERT INTO error_log (message, created_at) VALUES ('uralt', now() - interval '120 days')`);
    await q(`ALTER TABLE error_log ENABLE TRIGGER trg_error_log_guard`);
    await insert('neu');
    expect(await q(`SELECT 1 FROM error_log WHERE message = 'uralt'`)).toHaveLength(0);
    expect(await q(`SELECT 1 FROM error_log WHERE message = 'neu'`)).toHaveLength(1);
  });

  it('ohne Migration 01 bricht die Datei mit klarer Meldung ab', async () => {
    const leer = await makeDb([]);
    await expect(leer.exec(sql)).rejects.toThrow(/zuerst migration_2026_11_16_01/);
  }, 120000);
});
