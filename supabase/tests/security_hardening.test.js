// @vitest-environment node
//
// Rollen-/Rechte-Tests fuer supabase/migration_2026_11_16_01_security_hardening.sql.
// Laeuft gegen ein Wegwerf-Postgres (siehe harness.js), nie gegen die echte DB.
import { describe, it, expect, beforeAll } from 'vitest';
import { makeDb, as, rows, addMitarbeiter, CHEF_AUTH } from './harness.js';

const MIGRATION = 'migration_2026_11_16_01_security_hardening.sql';

let db, m1, m2, b1, b2, chefId;
const chef = (fn) => as(db, 'authenticated', CHEF_AUTH, fn);
const asM1 = (fn) => as(db, 'authenticated', m1.authId, fn);
const asM2 = (fn) => as(db, 'authenticated', m2.authId, fn);
const anon = (fn) => as(db, 'anon', null, fn);
const q = (sql, p) => rows(db, sql, p);

const stunde = (over = {}) => ({
  baustelle: b1, mitarbeiter: m1.id, typ: 'mitarbeiter', freigegeben: false, ...over,
});
const insertStunde = (s) =>
  q(
    `INSERT INTO stundeneintraege (baustelle_id, datum, beginn, ende, person_typ, mitarbeiter_id, freigegeben)
     VALUES ($1, '2026-11-16', '07:00', '15:00', $2, $3, $4) RETURNING id`,
    [s.baustelle, s.typ, s.mitarbeiter, s.freigegeben],
  );

beforeAll(async () => {
  db = await makeDb([MIGRATION]);
  chefId = (await q(`SELECT id FROM users WHERE username = 'a.malici'`))[0].id;
  m1 = await addMitarbeiter(db, 'Max Muster', 'm.muster', '4711');
  m2 = await addMitarbeiter(db, 'Nora Neu', 'n.neu', '4712');
  await asM1(() => q(`SELECT complete_onboarding_v2($1, '1111')`, [m1.id]));
  await asM2(() => q(`SELECT complete_onboarding_v2($1, '2222')`, [m2.id]));
  await chef(async () => {
    b1 = (await q(`INSERT INTO baustellen (kunde) VALUES ('Zugewiesen') RETURNING id`))[0].id;
    b2 = (await q(`INSERT INTO baustellen (kunde) VALUES ('Fremd') RETURNING id`))[0].id;
    await q(`SELECT sync_baustelle_junctions($1, $2::uuid[], '{}'::uuid[])`, [b1, [m1.id, m2.id]]);
  });
}, 120000);

