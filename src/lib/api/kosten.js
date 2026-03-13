import { supabase } from '../supabase.js';

export async function getAll() {
  const { data, error } = await supabase
    .from('kosten')
    .select('*')
    .order('created_at');
  if (error) throw error;
  return data.map(r => ({
    id: r.id,
    baustelleId: r.baustelle_id,
    kategorie: r.kategorie,
    beschreibung: r.beschreibung,
    betrag: Number(r.betrag),
    datum: r.datum,
    ersteller: r.ersteller,
  }));
}

export async function create(k) {
  const row = {
    baustelle_id: k.baustelleId,
    kategorie: k.kategorie || 'material',
    beschreibung: k.beschreibung,
    betrag: k.betrag,
    datum: k.datum || new Date().toISOString().split('T')[0],
    ersteller: k.ersteller || null,
  };
  const { data, error } = await supabase
    .from('kosten')
    .insert(row)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function remove(id) {
  const { error } = await supabase.from('kosten').delete().eq('id', id);
  if (error) throw error;
}
