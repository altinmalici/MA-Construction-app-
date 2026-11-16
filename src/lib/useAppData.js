import { useState, useEffect, useCallback, useRef } from 'react';
import * as api from './api/index.js';
import { getPending, getQueue, dequeue, markFailed, dauerfehlerText, gehoertZu } from './offlineQueue.js';

// 6-02b: Postgres-Realtime-Payloads kommen mit snake_case-Keys; der App-State
// nutzt camelCase. Generisch top-level Keys mappen — Postgres-Rows sind flach,
// also keine Rekursion nötig.
const toCamel = (s) => s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
const mapKeysToCamel = (row) =>
  Object.fromEntries(Object.entries(row).map(([k, v]) => [toCamel(k), v]));

// 6-02b: Out-of-Order-Schutz für UPDATE. Wenn der bestehende Eintrag KEIN
// updatedAt hat (z.B. älterer Seed-Stand vor der Migration), gibt es keine
// Referenz — wir akzeptieren das Update. Wenn er eines hat, muss das
// eingehende Event STRIKT neuer sein; fehlt updatedAt im eingehenden Event,
// behalten wir den Bestand (sicherer Default — Reihenfolge unbekannt).
const isNewer = (incoming, existing) => {
  if (!existing.updatedAt) return true;
  if (!incoming.updatedAt) return false;
  return incoming.updatedAt > existing.updatedAt;
};

// Offline erfasste Stunden, die noch auf diesem Gerät warten (oder vom
// Server abgelehnt wurden), bleiben in der Liste sichtbar — markiert mit
// `_pending`. Früher verschwanden sie beim nächsten Nachladen aus "Meine
// Stunden", obwohl sie noch nicht synchronisiert waren; das lud dazu ein,
// sie ein zweites Mal einzutragen.
export function mitWartenden(serverList) {
  const ids = new Set(serverList.map((e) => e.id));
  const wartend = getQueue()
    .filter((item) => item?.entry?.id && !ids.has(item.entry.id))
    .map((item) => ({
      freigegeben: false,
      fotos: [],
      ...item.entry,
      _pending: item.failed ? "abgelehnt" : "wartet",
    }));
  return wartend.length > 0 ? [...serverList, ...wartend] : serverList;
}

const emptyData = {
  users: [],
  subunternehmer: [],
  baustellen: [],
  stundeneintraege: [],
  kalender: [],
  maengel: [],
  bautagebuch: [],
  dokumente: [],
  benachrichtigungen: [],
  kosten: [],
};