describe('S-01: users – keine Selbst-Befoerderung', () => {
  it('Mitarbeiter kann die eigene Rolle nicht aendern', async () => {
    await expect(
      asM1(() => q(`UPDATE users SET role = 'chef' WHERE id = $1`, [m1.id])),
    ).rejects.toThrow(/permission denied/i);
    expect((await q(`SELECT role FROM users WHERE id = $1`, [m1.id]))[0].role).toBe('mitarbeiter');
  });

  it('Mitarbeiter kann eigenen Stundensatz nicht aendern (wird verworfen)', async () => {
    await asM1(() => q(`UPDATE users SET stundensatz = 999 WHERE id = $1`, [m1.id]));
    expect(Number((await q(`SELECT stundensatz FROM users WHERE id = $1`, [m1.id]))[0].stundensatz)).toBe(40);
  });

  it('Profil mit veraltetem Stundensatz: Name wird gespeichert, Chef-Wert bleibt', async () => {
    await chef(() => q(`UPDATE users SET stundensatz = 48 WHERE id = $1`, [m2.id]));
    const r = await asM2(() =>
      q(`UPDATE users SET name = 'Nora Neu', stundensatz = 40 WHERE id = $1 RETURNING name, stundensatz`, [m2.id]),
    );
    expect(r[0].name).toBe('Nora Neu');
    expect(Number(r[0].stundensatz)).toBe(48);
    await chef(() => q(`UPDATE users SET stundensatz = 40 WHERE id = $1`, [m2.id]));
  });

  it('Profil-Pfad: eigener Name mit unveraendertem Stundensatz geht (users.update)', async () => {
    const r = await asM2(() =>
      q(`UPDATE users SET name = 'Nora N.', stundensatz = 40 WHERE id = $1 RETURNING id, name, role, stundensatz`, [m2.id]),
    );
    expect(r[0].name).toBe('Nora N.');
  });

  it('Mitarbeiter kann fremde Zeilen nicht aendern (0 Zeilen)', async () => {
    const r = await asM1(() => q(`UPDATE users SET name = 'Hack' WHERE id = $1 RETURNING id`, [m2.id]));
    expect(r).toHaveLength(0);
  });

  it('Wartung ohne API-Kontext (SQL-Editor) darf den Stundensatz setzen', async () => {
    await q(`UPDATE users SET stundensatz = 40 WHERE id = $1`, [m1.id]);
  });

  it('niemand schreibt pin_hash / is_active / auth_id direkt', async () => {
    for (const col of ['pin_hash', 'is_active', 'auth_id', 'is_onboarded', 'username']) {
      await expect(
        chef(() => q(`UPDATE users SET ${col} = ${col} WHERE id = $1`, [m1.id])),
      ).rejects.toThrow(/permission denied/i);
    }
  });

  it('Chef kann Name und Stundensatz weiter aendern (App-Pfad users.update)', async () => {
    const r = await chef(() =>
      q(`UPDATE users SET name = 'Max M.', stundensatz = 42 WHERE id = $1 RETURNING id, name, role, stundensatz`, [m1.id]),
    );
    expect(r[0].name).toBe('Max M.');
  });

  it('direktes INSERT/DELETE auf users ist gesperrt (nur ueber RPCs)', async () => {
    await expect(
      chef(() => q(`DELETE FROM users WHERE id = $1`, [m2.id])),
    ).rejects.toThrow(/permission denied/i);
    await expect(
      asM1(() => q(`INSERT INTO users (name, role, pin_hash) VALUES ('X', 'chef', 'x')`)),
    ).rejects.toThrow(/permission denied/i);
  });

  it('App-Abfrage der Nutzerliste funktioniert weiter', async () => {
    const r = await asM1(() =>
      q(`SELECT id, name, role, stundensatz, username, is_onboarded, is_active, onboarding_pin_expiry FROM users ORDER BY created_at`),
    );
    expect(r.length).toBe(3);
  });
});

describe('S-02: PIN-Drossel-Tabelle ist nicht von aussen erreichbar', () => {
  it('anon und authenticated koennen die Drossel weder lesen noch aendern', async () => {
    for (const run of [anon, asM1]) {
      await expect(run(() => q(`UPDATE pin_lookup_throttle SET count = 0`))).rejects.toThrow(/permission denied/i);
      await expect(run(() => q(`SELECT * FROM pin_lookup_throttle`))).rejects.toThrow(/permission denied/i);
    }
  });

  it('der PIN-Login-Lookup funktioniert weiter (anon)', async () => {
    const r = await anon(() => q(`SELECT * FROM lookup_user_by_pin('1111')`));
    expect(r.map((x) => x.username)).toEqual(['m.muster']);
  });
});

