import { useState, useEffect, useCallback, useRef } from 'react';
import * as api from './api/index.js';

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
      remove: async (id) => {
        await api.dokumente.remove(id);
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

  return { data, loading, error, actions };
}
