/**
 * Pastor quick-prompts for Bible AI (Phase 1 of the Study & Preach plan).
 * The persona system prompt has promised "teaching angles, sermon illustrations
 * and application points" since V7; nothing on screen ever asked for them.
 * These build the message a tap sends. Pure — no storage, no React — so the
 * shapes are unit-testable. Labels arrive already translated (i18n keys in
 * PASTOR_PROMPT_LABEL); everything appended is language-neutral data: a
 * reference, a quoted line, the pastor's own highlights.
 */
export type PastorPromptKind = 'angles' | 'illustration' | 'greek' | 'outline';

export const PASTOR_PROMPT_KINDS: PastorPromptKind[] = ['angles', 'illustration', 'greek', 'outline'];

export const PASTOR_PROMPT_LABEL: Record<PastorPromptKind, string> = {
  angles: 'ai_pastor_angles',
  illustration: 'ai_pastor_illustration',
  greek: 'ai_pastor_greek',
  outline: 'ai_pastor_outline',
};

/** Labels that change when nothing is selected: "behind this word?" needs a
 *  word, so without one the Greek prompt asks about the chapter's key words. */
export const PASTOR_PROMPT_LABEL_NO_SELECTION: Partial<Record<PastorPromptKind, string>> = {
  greek: 'ai_pastor_greek_passage',
};

/** The i18n key for a prompt's button / message, given whether text is selected. */
export function pastorPromptLabelKey(kind: PastorPromptKind, hasSelection: boolean): string {
  return (!hasSelection && PASTOR_PROMPT_LABEL_NO_SELECTION[kind]) || PASTOR_PROMPT_LABEL[kind];
}

export interface PastorPromptSource {
  ref: string;
  text: string;
  ts?: number;
}

export interface PastorPromptContext {
  /** The translated button label — becomes the first line of the message. */
  label: string;
  /** Verse reference of the current selection, e.g. "John 3:16". */
  ref?: string;
  /** Text of the current selection / highlight. */
  selectedText?: string;
  /** Today's hero chapter, e.g. "Romans 8", when nothing is selected. */
  passage?: string;
  /** What the pastor said they are preaching through (sermon prep focus). */
  focus?: string;
  /** Translated "today's reading" — used when no ref and no passage. */
  todaysReading: string;
  /** Translated "Big idea, three points, one weekly action." */
  outlineShape: string;
  /** Translated "I have not filed any highlights yet, so build it from {ref}."
   *  `{ref}` is replaced with the passage; without a placeholder it is appended. */
  noHighlights: string;
  /** Sermon prep bag (HighlightToolbar "File to sermon"), newest first. */
  prepItems?: PastorPromptSource[];
  /** Verse highlights (dw_highlights) — fallback when the prep bag is empty. */
  highlights?: PastorPromptSource[];
}

const MAX_QUOTE = 160;
const MAX_ITEMS = 12;
const MAX_ITEM_TEXT = 220;
const MAX_BODY = 2400;

function quote(text: string, max: number): string {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (!clean) return '';
  return `"${clean.length > max ? clean.slice(0, max - 1).trimEnd() + '…' : clean}"`;
}

function newestFirst(items: PastorPromptSource[] | undefined): PastorPromptSource[] {
  return [...(items || [])]
    .filter(i => i && String(i.text || '').trim())
    .sort((a, b) => (b.ts || 0) - (a.ts || 0));
}

export function buildPastorPrompt(kind: PastorPromptKind, ctx: PastorPromptContext): string {
  const ref = (ctx.ref || '').trim();
  const place = ref || (ctx.passage || '').trim() || ctx.todaysReading;
  const snippet = ctx.selectedText ? quote(ctx.selectedText, MAX_QUOTE) : '';
  // A selection is attributed to a verse only when it HAS one. A selection
  // without a ref (the daily quote card) stands alone — never "Romans 8: <quote>".
  const anchor = snippet ? (ref ? `${ref}: ${snippet}` : snippet) : place;
  const focus = (ctx.focus || '').replace(/\s+/g, ' ').trim();

  switch (kind) {
    case 'angles':
    case 'greek':
      return `${ctx.label} (${anchor})`;

    case 'illustration': {
      // "This idea" = the line they highlighted; else the series they are
      // preaching through; else the chapter in front of them.
      const idea = snippet ? anchor : (focus || place);
      return `${ctx.label} (${idea})`;
    }

    case 'outline': {
      const prep = newestFirst(ctx.prepItems);
      const items = (prep.length ? prep : newestFirst(ctx.highlights)).slice(0, MAX_ITEMS);
      const head = `${ctx.label}${focus ? ` (${focus})` : ''} ${ctx.outlineShape}`;
      if (!items.length) {
        const fallback = ctx.noHighlights.includes('{ref}')
          ? ctx.noHighlights.replace('{ref}', place)
          : `${ctx.noHighlights} ${place}.`;
        return `${head}\n\n${fallback}`;
      }
      const lines: string[] = [];
      let size = 0;
      for (const item of items) {
        const line = `- ${item.ref ? `${item.ref}: ` : ''}${quote(item.text, MAX_ITEM_TEXT)}`;
        if (size + line.length > MAX_BODY) break;
        lines.push(line);
        size += line.length + 1;
      }
      return `${head}\n\n${lines.join('\n')}`;
    }
  }
}
