import { supabase } from './supabase.js';

/**
 * Storage-Helper für die beiden Buckets aus Task 4-01:
 *   - documents: PDFs, Office, Bauzeichnungen
 *   - photos:    Mängel, Bautagebuch, Baustellen
 *
 * Pfad-Konvention (RLS-relevant): erstes Segment = baustelle_uuid
 *   documents:  {baustelle_id}/{doc_id}-{filename}
 *   photos:     {baustelle_id}/{entity}/{entity_id}/{photo_id}.jpg
 *
 * Beide Buckets sind privat → signedUrl() für Reads. publicUrl() würde
 * eine URL liefern, der Request läuft aber durch RLS und wird abgewiesen.
 */

// ---------------------------------------------------------------------
// DOCUMENTS BUCKET
// ---------------------------------------------------------------------

/**
 * Dokument hochladen.
 * @param {File} file
 * @param {string} baustelleId UUID, RLS-Path-Prefix
 * @param {string} docId UUID des dokumente-Row-Eintrags
 * @returns {Promise<{path: string}>}
 */
export async function uploadDocument(file, baustelleId, docId) {
  if (!file) throw new Error('Datei fehlt');
  if (!baustelleId) throw new Error('baustelleId fehlt');
  if (!docId) throw new Error('docId fehlt');

  const cleanName = sanitizeFilename(file.name);
  const path = `${baustelleId}/${docId}-${cleanName}`;

  const { error } = await supabase.storage.from('documents').upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type || undefined,
  });
  if (error) throw error;

  return { path };
}

/**
 * Signierte Download-URL.
 * @param {string} path
 * @param {number} expiresIn Sekunden (default 60 — User klickt direkt)
 */
export async function getDocumentUrl(path, expiresIn = 60) {
  if (!path) throw new Error('path fehlt');
  const { data, error } = await supabase.storage
    .from('documents')
    .createSignedUrl(path, expiresIn);
  if (error) throw error;
  return data.signedUrl;
}

export async function deleteDocument(path) {
  if (!path) throw new Error('path fehlt');
  const { error } = await supabase.storage.from('documents').remove([path]);
  if (error) throw error;
}

// ---------------------------------------------------------------------
// PHOTOS BUCKET
// ---------------------------------------------------------------------

/**
 * Foto hochladen.
 * @param {Blob|File} blob (in Task 4-04 aus Canvas-Compression)
 * @param {string} baustelleId UUID, RLS-Path-Prefix
 * @param {string} entity 'maengel' | 'bautagebuch' | 'baustellen' | ...
 * @param {string} entityId UUID der zugehörigen Row
 * @param {string} [photoId] optional — wenn leer, wird crypto.randomUUID() genutzt
 * @returns {Promise<{path: string}>}
 */
export async function uploadPhoto(blob, baustelleId, entity, entityId, photoId) {
  if (!blob) throw new Error('Foto fehlt');
  if (!baustelleId) throw new Error('baustelleId fehlt');
  if (!entity) throw new Error('entity fehlt');
  if (!entityId) throw new Error('entityId fehlt');

  const id = photoId || crypto.randomUUID();
  const ext = mimeToExtension(blob.type) || 'jpg';
  const path = `${baustelleId}/${entity}/${entityId}/${id}.${ext}`;

  const { error } = await supabase.storage.from('photos').upload(path, blob, {
    cacheControl: '86400', // Fotos ändern sich nicht
    upsert: false,
    contentType: blob.type || 'image/jpeg',
  });
  if (error) throw error;

  return { path };
}

/**
 * Signierte URL für ein einzelnes Foto.
 * Default expiresIn 1h — Listen-Renderings müssen nicht jede Sekunde re-signen.
 */
export async function getPhotoUrl(path, expiresIn = 3600) {
  if (!path) throw new Error('path fehlt');
  const { data, error } = await supabase.storage
    .from('photos')
    .createSignedUrl(path, expiresIn);
  if (error) throw error;
  return data.signedUrl;
}

/**
 * Mehrere Foto-URLs auf einmal signieren — spart Round-Trips bei
 * 5-Foto-Mängel-Listen.
 * @returns {Promise<Object<string,string>>} Map path → signedUrl
 */
export async function getPhotoUrls(paths, expiresIn = 3600) {
  if (!paths || paths.length === 0) return {};
  const { data, error } = await supabase.storage
    .from('photos')
    .createSignedUrls(paths, expiresIn);
  if (error) throw error;
  const map = {};
  for (const item of data) {
    if (item.path && item.signedUrl) map[item.path] = item.signedUrl;
  }
  return map;
}

export async function deletePhoto(path) {
  if (!path) throw new Error('path fehlt');
  const { error } = await supabase.storage.from('photos').remove([path]);
  if (error) throw error;
}

/**
 * Mehrere Fotos einer Entity löschen (z.B. wenn ein Mangel entfernt wird).
 * Aufrufer liefert die Pfade — wir scannen den Bucket nicht.
 */
export async function deletePhotos(paths) {
  if (!paths || paths.length === 0) return;
  const { error } = await supabase.storage.from('photos').remove(paths);
  if (error) throw error;
}

// ---------------------------------------------------------------------
// PRIVATE HELPERS
// ---------------------------------------------------------------------

function sanitizeFilename(name) {
  if (!name) return 'datei';
  const lastDot = name.lastIndexOf('.');
  const base = lastDot > 0 ? name.slice(0, lastDot) : name;
  const ext = lastDot > 0 ? name.slice(lastDot + 1).toLowerCase() : '';
  const cleanBase = base
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/Ä/g, 'Ae')
    .replace(/Ö/g, 'Oe')
    .replace(/Ü/g, 'Ue')
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 100);
  const cleanExt = ext.replace(/[^a-z0-9]/g, '');
  return cleanExt ? `${cleanBase || 'datei'}.${cleanExt}` : cleanBase || 'datei';
}

function mimeToExtension(mime) {
  switch (mime) {
    case 'image/jpeg':
      return 'jpg';
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    default:
      return null;
  }
}

// Für Vitest — nicht Teil der öffentlichen API.
export const _internals = { sanitizeFilename, mimeToExtension };
