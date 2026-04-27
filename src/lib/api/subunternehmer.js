import { supabase } from '../supabase.js';
import { requestWithRetry } from './_request.js';

export async function getAll({ signal } = {}) {
  // 6-04: Retry/Abort/Timeout-Wrapper.
  const { data, error } = await requestWithRetry(
    () => supabase.from('subunternehmer').select('*').order('created_at'),
    { signal },
  );
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
  // F-03: API-Returns app-weit konsistent als id-String.
  return data.id;
}

export async function remove(id) {
  const { error } = await supabase.from('subunternehmer').delete().eq('id', id);
  if (error) throw error;
}