describe('S-03: Stundeneintraege – nur eigene, freigegebene sind gesperrt', () => {
  it('Mitarbeiter erfasst eigene Stunden auf zugewiesener Baustelle', async () => {
    const r = await asM1(() => insertStunde(stunde()));
    expect(r).toHaveLength(1);
  });

  it('nicht fuer Kollegen, nicht auf fremder Baustelle, nicht als Sub/Sonstige', async () => {
    await expect(asM1(() => insertStunde(stunde({ mitarbeiter: m2.id })))).rejects.toThrow(/row-level security/i);
    await expect(asM1(() => insertStunde(stunde({ baustelle: b2 })))).rejects.toThrow(/row-level security/i);
    await expect(asM1(() => insertStunde(stunde({ typ: 'sonstige', mitarbeiter: null })))).rejects.toThrow(/row-level security/i);
  });

  it('kann sich nicht selbst freigeben', async () => {
    await expect(asM1(() => insertStunde(stunde({ freigegeben: true })))).rejects.toThrow(/row-level security/i);
    const id = (await asM1(() => insertStunde(stunde())))[0].id;
    await expect(
      asM1(() => q(`UPDATE stundeneintraege SET freigegeben = true WHERE id = $1`, [id])),
    ).rejects.toThrow(/row-level security/i);
  });

  it('Kollege sieht den Eintrag, kann ihn aber weder aendern noch loeschen', async () => {
    const id = (await asM1(() => insertStunde(stunde())))[0].id;
    expect(await asM2(() => q(`SELECT id FROM stundeneintraege WHERE id = $1`, [id]))).toHaveLength(1);
    expect(await asM2(() => q(`UPDATE stundeneintraege SET ende = '20:00' WHERE id = $1 RETURNING id`, [id]))).toHaveLength(0);
    expect(await asM2(() => q(`DELETE FROM stundeneintraege WHERE id = $1 RETURNING id`, [id]))).toHaveLength(0);
  });

  it('eigener Eintrag: aendern/loeschen geht – nach Freigabe nicht mehr', async () => {
    const id = (await asM1(() => insertStunde(stunde())))[0].id;
    expect(await asM1(() => q(`UPDATE stundeneintraege SET ende = '16:00' WHERE id = $1 RETURNING id`, [id]))).toHaveLength(1);
    await chef(() => q(`UPDATE stundeneintraege SET freigegeben = true WHERE id = $1`, [id]));
    expect(await asM1(() => q(`UPDATE stundeneintraege SET ende = '23:00' WHERE id = $1 RETURNING id`, [id]))).toHaveLength(0);
    expect(await asM1(() => q(`DELETE FROM stundeneintraege WHERE id = $1 RETURNING id`, [id]))).toHaveLength(0);
    expect((await q(`SELECT ende FROM stundeneintraege WHERE id = $1`, [id]))[0].ende).toBe('16:00');
  });

  it('Chef darf alles (auch fuer andere, Sub, freigeben, loeschen)', async () => {
    const r = await chef(async () => {
      const a = await insertStunde(stunde({ mitarbeiter: m2.id }));
      const b = await insertStunde(stunde({ typ: 'sonstige', mitarbeiter: null, baustelle: b2 }));
      await q(`UPDATE stundeneintraege SET freigegeben = true WHERE id = $1`, [a[0].id]);
      return q(`DELETE FROM stundeneintraege WHERE id = ANY($1::uuid[]) RETURNING id`, [[a[0].id, b[0].id]]);
    });
    expect(r).toHaveLength(2);
  });
});

describe('S-06: PIN-Regeln werden serverseitig erzwungen', () => {
  it('lehnt alles ab, was nicht genau 4 Ziffern hat', async () => {
    for (const bad of ['123', '12345', 'abcd', '12 4', '']) {
      await expect(
        asM1(() => q(`SELECT update_user_pin_v2($1, $2)`, [m1.id, bad])),
      ).rejects.toThrow(/4 Ziffern/);
    }
  });

  it('lehnt einen bereits vergebenen PIN ab', async () => {
    await expect(
      asM1(() => q(`SELECT update_user_pin_v2($1, '2222')`, [m1.id])),
    ).rejects.toThrow(/bereits vergeben/);
  });

  it('eigener PIN-Wechsel funktioniert, Login-Lookup findet den neuen PIN', async () => {
    await asM1(() => q(`SELECT update_user_pin_v2($1, '1357')`, [m1.id]));
    expect(await anon(() => q(`SELECT username FROM lookup_user_by_pin('1357')`))).toHaveLength(1);
    expect(await anon(() => q(`SELECT username FROM lookup_user_by_pin('1111')`))).toHaveLength(0);
    // Auth-Passwort wurde mitgezogen
    const ok = await q(
      `SELECT encrypted_password = crypt('1357', encrypted_password) AS ok FROM auth.users WHERE id = $1`,
      [m1.authId],
    );
    expect(ok[0].ok).toBe(true);
  });

  it('Mitarbeiter kann den PIN eines Kollegen nicht setzen', async () => {
    await expect(
      asM1(() => q(`SELECT update_user_pin_v2($1, '9080')`, [m2.id])),
    ).rejects.toThrow(/Nicht erlaubt/);
  });
});

