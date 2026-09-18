import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { closeThenNavigate } from './closeThenNavigate';

describe('closeThenNavigate', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('closes first and does not navigate until the sub-view entry is consumed', () => {
    const order: string[] = [];
    closeThenNavigate(() => order.push('close'), () => order.push('navigate'));
    expect(order).toEqual(['close']);
    window.dispatchEvent(new PopStateEvent('popstate', { state: { dwTab: 'home' } }));
    expect(order).toEqual(['close', 'navigate']);
  });

  it('navigates exactly once: the backstop does not fire a second time', () => {
    const navigate = vi.fn();
    closeThenNavigate(() => {}, navigate);
    window.dispatchEvent(new PopStateEvent('popstate'));
    vi.advanceTimersByTime(2000);
    window.dispatchEvent(new PopStateEvent('popstate'));
    expect(navigate).toHaveBeenCalledTimes(1);
  });

  it('still navigates when no popstate ever arrives', () => {
    const navigate = vi.fn();
    closeThenNavigate(() => {}, navigate, 600);
    vi.advanceTimersByTime(599);
    expect(navigate).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(navigate).toHaveBeenCalledTimes(1);
  });
});
