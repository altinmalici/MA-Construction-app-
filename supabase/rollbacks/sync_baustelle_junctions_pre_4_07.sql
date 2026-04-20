-- Rollback für Task 4-07: sync_baustelle_junctions
-- Setzt den DB-Zustand zurück auf vor der Migration (Function existiert nicht).
-- Achtung: Aufrufer in src/lib/api/baustellen.js (syncJunctions via RPC) wird
-- danach scheitern — vor diesem Rollback also Code-Revert auf 4-07-Vor-Stand.
DROP FUNCTION IF EXISTS public.sync_baustelle_junctions(uuid, uuid[], uuid[]);
