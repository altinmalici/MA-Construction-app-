import { supabase } from '../supabase.js';

export async function getAll() {
  const { data, error } = await supabase
    .from('benachrichtigungen')
    .select('*')
    .order('datum', { ascending: false });
  if (error) throw error;
  return data.map(r => ({
    id: r.id,
    typ: r.typ,
    text: r.text,
    baustelleId: r.baustelle_id,
    datum: r.datum,
    gelesen: r.gelesen,
  }));
}

export async function create(n) {
  const row = {
    typ: n.typ || 'info',
    text: n.text,
    baustelle_id: n.baustelleId || null,
    datum: n.datum || new Date().toISOString(),
    gelesen: false,
  };
  const { data, error } = await supabase
    .from('benachrichtigungen')
    .insert(row)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function markAllRead() {
  const { error } = await supabase
    .from('benachrichtigungen')
    .update({ gelesen: true })
    .eq('gelesen', false);
  if (error) throw error;
}

export async function remove(id) {
  const { error } = await supabase.from('benachrichtigungen').delete().eq('id', id);
  if (error) throw error;
}

export async function removeAll() {
  const { error } = await supabase.from('benachrichtigungen').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (error) throw error;
}
