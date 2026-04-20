import { supabase } from '../supabase.js';

export async function getAll() {
  const { data, error } = await supabase
    .from('maengel')
    .select('*')
    .order('created_at');
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
    erstellt_am: m.erstelltAm || new Date().toISOString().split('T')[0],
    frist: m.frist || null,
    fotos: m.fotos || [],
  };
  const { data, error } = await supabase
    .from('maengel')
    .insert(row)
    .select()
    .single();
  if (error) throw error;
  return mapRow(data);
}

export async function updateStatus(id, status) {
  const { error } = await supabase.from('maengel').update({ status }).eq('id', id);
  if (error) throw error;
}

export async function remove(id) {
  const { error } = await supabase.from('maengel').delete().eq('id', id);
  if (error) throw error;
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
