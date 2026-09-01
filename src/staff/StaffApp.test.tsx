import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act, type ReactElement } from 'react';

vi.mock('./api', () => ({
  getStaffToken: () => 'test-token',
  setStaffToken: vi.fn(),
  intake: vi.fn(),
}));

import { StaffApp } from './StaffApp';
import { intake } from './api';

beforeAll(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

function mount(ui: ReactElement): { el: HTMLDivElement; root: Root } {
  const el = document.createElement('div');
  document.body.appendChild(el);
  const root = createRoot(el);
  act(() => { root.render(ui); });
  return { el, root };
}

async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe('StaffApp admin home', () => {
  beforeEach(() => {
    vi.mocked(intake).mockImplementation(async (action: string) => {
      if (action === 'me') {
        return {
          staff: {
            email: 'ae@futures.global',
            role: 'admin',
            campusId: null,
            name: 'Ashley Evans',
            isAdmin: true,
          },
        };
      }
      return {};
    });
  });

  it('keeps People and History and does not offer Questions', async () => {
    const { el, root } = mount(<StaffApp />);
    await flush();
    const labels = [...el.querySelectorAll('button')].map(b => (b.textContent || '').trim());
    expect(labels).toContain('People');
    expect(labels).toContain('History');
    expect(labels).not.toContain('Questions');
    expect(el.textContent).not.toContain('These are the prompts on each job');
    expect(el.textContent).toMatch(/sermon notes/i);
    act(() => root.unmount());
  });

  it('opens People, History, and an intake job from home', async () => {
    vi.mocked(intake).mockImplementation(async (action: string) => {
      if (action === 'me') {
        return {
          staff: {
            email: 'ae@futures.global',
            role: 'admin',
            campusId: null,
            name: 'Ashley Evans',
            isAdmin: true,
          },
        };
      }
      if (action === 'roster_list') return { roster: [] };
      if (action === 'submissions') return { submissions: [] };
      if (action === 'questions_list') return { questions: [] };
      if (action === 'form') return { questions: [], cornerItems: [], submissions: [], sermons: [] };
      return {};
    });

    const { el, root } = mount(<StaffApp />);
    await flush();

    const clickNamed = async (re: RegExp) => {
      const btn = [...el.querySelectorAll('button')].find(b => re.test(b.textContent || ''));
      expect(btn, `missing button ${re}`).toBeTruthy();
      await act(async () => { btn!.click(); });
      await flush();
    };

    await clickNamed(/^People$/);
    expect(el.textContent).toMatch(/Who can sign in/);
    expect(el.textContent).not.toContain('These are the prompts on each job');

    await clickNamed(/Staff home/);
    await clickNamed(/^History$/);
    expect(el.textContent).toMatch(/What already went live/);
    expect(el.textContent).not.toContain('These are the prompts on each job');

    await clickNamed(/Staff home/);
    await clickNamed(/Put up this week/);
    expect(el.textContent).toMatch(/this week/i);
    expect(el.querySelector('form')).toBeTruthy();

    act(() => root.unmount());
  });
});
