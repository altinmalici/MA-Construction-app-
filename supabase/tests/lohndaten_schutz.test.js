// @vitest-environment node
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { makeDb, as, rows, addMitarbeiter, CHEF_AUTH } from './harness.js';

const FILE = 'migration_2026_11_18_03_lohndaten_schutz.sql';
const sql = readFileSync(new URL(`../${FILE}`, import.meta.url), 'utf8');
let db, b1, max, nora;
const q = (s, p) => rows(db, s, p);
const chef = (fn) => as(db, 'authenticated', CHEF_AUTH, fn);
const alsMax = (fn) => as(db, 'authenticated', max.authId, fn);
const anon = (fn) => as(db, 'anon', null, fn);

beforeAll(async () => {
  db = await makeDb(['migration_2026_11_16_01_security_hardening.sql', FILE]);
  await db.exec(sql); // wiederholbar
  const details = JSON.stringify({ raeume: 'Bad', rechnungFirma: 'Huber GmbH', rechnungUid: 'DE123', RechnungEmail: 'x@y.de' });
  b1 = (await q(`INSERT INTO baustellen (kunde, budget, details) VALUES ('Zugewiesen', 50000, $1) RETURNING id`, [details]))[0].id;
  await q(`INSERT INTO baustellen (kunde, budget) VALUES ('Fremd', 9000)`);
  max = await addMitarbeiter(db, 'Max Muster', 'm.muster', '1001');
  nora = await addMitarbeiter(db, 'Nora Neu', 'n.neu', '1002');
  await q(`INSERT INTO baustellen_mitarbeiter (baustelle_id, user_id) VALUES ($1, $2)`, [b1, max.id]);
  await q(`INSERT INTO kosten (baustelle_id, beschreibung, betrag) VALUES ($1, 'Fliesen', 1200)`, [b1]);
  await q(`INSERT INTO stundeneintraege (baustelle_id, datum, beginn, ende, mitarbeiter_id) VALUES ($1, '2026-11-18', '07:00', '15:00', $2)`, [b1, max.id]);
}, 120000);

describe('Mitarbeiter', () => {
  it('liest aus users nur die eigene Zeile – keinen Stundensatz der Kollegen', async () => {
    const r = await alsMax(() => q(`SELECT id, stundensatz FROM users`));
    expect(r.map((x) => x.id)).toEqual([max.id]);
  });

  it('kollegen_liste liefert Namen aller Nutzer, aber weder Stundensatz noch Benutzername', async () => {
    const r = await alsMax(() => q(`SELECT * FROM kollegen_liste()`));
    expect(r.map((x) => x.name).sort()).toEqual(expect.arrayContaining(['Max Muster', 'Nora Neu']));
    expect(r.length).toBeGreaterThanOrEqual(3); // inkl. Chef
    expect(Object.keys(r[0]).sort()).toEqual(['id', 'is_active', 'name', 'role']);
  });

  it('liest die Tabelle baustellen nicht mehr direkt', async () => {
    expect(await alsMax(() => q(`SELECT id, budget FROM baustellen`))).toEqual([]);
  });

  it('meine_baustellen: nur zugewiesene, ohne Budget und ohne Rechnungsdaten', async () => {
    const r = await alsMax(() => q(`SELECT * FROM meine_baustellen()`));
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ id: b1, kunde: 'Zugewiesen', details: { raeume: 'Bad' } });
    expect(r[0]).not.toHaveProperty('budget');
    expect(JSON.stringify(r[0])).not.toMatch(/Huber GmbH|DE123|x@y\.de|50000/);
  });

  it('liest keine Kosten mehr', async () => {
    expect(await alsMax(() => q(`SELECT * FROM kosten`))).toEqual([]);
  });

  it('alles andere geht weiter: eigene Stunden lesen und erfassen, eigenes Profil ändern', async () => {
    expect(await alsMax(() => q(`SELECT 1 FROM stundeneintraege`))).toHaveLength(1);
    await alsMax(() => q(`INSERT INTO stundeneintraege (baustelle_id, datum, beginn, ende, mitarbeiter_id) VALUES ($1, '2026-11-19', '07:00', '15:00', $2)`, [b1, max.id]));
    const r = await alsMax(() => q(`UPDATE users SET name = 'Max M.' WHERE id = $1 RETURNING id, name, role, stundensatz`, [max.id]));
    expect(r).toHaveLength(1);
    expect(await alsMax(() => q(`SELECT name FROM get_user_by_auth_id()`))).toEqual([{ name: 'Max M.' }]);
  });
});

describe('Sonderfaelle', () => {
  it('kaputtes details-Feld (kein Objekt) sperrt den Mitarbeiter nicht aus', async () => {
    await q(`UPDATE baustellen SET details = '[1,2]'::jsonb WHERE id = $1`, [b1]);
    const r = await alsMax(() => q(`SELECT details FROM meine_baustellen()`));
    expect(r).toEqual([{ details: {} }]);
    await q(`UPDATE baustellen SET details = '{"raeume":"Bad","rechnungFirma":"Huber GmbH"}'::jsonb WHERE id = $1`, [b1]);
  });

  it('deaktivierter Nutzer bekommt weder Kollegen noch Baustellen', async () => {
    await q(`UPDATE users SET is_active = false WHERE id = $1`, [max.id]);
    expect(await alsMax(() => q(`SELECT * FROM kollegen_liste()`))).toEqual([]);
    expect(await alsMax(() => q(`SELECT * FROM meine_baustellen()`))).toEqual([]);
    await q(`UPDATE users SET is_active = true WHERE id = $1`, [max.id]);
  });

  it('Mitarbeiter kann weiter einen Mangel fuer seine Baustelle anlegen', async () => {
    await alsMax(() => q(`INSERT INTO maengel (baustelle_id, titel) VALUES ($1, 'Riss')`, [b1]));
    expect(await alsMax(() => q(`SELECT 1 FROM maengel`))).toHaveLength(1);
  });

  it('liegt noch eine andere Lese-Regel auf den Tabellen, bricht die Datei ab', async () => {
    const d = await makeDb(['migration_2026_11_16_01_security_hardening.sql']);
    await d.exec(`CREATE POLICY "allow_all" ON public.kosten FOR SELECT USING (true)`);
    await expect(d.exec(sql)).rejects.toThrow(/unerwartete Lese-Regeln.*kosten\.allow_all/);
  }, 120000);
});

describe('Chef und Fremde', () => {
  it('Chef liest weiter alles', async () => {
    expect((await chef(() => q(`SELECT stundensatz FROM users`))).length).toBeGreaterThanOrEqual(3);
    const bs = await chef(() => q(`SELECT kunde, budget::int AS budget, details FROM baustellen ORDER BY kunde`));
    expect(bs.map((b) => b.budget)).toEqual([9000, 50000]);
    expect(bs[1].details.rechnungFirma).toBe('Huber GmbH');
    expect(await chef(() => q(`SELECT 1 FROM kosten`))).toHaveLength(1);
  });

  it('ohne Anmeldung: keine der neuen Funktionen', async () => {
    await expect(anon(() => q(`SELECT * FROM kollegen_liste()`))).rejects.toThrow(/permission denied/);
    await expect(anon(() => q(`SELECT * FROM meine_baustellen()`))).rejects.toThrow(/permission denied/);
  });

  it('Mitarbeiter ohne Zuweisung sieht keine Baustelle', async () => {
    expect(await as(db, 'authenticated', nora.authId, () => q(`SELECT * FROM meine_baustellen()`))).toEqual([]);
  });
});
