import { todayIso } from '../../utils/helpers.js';
import { supabase } from '../supabase.js';
import { deletePhotos } from '../storage.js';
import { selectAll } from './_request.js';

export async function getAll({ signal } = {}) {
  // 6-04: Retry/Abort/Timeout-Wrapper.
  const { data, error } = await selectAll(
    () => supabase.from('maengel').select('*').order('created_at').order('id'),
    { signal },
  );
  if (error) throw error;
  return data.map(mapRow);
}

export async function create(m) {
  const row = {
    // Pre-insert UUID erlaubt Foto-Upload mit korrektem Pfad VOR dem Insert.
    ...(m.id ? { id: m.id } : {}),
    baustelle_id: m.baustelleId,
    titel: m.titel,
    beschreibung: m.beschreibung || '',
    prioritaet: m.prioritaet || 'mittel',
    status: m.status || 'offen',
    zustaendig: m.zustaendig || null,
    erstellt_am: m.erstelltAm || todayIso(),
    frist: m.frist || null,
    fotos: m.fotos || [],
  };
  const { data, error } = await supabase
    .from('maengel')
    .insert(row)
    .select()
    .single();
  if (error) throw error;
  // F-03: API-Returns app-weit konsistent als id-String. Aufrufer holen
  // sich das volle Object via reload + Lookup, falls benötigt.
  return data.id;
}

export async function updateStatus(id, status) {
  const { error } = await supabase.from('maengel').update({ status }).eq('id', id);
  if (error) throw error;
}

export async function remove(id) {
  // Reihenfolge: erst die Zeile löschen, DANN die Fotos. Früher umgekehrt —
  // scheiterte das Löschen der Zeile (z.B. keine Berechtigung), blieb der
  // Mangel stehen, aber seine Fotos waren weg. Verwaiste Dateien im Speicher
  // sind das kleinere Übel als ein Mangel ohne Fotos.
  const { data: row, error: readErr } = await supabase
    .from('maengel')
    .select('fotos')
    .eq('id', id)
    .single();
  if (readErr) throw readErr;
  // Legacy-Base64-Einträge ("data:...") liegen nicht im Storage.
  const paths = (row?.fotos || []).filter(
    (f) => typeof f === 'string' && !f.startsWith('data:'),
  );

  const { error } = await supabase.from('maengel').delete().eq('id', id);
  if (error) throw error;

  if (paths.length > 0) {
    try {
      await deletePhotos(paths);
    } catch (e) {
      // Aufräumen ist best-effort — der Mangel ist bereits gelöscht.
      console.error('[maengel.remove] storage cleanup failed:', e);
    }
  }
}

function mapRow(r) {
  return {
    id: r.id,
    baustelleId: r.baustelle_id,
    titel: r.titel,
    beschreibung: r.beschreibung || '',
    prioritaet: r.prioritaet,
    status: r.status,
    zustaendig: r.zustaendig,
    erstelltAm: r.erstellt_am,
    frist: r.frist,
    fotos: r.fotos || [],
  };
}
