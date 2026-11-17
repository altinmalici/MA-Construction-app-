import { todayIso } from '../../utils/helpers.js';
import { supabase } from '../supabase.js';
import { uploadDocument, deleteDocument, getDocumentUrl } from '../storage.js';
import { selectAll } from './_request.js';

export async function getAll({ signal } = {}) {
  // 6-04: Retry/Abort/Timeout-Wrapper.
  const { data, error } = await selectAll(
    () => supabase.from('dokumente').select('*').order('created_at').order('id'),
    { signal },
  );
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
    datum: doc.datum || todayIso(),
    storage_path: doc.storagePath || null,
  };
  const { data, error } = await supabase
    .from('dokumente')
    .insert(row)
    .select()
    .single();
  if (error) throw error;
  // F-03: API-Returns app-weit konsistent als id-String. createWithFile
  // bleibt Sonderfall (returnt {id, storagePath} weil Caller den Pfad braucht).
  return data.id;
}

/**
 * Datei in den Storage + Zeile in dokumente.
 *
 * Reihenfolge: ID vorab vergeben → Datei hochladen → Zeile MIT Pfad anlegen.
 * Scheitert das Anlegen der Zeile, wird die Datei wieder gelöscht. Früher
 * wurde zuerst eine Zeile ohne Pfad angelegt; brach der Upload ab (App
 * geschlossen, Netz weg), blieb ein Eintrag ohne Datei stehen.
 */
export async function createWithFile({ file, baustelleId, typ = 'dokument' }) {
  if (!file) throw new Error('Datei fehlt');
  if (!baustelleId) throw new Error('baustelleId fehlt');

  const id = crypto.randomUUID();
  const { path } = await uploadDocument(file, baustelleId, id);

  const { error: insertErr } = await supabase
    .from('dokumente')
    .insert({
      id,
      baustelle_id: baustelleId,
      name: file.name,
      typ,
      groesse: formatFileSize(file.size),
      datum: todayIso(),
      storage_path: path,
    })
    .select()
    .single();
  if (insertErr) {
    // Datei nur bei eindeutiger Ablehnung entfernen (Fehler-Code vom
    // Server). Bei einem Netzfehler kann die Zeile trotzdem angelegt worden
    // sein — dann würde das Löschen einen Eintrag ohne Datei hinterlassen.
    if (insertErr.code) {
      try {
        await deleteDocument(path);
      } catch (e) {
        console.warn('[dokumente.createWithFile] Datei konnte nach Fehler nicht entfernt werden:', e);
      }
    }
    throw insertErr;
  }
  return { id, storagePath: path };
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