export function useAppData() {
  const [data, setData] = useState(emptyData);
  // Kein Laden beim App-Start mehr: ohne Sitzung liefert RLS ohnehin nur
  // leere Listen, und ohne Netz erschien statt des Logins der Fehlerbildschirm.
  // Geladen wird nach dem Login (AppContext.completeLogin → loadAll).
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);

  // Load all data from Supabase
  // silent=true: Fehler nur loggen (Auffrischen im Hintergrund, z.B. nach dem
  // Entsperren) — sonst würde der App-weite Fehlerbildschirm den offenen
  // Screen samt Eingaben ersetzen.
  const loadAll = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const [
        users,
        subunternehmer,
        baustellen,
        stundeneintraege,
        kalender,
        maengel,
        bautagebuch,
        dokumente,
        benachrichtigungen,
        kosten,
      ] = await Promise.all([
        api.users.getAll(),
        api.subunternehmer.getAll(),
        api.baustellen.getAll(),
        api.stundeneintraege.getAll(),
        api.kalender.getAll(),
        api.maengel.getAll(),
        api.bautagebuch.getAll(),
        api.dokumente.getAll(),
        api.benachrichtigungen.getAll(),
        api.kosten.getAll(),
      ]);
      if (mountedRef.current) {
        setData({ users, subunternehmer, baustellen, stundeneintraege: mitWartenden(stundeneintraege), kalender, maengel, bautagebuch, dokumente, benachrichtigungen, kosten });
        setError(null);
      }
    } catch (err) {
      console.error('Daten laden fehlgeschlagen:', err);
      if (mountedRef.current && !silent) setError(err.message);
    } finally {
      if (mountedRef.current && !silent) setLoading(false);
    }
  }, []);

  // Alles verwerfen (Logout / Nutzerwechsel), damit der nächste Nutzer am
  // selben Gerät nie die Daten des vorherigen sieht.
  const resetData = useCallback(() => {
    if (!mountedRef.current) return;
    setData(emptyData);
    setError(null);
  }, []);

  // 6-02: Merge eines einzelnen Realtime-Events in den lokalen State
  // ohne Refetch. Dedup gegen lokale Mutation: bei INSERT prüfen, ob ID
  // schon im State ist (z.B. wenn die optimistic-Mutation des aktuellen
  // Tabs zuerst war) → SKIP statt Duplikat. UPDATE/DELETE replacen/
  // entfernen by ID.
  //
  // 6-02b: Postgres liefert snake_case keys (baustelle_id, updated_at);
  // App-State erwartet camelCase (baustelleId, updatedAt). Generischer
  // Mapper unten. Dedup-Vergleich nutzt updatedAt: out-of-order Events
  // dürfen nie einen neueren State mit älterem Snapshot überschreiben.
  // Wenn das eingehende Event keinen updated_at hat, behalten wir den
  // bestehenden Stand (sicherer Default — wir wissen die Reihenfolge nicht).
  //
  // table: 'stundeneintraege' | 'maengel' | 'benachrichtigungen' | ...
  // op:    'INSERT' | 'UPDATE' | 'DELETE'
  // row:   das Postgres-Row-Object (snake_case keys aus Supabase)
  //
  // KEIN reload, KEIN Full-Refresh — nur lokaler State-Update.
  const mergeIncomingRow = useCallback((table, row, op) => {
    if (!row || !row.id) return;
    if (!mountedRef.current) return;
    const mapped = mapKeysToCamel(row);
    setData((prev) => {
      const list = prev[table];
      if (!Array.isArray(list)) return prev;
      if (op === "INSERT") {
        const existing = list.find((r) => r.id === mapped.id);
        if (existing) return prev; // dedup — erstes wins
        return { ...prev, [table]: [...list, mapped] };
      }
      if (op === "UPDATE") {
        const idx = list.findIndex((r) => r.id === mapped.id);
        if (idx === -1) return prev; // nicht im State (RLS-gefiltert?) → ignorieren
        if (!isNewer(mapped, list[idx])) return prev; // älter/gleich/unbekannt → behalten
        const next = [...list];
        next[idx] = { ...next[idx], ...mapped };
        return { ...prev, [table]: next };
      }
      if (op === "DELETE") {
        const filtered = list.filter((r) => r.id !== mapped.id);
        if (filtered.length === list.length) return prev; // nicht im State
        return { ...prev, [table]: filtered };
      }
      return prev;
    });
  }, []);

  // Reload a single entity
  const reload = useCallback(async (...entities) => {
    const loaders = {
      users: api.users.getAll,
      subunternehmer: api.subunternehmer.getAll,
      baustellen: api.baustellen.getAll,
      stundeneintraege: api.stundeneintraege.getAll,
      kalender: api.kalender.getAll,
      maengel: api.maengel.getAll,
      bautagebuch: api.bautagebuch.getAll,
      dokumente: api.dokumente.getAll,
      benachrichtigungen: api.benachrichtigungen.getAll,
      kosten: api.kosten.getAll,
    };
    const results = await Promise.all(entities.map(e => loaders[e]()));
    if (mountedRef.current) {
      setData(prev => {
        const next = { ...prev };
        entities.forEach((e, i) => {
          next[e] = e === 'stundeneintraege' ? mitWartenden(results[i]) : results[i];
        });
        return next;
      });
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Nachladen NACH einem erfolgreichen Schreibvorgang darf den Erfolg nicht in
  // einen Fehler verwandeln. Früher warf z.B. create() bei gescheitertem
  // Nachladen — der Nutzer sah "Fehler", speicherte erneut und erzeugte ein
  // Duplikat (oder der neue Einladungs-PIN wurde nie angezeigt).
  const refresh = useCallback(async (...entities) => {
    try {
      await reload(...entities);
    } catch (err) {
      console.error('Nachladen fehlgeschlagen (Daten wurden gespeichert):', err);
    }
  }, [reload]);

  // ---- Action creators ----

  const actions = {
    auth: {
      loginAsUser: async (username, pin) => {
        return await api.auth.loginAsUser(username, pin);
      },
      loginWithUsername: async (username, onboardingPin) => {
        return await api.auth.loginWithUsername(username, onboardingPin);
      },
      completeOnboarding: async (userId, newPin) => {
        await api.auth.completeOnboarding(userId, newPin);
        await refresh('users');
      },
      validateOnboardingToken: async (token) => {
        return await api.auth.validateOnboardingToken(token);
      },
      consumeOnboardingToken: async (token, pin) => {
        return await api.auth.consumeOnboardingToken(token, pin);
      },
      signOut: async (opts) => {
        await api.auth.signOut(opts);
      },
      getCurrentUser: async () => {
        return await api.auth.getCurrentUser();
      },
      onAuthStateChange: (callback) => {
        return api.auth.onAuthStateChange(callback);
      },
    },

    users: {
      create: async ({ name, role, pin, stundensatz, username }) => {
        await api.users.create({ name, role, pin, stundensatz, username });
        await refresh('users');
      },
      update: async (id, { name, pin, stundensatz }) => {
        await api.users.update(id, { name, pin, stundensatz });
        await refresh('users');
      },
      remove: async (id) => {
        await api.baustellen.removeMitarbeiterFromAll(id);
        await api.users.remove(id);
        await refresh('users', 'baustellen');
      },
      checkPinExists: async (pin, excludeId) => {
        return await api.users.checkPinExists(pin, excludeId);
      },
      createForOnboarding: async ({ name, username, stundensatz, onboardingPin }) => {
        const id = await api.users.createForOnboarding({ name, username, stundensatz, onboardingPin });
        await refresh('users');
        return id;
      },
      resetOnboardingPin: async (id, pin, username = null) => {
        await api.users.resetOnboardingPin(id, pin, username);
        await refresh('users');
      },
      // Liefert das Token; wirft, wenn die DB-Funktion fehlt (siehe
      // api.users.istRpcFehlt) — Aufrufer fällt dann auf den PIN zurück.
      createOnboardingToken: async (id) => {
        return await api.users.createOnboardingToken(id);
      },
      repair: async (id) => {
        const result = await api.users.repairUser(id);
        await refresh('users');
        return result;
      },
      cleanupOrphans: async () => {
        return await api.users.cleanupOrphanAuthUsers();
      },
      toggleActive: async (id, isActive) => {
        await api.users.toggleActive(id, isActive);
        await refresh('users');
      },
    },

    subunternehmer: {
      create: async ({ name, gewerk, telefon }) => {
        await api.subunternehmer.create({ name, gewerk, telefon });
        await refresh('subunternehmer');
      },
      remove: async (id) => {
        await api.baustellen.removeSubFromAll(id);
        await api.subunternehmer.remove(id);
        await refresh('subunternehmer', 'baustellen');
      },
    },

    baustellen: {
      create: async (bs) => {
        const id = await api.baustellen.create(bs);
        await refresh('baustellen');
        return id;
      },
      update: async (id, bs) => {
        await api.baustellen.update(id, bs);
        await refresh('baustellen');
      },
      updateField: async (id, field, value) => {
        await api.baustellen.updateField(id, field, value);
        await refresh('baustellen');
      },
      remove: async (id) => {
        await api.baustellen.remove(id);
        await refresh('baustellen', 'stundeneintraege', 'kalender', 'maengel', 'bautagebuch', 'dokumente');
      },
    },

    stundeneintraege: {
      create: async (entry) => {
        const result = await api.stundeneintraege.create(entry);
        await refresh('stundeneintraege');
        return result;
      },
      update: async (id, entry) => {
        await api.stundeneintraege.update(id, entry);
        await refresh('stundeneintraege');
      },
      remove: async (id) => {
        await api.stundeneintraege.remove(id);
        await refresh('stundeneintraege');
      },
      setFreigabe: async (ids, freigegeben) => {
        await api.stundeneintraege.setFreigabe(ids, freigegeben);
        await refresh('stundeneintraege');
      },
      // Optimistisch lokal anzeigen (Offline-Erfassung), ohne DB-Write.
      // Dedup by id: spaeterer Realtime-/Reload-Insert derselben id ersetzt
      // ihn, es entsteht kein Duplikat.
      addLocal: (entry) => mergeIncomingRow('stundeneintraege', entry, 'INSERT'),
      // Offline-Warteschlange abarbeiten. Idempotent: bereits synchronisierte
      // Eintraege (Duplicate-Key 23505) werden als erledigt entfernt; echte
      // Netzfehler lassen den Eintrag drin (spaeterer Retry). Gibt zurueck,
      // wie viele synchronisiert wurden und wie viele noch warten.
      syncOffline: async ({ userId = null, isChef = false } = {}) => {
        const q = getPending().filter((item) => gehoertZu(item, userId, isChef));
        if (q.length === 0) return { synced: 0, failed: 0, remaining: getPending().length };
        // Ohne Sitzung gar nicht erst senden: die Anfrage ginge als "anon"
        // raus und käme als 42501 zurück — das sähe aus wie eine endgültige
        // Ablehnung, ist aber nur ein (noch) nicht erneuertes Token, z.B.
        // direkt nach der Rückkehr des Empfangs.
        if (!(await api.auth.hasSession())) {
          return { synced: 0, failed: 0, remaining: getPending().length };
        }
        let synced = 0;
        let failed = 0;
        for (const item of q) {
          // Wieder offline → abbrechen, Rest bleibt fuer spaeter.
          if (typeof navigator !== 'undefined' && navigator.onLine === false) break;
          try {
            await api.stundeneintraege.create(item.entry);
            dequeue(item.id);
            synced++;
          } catch (e) {
            if (e?.code === '23505' || /duplicate key/i.test(e?.message || '')) {
              dequeue(item.id); // schon in der DB → erledigt
              synced++;
              continue;
            }
            // Endgueltige Ablehnung durch die DB: nicht endlos wiederholen,
            // sondern markieren und dem Nutzer zeigen (bleibt in der Queue).
            const grund = dauerfehlerText(e);
            // Sitzung mitten im Lauf verloren (Logout, Token widerrufen)?
            // Dann ist die Ablehnung kein Urteil über den Eintrag → Rest
            // bleibt wartend.
            if (grund && !(await api.auth.hasSession())) break;
            if (grund) {
              markFailed(item.id, grund);
              failed++;
            }
            // Alles andere (Netz, Timeout): Eintrag bleibt wartend und wird
            // beim naechsten Ausloeser erneut versucht — ein einzelner
            // Eintrag darf die folgenden nicht blockieren.
          }
        }
        if (synced > 0) await refresh('stundeneintraege');
        return { synced, failed, remaining: getPending().length };
      },
    },

    maengel: {
      create: async (m) => {
        const result = await api.maengel.create(m);
        await refresh('maengel');
        return result;
      },
      updateStatus: async (id, status) => {
        await api.maengel.updateStatus(id, status);
        await refresh('maengel');
      },
      remove: async (id) => {
        await api.maengel.remove(id);
        await refresh('maengel');
      },
    },

    bautagebuch: {
      create: async (entry) => {
        await api.bautagebuch.create(entry);
        await refresh('bautagebuch');
      },
      update: async (id, entry) => {
        await api.bautagebuch.update(id, entry);
        await refresh('bautagebuch');
      },
      remove: async (id) => {
        await api.bautagebuch.remove(id);
        await refresh('bautagebuch');
      },
    },

    kalender: {
      create: async (entry) => {
        await api.kalender.create(entry);
        await refresh('kalender');
      },
      update: async (id, entry) => {
        await api.kalender.update(id, entry);
        await refresh('kalender');
      },
      remove: async (id) => {
        await api.kalender.remove(id);
        await refresh('kalender');
      },
    },

    dokumente: {
      create: async (doc) => {
        await api.dokumente.create(doc);
        await refresh('dokumente');
      },
      createWithFile: async (payload) => {
        const result = await api.dokumente.createWithFile(payload);
        await refresh('dokumente');
        return result;
      },
      remove: async (id) => {
        await api.dokumente.remove(id);
        await refresh('dokumente');
      },
      removeWithFile: async (id, storagePath) => {
        await api.dokumente.removeWithFile(id, storagePath);
        await refresh('dokumente');
      },
    },

    kosten: {
      create: async (k) => {
        await api.kosten.create(k);
        await refresh('kosten');
      },
      remove: async (id) => {
        await api.kosten.remove(id);
        await refresh('kosten');
      },
    },

    benachrichtigungen: {
      create: async (n) => {
        await api.benachrichtigungen.create(n);
        await refresh('benachrichtigungen');
      },
      markAllRead: async () => {
        await api.benachrichtigungen.markAllRead();
        await refresh('benachrichtigungen');
      },
      remove: async (id) => {
        await api.benachrichtigungen.remove(id);
        await refresh('benachrichtigungen');
      },
      removeAll: async () => {
        await api.benachrichtigungen.removeAll();
        await refresh('benachrichtigungen');
      },
    },

    reload,
    loadAll,
    resetData,
  };

  return { data, loading, error, actions, mergeIncomingRow };
}
