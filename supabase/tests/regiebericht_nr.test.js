// @vitest-environment node
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { makeDb, as, rows, addMitarbeiter, CHEF_AUTH } from './harness.js';

const FILE = 'migration_2026_11_18_01_regiebericht_nr.sql';
const sql = readFileSync(new URL(`../${FILE}`, import.meta.url), 'utf8');
let db, b1, b2, ma;
const q = (s, p) => rows(db, s, p);
const chef = (fn) => as(db, 'authenticated', CHEF_AUTH, fn);
const std = (b, datum) => q(`INSERT INTO stundeneintraege (baustelle_id, datum, beginn, ende) VALUES ($1, $2, '07:00', '15:00')`, [b, datum]);
const vergeben = (b, daten) => q(`SELECT tag::text, nummer FROM regiebericht_nummern_vergeben($1, $2::date[])`, [b, daten]);

beforeAll(async () => {
  db = await makeDb(['migration_2026_11_16_01_security_hardening.sql']);
  b1 = (await q(`INSERT INTO baustellen (kunde) VALUES ('Eins') RETURNING id`))[0].id;
  b2 = (await q(`INSERT INTO baustellen (kunde) VALUES ('Zwei') RETURNING id`))[0].id;
  ma = await addMitarbeiter(db, 'Max Muster', 'm.muster', '1001');
  await q(`INSERT INTO baustellen_mitarbeiter (baustelle_id, user_id) VALUES ($1, $2)`, [b1, ma.id]);
  // Bestand vor der Migration: b1 hat drei Tage (einer doppelt belegt)
  await std(b1, '2026-11-02'); await std(b1, '2026-11-02'); await std(b1, '2026-11-05'); await std(b1, '2026-11-03');
  await db.exec(sql);
  await db.exec(sql); // wiederholbar
}, 120000);

describe('feste Regiebericht-Nummern', () => {
  it('Uebernahme: bestehende Tage behalten die bisher angezeigte Nummer (Position nach Datum)', async () => {
    expect(await q(`SELECT datum::text, nr FROM regiebericht_nummern WHERE baustelle_id = $1 ORDER BY nr`, [b1])).toEqual([
      { datum: '2026-11-02', nr: 1 }, { datum: '2026-11-03', nr: 2 }, { datum: '2026-11-05', nr: 3 },
    ]);
  });

  it('ein nachgetragener FRUEHERER Tag bekommt die naechste Nummer – bestehende verschieben sich nicht', async () => {
    await std(b1, '2026-11-01');
    const r = await chef(() => vergeben(b1, ['2026-11-01', '2026-11-02']));
    expect(r).toEqual([{ tag: '2026-11-01', nummer: 4 }, { tag: '2026-11-02', nummer: 1 }]);
  });

  it('erneutes Vergeben liefert dieselbe Nummer', async () => {
    expect(await chef(() => vergeben(b1, ['2026-11-01']))).toEqual([{ tag: '2026-11-01', nummer: 4 }]);
  });

  it('Datei erneut ausfuehren, nachdem Nummern vergeben wurden: nichts aendert sich', async () => {
    const vorher = await q(`SELECT datum::text, nr FROM regiebericht_nummern ORDER BY baustelle_id, nr`);
    await db.exec(sql);
    expect(await q(`SELECT datum::text, nr FROM regiebericht_nummern ORDER BY baustelle_id, nr`)).toEqual(vorher);
  });

  it('jede Baustelle zaehlt fuer sich', async () => {
    await std(b2, '2026-11-01');
    expect(await chef(() => vergeben(b2, ['2026-11-01']))).toEqual([{ tag: '2026-11-01', nummer: 1 }]);
  });

  it('Tage ohne Eintraege bekommen keine Nummer', async () => {
    expect(await chef(() => vergeben(b1, ['2030-01-01']))).toEqual([]);
  });

  it('Nummer bleibt vergeben, auch wenn die Eintraege des Tages geloescht werden – und wird nie neu vergeben', async () => {
    await q(`DELETE FROM stundeneintraege WHERE baustelle_id = $1 AND datum = '2026-11-01'`, [b1]);
    await std(b1, '2026-11-09');
    expect(await chef(() => vergeben(b1, ['2026-11-09']))).toEqual([{ tag: '2026-11-09', nummer: 5 }]);
  });

  it('Mitarbeiter: nur fuer zugewiesene Baustellen', async () => {
    const m = (fn) => as(db, 'authenticated', ma.authId, fn);
    expect(await m(() => vergeben(b1, ['2026-11-02']))).toEqual([{ tag: '2026-11-02', nummer: 1 }]);
    await expect(m(() => vergeben(b2, ['2026-11-01']))).rejects.toThrow(/Keine Berechtigung/);
    expect(await m(() => q(`SELECT 1 FROM regiebericht_nummern WHERE baustelle_id = $1`, [b2]))).toHaveLength(0);
  });

  it('niemand kann Nummern direkt aendern oder loeschen; ohne Anmeldung geht nichts', async () => {
    await expect(chef(() => q(`UPDATE regiebericht_nummern SET nr = 99`))).rejects.toThrow(/permission denied/);
    await expect(chef(() => q(`DELETE FROM regiebericht_nummern`))).rejects.toThrow(/permission denied/);
    await expect(as(db, 'anon', null, () => vergeben(b1, ['2026-11-02']))).rejects.toThrow(/permission denied/);
    await expect(as(db, 'anon', null, () => q(`SELECT 1 FROM regiebericht_nummern`))).rejects.toThrow(/permission denied/);
  });
});
