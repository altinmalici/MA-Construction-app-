import { supabase } from '../supabase.js';

export async function getAll() {
  const { data, error } = await supabase
    .from('subunternehmer')
    .select('*')
    .order('created_at');
  if (error) throw error;
  return data.map(s => ({ id: s.id, name: s.name, gewerk: s.gewerk || '', telefon: s.telefon || '' }));
}

export async function create({ name, gewerk, telefon }) {
  const { data, error } = await supabase
    .from('subunternehmer')
    .insert({ name, gewerk: gewerk || '', telefon: telefon || '' })
    .select()
    .single();
  if (error) throw error;
  return { id: data.id, name: data.name, gewerk: data.gewerk, telefon: data.telefon };
}

export async function remove(id) {
  const { error } = await supabase.from('subunternehmer').delete().eq('id', id);
  if (error) throw error;
}
