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
    // One CTA. The header's language switch (aria-haspopup="listbox") is chrome, not a CTA.
    expect(html.match(/<button\b(?![^>]*aria-haspopup)/g)?.length).toBe(1);

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
    const btn = Array.from(host.querySelectorAll('button')).find(b => b.textContent?.trim() === 'Read')!;
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

describe('Day1Landing — Door 1 of "Choose your path" (2 Sep 2026)', () => {
  it('shows one quiet line under Read — a text link, not a second CTA', () => {
    const html = closed();
    expect(html).toContain('Not new to faith?');
    expect(html).toMatch(/<button[^>]*aria-haspopup="dialog"[^>]*>Choose your path<\/button>/);
    // Still one CTA (the link carries aria-haspopup, like the language switch chrome).
    expect(html.match(/<button\b(?![^>]*aria-haspopup)/g)?.length).toBe(1);
    // The sheet is mounted closed — nothing of it paints before the tap.
    expect(html).not.toContain('Where are you today?');
  });

  it('opens the chooser sheet on the line, without leaving the closed hero', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = createRoot(host);
    await act(async () => { root.render(<Day1Landing />); });
    const link = Array.from(host.querySelectorAll('button')).find(b => b.textContent?.trim() === 'Choose your path')!;
    await act(async () => { link.click(); });
    expect(host.textContent).toContain('Where are you today?');
    expect(host.textContent).toContain("I'm part of Futures Church");
    expect(hasBegunDay1()).toBe(false);
    expect(host.textContent).not.toContain(DAY1_VERSE_REF);
    root.unmount();
    host.remove();
  });
});
