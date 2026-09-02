# Pastor Login — Implementation Handoff

**Feature:** Pastor sign-in inside the Futures Daily Word PWA, so staff can
use the app with a named, cloud-synced account rather than anonymous
localStorage.

**Repo:** https://github.com/AEGLOBALUSA/futures-daily-word  
**Live site:** https://futuresdailyword.com  
**Stack:** React 19 · Vite 6 · Tailwind 4 · TypeScript · Supabase · Netlify  
**Current HEAD:** d8f46d09

---

## Copy this prompt into a new Claude Code session

```
You are implementing a "Pastor sign-in" feature in an existing production PWA
called Futures Daily Word (https://futuresdailyword.com).

Repo: https://github.com/AEGLOBALUSA/futures-daily-word
Clone it, cd into it, run `npm install`.

---

## WHAT THE APP IS

A devotional PWA: React 19 + Vite 6 + Tailwind 4 + TypeScript.
localStorage-first (~45 `dw_*` keys) with Supabase cloud-backup via Netlify
functions. The home screen is persona-driven:
  new_to_faith | congregation | deeper_study | pastor_leader | comfort

Personas are stored in localStorage as `dw_setup` = `{persona, source}`.
Cloud sync is in `src/utils/cloudSync.ts` → calls
`/.netlify/functions/user-sync` (POST) with a Bearer token for auth.

The app is live — do not break it. Every change must build cleanly
(`npm run build`) and all 160 tests must pass (`npx vitest run`).

Deploy = git push to main → Netlify auto-builds → live.
Push every commit. Never push unless the build is green.

---

## WHAT EXISTS ALREADY

### Staff intake system (COMPLETE — do not touch)
- `netlify/functions/intake.js` — pastor auth backend
  - `action: "auth_status"` → `{ setup: bool }` — does this email have a password?
  - `action: "set_password"` → issues session token (first-time setup)
  - `action: "login"` → verifies password, returns `{ token, staff }`
  - `action: "logout"` → revokes token
  - `action: "me"` → returns `{ staff: { email, role, name, campusId, isAdmin } }`
  - Session tokens are 64-char hex, stored hashed in `staff_sessions` table
  - Sessions last 14 days
  - Any `@futures.church` email is allowed; `ae@futures.global` is admin
- `src/staff/api.ts` — `intake(action, body)` fetch helper + `getStaffToken()` /
  `setStaffToken(token)` localStorage helpers (key: `dw_staff_token`)

### User sync system (COMPLETE — do not touch)
- `netlify/functions/user-sync.js` — cloud backup of all `dw_*` keys
- Auth: Bearer token from `profiles.session_token_hashes` (Supabase table)
  — this is DIFFERENT from the staff session token
- The staff intake token (`staff_sessions` table) and the user-sync token
  (`profiles.session_token_hashes`) are two SEPARATE auth systems

### Persona config
- `src/utils/persona-config.ts` — `pastor_leader` persona exists with its own
  section order, greeting, and reading plans
- `pastor_leader` is a normal persona — nothing special to wire up

### Settings / More screen
- `src/screens/MoreScreen.tsx` — has persona-change UI; this is the right
  place to add a "Sign in as pastor" section

### Storage keys already in use
- `dw_setup` = `{persona, source}` — persona selection
- `dw_profile` = `{email, firstName, ...}` — user profile
- `dw_staff_token` — staff intake session token (already used by /staff portal)
- `dw_cloud_token` — user-sync Bearer token (different token, different system)

---

## WHAT YOU NEED TO BUILD

### Goal
Pastors can tap "Sign in as pastor" in the app (MoreScreen → Settings area),
enter their @futures.church email + password, and the app will:
1. Authenticate against the existing intake backend
2. Stamp their persona as `pastor_leader` automatically
3. Fill `dw_profile.email` and `dw_profile.firstName` from the staff record
4. Persist the staff token so re-opens skip the login screen
5. Show a "Signed in as [name]" indicator and a Sign Out button
6. On sign out: clear the staff token, reset persona to `congregation`

### What NOT to build in this pass
- Do NOT wire the staff token to user-sync (cloud backup still works as normal
  via `dw_cloud_token` — this is a separate auth layer)
- Do NOT build a persistent Claude conversation history
- Do NOT change anything in `netlify/functions/intake.js` or `user-sync.js`
- Do NOT touch the staff portal at `/staff`

---

## IMPLEMENTATION PLAN

### 1. Create `src/staff/api.ts` additions (or new file if api.ts doesn't exist)

The staff portal already has `src/staff/api.ts`. Check if it exports:
  - `getStaffToken(): string | null`
  - `setStaffToken(token: string | null): void`
  - `intake(action: string, body?: object): Promise<any>`

If those exist, import them in the new component. If not, add them:
```ts
const STAFF_TOKEN_KEY = 'dw_staff_token';
export function getStaffToken(): string | null {
  try { return localStorage.getItem(STAFF_TOKEN_KEY); } catch { return null; }
}
export function setStaffToken(t: string | null) {
  try {
    if (t) localStorage.setItem(STAFF_TOKEN_KEY, t);
    else localStorage.removeItem(STAFF_TOKEN_KEY);
  } catch {}
}
const INTAKE_BASE = '/.netlify/functions/intake';
export async function intake(action: string, body: object = {}): Promise<any> {
  const token = getStaffToken();
  const res = await fetch(INTAKE_BASE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ action, ...body }),
  });
  return res.json();
}
```

### 2. Create `src/components/PastorSignIn.tsx`

A self-contained sign-in form component. States:
  `idle` | `checking` | `needs_password` | `entering_password` | `signed_in` | `error`

Flow:
1. On mount: call `intake('me')` with stored token — if `ok`, show signed-in state
2. Email field → submit → `intake('auth_status', { email })`:
   - `setup: true` → show "Set your password" (first time)
   - `setup: false` → show "Enter your password"
3. Password submit → `intake('login', { email, password })` or `intake('set_password', ...)`
4. On success: `setStaffToken(token)`, stamp persona, set profile
5. Sign out: `intake('logout')`, `setStaffToken(null)`, reset

Stamping persona + profile (call these after successful login):
```ts
import { saveSetup } from '../utils/persona-config'; // or however saveSetup is exported
import { syncMisc } from '../utils/cloudSync';

