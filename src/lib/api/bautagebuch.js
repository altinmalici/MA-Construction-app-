import { supabase } from '../supabase.js';

export async function getAll() {
  const { data, error } = await supabase
    .from('bautagebuch')
    .select('*')
    .order('created_at');
  if (error) throw error;

  // Fetch anwesende junction
  const { data: anw } = await supabase.from('bautagebuch_anwesende').select('bautagebuch_id, user_id');
  const anwMap = {};
  (anw || []).forEach(r => {
    if (!anwMap[r.bautagebuch_id]) anwMap[r.bautagebuch_id] = [];
    anwMap[r.bautagebuch_id].push(r.user_id);
  });

  return data.map(r => ({
    id: r.id,
    baustelleId: r.baustelle_id,
    datum: r.datum,
    wetter: r.wetter,
    temperatur: r.temperatur,
    arbeiten: r.arbeiten || '',
    besonderheiten: r.besonderheiten || '',
    behinderungen: r.behinderungen || '',
    anwesende: anwMap[r.id] || [],
  }));
}

export async function create(entry) {
  const { anwesende, ...fields } = entry;
  const row = {
    baustelle_id: fields.baustelleId,
    datum: fields.datum,
    wetter: fields.wetter || 'sonnig',
    temperatur: fields.temperatur || 12,
    arbeiten: fields.arbeiten || '',
    besonderheiten: fields.besonderheiten || '',
    behinderungen: fields.behinderungen || '',
  };
  const { data, error } = await supabase
    .from('bautagebuch')
    .insert(row)
    .select()
    .single();
  if (error) throw error;

  // Insert anwesende
  if (anwesende?.length) {
    await supabase.from('bautagebuch_anwesende').insert(
      anwesende.map(uid => ({ bautagebuch_id: data.id, user_id: uid }))
    );
  }
  return data.id;
}

export async function remove(id) {
  const { error } = await supabase.from('bautagebuch').delete().eq('id', id);
  if (error) throw error;
}