describe('S-05: Einladungs-PIN', () => {
  it('abgelaufener Einladungs-PIN kann das Onboarding nicht mehr abschliessen', async () => {
    const m = await addMitarbeiter(db, 'Otto Alt', 'o.alt', '5555');
    await q(`UPDATE users SET onboarding_pin_expiry = now() - interval '1 minute' WHERE id = $1`, [m.id]);
    await expect(
      as(db, 'authenticated', m.authId, () => q(`SELECT complete_onboarding_v2($1, '6060')`, [m.id])),
    ).rejects.toThrow(/abgelaufen/);
    expect((await q(`SELECT is_onboarded FROM users WHERE id = $1`, [m.id]))[0].is_onboarded).toBe(false);
  });

  it('abgelaufener Einladungs-PIN: auch update_user_pin_v2 ist kein Umweg', async () => {
    const m = await addMitarbeiter(db, 'Udo Umweg', 'u.umweg', '5556');
    await q(`UPDATE users SET onboarding_pin_expiry = now() - interval '1 minute' WHERE id = $1`, [m.id]);
    await expect(
      as(db, 'authenticated', m.authId, () => q(`SELECT update_user_pin_v2($1, '6061')`, [m.id])),
    ).rejects.toThrow(/Onboarding nicht abgeschlossen/);
  });

  it('Fantasie-Benutzernamen legen keine Zaehler an', async () => {
    for (let i = 0; i < 5; i++) {
      await anon(() => q(`SELECT * FROM lookup_user_for_onboarding($1, '0000')`, [`gibt.es.nicht${i}`]));
    }
    const n = await q(`SELECT count(*)::int AS n FROM rpc_throttle WHERE key LIKE 'onboarding:gibt.es%'`);
    expect(n[0].n).toBe(0);
  });

  it('Lookup wird nach 5 Fehlversuchen pro Benutzername gesperrt', async () => {
    const m = await addMitarbeiter(db, 'Paul Probe', 'p.probe', '7788');
    for (let i = 0; i < 5; i++) {
      expect(await anon(() => q(`SELECT * FROM lookup_user_for_onboarding('p.probe', '0000')`))).toHaveLength(0);
    }
    // 6. Versuch mit dem RICHTIGEN PIN: gedrosselt → leer
    expect(await anon(() => q(`SELECT * FROM lookup_user_for_onboarding('p.probe', '7788')`))).toHaveLength(0);
    // anderer Benutzername ist nicht betroffen
    const other = await addMitarbeiter(db, 'Quirin Quer', 'q.quer', '3344');
    const r = await anon(() => q(`SELECT * FROM lookup_user_for_onboarding('q.quer', '3344')`));
    expect(r.map((x) => x.user_id)).toEqual([other.id]);
    expect(m.id).not.toBe(other.id);
  });
});

