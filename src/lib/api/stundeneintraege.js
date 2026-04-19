import { supabase } from '../supabase.js';
import { stripUndefined } from '../../utils/objects.js';

export async function getAll() {
  const { data, error } = await supabase
    .from('stundeneintraege')
    .select('*')
    .order('created_at');
  if (error) throw error;
  return data.map(mapRow);
}

export async function create(entry) {
  const row = toRow(entry);
  const { data, error } = await supabase
    .from('stundeneintraege')
    .insert(row)
    .select()
    .single();
  if (error) throw error;
  return mapRow(data);
}

export async function update(id, entry) {
  const row = stripUndefined(toRow(entry));
  const { error } = await supabase.from('stundeneintraege').update(row).eq('id', id);
  if (error) throw error;
}

export async function remove(id) {
  const { error } = await supabase.from('stundeneintraege').delete().eq('id', id);
  if (error) throw error;
}

function toRow(e) {
  return {
    baustelle_id: e.baustelleId,
    datum: e.datum,
    beginn: e.beginn,
    ende: e.ende,
    pause: e.pause || 0,
    fahrtzeit: e.fahrtzeit || 0,
    arbeit: e.arbeit || '',
    material: e.material || '',
    fotos: e.fotos || [],
    person_typ: e.personTyp || 'mitarbeiter',
    mitarbeiter_id: e.mitarbeiterId || null,
    sub_id: e.subId || null,
    person_name: e.personName || '',
  };
}

function mapRow(r) {
  return {
    id: r.id,
    baustelleId: r.baustelle_id,
    datum: r.datum,
    beginn: r.beginn,
    ende: r.ende,
    pause: r.pause,
    fahrtzeit: r.fahrtzeit || 0,
    arbeit: r.arbeit,
    material: r.material || '',
    fotos: r.fotos || [],
    personTyp: r.person_typ || 'mitarbeiter',
    mitarbeiterId: r.mitarbeiter_id,
    subId: r.sub_id,
    personName: r.person_name || '',
  };
}
