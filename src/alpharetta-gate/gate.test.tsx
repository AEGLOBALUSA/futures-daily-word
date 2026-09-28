import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act, lazy } from 'react';
import type { AlphaFeature } from './types';

const state = vi.hoisted(() => ({
  staff: { campusId: 'us-alpharetta', role: 'pastor', isAdmin: false },
  registry: [] as AlphaFeature[],
  track: vi.fn(),
  load: vi.fn(),
}));

vi.mock('./useAlphaStaff', () => ({ useAlphaStaff: () => state.staff }));
vi.mock('../utils/analytics', () => ({ track: state.track }));
vi.mock('../alpharetta/AlpharettaPanel', () => ({ default: ({ features, onOpen, creator, ready }: { features: AlphaFeature[]; onOpen: (f: AlphaFeature) => void; creator: boolean; ready: boolean }) => ready && creator && features.length === 0
  ? <div>Your Alpharetta space is ready</div>
  : <div>{features.map(f => <button key={f.id} type="button" aria-label={f.title} onClick={() => onOpen(f)}>{f.title}</button>)}</div> }));

import { alphaFeatureRegistryLoader } from './useAlphaFeatures';
import { useAlpharettaTab } from './AlpharettaSlot';

function mount(ui: React.ReactNode): { el: HTMLDivElement; root: Root } {
  const el = document.createElement('div');
  document.body.appendChild(el);
  const root = createRoot(el);
  act(() => root.render(ui));
  return { el, root };
}

function feature(id = 'first') {
  const Page = lazy(async () => ({ default: ({ onClose }: { onClose: () => void }) => <button type="button" onClick={onClose}>Feature page</button> }));
  return { id, title: 'First feature', visibility: 'creator', Page } as AlphaFeature;
}

async function flush() { await act(async () => { await Promise.resolve(); await Promise.resolve(); }); }

beforeEach(() => {
  state.staff = { campusId: 'us-alpharetta', role: 'pastor', isAdmin: false };
  state.registry = [];
  state.load.mockReset();
  state.load.mockResolvedValue({ FEATURES: state.registry });
  vi.spyOn(alphaFeatureRegistryLoader, 'load').mockImplementation(() => state.load());
  state.track.mockReset();
});
afterEach(() => { document.body.innerHTML = ''; });

describe('Alpharetta gate', () => {
  it('keeps the creator tab working when the registry throws', async () => {
    state.load.mockRejectedValue(new Error('broken registry'));
    const { el, root } = mount(<GateHarness campus="us-alpharetta" />);
    await flush();
    expect(el.textContent).toContain('Your Alpharetta space is ready');
    act(() => root.unmount());
  });

  it('does not load the registry for another campus', async () => {
    state.staff = null as never;
    const { root } = mount(<GateHarness campus="us-gwinnett" />);
    await flush();
    expect(state.load).not.toHaveBeenCalled();
    act(() => root.unmount());
  });

  it('drops malformed registry entries', async () => {
    state.registry.push(feature('valid'), { id: '', title: 'bad', visibility: 'creator', Page: feature('bad').Page } as AlphaFeature);
    const { el, root } = mount(<GateHarness campus="us-alpharetta" />);
    await flush();
    expect(el.querySelectorAll('button')).toHaveLength(1);
    act(() => root.unmount());
  });

  it('tracks and portal-renders a feature, then closes on Back and reset', async () => {
    state.registry.push(feature());
    const { el, root } = mount(<GateHarness campus="us-alpharetta" />);
    await flush();
    act(() => (el.querySelector('button[aria-label="First feature"]') as HTMLButtonElement).click());
    await flush();
    expect(state.track).toHaveBeenCalledWith('alpharetta_feature_open', 'first');
    const back = [...document.body.querySelectorAll('button')].find(button => button.textContent === 'Back to Alpharetta') as HTMLButtonElement;
    expect(back).toBeTruthy();
    act(() => back.click());
    expect(document.body.textContent).not.toContain('Feature page');
    act(() => (el.querySelector('button[aria-label="First feature"]') as HTMLButtonElement).click());
    await flush();
    act(() => window.dispatchEvent(new Event('dw-tab-reset')));
    expect(document.body.textContent).not.toContain('Feature page');
    act(() => root.unmount());
  });
});

function GateHarness({ campus }: { campus: string }) {
  const { showTab, panel } = useAlpharettaTab(campus);
  return <div data-show={showTab ? 'yes' : 'no'}>{panel}</div>;
}
