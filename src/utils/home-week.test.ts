import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { homeWeek, weekPlace } = require('../../netlify/functions/lib/home-week.js');

const campuses = [
  { id: 'kennesaw', name: 'Futures Kennesaw', congregation: 'futures-us', active: true },
  { id: 'alpharetta', name: 'Futures Alpharetta', congregation: 'futures-us', active: true },
  { id: 'adelaide', name: 'Futures Adelaide', congregation: 'futures-au', active: true },
];

/** A Supabase stand-in that records each count query and answers from `counts`. */
function fakeDb(counts: Record<string, number>) {
  const calls: { table: string; filters: unknown[][]; opts: unknown }[] = [];
  return {
    calls,
    from(table: string) {
      const call = { table, filters: [] as unknown[][], opts: undefined as unknown };
      calls.push(call);
      const q: Record<string, unknown> = {
        select(_cols: string, opts: unknown) { call.opts = opts; return q; },
        in(col: string, v: unknown) { call.filters.push(['in', col, v]); return q; },
        gte(col: string, v: unknown) { call.filters.push(['gte', col, v]); return q; },
        then(resolve: (v: unknown) => void) { resolve({ count: counts[table] ?? 0, error: null }); },
      };
      return q;
    },
  };
}

describe('homeWeek: Staff home names the church’s week in counts (10 Oct 2026)', () => {
  it('a hub person counts every campus of their church', async () => {
    const db = fakeDb({ prayers: 6, campus_content: 2 });
    const out = await homeWeek(db, { role: 'hub', email: 'h@x.org' }, campuses, 'futures-us', new Date('2026-10-10T12:00:00Z'));
    expect(out.prayers).toBe(6);
    expect(out.corner).toBe(2);
    expect(out.place).toMatch(/Futures/);
    for (const c of db.calls) {
      expect(c.opts).toEqual({ count: 'exact', head: true });
      expect(c.filters).toContainEqual(['in', 'campus', ['kennesaw', 'alpharetta']]);
      expect(c.filters).toContainEqual(['gte', 'created_at', '2026-10-03T12:00:00.000Z']);
    }
  });

  it('a campus pastor counts only their campus, and an unconfirmed campus gets no prayer number', async () => {
    expect(weekPlace({ role: 'campus', campusId: 'adelaide' }, campuses, 'futures-us')).toEqual({ campusIds: ['adelaide'], name: 'Futures Adelaide' });
    const db = fakeDb({ prayers: 3, campus_content: 1 });
    const out = await homeWeek(db, { role: 'campus', campusId: 'adelaide', email: 'p@x.org' }, campuses, 'futures-au');
    expect(out).toMatchObject({ place: 'Futures Adelaide', prayers: null, corner: 1 });
    expect(db.calls.map(c => c.table)).toEqual(['campus_content']);
  });

  it('media staff see the corner count but never a prayer count', async () => {
    const out = await homeWeek(fakeDb({ prayers: 9, campus_content: 4 }), { role: 'media', email: 'm@x.org' }, campuses, 'futures-us');
    expect(out).toMatchObject({ prayers: null, corner: 4 });
  });

  it('a church with no campuses counts nothing', async () => {
    const db = fakeDb({});
    expect(await homeWeek(db, { role: 'hub' }, campuses, 'futuros')).toMatchObject({ prayers: null, corner: null });
    expect(db.calls).toEqual([]);
  });
});
