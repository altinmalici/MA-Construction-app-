// @vitest-environment node
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { makeDb, rows } from './harness.js';

const FILE = 'migration_2026_11_17_pause_default_0.sql';
const sql = readFileSync(new URL(`../${FILE}`, import.meta.url), 'utf8');
let db, b;
const q = (s, p) => rows(db, s, p);
const insert = () =>
  q(`INSERT INTO stundeneintraege (baustelle_id, datum, beginn, ende) VALUES ($1, '2026-11-17', '07:00', '16:00') RETURNING pause, fahrtzeit`, [b]);

beforeAll(async () => {
  db = await makeDb();
  b = (await q(`INSERT INTO baustellen (kunde) VALUES ('X') RETURNING id`))[0].id;
}, 120000);

describe('Spalten-Standard pause/fahrtzeit', () => {
  it('vorher: Zeile ohne Angabe bekommt Pause 30', async () => {
    expect((await insert())[0]).toEqual({ pause: 30, fahrtzeit: 0 });
  });

  it('nachher: Pause 0 und Fahrtzeit 0; bestehende Zeilen bleiben unveraendert; wiederholbar', async () => {
    // Zwei "alte" Zeilen in diesem Test selbst anlegen (unabhaengig von der
    // Reihenfolge der Tests) und vor/nach der Migration vergleichen.
    await q(`INSERT INTO stundeneintraege (baustelle_id, datum, beginn, ende, pause, fahrtzeit) VALUES
      ($1, '2026-11-01', '07:00', '16:00', 45, 20), ($1, '2026-11-02', '07:00', '16:00', 30, 30)`, [b]);
    const snapshot = () => q(`SELECT id, pause, fahrtzeit FROM stundeneintraege ORDER BY id`);
    const vorher = await snapshot();
    await db.exec(sql);
    await db.exec(sql);
    expect(await snapshot()).toEqual(vorher);
    expect((await insert())[0]).toEqual({ pause: 0, fahrtzeit: 0 });
  });
});
