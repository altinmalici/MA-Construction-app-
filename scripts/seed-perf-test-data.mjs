#!/usr/bin/env node
/**
 * MA Construction – Performance Test Data Seeder (6-06)
 *
 * Generiert Synthetik-Daten zur Reproduktion von Performance-Bottlenecks
 * bei realistischem Daten-Volumen:
 *   - 100 Baustellen (60 aktiv, 30 abgeschlossen, 10 pausiert)
 *   - 10 Mitarbeiter (zusätzlich)
 *   - 50 Subunternehmer
 *   - 10.000 Stundeneinträge (verteilt, letzte 12 Monate)
 *   -    500 Mängel
 *   -    200 Kosten-Einträge
 *
 * Marker: Alle Test-Daten haben einen "[PERF-TEST]"-Prefix in einem
 * Text-Feld bzw. werden via dedizierter Kunde/Name-Konvention erkannt.
 * --cleanup löscht alle Rows mit dem Marker wieder.
 *
 * Default = --dry-run. --apply schreibt. --cleanup löscht.
 *
 * SICHERHEIT: NICHT direkt gegen Prod-DB ausführen ohne Backup!
 * Empfohlen: gegen Test-Branch in Supabase oder lokale Dev-DB.
 *
 *   SUPABASE_URL=https://xxx.supabase.co \
 *   SUPABASE_SERVICE_KEY=eyJ... \
 *   node scripts/seed-perf-test-data.mjs              # dry-run
 *   node scripts/seed-perf-test-data.mjs --apply      # real-run
 *   node scripts/seed-perf-test-data.mjs --cleanup    # lösche alle PERF-TEST-Rows
 */

import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const APPLY = process.argv.includes('--apply');
const CLEANUP = process.argv.includes('--cleanup');

const MARKER = '[PERF-TEST]';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_URL und SUPABASE_SERVICE_KEY müssen gesetzt sein');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ---------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function dateInLastMonths(months) {
  const now = Date.now();
  const past = now - months * 30 * 24 * 3600 * 1000;
  const t = past + Math.random() * (now - past);
  return new Date(t).toISOString().split('T')[0];
}

function timePair() {
  // Realistische Beginn/Ende: Beginn 6-9 Uhr, Schicht 6-10h
  const startHour = randInt(6, 9);
  const startMin = pick([0, 15, 30, 45]);
  const durHours = randInt(6, 10);
  const beginn = `${String(startHour).padStart(2, '0')}:${String(startMin).padStart(2, '0')}`;
  const endHour = (startHour + durHours) % 24;
  const ende = `${String(endHour).padStart(2, '0')}:${String(startMin).padStart(2, '0')}`;
  return { beginn, ende, pause: pick([0, 15, 30, 45, 60]) };
}

const STATUS_DIST = [
  ...Array(60).fill('aktiv'),
  ...Array(30).fill('abgerechnet'),
  ...Array(10).fill('pausiert'),
];

const ARBEITEN_BEISPIELE = [
  'Trockenbau Wand', 'Estrich verlegt', 'Fliesen Bad', 'Elektro Verkabelung',
  'Sanitär Installation', 'Maler Vorarbeiten', 'Fassade gestrichen',
  'Bodenbelag verlegt', 'Türen montiert', 'Fenster eingebaut',
  'Dämmung angebracht', 'Putz aufgetragen', 'Abriss alter Wand',
  'Sockelleisten', 'Aufmaß genommen',
];

const MAENGEL_BEISPIELE = [
  'Riss in Wand', 'Wasserschaden', 'Steckdose defekt', 'Tür schließt nicht',
  'Fliese gebrochen', 'Farbabplatzungen', 'Schimmelfleck', 'Heizung kalt',
];

const KAT_DIST = ['material', 'subunternehmer', 'sonstiges'];

// ---------------------------------------------------------------------
// Plan
// ---------------------------------------------------------------------

