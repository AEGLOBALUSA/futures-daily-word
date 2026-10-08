import { describe, it, expect, vi, beforeEach } from 'vitest';

const api = vi.hoisted(() => ({ token: 'tok-ashley-0000000000000000000000000000', intake: vi.fn() }));
vi.mock('./api', () => ({
  getStaffToken: () => api.token,
  intake: api.intake,
}));

import { createStaffTextSizeAdapter, OWNER_KEY, startStaffTextSizeSync } from './textSizeSync';

beforeEach(() => {
  api.token = 'tok-ashley-0000000000000000000000000000';
  api.intake.mockReset();
  // The sync calls Daily Word with its own fetch (never staff/api intake, which clears the token on a 401);
  // the stub hands each call to api.intake so the cases read as actions.
  vi.stubGlobal('fetch', vi.fn(async (_url: string, init: RequestInit) => {
    const { action, ...payload } = JSON.parse(String(init.body));
    const data = Object.keys(payload).length ? await api.intake(action, payload) : await api.intake(action);
    return { ok: true, status: 200, json: async () => data } as unknown as Response;
  }));
});

it('a 401 from Daily Word leaves the staff token and the session alone (the app\'s `me` path ends a lost session)', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 401, json: async () => ({ error: 'Sign in required' }) }) as unknown as Response));
  localStorage.setItem('dw_staff_token', api.token);
  await expect(createStaffTextSizeAdapter(api.token).read()).rejects.toMatchObject({ status: 401 });
  expect(localStorage.getItem('dw_staff_token')).toBe(api.token);
});

describe('text size server copy (Daily Word staff_roster, TEXT-SIZE-PLAN row 10)', () => {
  it('reads the pastor\'s own saved size', async () => {
    api.intake.mockResolvedValueOnce({ value: { size: 'l130', at: 1791257280000 } });
    const a = createStaffTextSizeAdapter(api.token);
    expect(await a.read()).toEqual({ size: 'l130', at: 1791257280000 });
    expect(api.intake).toHaveBeenCalledWith('text_size_get');
  });

  it('nothing saved reads as null', async () => {
    api.intake.mockResolvedValueOnce({ value: null });
    expect(await createStaffTextSizeAdapter(api.token).read()).toBeNull();
  });

  it('a Save writes the size and its stamp, nothing else', async () => {
    api.intake.mockResolvedValueOnce({ saved: true });
    await createStaffTextSizeAdapter(api.token).write({ size: 's80', at: 1791257340000 } as never);
    expect(api.intake).toHaveBeenCalledWith('text_size_set', { size: 's80', at: 1791257340000 });
  });

  it('after a sign-out or another pastor signs in, it neither reads nor writes for the first pastor', async () => {
    const a = createStaffTextSizeAdapter(api.token);
    api.token = 'tok-jane-000000000000000000000000000000';
    expect(await a.read()).toBeNull();
    await a.write({ size: 'l150', at: 1 } as never);
    api.token = '';
    expect(await a.read()).toBeNull();
    expect(api.intake).not.toHaveBeenCalled();
  });

  it('a read that comes back after the pastor changed is dropped', async () => {
    const a = createStaffTextSizeAdapter(api.token);
    api.intake.mockImplementationOnce(async () => { api.token = 'tok-jane-000000000000000000000000000000'; return { value: { size: 'l150', at: 1 } }; });
    expect(await a.read()).toBeNull();
  });

  it('no token: nothing runs', async () => {
    expect(await createStaffTextSizeAdapter('').read()).toBeNull();
    expect(api.intake).not.toHaveBeenCalled();
  });
});


/** A stand-in for the pre-paint runtime: one device copy, adopt() replaces it. */
function fakeRuntime(initial: { size: string; at: number } | null) {
  const rt = {
    value: initial,
    get: () => rt.value,
    adopt: vi.fn((v: { size: string; at: number }) => { rt.value = { ...v }; return rt.value; }),
    recheck: () => {},
  };
  (window as unknown as { MOSText: unknown }).MOSText = rt;
  return rt;
}
const save = (size: string, at: number) =>
  window.dispatchEvent(new CustomEvent('mos-text-change', { detail: { size, at, source: 'local' } }));
