import { supabase } from '../supabase.js';
import { uploadDocument, deleteDocument, getDocumentUrl } from '../storage.js';

export async function getAll() {
  const { data, error } = await supabase
    .from('dokumente')
    .select('*')
    .order('created_at');
  if (error) throw error;
  return data.map(r => ({
    id: r.id,
    baustelleId: r.baustelle_id,
    name: r.name,
    typ: r.typ || 'dokument',
    groesse: r.groesse || '–',
    datum: r.datum,
    storagePath: r.storage_path || null,
  }));
}

// Legacy-create (ohne File). Bleibt für Rückwärtskompatibilität erhalten.
export async function create(doc) {
  const row = {
    baustelle_id: doc.baustelleId,
    name: doc.name,
    typ: doc.typ || 'dokument',
    groesse: doc.groesse || '–',
    datum: doc.datum || new Date().toISOString().split('T')[0],
    storage_path: doc.storagePath || null,
  };
  const { data, error } = await supabase
    .from('dokumente')
    .insert(row)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/**
 * Atomic: File in Storage + Row in dokumente-Table.
 * Bei Storage-Fail wird die Row gerollbackt.
 */
export async function createWithFile({ file, baustelleId, typ = 'dokument' }) {
  if (!file) throw new Error('Datei fehlt');
  if (!baustelleId) throw new Error('baustelleId fehlt');

  const groesseStr = formatFileSize(file.size);
  const heute = new Date().toISOString().split('T')[0];

  // 1. Row anlegen (bekommt ID, noch ohne storage_path)
  const { data: row, error: insertErr } = await supabase
    .from('dokumente')
    .insert({
      baustelle_id: baustelleId,
      name: file.name,
      typ,
      groesse: groesseStr,
      datum: heute,
    })
    .select()
    .single();
  if (insertErr) throw insertErr;

  // 2. Upload + 3. Path zurück in die Row
  try {
    const { path } = await uploadDocument(file, baustelleId, row.id);
    const { error: updErr } = await supabase
      .from('dokumente')
      .update({ storage_path: path })
      .eq('id', row.id);
    if (updErr) throw updErr;
    return { id: row.id, storagePath: path };
  } catch (storageErr) {
    // Rollback: Row löschen, Storage-File ist entweder noch nicht da
    // oder bleibt orphan (wird bei manuellem Re-Upload überschrieben).
    await supabase.from('dokumente').delete().eq('id', row.id);
    throw storageErr;
  }
}

/**
 * Löscht Storage-File + DB-Row. Storage-Fail wird toleriert (max
 * orphaned File), DB-Fail wird durchgereicht.
 */
export async function removeWithFile(id, storagePath) {
  if (storagePath) {
    try {
      await deleteDocument(storagePath);
    } catch (e) {
      console.warn(
        '[dokumente.removeWithFile] Storage-delete fehlgeschlagen, fahre mit Row-delete fort:',
        e,
      );
    }
  }
  const { error } = await supabase.from('dokumente').delete().eq('id', id);
  if (error) throw error;
}

// Legacy-remove (DB-only) für Rows ohne storage_path.
export async function remove(id) {
  const { error } = await supabase.from('dokumente').delete().eq('id', id);
  if (error) throw error;
}

// Re-Export für Screen-Import-Komfort
export { getDocumentUrl };

function formatFileSize(bytes) {
  if (!bytes) return '–';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
