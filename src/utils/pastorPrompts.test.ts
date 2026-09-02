import { describe, it, expect } from 'vitest';
import { buildPastorPrompt, pastorPromptLabelKey, PASTOR_PROMPT_KINDS, PASTOR_PROMPT_LABEL, PASTOR_PROMPT_LABEL_NO_SELECTION } from './pastorPrompts';
import { t } from './i18n';

const base = {
  label: 'LABEL',
  todaysReading: "today's reading",
  outlineShape: 'Big idea, three points, one weekly action.',
  noHighlights: 'I have not filed any highlights yet, so build it from {ref}.',
};

describe('buildPastorPrompt', () => {
  it('anchors angles / greek on the selected verse and quotes the line', () => {
    const ctx = { ...base, ref: 'John 3:16', selectedText: 'For God so loved the world', passage: 'John 3' };
    expect(buildPastorPrompt('angles', ctx)).toBe('LABEL (John 3:16: "For God so loved the world")');
    expect(buildPastorPrompt('greek', ctx)).toBe('LABEL (John 3:16: "For God so loved the world")');
  });

  it('falls back to the hero chapter, then to today\'s reading', () => {
    expect(buildPastorPrompt('angles', { ...base, passage: 'Romans 8' })).toBe('LABEL (Romans 8)');
    expect(buildPastorPrompt('angles', base)).toBe("LABEL (today's reading)");
  });

  it('a selection without a verse ref (the daily quote) is never attributed to the hero chapter', () => {
    const quote = '"Preach the gospel at all times" — Francis of Assisi';
    expect(buildPastorPrompt('angles', { ...base, passage: 'Romans 8', selectedText: quote }))
      .toBe(`LABEL ("${quote}")`);
    expect(buildPastorPrompt('illustration', { ...base, passage: 'Romans 8', selectedText: quote, focus: 'Series' }))
      .toBe(`LABEL ("${quote}")`);
  });

  it('the Greek prompt asks about the chapter\'s key words when nothing is selected', () => {
    expect(pastorPromptLabelKey('greek', true)).toBe('ai_pastor_greek');
    expect(pastorPromptLabelKey('greek', false)).toBe('ai_pastor_greek_passage');
    expect(pastorPromptLabelKey('angles', false)).toBe('ai_pastor_angles');
  });

  it('truncates a long selection and collapses whitespace', () => {
    const long = 'word '.repeat(80);
    const out = buildPastorPrompt('greek', { ...base, ref: 'Psalm 23:1', selectedText: long });
    expect(out.length).toBeLessThan(200);
    expect(out).toMatch(/…"\)$/);
    expect(out).not.toMatch(/ {2}/);
  });

  it('illustration uses the highlighted line, else what they are preaching through, else the passage', () => {
    expect(buildPastorPrompt('illustration', { ...base, ref: 'Romans 8:28', selectedText: 'all things work together', focus: 'Romans: Life in the Spirit' }))
      .toBe('LABEL (Romans 8:28: "all things work together")');
    expect(buildPastorPrompt('illustration', { ...base, passage: 'Romans 8', focus: 'Romans: Life in the Spirit' }))
      .toBe('LABEL (Romans: Life in the Spirit)');
    expect(buildPastorPrompt('illustration', { ...base, passage: 'Romans 8' })).toBe('LABEL (Romans 8)');
  });

  it('outline lists the prep bag newest first, with the shape and the series', () => {
    const out = buildPastorPrompt('outline', {
      ...base,
      focus: 'Grace & Truth',
      passage: 'John 1',
      prepItems: [
        { ref: 'John 1:14', text: 'full of grace and truth', ts: 1 },
        { ref: 'John 1:1', text: 'In the beginning was the Word', ts: 2 },
      ],
      highlights: [{ ref: 'Psalm 1:1', text: 'should not appear', ts: 9 }],
    });
    expect(out).toBe(
      'LABEL (Grace & Truth) Big idea, three points, one weekly action.\n\n'
      + '- John 1:1: "In the beginning was the Word"\n'
      + '- John 1:14: "full of grace and truth"',
    );
  });

  it('outline falls back to verse highlights when the prep bag is empty, then to the passage', () => {
    const fromHighlights = buildPastorPrompt('outline', {
      ...base, passage: 'John 1', prepItems: [],
      highlights: [{ ref: 'John 1:5', text: 'the light shines', ts: 3 }, { ref: '', text: '   ', ts: 4 }],
    });
    expect(fromHighlights).toContain('- John 1:5: "the light shines"');
    expect(fromHighlights).not.toContain('- : ');
    expect(buildPastorPrompt('outline', { ...base, passage: 'John 1' }))
      .toBe('LABEL Big idea, three points, one weekly action.\n\nI have not filed any highlights yet, so build it from John 1.');
    // Placeholder form works for languages whose preposition contracts (pt "com base em / na"):
    expect(buildPastorPrompt('outline', { ...base, passage: 'Jo\u00e3o 1', noHighlights: 'Ainda n\u00e3o guardei destaques, ent\u00e3o use {ref} como base.' }))
      .toContain('use Jo\u00e3o 1 como base.');
    // A string without the placeholder still gets the passage appended.
    expect(buildPastorPrompt('outline', { ...base, passage: 'John 1', noHighlights: 'Build it from' }))
      .toContain('Build it from John 1.');
  });

  it('caps the outline body so the prep bag can never blow the request', () => {
    const prepItems = Array.from({ length: 40 }, (_, i) => ({ ref: `Ref ${i}`, text: 'x'.repeat(400), ts: i }));
    const out = buildPastorPrompt('outline', { ...base, prepItems });
    expect(out.length).toBeLessThan(3000);
    expect(out.split('\n- ').length - 1).toBeLessThanOrEqual(12);
  });

  it('every prompt label exists in all four languages', () => {
    for (const kind of PASTOR_PROMPT_KINDS) {
      const key = PASTOR_PROMPT_LABEL[kind];
      for (const lang of ['en', 'es', 'pt', 'id']) {
        expect(t(key, lang), `${key}/${lang}`).not.toBe(key);
      }
    }
    for (const key of ['ai_pastor_section', 'ai_pastor_outline_shape', 'ai_pastor_todays_reading', 'ai_pastor_no_highlights', ...Object.values(PASTOR_PROMPT_LABEL_NO_SELECTION)]) {
      for (const lang of ['en', 'es', 'pt', 'id']) {
        expect(t(key, lang)).not.toBe(key);
        if (key === 'ai_pastor_no_highlights') expect(t(key, lang)).toContain('{ref}');
      }
    }
  });
});
