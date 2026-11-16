// @vitest-environment node
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { makeDb, rows } from './harness.js';

const FILE = 'migration_2026_11_16_02_bautagebuch_wetter.sql';
const sql = readFileSync(new URL(`../${FILE}`, import.meta.url), 'utf8');
let db;
const q = (s, p) => rows(db, s, p);

beforeAll(async () => {
  db = await makeDb(['migration_2026_11_16_01_security_hardening.sql']);
  const b = (await q(`INSERT INTO baustellen (kunde) VALUES ('X') RETURNING id`))[0].id;
  await q(
    `INSERT INTO bautagebuch (id, baustelle_id, datum, wetter, temperatur, created_at) VALUES
      ('00000000-0000-0000-0000-000000000001', $1, '2026-10-01', 'sonnig', 12, '2026-10-01T10:00:00+02:00'),
      ('00000000-0000-0000-0000-000000000002', $1, '2026-10-02', 'regen',   8, '2026-10-02T10:00:00+02:00'),
      ('00000000-0000-0000-0000-000000000003', $1, '2026-11-20', 'sonnig', 12, '2026-11-20T10:00:00+01:00')`,
    [b],
  );
  await db.exec(sql);
}, 120000);

describe('Bautagebuch: erfundene Wetterdaten', () => {
  it('erfundene Standard-Eintraege werden geleert, abweichende bleiben', async () => {
    const r = await q(`SELECT wetter, temperatur FROM bautagebuch ORDER BY id`);
    expect(r).toEqual([
      { wetter: null, temperatur: null },
      { wetter: 'regen', temperatur: 8 },
      { wetter: null, temperatur: null },
    ]);
  });
  it('neue Eintraege ohne Angabe bekommen kein erfundenes Wetter mehr', async () => {
    const b = (await q(`SELECT id FROM baustellen LIMIT 1`))[0].id;
    const r = (await q(`INSERT INTO bautagebuch (baustelle_id, datum) VALUES ($1, '2026-11-21') RETURNING wetter, temperatur`, [b]))[0];
    expect(r).toEqual({ wetter: null, temperatur: null });
  });
  it('erneutes Ausfuehren trifft ein spaeter eingetragenes echtes "sonnig, 12" nicht', async () => {
    const b = (await q(`SELECT id FROM baustellen LIMIT 1`))[0].id;
    const id = (await q(`INSERT INTO bautagebuch (baustelle_id, datum, wetter, temperatur) VALUES ($1, '2026-11-22', 'sonnig', 12) RETURNING id`, [b]))[0].id;
    await db.exec(sql);
    expect((await q(`SELECT wetter, temperatur FROM bautagebuch WHERE id = $1`, [id]))[0]).toEqual({ wetter: 'sonnig', temperatur: 12 });
  });
});
