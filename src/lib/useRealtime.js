import { useEffect } from "react";
import { supabase } from "./supabase.js";

/**
 * React-Hook für Supabase postgres_changes-Subscriptions.
 *
 * Abonniert INSERT/UPDATE/DELETE-Events einer Tabelle und ruft die
 * entsprechenden Handler. Cleanup beim Unmount via removeChannel.
 *
 * RLS gilt: Supabase liefert nur Events für Rows die der aktuelle Auth-
 * User auch via SELECT sehen darf. Mitarbeiter bekommen also nicht
 * automatisch Chef-Events.
 *
 * @param {string} table — Tabellenname (z.B. 'stundeneintraege')
 * @param {object} handlers
 * @param {(row) => void} [handlers.onInsert]
 * @param {(row, oldRow) => void} [handlers.onUpdate]
 * @param {(oldRow) => void} [handlers.onDelete]
 * @param {object} [opts]
 * @param {boolean} [opts.enabled=true] — Subscription nur aktiv wenn true
 *   (z.B. für Login-Gating: enabled=!!currentUser)
 * @param {string} [opts.filter] — optionaler Postgres-Filter im Format
 *   "column=eq.value" (z.B. "baustelle_id=eq.UUID")
 *
 * @example
 *   useRealtime('stundeneintraege', {
 *     onInsert: (row) => mergeIncoming('stundeneintraege', row, 'INSERT'),
 *   }, { enabled: !!cu });
 */
export function useRealtime(table, handlers, opts = {}) {
  const { enabled = true, filter } = opts;
  const { onInsert, onUpdate, onDelete } = handlers;

  useEffect(() => {
    if (!enabled) return undefined;

    const channelName = filter
      ? `realtime:${table}:${filter}`
      : `realtime:${table}`;

    const channel = supabase.channel(channelName);
    const config = { event: "*", schema: "public", table };
    if (filter) config.filter = filter;

    channel
      .on("postgres_changes", config, (payload) => {
        // payload: { eventType: 'INSERT'|'UPDATE'|'DELETE', new, old, ... }
        if (payload.eventType === "INSERT" && onInsert) {
          onInsert(payload.new);
        } else if (payload.eventType === "UPDATE" && onUpdate) {
          onUpdate(payload.new, payload.old);
        } else if (payload.eventType === "DELETE" && onDelete) {
          onDelete(payload.old);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // Handler-Refs ändern sich potentiell pro Render — aber wir wollen
    // die Subscription NUR bei Setup-relevanten Änderungen neu aufbauen
    // (table/filter/enabled). Aufrufer sollte handlers daher als stable
    // Referenz übergeben (useCallback) oder akzeptieren dass die letzten
    // Handler-Closures aus dem Setup-Render gewinnen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, filter, enabled]);
}
