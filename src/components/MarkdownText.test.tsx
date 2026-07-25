import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MarkdownText } from './MarkdownText';
import { stripMarkdown } from '../utils/markdown';

const html = (text: string) => renderToStaticMarkup(<MarkdownText text={text} />);

describe('MarkdownText', () => {
  it('renders bold instead of showing literal asterisks', () => {
    const out = html('God has not given us a spirit of **fear**.');
    expect(out).toContain('<strong');
    expect(out).toContain('fear');
    expect(out).not.toContain('**');
  });

  it('renders headings instead of showing a literal hash', () => {
    const out = html('# 2 Timothy 1:7 — A Verse About Bold Faith');
    expect(out).toContain('role="heading"');
    expect(out).toContain('2 Timothy 1:7');
    expect(out).not.toMatch(/#\s/);
  });

  it('keeps paragraph breaks as separate paragraphs', () => {
    const out = html('First para.\n\nSecond para.');
    expect(out.match(/<p /g)?.length).toBe(2);
  });

  it('renders bullet and numbered lists', () => {
    expect(html('- power\n- love\n- sound mind')).toContain('<ul');
    expect(html('1. power\n2. love')).toContain('<ol');
    // list items should not keep their markers
    expect(html('- power')).not.toMatch(/>\s*-\s*power/);
  });

  it('renders the exact shape a real Bible AI answer comes back in', () => {
    const real = [
      '# 2 Timothy 1:7 — A Verse About Bold Faith',
      '',
      '**"For God has not given us a spirit of fear, but of power and of love and of a sound mind." (NKJV)**',
      '',
      'This is Paul\'s encouragement to Timothy.',
      '',
      '**What it means:** Paul is reminding Timothy that fear isn\'t from God.',
      '',
      '- **power** (the Holy Spirit\'s strength)',
      '- **love** (which casts out fear)',
      '- **a sound mind** (clarity and wisdom)',
    ].join('\n');
    const out = html(real);
    expect(out).not.toContain('**');
    expect(out).not.toContain('# ');
    expect(out).toContain('role="heading"');
    expect(out).toContain('<ul');
    expect(out).toContain('<strong');
  });

  it('does not treat ** inside inline code as bold', () => {
    const out = html('Use `a ** b` carefully.');
    expect(out).toContain('<code');
    expect(out).toContain('a ** b');
  });

  it('leaves a lone asterisk alone rather than eating text', () => {
    const out = html('5 * 3 = 15');
    expect(out).toContain('5 * 3 = 15');
  });

  it('renders italics', () => {
    expect(html('this is *emphasis* here')).toContain('<em');
  });

  it('does not italicise snake_case identifiers', () => {
    const out = html('the key is dw_cookie_consent today');
    expect(out).not.toContain('<em');
    expect(out).toContain('dw_cookie_consent');
  });

  it('never emits raw HTML from model output (no injection)', () => {
    const out = html('<img src=x onerror="alert(1)"> and <script>alert(2)</script>');
    expect(out).not.toContain('<img');
    expect(out).not.toContain('<script>');
    expect(out).toContain('&lt;img');
  });

  it('handles empty and whitespace input without throwing', () => {
    expect(() => html('')).not.toThrow();
    expect(() => html('\n\n   \n')).not.toThrow();
  });

  it('renders blockquotes and horizontal rules', () => {
    expect(html('> a quote line')).toContain('<blockquote');
    expect(html('a\n\n---\n\nb')).toContain('<hr');
  });
});

describe('stripMarkdown', () => {
  it('flattens markers so saved notes do not keep them', () => {
    const s = stripMarkdown('# Title\n\n**bold** and *italic* and `code`\n\n- one\n- two');
    expect(s).not.toContain('**');
    expect(s).not.toContain('# ');
    expect(s).not.toContain('`');
    expect(s).toContain('Title');
    expect(s).toContain('bold');
    expect(s).toContain('• one');
  });

  it('is safe on empty input', () => {
    expect(stripMarkdown('')).toBe('');
  });
});
