// @vitest-environment node
//
// Tests fuer supabase/migration_2026_11_16_04_onboarding.sql
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { makeDb, as, rows, addMitarbeiter, CHEF_AUTH } from './harness.js';

const FILE = 'migration_2026_11_16_04_onboarding.sql';
let db;
const q = (s, p) => rows(db, s, p);
const chef = (fn) => as(db, 'authenticated', CHEF_AUTH, fn);
const anon = (fn) => as(db, 'anon', null, fn);
const token = (userId) => chef(async () => (await q(`SELECT create_onboarding_token($1) AS t`, [userId]))[0].t);
const authPwOk = async (authId, pin) =>
  (await q(`SELECT encrypted_password = crypt($2, encrypted_password) AS ok FROM auth.users WHERE id = $1`, [authId, pin]))[0].ok;

beforeAll(async () => {
  db = await makeDb(['migration_2026_11_16_01_security_hardening.sql', FILE]);
  // wiederholbar
  await db.exec(readFileSync(new URL(`../${FILE}`, import.meta.url), 'utf8'));
}, 120000);

describe('Einladungs-Link', () => {
  it('Chef erzeugt Token; gespeichert ist nur der Hash', async () => {
    const m = await addMitarbeiter(db, 'Anna Link', 'a.link', '1001');
    const t = await token(m.id);
    expect(t).toMatch(/^[0-9a-f]{48}$/);
    const stored = await q(`SELECT token_hash FROM onboarding_tokens WHERE user_id = $1`, [m.id]);
    expect(stored).toHaveLength(1);
    expect(stored[0].token_hash).not.toContain(t);
  });

  it('validate: gueltiger Token liefert Name + Benutzername, falscher nichts', async () => {
    const m = await addMitarbeiter(db, 'Bernd Link', 'b.link', '1002');
    const t = await token(m.id);
    expect(await anon(() => q(`SELECT name, username FROM validate_onboarding_token($1)`, [t]))).toEqual([
      { name: 'Bernd Link', username: 'b.link' },
    ]);
    expect(await anon(() => q(`SELECT * FROM validate_onboarding_token($1)`, ['0'.repeat(48)]))).toEqual([]);
    expect(await anon(() => q(`SELECT * FROM validate_onboarding_token('kaputt')`))).toEqual([]);
  });

  it('consume: setzt PIN (public + auth), markiert eingerichtet, Token ist danach verbraucht', async () => {
    const m = await addMitarbeiter(db, 'Carla Link', 'c.link', '1003');
    const t = await token(m.id);
    const username = (await anon(() => q(`SELECT consume_onboarding_token($1, '3141') AS u`, [t])))[0].u;
    expect(username).toBe('c.link');
    const u = (await q(`SELECT is_onboarded, onboarding_pin, pin_hash = crypt('3141', pin_hash) AS ok FROM users WHERE id = $1`, [m.id]))[0];
    expect(u).toEqual({ is_onboarded: true, onboarding_pin: null, ok: true });
    expect(await authPwOk(m.authId, '3141')).toBe(true);
    await expect(anon(() => q(`SELECT consume_onboarding_token($1, '3142')`, [t]))).rejects.toThrow(/ungueltig oder abgelaufen/);
    expect(await anon(() => q(`SELECT * FROM validate_onboarding_token($1)`, [t]))).toEqual([]);
  });

  it('kein Zombie: bis zum Einloesen bleibt der bisherige PIN gueltig', async () => {
    const m = await addMitarbeiter(db, 'Dora Link', 'd.link', '1004');
    await as(db, 'authenticated', m.authId, () => q(`SELECT complete_onboarding_v2($1, '4242')`, [m.id]));
    await token(m.id); // Chef schickt neuen Link, Nachricht kommt nie an
    const u = (await q(`SELECT is_onboarded, pin_hash = crypt('4242', pin_hash) AS ok FROM users WHERE id = $1`, [m.id]))[0];
    expect(u).toEqual({ is_onboarded: true, ok: true });
    expect(await authPwOk(m.authId, '4242')).toBe(true);
  });

  it('neuer Token macht den alten ungueltig', async () => {
    const m = await addMitarbeiter(db, 'Emil Link', 'e.link', '1005');
    const t1 = await token(m.id);
    const t2 = await token(m.id);
    await expect(anon(() => q(`SELECT consume_onboarding_token($1, '5151')`, [t1]))).rejects.toThrow(/ungueltig/);
    expect((await anon(() => q(`SELECT consume_onboarding_token($1, '5151') AS u`, [t2])))[0].u).toBe('e.link');
  });

  it('abgelaufener Token und deaktivierter Mitarbeiter werden abgelehnt', async () => {
    const m = await addMitarbeiter(db, 'Fritz Link', 'f.link', '1006');
    const t = await token(m.id);
    await q(`UPDATE onboarding_tokens SET expires_at = now() - interval '1 minute' WHERE user_id = $1`, [m.id]);
    await expect(anon(() => q(`SELECT consume_onboarding_token($1, '6161')`, [t]))).rejects.toThrow(/abgelaufen/);
    const m2 = await addMitarbeiter(db, 'Gerd Link', 'g.link', '1007');
    const t2 = await token(m2.id);
    await chef(() => q(`SELECT toggle_user_active_v2($1, false)`, [m2.id]));
    await expect(anon(() => q(`SELECT consume_onboarding_token($1, '7171')`, [t2]))).rejects.toThrow(/ungueltig/);
    await expect(token(m2.id)).rejects.toThrow(/deaktiviert/);
  });

  it('PIN-Regeln gelten: Format und bereits vergebener PIN; der Link bleibt danach nutzbar', async () => {
    const m = await addMitarbeiter(db, 'Hans Link', 'h.link', '1008');
    const t = await token(m.id);
    await expect(anon(() => q(`SELECT consume_onboarding_token($1, '12')`, [t]))).rejects.toThrow(/4 Ziffern/);
    await expect(anon(() => q(`SELECT consume_onboarding_token($1, '1998')`, [t]))).rejects.toThrow(/bereits vergeben/);
    expect((await anon(() => q(`SELECT consume_onboarding_token($1, '8181') AS u`, [t])))[0].u).toBe('h.link');
  });

  it('kein Link fuer Chef-Konten', async () => {
    const chefId = (await q(`SELECT id FROM users WHERE username = 'a.malici'`))[0].id;
    await expect(token(chefId)).rejects.toThrow(/Chef-Konten/);
    // selbst ein direkt eingeschleustes Token wirkt nicht
    await q(`INSERT INTO onboarding_tokens (user_id, token_hash, expires_at) VALUES ($1, encode(digest($2, 'sha256'), 'hex'), now() + interval '1 day')`, [chefId, 'e'.repeat(48)]);
    expect(await anon(() => q(`SELECT * FROM validate_onboarding_token($1)`, ['e'.repeat(48)]))).toEqual([]);
    await expect(anon(() => q(`SELECT consume_onboarding_token($1, '7777')`, ['e'.repeat(48)]))).rejects.toThrow(/ungueltig/);
    await q(`DELETE FROM onboarding_tokens WHERE user_id = $1`, [chefId]);
  });

  it('Gueltigkeit: 7 Tage fuer neue, 48 h fuer bereits eingerichtete Mitarbeiter', async () => {
    const neu = await addMitarbeiter(db, 'Kai Neu', 'k.neu', '1011');
    await token(neu.id);
    const alt = await addMitarbeiter(db, 'Lars Alt', 'l.alt', '1012');
    await as(db, 'authenticated', alt.authId, () => q(`SELECT complete_onboarding_v2($1, '1213')`, [alt.id]));
    await token(alt.id);
    const h = async (id) => Number((await q(`SELECT round(extract(epoch FROM (expires_at - now())) / 3600) AS h FROM onboarding_tokens WHERE user_id = $1`, [id]))[0].h);
    expect(await h(neu.id)).toBe(168);
    expect(await h(alt.id)).toBe(48);
  });

  it('offene Links verfallen bei PIN-Wechsel, Deaktivierung und PIN-Reset', async () => {
    const m = await addMitarbeiter(db, 'Mona Verfall', 'm.verfall', '1013');
    await as(db, 'authenticated', m.authId, () => q(`SELECT complete_onboarding_v2($1, '1314')`, [m.id]));
    const open = async () => (await q(`SELECT count(*)::int AS n FROM onboarding_tokens WHERE user_id = $1 AND consumed_at IS NULL`, [m.id]))[0].n;
    let t = await token(m.id);
    await as(db, 'authenticated', m.authId, () => q(`SELECT update_user_pin_v2($1, '1315')`, [m.id]));
    expect(await open()).toBe(0);
    await expect(anon(() => q(`SELECT consume_onboarding_token($1, '1316')`, [t]))).rejects.toThrow(/ungueltig/);
    t = await token(m.id);
    await chef(() => q(`SELECT toggle_user_active_v2($1, false)`, [m.id]));
    await chef(() => q(`SELECT toggle_user_active_v2($1, true)`, [m.id]));
    expect(await open()).toBe(0);
    t = await token(m.id);
    await chef(() => q(`SELECT reset_onboarding_v2($1, '1317', now() + interval '7 days', 'm.verfall')`, [m.id]));
    expect(await open()).toBe(0);
  });

  it('Chef kann offene Links widerrufen; eingeloeste bleiben als Nachweis', async () => {
    const m = await addMitarbeiter(db, 'Nico Widerruf', 'n.widerruf', '1014');
    const t1 = await token(m.id);
    await anon(() => q(`SELECT consume_onboarding_token($1, '1415')`, [t1]));
    const t2 = await token(m.id);
    expect((await chef(() => q(`SELECT revoke_onboarding_tokens($1) AS n`, [m.id])))[0].n).toBe(1);
    await expect(anon(() => q(`SELECT consume_onboarding_token($1, '1416')`, [t2]))).rejects.toThrow(/ungueltig/);
    expect((await q(`SELECT count(*)::int AS n FROM onboarding_tokens WHERE user_id = $1 AND consumed_at IS NOT NULL`, [m.id]))[0].n).toBe(1);
    await expect(as(db, 'authenticated', m.authId, () => q(`SELECT revoke_onboarding_tokens($1)`, [m.id]))).rejects.toThrow(/Nur der Chef/);
  });

  it('Einloesen erzeugt eine Benachrichtigung fuer den Chef', async () => {
    const m = await addMitarbeiter(db, 'Olga Meldung', 'o.meldung', '1015');
    const t = await token(m.id);
    await anon(() => q(`SELECT consume_onboarding_token($1, '1516')`, [t]));
    const n = await q(`SELECT text FROM benachrichtigungen WHERE text LIKE 'Olga Meldung%'`);
    expect(n).toHaveLength(1);
    expect(n[0].text).toMatch(/Einladungs-Link/);
  });

  it('viele falsche Tokens von aussen blockieren echte Links nicht', async () => {
    const m = await addMitarbeiter(db, 'Pia Frei', 'p.frei', '1016');
    const t = await token(m.id);
    for (let i = 0; i < 150; i++) {
      await anon(() => q(`SELECT * FROM validate_onboarding_token($1)`, [String(i).padStart(48, '0')]));
    }
    expect(await anon(() => q(`SELECT username FROM validate_onboarding_token($1)`, [t]))).toEqual([{ username: 'p.frei' }]);
  });

  it('nur der Chef erzeugt Tokens; die Tabelle ist von aussen nicht lesbar', async () => {
    const m = await addMitarbeiter(db, 'Ida Link', 'i.link', '1009');
    await expect(as(db, 'authenticated', m.authId, () => q(`SELECT create_onboarding_token($1)`, [m.id]))).rejects.toThrow(/Nur der Chef/);
    await expect(anon(() => q(`SELECT create_onboarding_token($1)`, [m.id]))).rejects.toThrow(/permission denied/i);
    await expect(chef(() => q(`SELECT * FROM onboarding_tokens`))).rejects.toThrow(/permission denied/i);
    await expect(anon(() => q(`SELECT * FROM onboarding_tokens`))).rejects.toThrow(/permission denied/i);
  });

  it('Einloesen beendet alte Sitzungen', async () => {
    const m = await addMitarbeiter(db, 'Jan Link', 'j.link', '1010');
    await q(`INSERT INTO auth.sessions (user_id) VALUES ($1)`, [m.authId]);
    const t = await token(m.id);
    await anon(() => q(`SELECT consume_onboarding_token($1, '9191')`, [t]));
    expect(await q(`SELECT 1 FROM auth.sessions WHERE user_id = $1`, [m.authId])).toHaveLength(0);
  });
});

