// Gemeinsamer Supabase-Mock für API-Tests.
//
// Jede Abfrage wird als { table, op, payload, filters } in `mock.calls`
// protokolliert. Antworten kommen aus `mock.responses["<tabelle>.<op>"]`
// (op: select | insert | update | delete) bzw. `mock.responses["rpc.<name>"]`.
// Ein Array als Antwort wird der Reihe nach verbraucht (z.B. Seiten).
// Ohne Eintrag: { data: [] bzw. null bei single(), error: null }.
//
// Verwendung in einem Test:
//   vi.mock("../supabase.js", async () => (await import("../../test/supabaseMock.js")).moduleMock());
//   import { mock } from "../../test/supabaseMock.js";
//   beforeEach(() => mock.reset());

function next(key, fallback) {
  const r = mock.responses[key];
  if (Array.isArray(r)) return r.length > 0 ? r.shift() : fallback;
  return r ?? fallback;
}

function builder(table) {
  const call = { table, op: null, payload: undefined, filters: [] };
  const b = {
    insert(payload) { call.op = "insert"; call.payload = payload; mock.calls.push(call); return b; },
    update(payload) { call.op = "update"; call.payload = payload; mock.calls.push(call); return b; },
    delete() { call.op = "delete"; mock.calls.push(call); return b; },
    select(cols) {
      if (!call.op) { call.op = "select"; call.payload = cols; mock.calls.push(call); }
      else call.returning = true; // .insert()/.update() mit Zurücklesen
      return b;
    },
    order(col, opts) { call.filters.push(["order", col, opts]); return b; },
    range(from, to) { call.filters.push(["range", from, to]); return b; },
    limit(n) { call.filters.push(["limit", n]); return b; },
    eq(col, v) { call.filters.push(["eq", col, v]); return b; },
    neq(col, v) { call.filters.push(["neq", col, v]); return b; },
    in(col, v) { call.filters.push(["in", col, v]); return b; },
    single() {
      return Promise.resolve(next(`${table}.${call.op}`, { data: null, error: null }));
    },
    then(res, rej) {
      return Promise.resolve(next(`${table}.${call.op}`, { data: [], error: null })).then(res, rej);
    },
  };
  return b;
}

export const mock = {
  calls: [],
  rpcCalls: [],
  responses: {},
  reset() {
    mock.calls.length = 0;
    mock.rpcCalls.length = 0;
    mock.responses = {};
  },
  // Hilfen für Assertions
  find(table, op) {
    return mock.calls.find((c) => c.table === table && c.op === op);
  },
  all(table, op) {
    return mock.calls.filter((c) => c.table === table && c.op === op);
  },
  supabase: {
    from: (table) => builder(table),
    rpc: (name, args) => {
      mock.rpcCalls.push({ name, args });
      return Promise.resolve(next(`rpc.${name}`, { data: null, error: null }));
    },
  },
};

export const moduleMock = () => ({ supabase: mock.supabase });
