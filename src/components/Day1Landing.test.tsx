import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { Day1Landing } from './Day1Landing';
import { DAY1_VERSE_REF, DAY1_VERSE_TEXT } from '../data/day1-landing';
import { hasBegunDay1 } from '../utils/coldStart';

const closed = () => renderToStaticMarkup(<Day1Landing />);

describe('Day1Landing — closed hero is first paint', () => {
  it('shows wordmark, Day 1 of 40, title, and one Read button — no scripture, no pastoral', () => {
    const html = closed();
    expect(html).toContain('Futures Daily Word');
    expect(html).toMatch(/Day 1 of 40/i);
    expect(html).toContain('New &amp; Returning to Faith');
    expect(html).toContain('Grace Changes Everything');
    expect(html).toContain('>Read</button>');
    expect(html.match(/<button\b/g)?.length).toBe(1);

    expect(html).not.toContain(DAY1_VERSE_REF);
    expect(html).not.toContain(DAY1_VERSE_TEXT.slice(0, 24));
    expect(html).not.toMatch(/LIVE saved/i);
    expect(html).not.toMatch(/Mark as read/i);
  });

  it('opens scripture and pastoral below the button only after Read', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = createRoot(host);
    await act(async () => {
      root.render(<Day1Landing />);
    });
    const btn = host.querySelector('button');
    expect(btn?.textContent).toBe('Read');
    await act(async () => {
      btn!.click();
    });
    expect(hasBegunDay1()).toBe(true);
    expect(host.textContent).toContain(DAY1_VERSE_REF);
    expect(host.textContent).toContain(DAY1_VERSE_TEXT.slice(0, 24));
    expect(host.textContent).toMatch(/LIVE saved/i);
    expect(host.textContent).toMatch(/Mark as read/i);
    root.unmount();
    host.remove();
  });

  it('startOpen (refresh after Read) is the reading surface, not the closed hero', () => {
    const html = renderToStaticMarkup(<Day1Landing startOpen />);
    expect(html).not.toContain('>Read</button>');
    expect(html).toContain(DAY1_VERSE_REF);
    expect(html).toMatch(/Mark as read/i);
  });
});
