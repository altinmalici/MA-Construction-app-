// @vitest-environment node
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { makeDb, as, rows, addMitarbeiter, CHEF_AUTH } from './harness.js';

const FILE = 'migration_2026_11_18_04_benachrichtigungen_pro_nutzer.sql';
const sql = readFileSync(new URL(`../${FILE}`, import.meta.url), 'utf8');
let db, b1, b2, max, nora, alt;
const q = (s, p) => rows(db, s, p);
const chef = (fn) => as(db, 'authenticated', CHEF_AUTH, fn);
const alsMax = (fn) => as(db, 'authenticated', max.authId, fn);
const alsNora = (fn) => as(db, 'authenticated', nora.authId, fn);
const meine = () => q(`SELECT text, gelesen FROM meine_benachrichtigungen() ORDER BY text`);

beforeAll(async () => {
  db = await makeDb(['migration_2026_11_16_01_security_hardening.sql']);
  b1 = (await q(`INSERT INTO baustellen (kunde) VALUES ('Eins') RETURNING id`))[0].id;
  b2 = (await q(`INSERT INTO baustellen (kunde) VALUES ('Zwei') RETURNING id`))[0].id;
  max = await addMitarbeiter(db, 'Max Muster', 'm.muster', '1001');
  nora = await addMitarbeiter(db, 'Nora Neu', 'n.neu', '1002');
  await q(`INSERT INTO baustellen_mitarbeiter (baustelle_id, user_id) VALUES ($1, $2), ($1, $3), ($4, $3)`, [b1, max.id, nora.id, b2]);
  // Bestand vor der Migration
  alt = (await q(`INSERT INTO benachrichtigungen (text, baustelle_id, gelesen) VALUES ('alt gelesen', $1, true) RETURNING id`, [b1]))[0].id;
  await q(`INSERT INTO benachrichtigungen (text, baustelle_id, gelesen) VALUES ('alt offen', $1, false)`, [b1]);
  await q(`INSERT INTO benachrichtigungen (text, baustelle_id) VALUES ('nur zwei', $1)`, [b2]);
  await q(`INSERT INTO benachrichtigungen (text) VALUES ('ohne baustelle')`);
  await db.exec(sql);
  await db.exec(sql); // wiederholbar
}, 120000);

describe('Benachrichtigungen pro Nutzer', () => {
  it('Uebernahme: bisher Gelesenes gilt fuer alle als gelesen, Offenes bleibt offen', async () => {
    expect(await alsMax(meine)).toEqual([{ text: 'alt gelesen', gelesen: true }, { text: 'alt offen', gelesen: false }]);
    expect((await q(`SELECT gelesen FROM benachrichtigungen WHERE id = $1`, [alt]))[0].gelesen).toBe(true); // Bestand unveraendert
  });

  it('Mitarbeiter sieht nur seine Baustellen; ohne Baustelle sieht nur der Chef', async () => {
    expect((await alsMax(meine)).map((r) => r.text)).toEqual(['alt gelesen', 'alt offen']);
    expect((await alsNora(meine)).map((r) => r.text)).toEqual(['alt gelesen', 'alt offen', 'nur zwei']);
    expect((await chef(meine)).map((r) => r.text)).toEqual(['alt gelesen', 'alt offen', 'nur zwei', 'ohne baustelle']);
    expect(await alsMax(() => q(`SELECT text FROM benachrichtigungen ORDER BY text`))).toHaveLength(2);
  });

  it('jeder hat sein eigenes "gelesen"', async () => {
    await alsMax(() => q(`SELECT benachrichtigungen_alle_gelesen()`));
    expect((await alsMax(meine)).every((r) => r.gelesen)).toBe(true);
    expect((await alsNora(meine)).find((r) => r.text === 'alt offen').gelesen).toBe(false);
    expect((await chef(meine)).find((r) => r.text === 'alt offen').gelesen).toBe(false);
    // Max hat nichts fuer fremde Baustellen markiert
    expect(await q(`SELECT 1 FROM benachrichtigungen_gelesen g JOIN benachrichtigungen b ON b.id = g.benachrichtigung_id WHERE g.user_id = $1 AND b.text IN ('nur zwei', 'ohne baustelle')`, [max.id])).toHaveLength(0);
    await alsMax(() => q(`SELECT benachrichtigungen_alle_gelesen()`)); // doppelt schadet nicht
  });

  it('wer eine Meldung ausloest, hat sie selbst gelesen – die anderen nicht', async () => {
    await alsMax(() => q(`INSERT INTO benachrichtigungen (typ, text, baustelle_id) VALUES ('stunden', 'Max: Stunden', $1)`, [b1]));
    expect((await alsMax(meine)).find((r) => r.text === 'Max: Stunden').gelesen).toBe(true);
    expect((await alsNora(meine)).find((r) => r.text === 'Max: Stunden').gelesen).toBe(false);
    expect((await chef(meine)).find((r) => r.text === 'Max: Stunden').gelesen).toBe(false);
  });

  it('Mitarbeiter: anlegen nur fuer eigene Baustellen, aendern und loeschen gar nicht', async () => {
    await expect(alsMax(() => q(`INSERT INTO benachrichtigungen (text, baustelle_id) VALUES ('x', $1)`, [b2]))).rejects.toThrow(/row-level security/);
    await expect(alsMax(() => q(`INSERT INTO benachrichtigungen (text) VALUES ('x')`))).rejects.toThrow(/row-level security/);
    await alsMax(() => q(`UPDATE benachrichtigungen SET text = 'gehackt'`));
    await alsMax(() => q(`DELETE FROM benachrichtigungen`));
    expect(await q(`SELECT 1 FROM benachrichtigungen WHERE text = 'gehackt'`)).toHaveLength(0);
    expect((await q(`SELECT count(*)::int AS n FROM benachrichtigungen`))[0].n).toBe(5);
  });

  it('niemand kann fuer andere "gelesen" setzen oder fremde Lese-Eintraege sehen', async () => {
    await expect(alsMax(() => q(`INSERT INTO benachrichtigungen_gelesen (benachrichtigung_id, user_id) VALUES ($1, $2)`, [alt, nora.id]))).rejects.toThrow(/row-level security/);
    const r = await alsMax(() => q(`SELECT DISTINCT user_id FROM benachrichtigungen_gelesen`));
    expect(r).toEqual([{ user_id: max.id }]);
    await expect(as(db, 'anon', null, () => q(`SELECT * FROM meine_benachrichtigungen()`))).rejects.toThrow(/permission denied/);
  });

  it('Chef loescht eine Benachrichtigung → Lese-Eintraege verschwinden mit', async () => {
    await chef(() => q(`DELETE FROM benachrichtigungen WHERE id = $1`, [alt]));
    expect(await q(`SELECT 1 FROM benachrichtigungen_gelesen WHERE benachrichtigung_id = $1`, [alt])).toHaveLength(0);
  });
});
