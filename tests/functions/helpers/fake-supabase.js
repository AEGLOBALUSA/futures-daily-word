/**
 * A small in-memory stand-in for the Supabase client, enough for the tables the
 * session-proof code touches (profiles, user_data, rate_limit_hits).
 *
 * Supports: select (with { count: 'exact', head: true }), eq, is, contains (JSON
 * string), like, gte, lt, single, maybeSingle, update, upsert, insert, delete,
 * and rpc (a no-op). jsonb filter values arrive as JSON strings, exactly as the
 * real client sends them (see lib/auth.js), and are compared structurally.
 *
 * `fake.failOn(table, op)` makes the next calls of that op on that table return
 * { error } so a test can prove a gate fails closed.
 *
 * NOTE: this file lives in tests/, never in netlify/functions/.
 */

const clone = (v) => (v === undefined ? v : JSON.parse(JSON.stringify(v)));

export function createFakeSupabase(seed = {}) {
  const tables = {
    profiles: [],
    user_data: [],
    rate_limit_hits: [],
    activity_events: [],
    ...clone(seed),
  };
  const failures = new Set();

  function matches(row, filters) {
    return filters.every((f) => {
      const v = row[f.col];
      switch (f.type) {
        case 'eq':
          if (typeof f.val === 'string' && v !== null && typeof v === 'object') return JSON.stringify(v) === f.val;
          return v === f.val;
        case 'is':
          return f.val === null ? v == null : v === f.val;
        case 'contains': {
          const want = JSON.parse(f.val);
          return Array.isArray(v) && want.every((w) => v.some((x) => JSON.stringify(x) === JSON.stringify(w)));
        }
        case 'like': {
          const re = new RegExp('^' + f.val.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*') + '$');
          return typeof v === 'string' && re.test(v);
        }
        case 'gte':
          return v != null && v >= f.val;
        case 'lt':
          return v != null && v < f.val;
        default:
          return true;
      }
    });
  }

  function builder(table) {
    const st = { op: 'select', filters: [], payload: null, opts: null, selectOpts: null, returning: false, mode: 'many', onConflict: null };
    const b = {};
    const chain = (fn) => (...a) => { fn(...a); return b; };

    b.select = (cols, opts) => {
      if (st.op === 'select') st.selectOpts = opts || null;
      else st.returning = true;
      return b;
    };
    b.eq = chain((col, val) => st.filters.push({ type: 'eq', col, val }));
    b.is = chain((col, val) => st.filters.push({ type: 'is', col, val }));
    b.contains = chain((col, val) => st.filters.push({ type: 'contains', col, val }));
    b.like = chain((col, val) => st.filters.push({ type: 'like', col, val }));
    b.gte = chain((col, val) => st.filters.push({ type: 'gte', col, val }));
    b.lt = chain((col, val) => st.filters.push({ type: 'lt', col, val }));
    b.insert = chain((obj) => { st.op = 'insert'; st.payload = obj; });
    b.update = chain((obj) => { st.op = 'update'; st.payload = obj; });
    b.upsert = chain((obj, opts) => { st.op = 'upsert'; st.payload = obj; st.onConflict = opts && opts.onConflict; });
    b.delete = chain(() => { st.op = 'delete'; });
    b.single = () => { st.mode = 'single'; return b; };
    b.maybeSingle = () => { st.mode = 'maybe'; return b; };

    function run() {
      if (failures.has(`${table}:${st.op}`)) {
        return { data: null, error: { message: `injected ${st.op} failure`, code: 'XX000' } };
      }
      const rows = tables[table] || (tables[table] = []);
      let out = [];
      if (st.op === 'insert') {
        const list = Array.isArray(st.payload) ? st.payload : [st.payload];
        for (const r of list) {
          const row = { ...clone(r) };
          if (table === 'rate_limit_hits' && !row.created_at) row.created_at = new Date().toISOString();
          rows.push(row);
          out.push(row);
        }
      } else if (st.op === 'upsert') {
        const key = st.onConflict || 'email';
        const r = clone(st.payload);
        const existing = rows.find((x) => x[key] === r[key]);
        if (existing) {
          Object.assign(existing, r);
          if (table === 'user_data') existing.sync_version = (existing.sync_version || 1) + 1;
          out = [existing];
        } else {
          if (table === 'user_data') r.sync_version = 1;
          rows.push(r);
          out = [r];
        }
      } else if (st.op === 'update') {
        out = rows.filter((r) => matches(r, st.filters));
        out.forEach((r) => {
          Object.assign(r, clone(st.payload));
          if (table === 'user_data') r.sync_version = (r.sync_version || 1) + 1;
        });
      } else if (st.op === 'delete') {
        out = rows.filter((r) => matches(r, st.filters));
        tables[table] = rows.filter((r) => !out.includes(r));
      } else {
        out = rows.filter((r) => matches(r, st.filters));
      }

      if (st.op === 'select' && st.selectOpts && st.selectOpts.count) {
        return { data: st.selectOpts.head ? null : clone(out), count: out.length, error: null };
      }
      const returning = st.op === 'select' || st.returning;
      if (st.mode === 'single') {
        if (out.length !== 1) return { data: null, error: { code: 'PGRST116', message: 'no single row' } };
        return { data: clone(out[0]), error: null };
      }
      if (st.mode === 'maybe') {
        if (out.length > 1) return { data: null, error: { code: 'PGRST116', message: 'multiple rows' } };
        return { data: out.length ? clone(out[0]) : null, error: null };
      }
      return { data: returning ? clone(out) : null, error: null };
    }

    b.then = (resolve, reject) => Promise.resolve().then(run).then(resolve, reject);
    return b;
  }

  return {
    tables,
    from: (table) => builder(table),
    rpc: async () => ({ data: null, error: null }),
    failOn: (table, op) => failures.add(`${table}:${op}`),
    clearFailures: () => failures.clear(),
  };
}
