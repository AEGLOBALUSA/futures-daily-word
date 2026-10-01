#!/usr/bin/env node
/**
 * Issue a one-time staff setup code from the command line.
 *
 * The normal route is People in the staff app (adding someone, or "Let them set a
 * new password", shows the code). This is the fallback for when nobody can sign
 * in to do that, for example Ashley locked out of his own account.
 *
 *   SUPABASE_URL=... SUPABASE_SERVICE_KEY=... node scripts/issue-staff-setup-code.mjs person@futures.church
 *
 * It WRITES to the database it is pointed at, only on a row that already exists
 * and has no password. It prints the code once and stores only a hash.
 */
import { createRequire } from 'node:module';
import { createClient } from '@supabase/supabase-js';

const require = createRequire(import.meta.url);
const core = require('../netlify/functions/lib/intake-core.js');

const email = core.normalizeEmail(process.argv[2]);
if (!email) {
  console.error('Usage: node scripts/issue-staff-setup-code.mjs person@futures.church');
  process.exit(2);
}
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_KEY first.');
  process.exit(2);
}
const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const { data: row, error } = await db.from('staff_roster').select('email, password_hash').eq('email', email).maybeSingle();
if (error) { console.error(error.message); process.exit(1); }
if (!row) { console.error(`${email} is not on the roster. Add them in People first.`); process.exit(1); }
if (row.password_hash) {
  console.error(`${email} already has a password. Clear it first (People → Let them set a new password), which issues a code itself.`);
  process.exit(1);
}
const code = core.generateSetupCode();
const expiresAt = new Date(Date.now() + core.SETUP_CODE_TTL_MS).toISOString();
const { error: upErr } = await db.from('staff_roster').update({
  setup_code_hash: core.hashSetupCode(code),
  setup_code_expires_at: expiresAt,
  setup_code_attempts: 0,
  updated_at: new Date().toISOString(),
}).eq('email', email);
if (upErr) { console.error(upErr.message); process.exit(1); }
console.log(`Setup code for ${email}: ${code}`);
console.log(`Works once. Expires ${expiresAt}.`);
