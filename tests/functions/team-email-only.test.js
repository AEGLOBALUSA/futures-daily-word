import { describe, it, expect } from "vitest";
import { createRequire } from 'node:module';

const { isTeamEmailOnly, TEAM_EMAIL_ONLY } = createRequire(import.meta.url)('../../netlify/functions/lib/team-email-only.js');

const before = new Date("2026-10-07T12:00:00Z");
const after = new Date("2026-10-08T13:05:00Z");

describe("isTeamEmailOnly", () => {
  it("passes every listed email before the deadline", () => {
    for (const e of TEAM_EMAIL_ONLY) expect(isTeamEmailOnly(e, before)).toBe(true);
  });
  it("ignores case and surrounding whitespace", () => {
    expect(isTeamEmailOnly("  AE@Futures.Global ", before)).toBe(true);
  });
  it("fails an unlisted email", () => {
    expect(isTeamEmailOnly("someone@futures.church", before)).toBe(false);
    expect(isTeamEmailOnly("", before)).toBe(false);
  });
  it("fails every email at and after the deadline", () => {
    expect(isTeamEmailOnly("ae@futures.global", after)).toBe(false);
  });
});
