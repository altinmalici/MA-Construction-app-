import { supabase } from '../supabase.js';

// Feste Regiebericht-Nummern (supabase/migration_2026_11_18_01_regiebericht_nr.sql).

// true, wenn Tabelle/Funktion (noch) nicht existieren — die Migration also
// nicht angewandt ist. Dann zählt die App wie bisher (Position des Tages).
export function istNummernFehlt(error) {
  if (!error) return false;
  return (
    ['PGRST202', 'PGRST205', '42883', '42P01'].includes(error.code) ||
    /could not find the (function|table)|does not exist/i.test(String(error.message || ''))
  );
}

/** Bereits vergebene Nummern einer Baustelle: { "2026-11-18": 7, … } */
export async function listNummern(baustelleId) {
  const { data, error } = await supabase
    .from('regiebericht_nummern')
    .select('datum, nr')
    .eq('baustelle_id', baustelleId);
  if (error) throw error;
  return Object.fromEntries((data || []).map((r) => [r.datum, r.nr]));
}

/** Vergibt fehlende Nummern für die Tage und liefert alle: { datum: nr } */
export async function vergebeNummern(baustelleId, daten) {
  const { data, error } = await supabase.rpc('regiebericht_nummern_vergeben', {
    p_baustelle_id: baustelleId,
    p_daten: daten,
  });
  if (error) throw error;
  return Object.fromEntries((data || []).map((r) => [r.tag, r.nummer]));
}
