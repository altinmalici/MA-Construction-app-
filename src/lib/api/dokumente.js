import { supabase } from '../supabase.js';

export async function getAll() {
  const { data, error } = await supabase
    .from('dokumente')
    .select('*')
    .order('created_at');
  if (error) throw error;
  return data.map(r => ({
    id: r.id,
    baustelleId: r.baustelle_id,
    name: r.name,
    typ: r.typ || 'dokument',
    groesse: r.groesse || '–',
    datum: r.datum,
  }));
}

export async function create(doc) {
  const row = {
    baustelle_id: doc.baustelleId,
    name: doc.name,
    typ: doc.typ || 'dokument',
    groesse: doc.groesse || '–',
    datum: doc.datum || new Date().toISOString().split('T')[0],
  };
  const { data, error } = await supabase
    .from('dokumente')
    .insert(row)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function remove(id) {
  const { error } = await supabase.from('dokumente').delete().eq('id', id);
  if (error) throw error;
}
