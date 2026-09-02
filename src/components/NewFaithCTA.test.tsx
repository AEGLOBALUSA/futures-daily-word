import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { NewFaithCTA } from './NewFaithCTA';

describe('NewFaithCTA', () => {
  it('is a filled green control with the accessible name', () => {
    const html = renderToStaticMarkup(
      <NewFaithCTA>Begin Day 1</NewFaithCTA>,
    );
    expect(html).toContain('dw-new-faith-cta');
    expect(html).toContain('Begin Day 1');
    expect(html).not.toContain('aria-busy');
  });

  it('loading keeps the name and sets aria-busy', () => {
    const html = renderToStaticMarkup(
      <NewFaithCTA loading>Continue Journey</NewFaithCTA>,
    );
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('Continue Journey');
    expect(html).toContain('disabled');
  });
});
