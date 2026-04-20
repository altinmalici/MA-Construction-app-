import { supabase } from '../supabase.js';
import { stripUndefined } from '../../utils/objects.js';

// Whitelist allowed for partial single-field updates via updateField().
// Other columns (kunde, adresse, budget, details, ...) must go through
// the full update() with the complete edit-form payload — that's both a
// defense-in-depth guard against typos / API misuse and an explicit
// boundary between "quick toggles" and "full edits".
export const BAUSTELLE_UPDATABLE_FIELDS = Object.freeze([
  'status',
  'fortschritt',
]);

export async function getAll() {
  // Fetch baustellen with junction tables
  const { data: bsList, error } = await supabase
    .from('baustellen')
    .select('*')
    .order('created_at');
  if (error) throw error;

  // Fetch all junction entries at once
  const [mitRes, subRes] = await Promise.all([
    supabase.from('baustellen_mitarbeiter').select('baustelle_id, user_id'),
    supabase.from('baustellen_subunternehmer').select('baustelle_id, sub_id'),
  ]);

  const mitMap = {};
  (mitRes.data || []).forEach(r => {
    if (!mitMap[r.baustelle_id]) mitMap[r.baustelle_id] = [];
    mitMap[r.baustelle_id].push(r.user_id);
  });

  const subMap = {};
  (subRes.data || []).forEach(r => {
    if (!subMap[r.baustelle_id]) subMap[r.baustelle_id] = [];
    subMap[r.baustelle_id].push(r.sub_id);
  });

  return bsList.map(b => ({
    id: b.id,
    kunde: b.kunde,
    adresse: b.adresse || '',
    status: b.status,
    fortschritt: b.fortschritt || 0,
    ansprechpartner: b.ansprechpartner || '',
    telefon: b.telefon || '',
    zugang: b.zugang || '',
    startdatum: b.startdatum || '',
    enddatum: b.enddatum || '',
    budget: b.budget || 0,
    details: b.details || {},
    mitarbeiter: mitMap[b.id] || [],
    subunternehmer: subMap[b.id] || [],
  }));
}

export async function create(bs) {
  const { mitarbeiter, subunternehmer, ...fields } = bs;
  const row = {
    kunde: fields.kunde,
    adresse: fields.adresse || '',
    status: fields.status || 'geplant',
    fortschritt: fields.fortschritt || 0,
    ansprechpartner: fields.ansprechpartner || '',
    telefon: fields.telefon || '',
    zugang: fields.zugang || '',
    startdatum: fields.startdatum || null,
    enddatum: fields.enddatum || null,
    budget: fields.budget || 0,
    details: fields.details || {},
  };

  const { data, error } = await supabase
    .from('baustellen')
    .insert(row)
    .select()
    .single();
  if (error) throw error;

  // Insert junction entries
  await syncJunctions(data.id, mitarbeiter || [], subunternehmer || []);
  return data.id;
}

export async function update(id, bs) {
  const { mitarbeiter, subunternehmer, ...fields } = bs;
  const row = stripUndefined({
    kunde: fields.kunde,
    adresse: fields.adresse || '',
    status: fields.status || 'geplant',
    fortschritt: fields.fortschritt || 0,
    ansprechpartner: fields.ansprechpartner || '',
    telefon: fields.telefon || '',
    zugang: fields.zugang || '',
    startdatum: fields.startdatum || null,
    enddatum: fields.enddatum || null,
    budget: fields.budget || 0,
    details: fields.details || {},
  });

  const { error } = await supabase.from('baustellen').update(row).eq('id', id);
  if (error) throw error;

  await syncJunctions(id, mitarbeiter || [], subunternehmer || []);
}

export async function updateField(id, field, value) {
  if (!BAUSTELLE_UPDATABLE_FIELDS.includes(field)) {
    throw new Error(
      `[baustellen.updateField] Field "${field}" is not in the whitelist. ` +
      `Allowed: ${BAUSTELLE_UPDATABLE_FIELDS.join(', ')}. ` +
      `For full updates use baustellen.update(id, data).`
    );
  }
  const { error } = await supabase.from('baustellen').update({ [field]: value }).eq('id', id);
  if (error) throw error;
}

export async function remove(id) {
  const { error } = await supabase.from('baustellen').delete().eq('id', id);
  if (error) throw error;
}

async function syncJunctions(baustelleId, mitarbeiterIds, subIds) {
  // Atomar: ein RPC-Call, der DELETE + INSERT für beide Junctions
  // (mitarbeiter + sub) in einer Postgres-Transaktion fährt. Vorher
  // 4 separate Queries — bei Netz-Abbruch zwischen DELETE und INSERT
  // landete die Baustelle ohne Zuordnungen → Mitarbeiter verlor still
  // den Zugriff.
  const { error } = await supabase.rpc('sync_baustelle_junctions', {
    p_baustelle_id: baustelleId,
    p_mitarbeiter_ids: mitarbeiterIds || [],
    p_sub_ids: subIds || [],
  });
  if (error) throw error;
}

export async function removeMitarbeiterFromAll(userId) {
  const { error } = await supabase.from('baustellen_mitarbeiter').delete().eq('user_id', userId);
  if (error) throw error;
}

export async function removeSubFromAll(subId) {
  const { error } = await supabase.from('baustellen_subunternehmer').delete().eq('sub_id', subId);
  if (error) throw error;
}
