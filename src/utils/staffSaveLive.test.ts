import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('staff save is live', () => {
  const src = readFileSync(resolve(__dirname, '../staff/StaffApp.tsx'), 'utf8');
  const api = readFileSync(resolve(__dirname, '../../netlify/functions/intake.js'), 'utf8');

  it('puts notes live from save, without sending them to Ashley', () => {
    expect(src).toMatch(/Put this on the congregation page/);
    expect(src).toMatch(/Put this on the campus corner/);
    expect(src).not.toMatch(/Send to Ashley/);
    expect(src).not.toMatch(/Sign off \(this version\)/);
    expect(src).not.toMatch(/Review what staff sent/);
    expect(src).toMatch(/History/);
    expect(src).toMatch(/Save puts it on the congregation page/);
  });

  it('always publishes on submit instead of leaving pending for review', () => {
    expect(api).toMatch(/publishApproved/);
    expect(api).not.toMatch(/publishNow/);
    expect(api).toMatch(/published: true/);
    expect(api).not.toMatch(/staff\.role === ["']admin["'] && body\.publishNow/);
  });
});