describe('S-04: PIN-Abfragen sind pro Nutzer gedrosselt', () => {
  it('check_pin_exists: normale Nutzung geht, Durchprobieren wird gesperrt', async () => {
    const m = await addMitarbeiter(db, 'Rita Rate', 'r.rate', '8001');
    const asM = (fn) => as(db, 'authenticated', m.authId, fn);
    expect((await asM(() => q(`SELECT check_pin_exists('1357') AS x`)))[0].x).toBe(true);
    expect((await asM(() => q(`SELECT check_pin_exists('9999') AS x`)))[0].x).toBe(false);
    let blocked = false;
    for (let i = 0; i < 8 && !blocked; i++) {
      try {
        await asM(() => q(`SELECT check_pin_exists($1)`, [String(1000 + i)]));
      } catch (e) {
        blocked = /Zu viele Versuche/.test(e.message);
      }
    }
    expect(blocked).toBe(true);
  });

  it('update_user_pin_v2 taugt nicht als Ersatz-Orakel (gleiche Drossel)', async () => {
    const m = await addMitarbeiter(db, 'Sven Such', 's.such', '8002');
    const asM = (fn) => as(db, 'authenticated', m.authId, fn);
    await asM(() => q(`SELECT complete_onboarding_v2($1, '8003')`, [m.id]));
    let blocked = false;
    let found = [];
    for (let i = 0; i < 30 && !blocked; i++) {
      const pin = String(8100 + i);
      try {
        await asM(() => q(`SELECT update_user_pin_v2($1, $2)`, [m.id, pin]));
      } catch (e) {
        if (/Zu viele Versuche/.test(e.message)) blocked = true;
        else if (/bereits vergeben/.test(e.message)) found.push(pin);
      }
    }
    expect(blocked).toBe(true);
    expect(found).toEqual([]);
  });

  it('Chef ist beim PIN-Setzen fuer Mitarbeiter nicht gedrosselt', async () => {
    for (let i = 0; i < 8; i++) {
      await chef(() => q(`SELECT update_user_pin_v2($1, $2)`, [m2.id, String(2300 + i)]));
    }
    await chef(() => q(`SELECT update_user_pin_v2($1, '2222')`, [m2.id]));
  });

  it('bleibt fuer anon gesperrt', async () => {
    await expect(anon(() => q(`SELECT check_pin_exists('1357')`))).rejects.toThrow(/permission denied/i);
  });
});

describe('S-07: SECURITY-DEFINER-Funktionen haben einen festen search_path', () => {
  it('keine Funktion in public ohne search_path', async () => {
    const r = await q(`
      SELECT p.oid::regprocedure::text AS fn
      FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.prosecdef
        AND NOT EXISTS (SELECT 1 FROM unnest(coalesce(p.proconfig, '{}')) c WHERE c LIKE 'search_path=%')`);
    expect(r.map((x) => x.fn)).toEqual([]);
  });

  it('interne Drossel-Hilfsfunktion ist nicht von aussen aufrufbar', async () => {
    await expect(
      asM1(() => q(`SELECT rpc_throttle_hit('x', 1, interval '1 minute')`)),
    ).rejects.toThrow(/permission denied/i);
  });
});

describe('S-08: Benutzername wird geprueft', () => {
  it('lehnt Grossbuchstaben, Leerzeichen und Umlaute ab – ohne Auth-Leiche', async () => {
    for (const bad of ['Max.Muster', 'max muster', 'm.müller', 'a', '']) {
      await expect(
        chef(() => q(`SELECT create_user_with_auth('Test', $1, 40, '1234', now() + interval '7 days')`, [bad])),
      ).rejects.toThrow(/Benutzername/);
    }
    // Transaktion zurueckgerollt → kein verwaistes Auth-Konto
    const orphans = await q(
      `SELECT count(*)::int AS n FROM auth.users a WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.auth_id = a.id)`,
    );
    expect(orphans[0].n).toBe(0);
  });
});

