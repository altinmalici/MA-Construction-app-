#!/usr/bin/env node
/**
 * MA Construction – Photo Storage Migration
 *
 * Migriert Base64-Fotos aus den TEXT[]-Spalten von `maengel.fotos` und
 * `stundeneintraege.fotos` in den `photos`-Storage-Bucket.
 *
 * Pro Row:
 *   1. fotos[] aufteilen in Base64-Einträge ("data:image/...") und schon-Pfade
 *   2. Base64 → Blob → upload nach {baustelle_id}/{entity}/{row_id}/{uuid}.{ext}
 *   3. Row updaten: fotos = [...kept-paths, ...neue-paths]
 *
 * Idempotent: Rows ohne Base64-Einträge werden übersprungen.
 *
 * Ausführung (Dry-Run = Default, schreibt nicht):
 *   SUPABASE_URL=https://xxx.supabase.co \
 *   SUPABASE_SERVICE_KEY=eyJ... \
 *   node scripts/migrate-photos-to-storage.mjs
 *
 * Real-Run:
 *   ... node scripts/migrate-photos-to-storage.mjs --apply
 */

import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const APPLY = process.argv.includes('--apply');

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Fehlende Umgebungsvariablen: SUPABASE_URL und SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const TABLES = [
  { table: 'maengel', entity: 'maengel' },
  { table: 'stundeneintraege', entity: 'stundeneintraege' },
];

const MIME_TO_EXT = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

/**
 * Splittet eine Data-URL in {mime, buffer}. Wirft, wenn nicht parsebar.
 */
function dataUrlToBuffer(dataUrl) {
  const match = /^data:([^;,]+)(?:;base64)?,(.*)$/s.exec(dataUrl);
  if (!match) throw new Error('keine gültige data: URL');
  const mime = match[1].toLowerCase();
  const buf = Buffer.from(match[2], 'base64');
  return { mime, buffer: buf };
}

function isBase64(f) {
  return typeof f === 'string' && f.startsWith('data:');
}

async function migrateRow({ table, entity }, row) {
  const fotos = row.fotos || [];
  const base64s = fotos.filter(isBase64);
  const keptPaths = fotos.filter((f) => !isBase64(f));

  if (base64s.length === 0) {
    return { skipped: true, uploaded: 0 };
  }

  if (!row.baustelle_id) {
    throw new Error('row.baustelle_id fehlt — Storage-Pfad nicht generierbar');
  }

  const newPaths = [];
  for (const dataUrl of base64s) {
    const { mime, buffer } = dataUrlToBuffer(dataUrl);
    const ext = MIME_TO_EXT[mime] || 'jpg';
    const contentType = MIME_TO_EXT[mime] ? mime : 'image/jpeg';
    const photoId = randomUUID();
    const path = `${row.baustelle_id}/${entity}/${row.id}/${photoId}.${ext}`;

    if (!APPLY) {
      console.log(`    [dry] upload ${buffer.byteLength}B → ${path}`);
      newPaths.push(path);
      continue;
    }

    const { error: upErr } = await supabase.storage
      .from('photos')
      .upload(path, buffer, {
        contentType,
        cacheControl: '86400',
        upsert: false,
      });
    if (upErr) throw new Error(`upload ${path} failed: ${upErr.message}`);
    newPaths.push(path);
  }

  const newFotos = [...keptPaths, ...newPaths];

  if (!APPLY) {
    console.log(
      `    [dry] update ${table}.id=${row.id} fotos: ${fotos.length} → ${newFotos.length} (${base64s.length} base64 → pfad)`,
    );
  } else {
    const { error: updErr } = await supabase
      .from(table)
      .update({ fotos: newFotos })
      .eq('id', row.id);
    if (updErr) throw new Error(`update ${table}.${row.id} failed: ${updErr.message}`);
  }

  return { skipped: false, uploaded: base64s.length };
}

async function migrateTable(target) {
  console.log(`\n=== ${target.table} ===`);
  const { data: rows, error } = await supabase
    .from(target.table)
    .select('id, baustelle_id, fotos')
    .order('created_at');
  if (error) throw new Error(`load ${target.table}: ${error.message}`);

  let touched = 0;
  let uploadedTotal = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of rows || []) {
    const base64s = (row.fotos || []).filter(isBase64);
    if (base64s.length === 0) {
      skipped++;
      continue;
    }
    console.log(`  ${row.id} (baustelle=${row.baustelle_id}): ${base64s.length} base64-foto(s)`);
    try {
      const res = await migrateRow(target, row);
      if (!res.skipped) {
        touched++;
        uploadedTotal += res.uploaded;
      }
    } catch (e) {
      failed++;
      console.error(`    ❌ ${e.message}`);
    }
  }

  console.log(
    `  → ${target.table}: ${touched} rows migriert (${uploadedTotal} foto(s)), ${skipped} skipped, ${failed} failed`,
  );
  return { touched, uploadedTotal, skipped, failed };
}

async function main() {
  console.log(`🔄 MA Construction – Photo Storage Migration`);
  console.log(`   Modus: ${APPLY ? '⚠️  REAL-RUN (--apply)' : '🧪 DRY-RUN (default)'}`);

  let totalUploaded = 0;
  let totalFailed = 0;
  for (const target of TABLES) {
    const res = await migrateTable(target);
    totalUploaded += res.uploadedTotal;
    totalFailed += res.failed;
  }

  console.log(`\n========================================`);
  console.log(`Fotos migriert: ${totalUploaded}`);
  if (totalFailed > 0) console.log(`❌ Failed:        ${totalFailed}`);
  if (!APPLY) console.log(`\n💡 Re-Run mit --apply um die Änderungen zu schreiben.`);
}

// Nur wenn direkt aufgerufen — beim Import (z.B. aus Tests) nichts tun.
const isDirectRun =
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith('migrate-photos-to-storage.mjs');
if (isDirectRun) {
  main().catch((err) => {
    console.error('❌ Unerwarteter Fehler:', err);
    process.exit(1);
  });
}

// Exporte für Vitest
export const _internals = { dataUrlToBuffer, isBase64 };