function applyStaffIdentity(staff: { name: string; email: string; role: string }) {
  // Persona
  const persona = 'pastor_leader';
  const setup = { persona, source: 'settings' };
  localStorage.setItem('dw_setup', JSON.stringify(setup));
  window.dispatchEvent(new CustomEvent('dw-setup-changed', { detail: setup }));

  // Profile — firstName from first word of display name
  const firstName = (staff.name || '').split(' ')[0] || '';
  const profile = { email: staff.email, firstName };
  localStorage.setItem('dw_profile', JSON.stringify(profile));
  syncMisc('dw_profile', JSON.stringify(profile));
}
```

Sign out:
```ts
function clearStaffIdentity() {
  setStaffToken(null);
  const setup = { persona: 'congregation', source: 'settings' };
  localStorage.setItem('dw_setup', JSON.stringify(setup));
  window.dispatchEvent(new CustomEvent('dw-setup-changed', { detail: setup }));
}
```

UI notes:
- Keep it minimal: email field, password field, submit button
- On signed-in state: show "Signed in as [name] · [role]" + Sign Out button
- Use existing CSS tokens: `--dw-accent`, `--dw-card`, `--dw-text-primary`, etc.
- No magic links, no OAuth. Password only.
- The same password and email work at /staff — tell the pastor that.

### 3. Mount PastorSignIn in MoreScreen

In `src/screens/MoreScreen.tsx`, find the settings section (look for persona
picker or account section) and add the PastorSignIn component below it,
separated by a section header "Pastor account".

### 4. Auto-restore on app boot

In `src/App.tsx` (or wherever the app initialises), add a boot effect:
```ts
useEffect(() => {
  const token = getStaffToken();
  if (!token) return;
  intake('me').then(res => {
    if (res.staff) applyStaffIdentity(res.staff);
    else setStaffToken(null); // expired
  });
}, []);
```
This silently re-stamps the pastor persona on every app open if they're
still signed in.

---

## CRITICAL RULES (read before touching anything)

1. **Build green before push.** `npm run build` must succeed. `npx vitest run`
   must show 160 passed. Fix any failures before committing.

2. **Push every commit.** `git push` after each commit. Deploy is automatic.

3. **No magic links.** This codebase has a standing rule: no passwordless
   email flows (Supabase magic links burn auth cookies in deploy previews).
   Password only — the intake backend already enforces this.

4. **dw_setup source.** When stamping a persona programmatically, always use
   `source: 'settings'`. `source: 'default'` and `source: 'sunday-guest'`
   must NOT stamp a persistent persona (they're auto-detection flows).

5. **Two separate token systems.** The staff intake token (`dw_staff_token`,
   used with `intake()`) and the user-sync token (`dw_cloud_token`, used with
   `syncMisc()`) are completely separate. Do NOT pass the staff token to
   user-sync or vice versa.

6. **Never touch intake.js or user-sync.js.** All the backend you need already
   exists. Client-side only changes for this feature.

7. **PersonaConfig `saveSetup` may or may not be exported.** Check
   `src/utils/persona-config.ts` — if `saveSetup` is a local function in
   HomeScreen, replicate the logic directly (see the stamping code above).

8. **dw-setup-changed event.** HomeScreen listens to this CustomEvent to
   re-render with the new persona. Always fire it after changing `dw_setup`.

9. **Test the full sign-in flow locally** using `npm run dev` with the Netlify
   dev server: `npx netlify dev` (or preview via the deploy URL). The intake
   function hits Supabase so it needs Netlify env vars — test against the
   live deploy preview, not raw `vite dev`.

---

## FILE MAP (things you'll read)

| File | Why |
|------|-----|
| `src/screens/MoreScreen.tsx` | Where PastorSignIn mounts |
| `src/App.tsx` | Where boot restore effect goes |
| `src/staff/api.ts` | Existing intake() helper |
| `netlify/functions/intake.js` | Backend reference (read-only) |
| `src/utils/persona-config.ts` | Persona types + sectionOrder |
| `src/utils/cloudSync.ts` | syncMisc() signature |
| `src/utils/storage.ts` | dw_* key constants |
| `src/index.css` | CSS tokens for styling |

---

## ACCEPTANCE CRITERIA

- [ ] Tapping "Sign in as pastor" in MoreScreen shows email field
- [ ] Entering a valid @futures.church email shows password field (or set-password on first use)
- [ ] Successful login stamps `pastor_leader` persona and fills first name in greeting
- [ ] App re-opens while signed in and auto-restores pastor identity (no re-login needed)
- [ ] Sign Out resets to `congregation` persona and clears token
- [ ] Expired/invalid token at boot silently clears without crashing
- [ ] `npm run build` green · `npx vitest run` 160/160
```

---

## Context Ashley will want to give the new session

- The app is production-live, used by a real congregation
- Ashley (ae@futures.global) is the admin; all other pastors use `@futures.church` emails
- The staff intake portal is already at https://futuresdailyword.com/staff
- Pastors already have passwords set (or will set them the first time via the in-app flow)
- This is a one-day build — scope creep is the enemy
