// @vitest-environment node
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { makeDb, as, rows, addMitarbeiter, CHEF_AUTH } from './harness.js';

const FILE = 'migration_2026_11_18_05_stunden_nur_offene_baustellen.sql';
const sql = readFileSync(new URL(`../${FILE}`, import.meta.url), 'utf8');
let db, max, bs = {};
const q = (s, p) => rows(db, s, p);
const chef = (fn) => as(db, 'authenticated', CHEF_AUTH, fn);
const alsMax = (fn) => as(db, 'authenticated', max.authId, fn);
const insert = (b, datum = '2026-11-18') =>
  q(`INSERT INTO stundeneintraege (baustelle_id, datum, beginn, ende, mitarbeiter_id) VALUES ($1, $2, '07:00', '15:00', $3) RETURNING id`, [b, datum, max.id]);
const MELDUNG = /Baustelle ist abgeschlossen – bitte beim Chef melden\./;

beforeAll(async () => {
  // inkl. Lohndaten-Schutz: Mitarbeiter liest baustellen nicht mehr direkt
  db = await makeDb(['migration_2026_11_16_01_security_hardening.sql', 'migration_2026_11_18_03_lohndaten_schutz.sql', FILE]);
  await db.exec(sql); // wiederholbar
  max = await addMitarbeiter(db, 'Max Muster', 'm.muster', '1001');
  for (const s of ['geplant', 'aktiv', 'fertig', 'abgerechnet']) {
    bs[s] = (await q(`INSERT INTO baustellen (kunde, status) VALUES ($1, $1) RETURNING id`, [s]))[0].id;
    await q(`INSERT INTO baustellen_mitarbeiter (baustelle_id, user_id) VALUES ($1, $2)`, [bs[s], max.id]);
  }
}, 120000);

describe('Stunden nur auf offenen Baustellen', () => {
  it('Mitarbeiter: geplant und aktiv gehen', async () => {
    expect(await alsMax(() => insert(bs.geplant))).toHaveLength(1);
    expect(await alsMax(() => insert(bs.aktiv))).toHaveLength(1);
  });

  it('Mitarbeiter: fertig und abgerechnet werden mit klarer Meldung abgelehnt', async () => {
    await expect(alsMax(() => insert(bs.fertig))).rejects.toThrow(MELDUNG);
    await expect(alsMax(() => insert(bs.abgerechnet))).rejects.toThrow(MELDUNG);
  });

  it('Mitarbeiter: bestehenden Eintrag aendern geht nur, solange die Baustelle offen ist; verschieben auf eine fertige nicht', async () => {
    const id = (await alsMax(() => insert(bs.aktiv, '2026-11-19')))[0].id;
    await alsMax(() => q(`UPDATE stundeneintraege SET arbeit = 'Putz' WHERE id = $1`, [id]));
    await expect(alsMax(() => q(`UPDATE stundeneintraege SET baustelle_id = $2 WHERE id = $1`, [id, bs.fertig]))).rejects.toThrow(MELDUNG);
    await q(`UPDATE baustellen SET status = 'fertig' WHERE id = $1`, [bs.aktiv]);
    await expect(alsMax(() => q(`UPDATE stundeneintraege SET arbeit = 'Putz 2' WHERE id = $1`, [id]))).rejects.toThrow(MELDUNG);
    // auch wegschieben von der fertigen auf eine offene Baustelle geht nicht
    await expect(alsMax(() => q(`UPDATE stundeneintraege SET baustelle_id = $2 WHERE id = $1`, [id, bs.geplant]))).rejects.toThrow(MELDUNG);
    // loeschen bleibt moeglich
    await alsMax(() => q(`DELETE FROM stundeneintraege WHERE id = $1`, [id]));
    expect(await q(`SELECT 1 FROM stundeneintraege WHERE id = $1`, [id])).toHaveLength(0);
    await q(`UPDATE baustellen SET status = 'aktiv' WHERE id = $1`, [bs.aktiv]);
  });

  it('Chef traegt ueberall nach und kann freigeben', async () => {
    const r = await chef(() => insert(bs.fertig));
    expect(r).toHaveLength(1);
    await chef(() => insert(bs.abgerechnet));
    await chef(() => q(`UPDATE stundeneintraege SET freigegeben = true WHERE id = $1`, [r[0].id]));
  });

  it('ohne App-Anmeldung (SQL-Editor) gilt keine Einschraenkung', async () => {
    expect(await insert(bs.fertig, '2026-11-20')).toHaveLength(1);
  });
});
