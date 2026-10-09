import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const html = readFileSync('index.html', 'utf8');

describe('Face ID lock is staff-only', () => {
  it('index.html loads mo-lock.js only behind the /staff path test, with data-required', () => {
    const lines = html.split('\n').filter(l => l.includes('mo-lock.js'));
    const loads = lines.filter(l => l.includes('document.write'));
    expect(loads).toHaveLength(1);
    expect(loads[0]).toMatch(/^\s*if \(\/\^\\\/staff\\\/\*\$\/\.test\(location\.pathname\)\) document\.write\(/);
    expect(loads[0]).toContain('data-required="true"');
    // No plain script tag that would run on the congregation pages.
    expect(html.split('\n').filter(l => !l.includes('document.write')).join('\n')).not.toMatch(/<script[^>]*src="\/multiplyos\/mo-lock\.js"/);
  });

  it('serves the canonical kit file byte for byte', () => {
    const md5 = createHash('md5').update(readFileSync('public/multiplyos/mo-lock.js')).digest('hex');
    expect(md5).toBe('9c5eeb345c94f40d5efa2ef6c07a1051');
  });
});