describe('Voraussetzung', () => {
  it('ohne Migration 01 bricht Migration 04 mit klarer Meldung ab', async () => {
    const leer = await makeDb([]);
    await expect(
      leer.exec(readFileSync(new URL(`../${FILE}`, import.meta.url), 'utf8')),
    ).rejects.toThrow(/zuerst migration_2026_11_16_01/);
  }, 120000);
});

describe('repair_orphan_user', () => {
  it('gesundes Konto → "ok", nichts wird veraendert (PIN bleibt)', async () => {
    const m = await addMitarbeiter(db, 'Karl Heil', 'k.heil', '2001');
    await as(db, 'authenticated', m.authId, () => q(`SELECT complete_onboarding_v2($1, '2002')`, [m.id]));
    expect((await chef(() => q(`SELECT repair_orphan_user($1) AS r`, [m.id])))[0].r).toBe('ok');
    expect(await authPwOk(m.authId, '2002')).toBe(true);
    expect((await q(`SELECT is_onboarded FROM users WHERE id = $1`, [m.id]))[0].is_onboarded).toBe(true);
  });

  it('Auth-Konto fehlt → wird angelegt und verknuepft; danach klappt die Einladung', async () => {
    const m = await addMitarbeiter(db, 'Lea Weg', 'l.weg', '2003');
    await q(`UPDATE users SET auth_id = gen_random_uuid() WHERE id = $1`, [m.id]); // zeigt ins Leere
    await q(`DELETE FROM auth.users WHERE id = $1`, [m.authId]);
    await expect(token(m.id)).rejects.toThrow(/Zugang reparieren/);
    const r = (await chef(() => q(`SELECT repair_orphan_user($1) AS r`, [m.id])))[0].r;
    expect(r).toContain('auth_angelegt');
    expect(r).toContain('identity_angelegt');
    const u = (await q(`SELECT u.is_onboarded, a.email FROM users u JOIN auth.users a ON a.id = u.auth_id WHERE u.id = $1`, [m.id]))[0];
    expect(u).toEqual({ is_onboarded: false, email: 'l.weg@ma-construction.local' });
    const t = await token(m.id);
    expect((await anon(() => q(`SELECT consume_onboarding_token($1, '2004') AS u`, [t])))[0].u).toBe('l.weg');
  });

  it('verwaistes Auth-Konto mit derselben Adresse → wird uebernommen statt Duplikat-Fehler', async () => {
    const m = await addMitarbeiter(db, 'Mia Alt', 'm.alt', '2005');
    await q(`UPDATE users SET auth_id = gen_random_uuid() WHERE id = $1`, [m.id]);
    const r = (await chef(() => q(`SELECT repair_orphan_user($1) AS r`, [m.id])))[0].r;
    expect(r).toContain('auth_verknuepft');
    expect((await q(`SELECT auth_id FROM users WHERE id = $1`, [m.id]))[0].auth_id).toBe(m.authId);
    // altes Passwort des uebernommenen Kontos gilt nicht mehr
    expect(await authPwOk(m.authId, '2005')).toBe(false);
  });

  it('von GoTrue angelegte Identity (provider_id = User-ID, Zusatzfelder) gilt als gesund', async () => {
    const m = await addMitarbeiter(db, 'Quinn Gotrue', 'q.gotrue', '2008');
    await q(
      `UPDATE auth.identities SET provider_id = $1::text,
         identity_data = jsonb_build_object('sub', $1::text, 'email', 'q.gotrue@ma-construction.local', 'email_verified', true)
       WHERE user_id = $1`,
      [m.authId],
    );
    expect((await chef(() => q(`SELECT repair_orphan_user($1) AS r`, [m.id])))[0].r).toBe('ok');
    const i = (await q(`SELECT provider_id, identity_data FROM auth.identities WHERE user_id = $1`, [m.authId]))[0];
    expect(i.provider_id).toBe(m.authId);
    expect(i.identity_data.email_verified).toBe(true);
  });

  it('E-Mail weicht vom Benutzernamen ab, NULL-Token-Spalten, falsche Sperre → korrigiert', async () => {
    const m = await addMitarbeiter(db, 'Nils Schief', 'n.schief', '2006');
    await q(`UPDATE auth.users SET email = 'alt.name@ma-construction.local', recovery_token = NULL, banned_until = '2099-12-31' WHERE id = $1`, [m.authId]);
    const r = (await chef(() => q(`SELECT repair_orphan_user($1) AS r`, [m.id])))[0].r;
    expect(r.split(',').sort()).toEqual(['auth_felder_korrigiert', 'email_korrigiert', 'sperre_aufgehoben']);
    const a = (await q(`SELECT email, recovery_token, banned_until FROM auth.users WHERE id = $1`, [m.authId]))[0];
    expect(a).toEqual({ email: 'n.schief@ma-construction.local', recovery_token: '', banned_until: null });
    expect((await chef(() => q(`SELECT repair_orphan_user($1) AS r`, [m.id])))[0].r).toBe('ok');
  });

  it('nur der Chef', async () => {
    const m = await addMitarbeiter(db, 'Olaf Nein', 'o.nein', '2007');
    await expect(as(db, 'authenticated', m.authId, () => q(`SELECT repair_orphan_user($1)`, [m.id]))).rejects.toThrow(/Nur der Chef/);
  });
});