describe('Rollen-Matrix (Stichprobe)', () => {
  it('Mitarbeiter sieht nur zugewiesene Baustellen', async () => {
    const r = await asM1(() => q(`SELECT kunde FROM baustellen`));
    expect(r.map((x) => x.kunde)).toEqual(['Zugewiesen']);
  });

  it('Mitarbeiter kann keine Baustelle, Kosten, Bautagebuch-Eintraege anlegen', async () => {
    await expect(asM1(() => q(`INSERT INTO baustellen (kunde) VALUES ('X')`))).rejects.toThrow(/row-level security/i);
    await expect(asM1(() => q(`INSERT INTO kosten (baustelle_id, beschreibung, betrag) VALUES ($1, 'X', 1)`, [b1]))).rejects.toThrow(/row-level security/i);
    await expect(asM1(() => q(`INSERT INTO bautagebuch (baustelle_id, datum) VALUES ($1, '2026-11-16')`, [b1]))).rejects.toThrow(/row-level security/i);
  });

  it('Mitarbeiter kann Mangel auf zugewiesener Baustelle melden, nicht auf fremder', async () => {
    expect(await asM1(() => q(`INSERT INTO maengel (baustelle_id, titel) VALUES ($1, 'Riss') RETURNING id`, [b1]))).toHaveLength(1);
    await expect(asM1(() => q(`INSERT INTO maengel (baustelle_id, titel) VALUES ($1, 'Riss')`, [b2]))).rejects.toThrow(/row-level security/i);
  });

  it('anon sieht nichts', async () => {
    for (const t of ['users', 'baustellen', 'stundeneintraege', 'maengel', 'kosten', 'benachrichtigungen']) {
      expect(await anon(() => q(`SELECT 1 FROM ${t}`))).toHaveLength(0);
    }
  });

  it('Admin-RPCs sind fuer Mitarbeiter und anon gesperrt', async () => {
    await expect(asM1(() => q(`SELECT delete_user_with_auth($1)`, [m2.id]))).rejects.toThrow(/Nur der Chef/);
    await expect(asM1(() => q(`SELECT toggle_user_active_v2($1, false)`, [m2.id]))).rejects.toThrow(/Nur der Chef/);
    await expect(asM1(() => q(`SELECT create_user_with_pin_v2('X','chef','1234',1,'x.y')`))).rejects.toThrow(/Nur der Chef/);
    await expect(anon(() => q(`SELECT delete_user_with_auth($1)`, [m2.id]))).rejects.toThrow(/permission denied/i);
  });

  it('deaktivierter Chef verliert die Chef-Rechte sofort', async () => {
    await q(`UPDATE users SET is_active = false WHERE id = $1`, [chefId]);
    try {
      expect((await chef(() => q(`SELECT is_chef() AS x`)))[0].x).toBe(false);
      expect(await chef(() => q(`SELECT 1 FROM baustellen`))).toHaveLength(0);
    } finally {
      await q(`UPDATE users SET is_active = true WHERE id = $1`, [chefId]);
    }
  });
});

describe('Migration ist wiederholbar und laesst die Admin-RPCs intakt', () => {
  it('zweites Ausfuehren laeuft ohne Fehler durch', async () => {
    const { readFileSync } = await import('node:fs');
    const sql = readFileSync(new URL(`../${MIGRATION}`, import.meta.url), 'utf8');
    await db.exec(sql);
    await db.exec(sql);
    expect((await q(`SELECT count(*)::int AS n FROM pg_policies WHERE tablename = 'stundeneintraege'`))[0].n).toBe(5);
  });

  it('Reset, Deaktivieren und Loeschen funktionieren weiter (inkl. Stunden-Schnappschuss)', async () => {
    const m = await addMitarbeiter(db, 'Vera Voll', 'v.voll', '8201');
    await as(db, 'authenticated', m.authId, () => q(`SELECT complete_onboarding_v2($1, '8202')`, [m.id]));
    await chef(() => q(`SELECT sync_baustelle_junctions($1, $2::uuid[], '{}'::uuid[])`, [b2, [m.id]]));
    const sid = (await as(db, 'authenticated', m.authId, () => insertStunde(stunde({ baustelle: b2, mitarbeiter: m.id }))))[0].id;
    await chef(async () => {
      await q(`SELECT reset_onboarding_v2($1, '8203', now() + interval '7 days', 'v.voll')`, [m.id]);
      await q(`SELECT toggle_user_active_v2($1, false)`, [m.id]);
      await q(`SELECT toggle_user_active_v2($1, true)`, [m.id]);
      await q(`SELECT delete_user_with_auth($1)`, [m.id]);
    });
    const row = (await q(`SELECT person_typ, person_name, mitarbeiter_id FROM stundeneintraege WHERE id = $1`, [sid]))[0];
    expect(row).toEqual({ person_typ: 'sonstige', person_name: 'Vera Voll', mitarbeiter_id: null });
    expect(await q(`SELECT 1 FROM auth.users WHERE id = $1`, [m.authId])).toHaveLength(0);
  });
});