const tick = () => new Promise(r => setTimeout(r, 0));
const MIN = 60_000;
const T0 = 29_854_000 * MIN; // a whole minute

describe('a shared device (Grok 4.7 high MUST): nobody else\'s size reaches this pastor\'s row', () => {
  beforeEach(() => { localStorage.clear(); });

  it('another pastor\'s newer Save on this device is not uploaded; this pastor\'s own size is put back', async () => {
    localStorage.setItem(OWNER_KEY, JSON.stringify({ email: 'a@futures.church', size: 'l150', at: T0 + 5 * MIN }));
    const rt = fakeRuntime({ size: 'l150', at: T0 + 5 * MIN });
    api.intake.mockResolvedValueOnce({ value: { size: 's80', at: T0 } });
    const stop = startStaffTextSizeSync(api.token, 'b@futures.church');
    await tick(); await tick();
    expect(api.intake).toHaveBeenCalledTimes(1);
    expect(api.intake).toHaveBeenCalledWith('text_size_get');
    expect(rt.adopt).toHaveBeenCalledWith({ size: 's80', at: T0 });
    stop();
  });

  it('a signed-out visitor\'s Save with no server copy: nothing is uploaded and the device is left alone', async () => {
    const rt = fakeRuntime({ size: 'l130', at: T0 });
    api.intake.mockResolvedValueOnce({ value: null });
    const stop = startStaffTextSizeSync(api.token, 'b@futures.church');
    await tick(); await tick();
    expect(api.intake).toHaveBeenCalledTimes(1);
    expect(rt.adopt).not.toHaveBeenCalled();
    stop();
  });

  it('this pastor\'s own Save made offline goes up on the next sign-in (newest wins)', async () => {
    localStorage.setItem(OWNER_KEY, JSON.stringify({ email: 'b@futures.church', size: 'l130', at: T0 + MIN }));
    fakeRuntime({ size: 'l130', at: T0 + MIN });
    api.intake.mockResolvedValueOnce({ value: { size: 's80', at: T0 } }).mockResolvedValueOnce({ saved: true });
    const stop = startStaffTextSizeSync(api.token, 'B@futures.church');
    await tick(); await tick();
    expect(api.intake).toHaveBeenLastCalledWith('text_size_set', { size: 'l130', at: T0 + MIN });
    stop();
  });

  it('a Save while signed in is recorded as this pastor\'s and goes up; after stop() nothing does', async () => {
    fakeRuntime(null);
    api.intake.mockResolvedValue({ value: null });
    const stop = startStaffTextSizeSync(api.token, 'b@futures.church');
    await tick(); await tick();
    save('l115', T0 + 2 * MIN);
    expect(api.intake).toHaveBeenLastCalledWith('text_size_set', { size: 'l115', at: T0 + 2 * MIN });
    expect(JSON.parse(localStorage.getItem(OWNER_KEY)!)).toEqual({ email: 'b@futures.church', size: 'l115', at: T0 + 2 * MIN });
    stop();
    api.intake.mockClear();
    save('xs50', T0 + 3 * MIN);
    expect(api.intake).not.toHaveBeenCalled();
  });

  it('a Save after the token changed (another pastor) is not written for the first one', async () => {
    fakeRuntime(null);
    api.intake.mockResolvedValue({ value: null });
    const stop = startStaffTextSizeSync(api.token, 'b@futures.church');
    await tick(); await tick();
    api.intake.mockClear();
    api.token = 'tok-jane-000000000000000000000000000000';
    save('l150', T0 + 4 * MIN);
    expect(api.intake).not.toHaveBeenCalled();
    stop();
  });
});
