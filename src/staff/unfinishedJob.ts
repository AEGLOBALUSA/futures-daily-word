/**
 * The last job this person started and did not send (readiness 10 Oct 2026,
 * Learns beyond the weekday). Kept on this device only, per signed-in email,
 * and only the job's name and when: never the answers. Typing into a job's
 * form starts it; a save that reaches the server (submit) finishes it. Every
 * read and write fails soft: private mode or blocked storage means home just
 * does not know, which is how it was before.
 */
export type FormJob = 'hub' | 'media' | 'campus';
export type Unfinished = { job: FormJob; at: number };

const KEY = 'dw_staff_unfinished';
/** After three days an unsent start is stale; home stops leading with it. */
export const UNFINISHED_MAX_AGE_MS = 3 * 24 * 60 * 60 * 1000;
const JOBS: FormJob[] = ['hub', 'media', 'campus'];

type Store = Record<string, Unfinished>;

function read(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    const v = raw ? JSON.parse(raw) : {};
    return v && typeof v === 'object' && !Array.isArray(v) ? v as Store : {};
  } catch {
    return {};
  }
}

function write(store: Store): void {
  try { localStorage.setItem(KEY, JSON.stringify(store)); } catch { /* storage blocked */ }
}

const who = (email: string) => String(email || '').trim().toLowerCase();

/** The person typed into this job's form. The first keystroke sets the time; later ones keep it. */
export function markJobStarted(email: string, job: string, now = Date.now()): void {
  const k = who(email);
  if (!k || !JOBS.includes(job as FormJob)) return;
  const store = read();
  if (store[k]?.job === job) return;
  store[k] = { job: job as FormJob, at: now };
  write(store);
}

/** The job's save reached the server: it is no longer unfinished. */
export function markJobSent(email: string, job: string): void {
  const k = who(email);
  const store = read();
  if (!k || !store[k] || store[k].job !== job) return;
  delete store[k];
  write(store);
}

/** The job this person started and has not sent, if it is recent. */
export function unfinishedJob(email: string, now = Date.now()): Unfinished | null {
  const u = read()[who(email)];
  if (!u || !JOBS.includes(u.job) || !Number.isFinite(u.at)) return null;
  if (u.at > now || now - u.at > UNFINISHED_MAX_AGE_MS) return null;
  return { job: u.job, at: u.at };
}
