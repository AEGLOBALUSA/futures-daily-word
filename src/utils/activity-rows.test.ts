import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { buildActivityRows } = require('../../netlify/functions/lib/activity-rows.js');

describe('buildActivityRows', () => {
  it('keeps well-shaped new event names', () => {
    const rows = buildActivityRows('a@b.com', [{ type: 'journey_day_open' }, { type: 'comfort_opened' }]);
    expect(rows.map((r: any) => r.event_type)).toEqual(['journey_day_open', 'comfort_opened']);
  });

  it('keeps daily_reading which used to be dropped by the old hardcoded list', () => {
    const rows = buildActivityRows('a@b.com', [{ type: 'daily_reading' }]);
    expect(rows).toHaveLength(1);
    expect(rows[0].event_type).toBe('daily_reading');
  });

  it('drops junk event names', () => {
    const rows = buildActivityRows('a@b.com', [
      { type: 'DROP TABLE' },
      { type: 'x' },
      { type: 'Mixed_Case' }
    ]);
    expect(rows).toHaveLength(0);
  });

  it('passes through valid path and journey_day, nulls malformed ones', () => {
    const rows = buildActivityRows('a@b.com', [
      { type: 'journey_day_open', path: 'new_to_faith', journey_day: 3 },
      { type: 'journey_day_open', path: 'BAD PATH!!', journey_day: -1 },
      { type: 'journey_day_open', path: 'x', journey_day: 1001 }
    ]);
    expect(rows[0].path).toBe('new_to_faith');
    expect(rows[0].journey_day).toBe(3);
    expect(rows[1].path).toBeNull();
    expect(rows[1].journey_day).toBeNull();
    expect(rows[2].path).toBeNull();
    expect(rows[2].journey_day).toBeNull();
  });

  it('caps detail at 500 chars and defaults to empty string', () => {
    const long = 'x'.repeat(600);
    const rows = buildActivityRows('a@b.com', [
      { type: 'journey_day_open', detail: long },
      { type: 'journey_day_open' }
    ]);
    expect(rows[0].detail).toHaveLength(500);
    expect(rows[1].detail).toBe('');
  });
});
