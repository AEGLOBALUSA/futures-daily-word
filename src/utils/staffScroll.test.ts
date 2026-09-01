import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');
const read = (p: string) => readFileSync(join(ROOT, p), 'utf-8');

describe('staff route scrolls; congregation tabs stay locked', () => {
  it('stamps staff-route on html only for /staff', () => {
    const main = read('src/main.tsx');
    expect(main).toMatch("p === '/staff'");
    expect(main).toMatch("classList.add('staff-route')");
    expect(main).toMatch('IS_STAFF');
  });

  it('overrides overflow on the staff route without changing the tab-app lock', () => {
    const css = read('src/index.css');
    expect(css).toMatch(/html,\s*body,\s*#root\s*\{[^}]*overflow:\s*hidden/s);
    expect(css).toMatch(/html\.staff-route,\s*html\.staff-route body,\s*html\.staff-route #root\s*\{[^}]*height:\s*auto/s);
    expect(css).toMatch(/html\.staff-route[\s\S]*?overflow:\s*auto/);
    expect(css).toMatch(/-webkit-overflow-scrolling:\s*touch/);
  });

  it('does not flex-center the signed-in staff shell', () => {
    const app = read('src/staff/StaffApp.tsx');
    const start = app.indexOf('className="staff-app"');
    expect(start).toBeGreaterThan(0);
    const shell = app.slice(start, start + 220);
    expect(shell).toMatch("minHeight: '100vh'");
    expect(shell).toMatch("overflow: 'visible'");
    expect(shell).not.toMatch('alignItems');
    expect(shell).not.toMatch("height: '100vh'");
  });
});
