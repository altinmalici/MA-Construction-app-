import { supabase } from '../supabase.js';
import { requestWithRetry, selectAll } from './_request.js';

// Whitelist allowed for partial single-field updates via updateField().
// Other columns (kunde, adresse, budget, details, ...) must go through
// the full update() with the complete edit-form payload — that's both a
// defense-in-depth guard against typos / API misuse and an explicit
// boundary between "quick toggles" and "full edits".
export const BAUSTELLE_UPDATABLE_FIELDS = Object.freeze([
  'status',
  'fortschritt',
]);

export async function getAll({ signal } = {}) {
  // Fetch baustellen mit Retry-Wrapper (6-04). Junction-Tables im
  // Promise.all bleiben "nackt" — sie folgen der Haupt-Query und
  // teilen sich konzeptuell denselben Fehler-Pfad.
  const { data: bsList, error } = await requestWithRetry(
    () => supabase.from('baustellen').select('*').order('created_at'),
    { signal },
  );
  if (error) throw error;

  // Fetch all junction entries at once
  const [mitRes, subRes] = await Promise.all([
    selectAll(() => supabase.from('baustellen_mitarbeiter').select('baustelle_id, user_id').order('baustelle_id').order('user_id'), { signal }),
    selectAll(() => supabase.from('baustellen_subunternehmer').select('baustelle_id, sub_id').order('baustelle_id').order('sub_id'), { signal }),
  ]);
  // Fehler NICHT schlucken: Sonst erscheinen alle Baustellen ohne Team —
  // Mitarbeiter sehen "keine Baustellen zugewiesen", und speichert der Chef
  // in diesem Zustand ein Formular, löscht er die echten Zuweisungen.
  if (mitRes.error) throw mitRes.error;
  if (subRes.error) throw subRes.error;

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

// Wie ein Feld beim Schreiben normalisiert wird (leere Eingaben → DB-Default).
const UPDATE_NORMALIZERS = {
  kunde: (v) => v,
  adresse: (v) => v || '',
  status: (v) => v || 'geplant',
  fortschritt: (v) => v || 0,
  ansprechpartner: (v) => v || '',
  telefon: (v) => v || '',
  zugang: (v) => v || '',
  startdatum: (v) => v || null,
  enddatum: (v) => v || null,
  budget: (v) => v || 0,
  details: (v) => v || {},
};

// Schreibt NUR die Felder, die in `bs` tatsaechlich vorkommen. Frueher
// wurden fehlende Felder mit Standardwerten ueberschrieben und die
// Zuweisungen immer synchronisiert — ein Teil-Update wie {fortschritt}
// leerte so die ganze Baustelle und entfernte das Team (Audit U-01).
// Zuweisungen werden nur synchronisiert, wenn BEIDE Listen uebergeben sind
// (der RPC ersetzt immer beide).
export async function update(id, bs) {
  const { mitarbeiter, subunternehmer, ...fields } = bs;
  const hasMit = mitarbeiter !== undefined;
  const hasSub = subunternehmer !== undefined;
  if (hasMit !== hasSub) {
    throw new Error(
      '[baustellen.update] mitarbeiter und subunternehmer müssen beide übergeben werden (oder beide fehlen).',
    );
  }

  const row = {};
  for (const [key, normalize] of Object.entries(UPDATE_NORMALIZERS)) {
    if (fields[key] !== undefined) row[key] = normalize(fields[key]);
  }

  if (Object.keys(row).length > 0) {
    const { error } = await supabase.from('baustellen').update(row).eq('id', id);
    if (error) throw error;
  }

  if (hasMit) await syncJunctions(id, mitarbeiter, subunternehmer);
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