describe('cleanup_orphan_auth_users', () => {
  it('entfernt nur Auth-Konten ohne Profil; danach laesst sich der Benutzername neu anlegen', async () => {
    await q(`INSERT INTO auth.users (id, email) VALUES (gen_random_uuid(), 'p.leiche@ma-construction.local'), (gen_random_uuid(), 'fremd@example.com')`);
    await expect(addMitarbeiter(db, 'Paul Leiche', 'p.leiche', '3001')).rejects.toThrow(/duplicate key|unique/i);
    const before = (await q(`SELECT count(*)::int AS n FROM auth.users`))[0].n;
    const n = (await chef(() => q(`SELECT cleanup_orphan_auth_users() AS n`)))[0].n;
    expect(n).toBe(1);
    expect((await q(`SELECT count(*)::int AS n FROM auth.users`))[0].n).toBe(before - 1);
    expect(await q(`SELECT 1 FROM auth.users WHERE email = 'fremd@example.com'`)).toHaveLength(1);
    const m = await addMitarbeiter(db, 'Paul Leiche', 'p.leiche', '3001');
    expect(m.id).toBeTruthy();
  });
});

describe('reset_onboarding_v2 (neu)', () => {
  it('beendet Sitzungen, haelt Identity synchron, Einladungs-PIN funktioniert', async () => {
    const m = await addMitarbeiter(db, 'Rosa Reset', 'r.reset', '4001');
    await as(db, 'authenticated', m.authId, () => q(`SELECT complete_onboarding_v2($1, '4002')`, [m.id]));
    await q(`INSERT INTO auth.sessions (user_id) VALUES ($1)`, [m.authId]);
    await chef(() => q(`SELECT reset_onboarding_v2($1, '4003', now() + interval '7 days', 'r.reset')`, [m.id]));
    expect(await q(`SELECT 1 FROM auth.sessions WHERE user_id = $1`, [m.authId])).toHaveLength(0);
    expect(await authPwOk(m.authId, '4003')).toBe(true);
    expect(await anon(() => q(`SELECT username FROM lookup_user_for_onboarding('r.reset', '4003')`))).toEqual([{ username: 'r.reset' }]);
  });

  it('defektes Konto → klarer Fehler statt halbem Update', async () => {
    const m = await addMitarbeiter(db, 'Sepp Kaputt', 's.kaputt', '4004');
    await q(`UPDATE users SET auth_id = gen_random_uuid() WHERE id = $1`, [m.id]);
    await expect(
      chef(() => q(`SELECT reset_onboarding_v2($1, '4005', now() + interval '7 days', 's.kaputt')`, [m.id])),
    ).rejects.toThrow(/Zugang reparieren/);
    expect((await q(`SELECT onboarding_pin = crypt('4004', onboarding_pin) AS alt FROM users WHERE id = $1`, [m.id]))[0].alt).toBe(true);
  });
});

describe('docs/sql/onboarding_diagnose.sql', () => {
  const sql = readFileSync(new URL('../../docs/sql/onboarding_diagnose.sql', import.meta.url), 'utf8');
  const code = sql.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n');

  it('enthaelt nur lesende Anweisungen', () => {
    expect(code).not.toMatch(/\b(insert|update|delete|drop|alter|create|truncate|grant|revoke)\b/i);
  });

  it('laeuft fehlerfrei und findet ein absichtlich kaputtes Konto', async () => {
    const m = await addMitarbeiter(db, 'Theo Diagnose', 't.diagnose', '5001');
    await q(`UPDATE auth.users SET email = 'falsch@ma-construction.local' WHERE id = $1`, [m.authId]);
    const statements = code.split(';').map((s) => s.trim()).filter(Boolean);
    expect(statements.length).toBeGreaterThanOrEqual(6);
    const results = [];
    for (const st of statements) results.push(await q(st));
    const row = results[0].find((r) => r.username === 't.diagnose');
    expect(row.problem).toMatch(/Auth-E-Mail passt nicht/);
    const healthy = results[0].find((r) => r.username === 'a.malici');
    expect(healthy.problem).toBe('');
  });
});