const PLAN = {
  baustellen: 100,
  mitarbeiter: 10,
  subunternehmer: 50,
  stundeneintraege: 10000,
  maengel: 500,
  kosten: 200,
};

function generateBaustellen() {
  const rows = [];
  for (let i = 0; i < PLAN.baustellen; i++) {
    const id = randomUUID();
    rows.push({
      id,
      kunde: `${MARKER} Kunde-${i + 1}`,
      adresse: `Teststraße ${i + 1}, 80331 München`,
      status: STATUS_DIST[i],
      fortschritt: randInt(0, 100),
      startdatum: dateInLastMonths(12),
      enddatum: dateInLastMonths(0),
      budget: randInt(5000, 200000),
      details: { perfTest: true },
    });
  }
  return rows;
}

function generateMitarbeiter() {
  const rows = [];
  for (let i = 0; i < PLAN.mitarbeiter; i++) {
    rows.push({
      name: `${MARKER} Tester-${i + 1}`,
      role: 'mitarbeiter',
      stundensatz: randInt(35, 65),
      // username + auth_id müssen über RPC gesetzt werden — hier nur als
      // public.users-Insert markiert. PIN-Lookup wird nicht funktionieren,
      // aber für Aggregations-Tests reichen die Rows.
    });
  }
  return rows;
}

function generateSubs() {
  const rows = [];
  for (let i = 0; i < PLAN.subunternehmer; i++) {
    rows.push({
      name: `${MARKER} Sub-${i + 1}`,
      gewerk: pick(['Sanitär', 'Elektrik', 'Maler', 'Fliesen', 'Trockenbau']),
      telefon: `+49 89 ${randInt(1000000, 9999999)}`,
    });
  }
  return rows;
}

function generateStunden(baustellenIds, mitarbeiterIds) {
  const rows = [];
  for (let i = 0; i < PLAN.stundeneintraege; i++) {
    const t = timePair();
    rows.push({
      id: randomUUID(),
      baustelle_id: pick(baustellenIds),
      mitarbeiter_id: pick(mitarbeiterIds),
      person_typ: 'mitarbeiter',
      datum: dateInLastMonths(12),
      ...t,
      arbeit: pick(ARBEITEN_BEISPIELE),
      material: i % 5 === 0 ? `${MARKER} Material-Notiz` : '',
      fotos: [],
    });
  }
  return rows;
}

function generateMaengel(baustellenIds) {
  const rows = [];
  for (let i = 0; i < PLAN.maengel; i++) {
    rows.push({
      id: randomUUID(),
      baustelle_id: pick(baustellenIds),
      titel: `${MARKER} ${pick(MAENGEL_BEISPIELE)}`,
      beschreibung: 'Synthetik-Test-Mangel',
      prioritaet: pick(['niedrig', 'mittel', 'hoch']),
      status: pick(['offen', 'in_arbeit', 'erledigt']),
      erstellt_am: dateInLastMonths(6),
      fotos: [],
    });
  }
  return rows;
}

function generateKosten(baustellenIds) {
  const rows = [];
  for (let i = 0; i < PLAN.kosten; i++) {
    rows.push({
      id: randomUUID(),
      baustelle_id: pick(baustellenIds),
      kategorie: pick(KAT_DIST),
      beschreibung: `${MARKER} Kostenposten ${i + 1}`,
      betrag: randInt(50, 5000),
      datum: dateInLastMonths(12),
    });
  }
  return rows;
}

// ---------------------------------------------------------------------
// Apply / Cleanup
// ---------------------------------------------------------------------

async function batchInsert(table, rows, label) {
  const BATCH = 500;
  for (let i = 0; i < rows.length; i += BATCH) {
    const slice = rows.slice(i, i + BATCH);
    const { error } = await supabase.from(table).insert(slice);
    if (error) throw new Error(`${label} batch ${i}: ${error.message}`);
    process.stdout.write(`\r  ${label}: ${Math.min(i + BATCH, rows.length)}/${rows.length}`);
  }
  process.stdout.write('\n');
}

