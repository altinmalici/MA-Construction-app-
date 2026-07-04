import { useState, useEffect, useCallback, useRef } from 'react';
import * as api from './api/index.js';

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);

  // Load all data from Supabase
  const loadAll = useCallback(async () => {
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
        setData({ users, subunternehmer, baustellen, stundeneintraege, kalender, maengel, bautagebuch, dokumente, benachrichtigungen, kosten });
        setError(null);
      }
    } catch (err) {
      console.error('Daten laden fehlgeschlagen:', err);
      if (mountedRef.current) setError(err.message);
    }
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
        entities.forEach((e, i) => { next[e] = results[i]; });
        return next;
      });
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    // setState passiert async im finally-Callback nach loadAll(). Lint sieht
    // den synchronen loadAll-Aufruf konservativ als Effect-setState — hier
    // erlaubt: kein cascading render, sondern One-Shot-Init.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAll().finally(() => {
      if (mountedRef.current) setLoading(false);
    });
    return () => { mountedRef.current = false; };
  }, [loadAll]);

  // ---- Action creators ----

  const actions = {
    auth: {
      login: async (pin) => {
        return await api.auth.login(pin);
      },
      loginAsUser: async (username, pin) => {
        return await api.auth.loginAsUser(username, pin);
      },
      loginWithUsername: async (username, onboardingPin) => {
        return await api.auth.loginWithUsername(username, onboardingPin);
      },
      completeOnboarding: async (userId, newPin) => {
        await api.auth.completeOnboarding(userId, newPin);
        await reload('users');
      },
      signOut: async () => {
        await api.auth.signOut();
      },
      getCurrentUser: async () => {
        return await api.auth.getCurrentUser();
      },
      reAuthWithPin: async (username, newPin) => {
        await api.auth.reAuthWithPin(username, newPin);
      },
      onAuthStateChange: (callback) => {
        return api.auth.onAuthStateChange(callback);
      },
    },

    users: {
      create: async ({ name, role, pin, stundensatz, username }) => {
        await api.users.create({ name, role, pin, stundensatz, username });
        await reload('users');
      },
      update: async (id, { name, pin, stundensatz }) => {
        await api.users.update(id, { name, pin, stundensatz });
        await reload('users');
      },
      remove: async (id) => {
        await api.baustellen.removeMitarbeiterFromAll(id);
        await api.users.remove(id);
        await reload('users', 'baustellen');
      },
      checkPinExists: async (pin, excludeId) => {
        return await api.users.checkPinExists(pin, excludeId);
      },
      createForOnboarding: async ({ name, username, stundensatz, onboardingPin }) => {
        await api.users.createForOnboarding({ name, username, stundensatz, onboardingPin });
        await reload('users');
      },
      resetOnboardingPin: async (id, pin, username = null) => {
        await api.users.resetOnboardingPin(id, pin, username);
        await reload('users');
      },
      toggleActive: async (id, isActive) => {
        await api.users.toggleActive(id, isActive);
        await reload('users');
      },
    },

    subunternehmer: {
      create: async ({ name, gewerk, telefon }) => {
        await api.subunternehmer.create({ name, gewerk, telefon });
        await reload('subunternehmer');
      },
      remove: async (id) => {
        await api.baustellen.removeSubFromAll(id);
        await api.subunternehmer.remove(id);
        await reload('subunternehmer', 'baustellen');
      },
    },

    baustellen: {
      create: async (bs) => {
        const id = await api.baustellen.create(bs);
        await reload('baustellen');
        return id;
      },
      update: async (id, bs) => {
        await api.baustellen.update(id, bs);
        await reload('baustellen');
      },
      updateField: async (id, field, value) => {
        await api.baustellen.updateField(id, field, value);
        await reload('baustellen');
      },
      remove: async (id) => {
        await api.baustellen.remove(id);
        await reload('baustellen', 'stundeneintraege', 'kalender', 'maengel', 'bautagebuch', 'dokumente');
      },
    },

    stundeneintraege: {
      create: async (entry) => {
        const result = await api.stundeneintraege.create(entry);
        await reload('stundeneintraege');
        return result;
      },
      update: async (id, entry) => {
        await api.stundeneintraege.update(id, entry);
        await reload('stundeneintraege');
      },
      remove: async (id) => {
        await api.stundeneintraege.remove(id);
        await reload('stundeneintraege');
      },
      setFreigabe: async (ids, freigegeben) => {
        await api.stundeneintraege.setFreigabe(ids, freigegeben);
        await reload('stundeneintraege');
      },
    },

    maengel: {
      create: async (m) => {
        const result = await api.maengel.create(m);
        await reload('maengel');
        return result;
      },
      updateStatus: async (id, status) => {
        await api.maengel.updateStatus(id, status);
        await reload('maengel');
      },
      remove: async (id) => {
        await api.maengel.remove(id);
        await reload('maengel');
      },
    },

    bautagebuch: {
      create: async (entry) => {
        await api.bautagebuch.create(entry);
        await reload('bautagebuch');
      },
      update: async (id, entry) => {
        await api.bautagebuch.update(id, entry);
        await reload('bautagebuch');
      },
      remove: async (id) => {
        await api.bautagebuch.remove(id);
        await reload('bautagebuch');
      },
    },

    kalender: {
      create: async (entry) => {
        await api.kalender.create(entry);
        await reload('kalender');
      },
      update: async (id, entry) => {
        await api.kalender.update(id, entry);
        await reload('kalender');
      },
      remove: async (id) => {
        await api.kalender.remove(id);
        await reload('kalender');
      },
    },

    dokumente: {
      create: async (doc) => {
        await api.dokumente.create(doc);
        await reload('dokumente');
      },
      createWithFile: async (payload) => {
        const result = await api.dokumente.createWithFile(payload);
        await reload('dokumente');
        return result;
      },
      remove: async (id) => {
        await api.dokumente.remove(id);
        await reload('dokumente');
      },
      removeWithFile: async (id, storagePath) => {
        await api.dokumente.removeWithFile(id, storagePath);
        await reload('dokumente');
      },
    },

    kosten: {
      create: async (k) => {
        await api.kosten.create(k);
        await reload('kosten');
      },
      remove: async (id) => {
        await api.kosten.remove(id);
        await reload('kosten');
      },
    },

    benachrichtigungen: {
      create: async (n) => {
        await api.benachrichtigungen.create(n);
        await reload('benachrichtigungen');
      },
      markAllRead: async () => {
        await api.benachrichtigungen.markAllRead();
        await reload('benachrichtigungen');
      },
      remove: async (id) => {
        await api.benachrichtigungen.remove(id);
        await reload('benachrichtigungen');
      },
      removeAll: async () => {
        await api.benachrichtigungen.removeAll();
        await reload('benachrichtigungen');
      },
    },

    reload,
    loadAll,
  };

  return { data, loading, error, actions, mergeIncomingRow };
}
