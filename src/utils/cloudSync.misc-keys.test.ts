/**
 * What rides the misc bag, and what deliberately does not.
 *
 * The journey's per-day answers (dw_pathway_qa_<day>) are pinned OUT of the bag
 * here: they call syncMisc but are device-only until the two defects recorded in
 * docs/im-new/SYNC-ANSWERS-FOLLOW-UP.md are fixed (no per-slot merge, and no
 * per-account attribution on a shared device). If this test fails because
 * someone added the prefix, read that note first.
 */
import { describe, it, expect } from 'vitest';
import { isSyncedMiscKey, isAuthored } from './cloudSync';

describe('misc bag key predicate', () => {
  it('carries the I\'m New handoff flags, newest-wins (not authored)', () => {
    expect(isSyncedMiscKey('dw_journey_handoff')).toBe(true);
    expect(isAuthored('dw_journey_handoff')).toBe(false);
  });

  it('keeps the journey answers on the device until the sync follow-up lands', () => {
    expect(isSyncedMiscKey('dw_pathway_qa_7')).toBe(false);
    expect(isSyncedMiscKey('dw_pathway_qa_40')).toBe(false);
  });

  it('never lets the progress record or the profile through the misc side door', () => {
    expect(isSyncedMiscKey('dw_pathway_progress')).toBe(false);
    expect(isSyncedMiscKey('dw_profile')).toBe(false);
    expect(isSyncedMiscKey('dw_session_token')).toBe(false);
  });

  it('still treats sermon fill-ins as authored free text', () => {
    expect(isSyncedMiscKey('dw_sermon_abc')).toBe(true);
    expect(isAuthored('dw_sermon_abc')).toBe(true);
  });
});
