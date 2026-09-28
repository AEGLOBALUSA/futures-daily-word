import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  buildComment, classify, classifyFiles, decide, hasTick, isRevert, isSundayHold, matchGlob, ownerApproved,
} from '../../scripts/zones/classify.mjs';

const zones = JSON.parse(fs.readFileSync('.github/zones.json', 'utf8'));
const result = (zone: 'green' | 'amber' | 'red', why = '') => ({ filename: 'x', zone, why });
const decideWith = (overrides: Partial<Parameters<typeof decide>[0]> = {}) => decide({
  author: 'pastor', owner: 'AEGLOBALUSA', results: [result('green')], body: '',
  now: new Date('2026-09-26T18:00:00-04:00'), revert: false, ownerApproved: false,
  ownerOnly: false, complete: true, ...overrides,
});

describe('zone globs and classification', () => {
  it('matches recursive, single-segment, and dotfile globs', () => {
    expect(matchGlob('**/*.sql', 'a.sql')).toBe(true);
    expect(matchGlob('**/*.sql', 'x/y/a.sql')).toBe(true);
    expect(matchGlob('src/*/Page?.tsx', 'src/foo/Page1.tsx')).toBe(true);
    expect(matchGlob('src/*/Page?.tsx', 'src/foo/bar/Page1.tsx')).toBe(false);
    expect(matchGlob('.github/**', '.github/workflows/x.yml')).toBe(true);
  });

  it('uses green, red, amber, and fallback precedence', () => {
    expect(classify('src/alpharetta/features/x/Page.test.tsx', zones).zone).toBe('green');
    expect(classify('src/alpharetta-gate/access.ts', zones).zone).toBe('red');
    expect(classify('src/alpharetta/features.ts', zones).zone).toBe('green');
    expect(classify('tests/functions/claude.test.js', zones).zone).toBe('red');
    expect(classify('src/components/Foo.test.tsx', zones).zone).toBe('red');
    expect(classify('src/utils/i18n.ts', zones)).toEqual({ zone: 'amber', why: 'every word in the app, in English, Spanish, Portuguese and Indonesian' });
    expect(classify('netlify/functions/intake.js', zones).zone).toBe('red');
    expect(classify('README.md', zones)).toEqual({ zone: 'amber', why: 'a part of the app every campus uses' });
  });

  it('lets the worse side of a rename win', () => {
    expect(classifyFiles([{ filename: 'netlify.toml', previous_filename: 'src/alpharetta/old.ts', status: 'renamed' }], zones)[0].zone).toBe('red');
  });
});

describe('Sunday hold and pull request decisions', () => {
  it.each([
    ['2026-09-26T17:59:00-04:00', false], ['2026-09-26T18:00:00-04:00', true],
    ['2026-09-27T13:59:00-04:00', true], ['2026-09-27T14:00:00-04:00', false],
    ['2026-12-05T17:59:00-05:00', false], ['2026-12-05T18:00:00-05:00', true],
    ['2026-12-06T13:59:00-05:00', true], ['2026-12-06T14:00:00-05:00', false],
  ])('holds at the Atlanta boundary: %s', (value, expected) => {
    expect(isSundayHold(new Date(value as string))).toBe(expected);
  });

  it('recognizes the read checkbox and reverts', () => {
    expect(hasTick('- [ ] I\'ve read what this changes')).toBe(false);
    expect(hasTick('* [x] I\'ve read what this changes')).toBe(true);
    expect(hasTick('- [X] I’ve read what this changes')).toBe(true);
    expect(isRevert({ headRef: 'revert-123-', title: 'anything', body: 'Reverts owner/repo#12' })).toBe(true);
    expect(isRevert({ headRef: 'revert-123-', title: 'anything', body: '' })).toBe(false);
    expect(isRevert({ headRef: 'feature', title: 'Revert "old change"', body: 'Reverts owner/repo#12' })).toBe(false);
  });

  it('decides owner, green, amber, red, hold, and revert cases', () => {
    const now = new Date('2026-09-26T18:00:00-04:00');
    expect(decideWith({ author: 'AEGLOBALUSA', ownerOnly: true, results: [result('red')] }).zones.state).toBe('success');
    expect(decideWith().zones.state).toBe('success');
    expect(decideWith({ results: [result('amber')] }).zones.state).toBe('failure');
    expect(decideWith({ results: [result('amber')], body: '- [x] I\'ve read what this changes' }).zones.state).toBe('success');
    expect(decideWith({ results: [result('amber')], revert: true }).zones.state).toBe('success');
    expect(decideWith({ results: [result('red', 'the database')] }).zones.state).toBe('failure');
    expect(decideWith({ results: [result('red')], ownerApproved: true }).zones.state).toBe('success');
    expect(decideWith({ results: [result('green')] }).hold.state).toBe('failure');
    expect(decideWith({ results: [result('green')], revert: true }).hold.state).toBe('success');
    expect(decideWith({ author: 'AEGLOBALUSA', ownerOnly: false, results: [result('red')] }).zones.state).toBe('failure');
    expect(decideWith({ complete: false }).zones).toEqual({ state: 'failure', description: 'Too many files to check here. Split this into smaller pull requests.' });
  });

  it('requires the latest owner approval to match the current commit', () => {
    const olderSha = 'older-sha';
    const currentSha = 'current-sha';
    const approval = (commit_id: string, state = 'APPROVED', submitted_at = '2026-09-26T12:00:00Z') => ({ user: { login: 'AEGLOBALUSA' }, state, commit_id, submitted_at });
    expect(ownerApproved({ reviews: [approval(olderSha)], owner: 'AEGLOBALUSA', headSha: currentSha })).toBe(false);
    expect(ownerApproved({ reviews: [approval(currentSha)], owner: 'AEGLOBALUSA', headSha: currentSha })).toBe(true);
    expect(ownerApproved({ reviews: [approval(currentSha), approval(currentSha, 'COMMENTED', '2026-09-26T13:00:00Z')], owner: 'AEGLOBALUSA', headSha: currentSha })).toBe(true);
    expect(decideWith({ results: [result('red')], ownerApproved: false }).zones.state).toBe('failure');
    expect(decideWith({ results: [result('red')], ownerApproved: true }).zones.state).toBe('success');
  });

  it('does not let a verified revert bypass a red zone', () => {
    expect(decideWith({ results: [result('red')], revert: true, ownerApproved: false }).zones.state).toBe('failure');
  });
});

describe('zone comments', () => {
  it('uses each zone header and the marker', () => {
    expect(buildComment({ results: [result('green')], holdActive: false })).toContain('This change stays inside');
    expect(buildComment({ results: [result('amber', 'the shared app')], holdActive: false })).toContain('This change reaches past');
    expect(buildComment({ results: [result('red', 'the database'), result('amber', 'shared code')], holdActive: true })).toContain('This change touches the deeper parts');
    expect(buildComment({ results: [result('green')], holdActive: true })).toContain('<!-- zones-check -->');
  });
});
