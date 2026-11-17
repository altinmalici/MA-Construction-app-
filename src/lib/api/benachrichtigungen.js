import { supabase } from '../supabase.js';
import { requestWithRetry } from './_request.js';

// DB-Funktion (noch) nicht vorhanden → Migration
// migration_2026_11_18_04_benachrichtigungen_pro_nutzer.sql nicht angewandt.
const istFunktionFehlt = (e) =>
  e?.code === 'PGRST202' ||
  e?.code === '42883' ||
  /could not find the function|function .* does not exist/i.test(String(e?.message || ''));

const mapRow = (r) => ({
  id: r.id,
  typ: r.typ,
  text: r.text,
  baustelleId: r.baustelle_id,
  datum: r.datum,
  gelesen: r.gelesen,
});

export async function getAll({ signal } = {}) {
  // Neu: meine_benachrichtigungen() liefert die für mich sichtbaren
  // Benachrichtigungen mit MEINEM "gelesen". Fehlt die Funktion, gilt wie
  // bisher das gemeinsame Häkchen aus der Tabelle.
  const neu = await requestWithRetry(() => supabase.rpc('meine_benachrichtigungen'), { signal });
  if (!neu.error) return (neu.data || []).map(mapRow);
  if (!istFunktionFehlt(neu.error)) throw neu.error;

  // 6-04: Retry/Abort/Timeout-Wrapper.
  const { data, error } = await requestWithRetry(
    // Nur die neuesten 200: die Liste wächst sonst unbegrenzt und wird bei
    // jedem Start komplett geladen.
    () => supabase.from('benachrichtigungen').select('*').order('datum', { ascending: false }).limit(200),
    { signal },
  );
  if (error) throw error;
  return data.map(mapRow);
}

export async function create(n) {
  // ID hier erzeugen und NICHT zurücklesen: Nach der Migration darf ein
  // Mitarbeiter nur noch Benachrichtigungen seiner Baustellen lesen – ein
  // Zurücklesen direkt beim Anlegen ist dafür nicht nötig.
  const id = crypto.randomUUID();
  const row = {
    id,
    typ: n.typ || 'info',
    text: n.text,
    baustelle_id: n.baustelleId || null,
    datum: n.datum || new Date().toISOString(),
    gelesen: false,
  };
  const { error } = await supabase.from('benachrichtigungen').insert(row);
  if (error) throw error;
  // F-03: API-Returns app-weit konsistent als id-String.
  return id;
}

export async function markAllRead() {
  // Neu: nur MEIN "gelesen". Fehlt die Funktion → altes gemeinsames Häkchen.
  const neu = await supabase.rpc('benachrichtigungen_alle_gelesen');
  if (!neu.error) return;
  if (!istFunktionFehlt(neu.error)) throw neu.error;
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

// Löscht ALLE Benachrichtigungen aus Sicht des aufrufenden Users (RLS-scoped).
// Schema hat keine user_id-Spalte — Benachrichtigungen sind shared.
// RLS-Policy "chef_all" erzwingt Chef-Recht für DELETE, defense-in-depth
// erfolgt im Aufrufer (Chef-Guard im UI). Nicht von Mitarbeitern aufrufen.
export async function removeAll() {
  const { error } = await supabase.from('benachrichtigungen').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (error) throw error;
}
