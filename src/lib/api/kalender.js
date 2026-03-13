import { supabase } from '../supabase.js';

export async function getAll() {
  const { data, error } = await supabase
    .from('kalender')
    .select('*')
    .order('datum');
  if (error) throw error;

  // Fetch mitarbeiter junction
  const { data: mitData } = await supabase.from('kalender_mitarbeiter').select('kalender_id, user_id');
  const mitMap = {};
  (mitData || []).forEach(r => {
    if (!mitMap[r.kalender_id]) mitMap[r.kalender_id] = [];
    mitMap[r.kalender_id].push(r.user_id);
  });

  return data.map(r => ({
    id: r.id,
    datum: r.datum,
    baustelleId: r.baustelle_id,
    titel: r.titel,
    mitarbeiter: mitMap[r.id] || [],
  }));
}

export async function create(entry) {
  const { mitarbeiter, ...fields } = entry;
  const row = {
    datum: fields.datum,
    baustelle_id: fields.baustelleId || null,
    titel: fields.titel,
  };
  const { data, error } = await supabase
    .from('kalender')
    .insert(row)
    .select()
    .single();
  if (error) throw error;

  if (mitarbeiter?.length) {
    await supabase.from('kalender_mitarbeiter').insert(
      mitarbeiter.map(uid => ({ kalender_id: data.id, user_id: uid }))
    );
  }
  return data.id;
}

export async function remove(id) {
  const { error } = await supabase.from('kalender').delete().eq('id', id);
  if (error) throw error;
}
