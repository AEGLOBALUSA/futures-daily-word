import { describe, it, expect, vi, afterEach } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { DoneCelebration } from './DoneCelebration';
import * as streakModule from '../utils/streak';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('DoneCelebration — showCount', () => {
  it('with streakCount=7 and no showCount prop, the text contains the streak count', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = createRoot(host);
    await act(async () => {
      root.render(<DoneCelebration streakCount={7} onClose={() => {}} />);
    });
    expect(host.textContent).toContain('7');
    root.unmount();
    host.remove();
  });

  it('with streakCount=7 and showCount={false}, the text has no digit and no streak line', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = createRoot(host);
    await act(async () => {
      root.render(<DoneCelebration streakCount={7} onClose={() => {}} showCount={false} />);
    });
    expect(host.textContent).not.toMatch(/\d/);
    expect(host.textContent).not.toContain('streak');
    expect(host.textContent).not.toMatch(/day streak/i);
    root.unmount();
    host.remove();
  });

  it('plan-finish variant with showCount={false} names the plan but prints no digit and does not call getStreak', async () => {
    const streakSpy = vi.spyOn(streakModule, 'getStreak');
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = createRoot(host);
    await act(async () => {
      root.render(
        <DoneCelebration
          streakCount={7}
          planFinish={{ title: 'The Gospel of Mark', days: 16 }}
          onClose={() => {}}
          showCount={false}
        />
      );
    });
    expect(host.textContent).toContain('The Gospel of Mark');
    expect(host.textContent).not.toMatch(/\d/);
    expect(streakSpy).not.toHaveBeenCalled();
    root.unmount();
    host.remove();
  });

  it('plan-finish variant with showCount={true} (default) still shows the day count', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = createRoot(host);
    await act(async () => {
      root.render(
        <DoneCelebration
          streakCount={7}
          planFinish={{ title: 'The Gospel of Mark', days: 16 }}
          onClose={() => {}}
        />
      );
    });
    expect(host.textContent).toContain('The Gospel of Mark');
    expect(host.textContent).toContain('16');
    root.unmount();
    host.remove();
  });
});
