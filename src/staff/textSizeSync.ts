/**
 * A staff member's text size on /staff follows them across devices (TEXT-SIZE-PLAN row 10; Ashley, 5 Oct 2026: "create on all
 * the apps especailly on the phone an adjustable font size so the writing can be manually adjusted").
 *
 * Two copies of one choice, `{ size, at }` (the shared kit, src/lib/mos/text-size):
 *  - the device cookie `mos_text`, applied before first paint by public/multiplyos/mos-text-prepaint.js, signed in
 *    loaded by the staff chunk before Staff home paints (the public reader never loads it);
 *  - `staff_roster.text_size` (+ `_at`), through intake text_size_get / text_size_set, which only ever touch the
 *    signed-in staff member's own row (newest wins there too). The same row serves Sermon Prep's copy.
 *
 * A shared device holds ONE cookie for everyone, so the device copy goes up only when it is this pastor's own Save:
 * every Save made while signed in is recorded here with the pastor's address (OWNER_KEY). On sign-in:
 *  - the cookie is this pastor's own Save → newest wins between the two copies (the kit's planSync);
 *  - it is not (another pastor's Save, a signed-out visitor's, or none) → the pastor's own server copy is put on the
 *    device; with no server copy both are left alone. Nothing of anyone else's ever reaches this pastor's row.
 * Only a Save reaches the server; a preview never does. Every call is pinned to the staff token the sync started
 * with, so once the device signs out or another pastor signs in nothing more is read or written for the first one.
 */
import type { TextSizeServerAdapter } from '../lib/mos/text-size/mos-text-script';
import { getTextSize, onTextSizeChange } from '../lib/mos/text-size/mos-text-script';
import { minuteAt, normalizeValue, planSync, type TextSizeValue } from '../lib/mos/text-size/text-scale-core';
import { getStaffToken } from './api';
import { localApiBase } from '../utils/api-base';

/** The last Save a signed-in pastor made on this device: `{ email, size, at }`. */
export const OWNER_KEY = 'dw_staff_text_size_owner';

type Owner = { email: string; size: string; at: number };

function readOwner(): Owner | null {
  try {
    const v = JSON.parse(localStorage.getItem(OWNER_KEY) || 'null');
    return v && typeof v.email === 'string' && typeof v.size === 'string' && typeof v.at === 'number' ? v : null;
  } catch { return null; }
}

function writeOwner(o: Owner) {
  try { localStorage.setItem(OWNER_KEY, JSON.stringify(o)); } catch { /* quota or blocked: the Save still syncs */ }
}

type Runtime = { adopt(v: TextSizeValue): unknown; recheck(): void };
const runtime = (): Runtime | null => (window as unknown as { MOSText?: Runtime }).MOSText ?? null;

/** Intake with THIS sync's token. Unlike staff/api intake() it never clears the token or signs out on a 401: a lost
 *  session is StaffApp's `me` path to end, not the text size's. */
async function call<T>(token: string, action: string, payload: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch(`${localApiBase()}/api/intake`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ action, ...payload }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error((data && data.error) || 'Request failed'), { status: res.status });
  return data as T;
}

export function createStaffTextSizeAdapter(token: string): TextSizeServerAdapter {
  const mine = () => !!token && getStaffToken() === token;
  return {
    // The value is checked (a known step, a sane stamp) before it is used.
    async read() {
      if (!mine()) return null;
      const res = await call<{ value?: TextSizeValue | null }>(token, 'text_size_get');
      return mine() && res && res.value ? res.value : null;
    },
    async write(v) {
      if (!mine()) return null;
      return call(token, 'text_size_set', { size: v.size, at: v.at });
    },
  };
}

/** Start the sync for the pastor holding `token` (`email` is theirs); returns stop(). Missing either: nothing runs. */
export function startStaffTextSizeSync(token: string, email: string): () => void {
  const who = String(email || '').trim().toLowerCase();
  if (!token || !who) return () => {};
  const adapter = createStaffTextSizeAdapter(token);
  const warn = (err: unknown) => console.warn('text size: server copy not synced', err);
  let stopped = false;
  const live = () => !stopped && getStaffToken() === token;

  // A Save in this tab while this pastor is signed in: it is theirs, so it is recorded and goes up.
  const stopListening = onTextSizeChange(v => {
    if (!live() || v.source !== 'local') return;
    const value = { size: v.size, at: minuteAt(v.at) } as TextSizeValue;
    writeOwner({ email: who, size: value.size, at: value.at });
    Promise.resolve(adapter.write(value)).catch(warn);
  });

  void (async () => {
    let server: TextSizeValue | null = null;
    try { server = normalizeValue(await adapter.read()); } catch (err) { warn(err); return; }
    if (!live()) return;
    try { runtime()?.recheck(); } catch { /* old runtime */ }
    const device = getTextSize();
    const owner = readOwner();
    const theirs = !!device && !!owner && owner.email === who && owner.size === device.size && owner.at === device.at;
    if (theirs) {
      const plan = planSync(device, server);
      if (!plan.winner) return;
      if (plan.writeDevice) runtime()?.adopt(plan.winner);
      if (plan.writeServer) { try { await adapter.write(plan.winner); } catch (err) { warn(err); } }
      return;
    }
    if (server && (!device || device.size !== server.size || device.at !== server.at)) {
      runtime()?.adopt(server);
      writeOwner({ email: who, size: server.size, at: minuteAt(server.at) });
    }
  })();

  return () => { stopped = true; stopListening(); };
}
