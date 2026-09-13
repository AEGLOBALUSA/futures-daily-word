/**
 * The server gates event names against its own copy of the allowlist, because
 * the client list lives in TypeScript that the CommonJS Netlify function cannot
 * import (the same convention as congregations.js mirroring congregations.ts).
 *
 * A duplicated list is only safe if drift cannot ship silently: if someone adds
 * an event name on the client and forgets the server, that event is dropped on
 * insert and the reader's activity is lost with no error anywhere. This test
 * turns that into a failing build.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { resolve, join } from 'path';
import { TRACKED_EVENTS } from './tracked-events';

function serverNames(): string[] {
  const src = readFileSync(
    resolve(__dirname, '../../netlify/functions/lib/activity-rows.js'),
    'utf8',
  );
  const open = src.indexOf('new Set([', src.indexOf('const TRACKED_EVENTS'));
  expect(open, 'server TRACKED_EVENTS Set not found').toBeGreaterThan(-1);
  const close = src.indexOf(']', open);
  return [...src.slice(open, close).matchAll(/'([a-z0-9_]+)'/g)].map(m => m[1]);
}

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      walk(full, out);
    } else if (/\.(ts|tsx|js|jsx)$/.test(entry) && !/\.test\.(ts|tsx|js|jsx)$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

/** Every `track('name')` literal call site across src (excluding test files). */
function emittedNames(): string[] {
  const srcDir = resolve(__dirname, '..');
  const names = new Set<string>();
  for (const file of walk(srcDir)) {
    const contents = readFileSync(file, 'utf8');
    for (const m of contents.matchAll(/track\('([a-z0-9_]+)'/g)) {
      names.add(m[1]);
    }
  }
  // Obvious test-fixture names that aren't real event names.
  const fixtureNames = new Set(['fake_event', 'test_event', 'example_event']);
  return [...names].filter(n => !fixtureNames.has(n));
}

describe('the server event allowlist mirrors the client one', () => {
  it('holds exactly the same names', () => {
    const server = serverNames();
    expect(server.length).toBeGreaterThan(0);
    // Sorted set comparison: order and duplicates are irrelevant, membership is not.
    expect([...new Set(server)].sort()).toEqual([...new Set(TRACKED_EVENTS)].sort());
  });

  it('names the client sends would all survive the server gate', () => {
    const server = new Set(serverNames());
    const dropped = TRACKED_EVENTS.filter(n => !server.has(n));
    expect(dropped, `client sends these but the server drops them: ${dropped.join(', ')}`).toEqual([]);
  });

  it('every track(\'...\') call site in src is in the allowlist', () => {
    const known = new Set<string>(TRACKED_EVENTS);
    const missing = emittedNames().filter(n => !known.has(n as (typeof TRACKED_EVENTS)[number]));
    expect(missing, `src calls track() with these names but TRACKED_EVENTS is missing them: ${missing.join(', ')}`).toEqual([]);
  });
});