async function applyAll() {
  console.log('=== APPLY ===');

  // 1. Baustellen
  const baustellen = generateBaustellen();
  console.log(`\n[1/5] Baustellen (${baustellen.length})...`);
  await batchInsert('baustellen', baustellen, 'baustellen');

  // 2. Subunternehmer
  const subs = generateSubs();
  console.log(`\n[2/5] Subunternehmer (${subs.length})...`);
  await batchInsert('subunternehmer', subs, 'subunternehmer');

  // 3. Mitarbeiter (public.users only — auth.users wird übersprungen,
  //    da RPC create_user_with_auth ein PIN erwartet, was für Test-
  //    Daten unnötig ist; Aggregations-Tests brauchen nur stundensatz).
  const mitarbeiter = generateMitarbeiter();
  console.log(`\n[3/5] Mitarbeiter (${mitarbeiter.length})...`);
  await batchInsert('users', mitarbeiter, 'users');

  // Read back inserted IDs
  const { data: bsRows } = await supabase
    .from('baustellen').select('id').like('kunde', `${MARKER}%`);
  const { data: muRows } = await supabase
    .from('users').select('id').like('name', `${MARKER}%`);
  const baustellenIds = bsRows.map((b) => b.id);
  const mitarbeiterIds = muRows.map((u) => u.id);

  // 4. Stunden
  const stunden = generateStunden(baustellenIds, mitarbeiterIds);
  console.log(`\n[4/5] Stundeneinträge (${stunden.length})...`);
  await batchInsert('stundeneintraege', stunden, 'stundeneintraege');

  // 5. Mängel + Kosten
  const maengel = generateMaengel(baustellenIds);
  const kosten = generateKosten(baustellenIds);
  console.log(`\n[5/5] Mängel (${maengel.length}) + Kosten (${kosten.length})...`);
  await batchInsert('maengel', maengel, 'maengel');
  await batchInsert('kosten', kosten, 'kosten');

  console.log('\n✅ APPLY done');
}

async function cleanupAll() {
  console.log('=== CLEANUP ===');
  // Reihenfolge wegen FK-Cascades: stunden, maengel, kosten zuerst,
  // dann baustellen + subs + users.
  const tables = [
    { name: 'stundeneintraege', filter: { col: 'material', like: `${MARKER}%` } },
    { name: 'maengel',          filter: { col: 'titel',   like: `${MARKER}%` } },
    { name: 'kosten',           filter: { col: 'beschreibung', like: `${MARKER}%` } },
    { name: 'subunternehmer',   filter: { col: 'name',    like: `${MARKER}%` } },
    { name: 'users',            filter: { col: 'name',    like: `${MARKER}%` } },
    { name: 'baustellen',       filter: { col: 'kunde',   like: `${MARKER}%` } },
  ];
  for (const t of tables) {
    const { error, count } = await supabase
      .from(t.name).delete({ count: 'exact' }).like(t.filter.col, t.filter.like);
    if (error) {
      console.error(`  ❌ ${t.name}: ${error.message}`);
    } else {
      console.log(`  ✓ ${t.name}: ${count ?? '?'} gelöscht`);
    }
  }
}

function dryRun() {
  console.log(`=== DRY-RUN ===`);
  console.log(`Würde anlegen (Marker: ${MARKER}):`);
  Object.entries(PLAN).forEach(([k, v]) => console.log(`  ${k.padEnd(20)} ${v}`));
  console.log(`\n💡 Re-Run mit --apply um zu schreiben.`);
  console.log(`💡 Re-Run mit --cleanup um die PERF-TEST-Daten zu löschen.`);
}

async function main() {
  if (CLEANUP) {
    await cleanupAll();
    return;
  }
  if (!APPLY) {
    dryRun();
    return;
  }
  await applyAll();
}

const isDirectRun =
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith('seed-perf-test-data.mjs');
if (isDirectRun) {
  main().catch((err) => {
    console.error('\n❌ Unerwarteter Fehler:', err.message);
    process.exit(1);
  });
}
