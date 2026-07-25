/**
 * MarkdownText — renders the small Markdown subset our AI replies actually use.
 *
 * Bible AI answers come back as Markdown ("# 2 Timothy 1:7", "**power**", bullet
 * lists). They were being dropped into JSX as a raw string, so readers saw the
 * literal syntax — asterisks and hashes scattered through every answer — and,
 * with no pre-wrap, the paragraph breaks collapsed into one wall of text.
 *
 * This renders to real React elements. There is deliberately no
 * dangerouslySetInnerHTML and no HTML passthrough, so model output can never
 * inject markup — the worst a stray character can do is render as itself.
 *
 * Supported: #..###### headings, **bold**, __bold__, *italic*, `code`,
 * - / * / + bullets, 1. ordered lists, > blockquotes, --- rules, paragraphs.
 * Anything else falls through as plain text, which is the safe default.
 */
import type { CSSProperties, ReactNode } from 'react';

const INLINE_RULES: { re: RegExp; tag: 'code' | 'strong' | 'em' }[] = [
  { re: /`([^`\n]+)`/, tag: 'code' },
  { re: /\*\*([^\n]+?)\*\*/, tag: 'strong' },
  { re: /__([^\n]+?)__/, tag: 'strong' },
  // Single-asterisk italics only. Single underscores are skipped on purpose:
  // they false-positive on snake_case and Strong's refs far more than they help.
  { re: /\*([^*\n]+?)\*/, tag: 'em' },
];

const codeStyle: CSSProperties = {
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  fontSize: '0.92em',
  background: 'var(--dw-surface-hover)',
  borderRadius: 4,
  padding: '1px 4px',
};

/** Walks a line, replacing the earliest inline marker, then recursing. */
function inline(text: string, key: () => string): ReactNode[] {
  let best: { idx: number; len: number; inner: string; tag: string } | null = null;
  for (const rule of INLINE_RULES) {
    const m = rule.re.exec(text);
    // Strictly-earlier wins, so the rule order above breaks ties: on "**x**"
    // the bold rule matches at 0 and the italic rule only at 1.
    if (m && (best === null || m.index < best.idx)) {
      best = { idx: m.index, len: m[0].length, inner: m[1], tag: rule.tag };
    }
  }
  if (!best) return text ? [text] : [];

  const before = text.slice(0, best.idx);
  const after = text.slice(best.idx + best.len);
  const k = key();
  const node =
    best.tag === 'code' ? <code key={k} style={codeStyle}>{best.inner}</code>
      : best.tag === 'strong' ? <strong key={k} style={{ fontWeight: 700 }}>{inline(best.inner, key)}</strong>
        : <em key={k}>{inline(best.inner, key)}</em>;

  return [...(before ? [before] : []), node, ...inline(after, key)];
}

const HEADING = /^(#{1,6})\s+(.*)$/;
const BULLET = /^\s*[-*+]\s+(.*)$/;
const ORDERED = /^\s*\d+[.)]\s+(.*)$/;
const QUOTE = /^>\s?(.*)$/;
const RULE = /^(?:---+|\*\*\*+|___+)\s*$/;

export function MarkdownText({ text, style }: { text: string; style?: CSSProperties }) {
  let n = 0;
  const key = () => `md${n++}`;

  const lines = (text || '').replace(/\r\n?/g, '\n').split('\n');
  const blocks: ReactNode[] = [];
  let para: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  let quote: string[] = [];

  const flushPara = () => {
    if (!para.length) return;
    // Single newlines inside a paragraph are soft breaks, not new paragraphs.
    const kids: ReactNode[] = [];
    para.forEach((line, i) => {
      if (i > 0) kids.push(<br key={key()} />);
      kids.push(...inline(line, key));
    });
    blocks.push(<p key={key()} style={{ margin: '0 0 10px' }}>{kids}</p>);
    para = [];
  };
  const flushList = () => {
    if (!list) return;
    const items = list.items.map(it => <li key={key()} style={{ marginBottom: 3 }}>{inline(it, key)}</li>);
    // listStyleType is set explicitly: the app's global reset strips markers, which
    // would leave a bullet list looking like plain indented text and an ordered list
    // with no numbers at all.
    blocks.push(
      list.ordered
        ? <ol key={key()} style={{ margin: '0 0 10px', paddingLeft: 22, listStyleType: 'decimal', listStylePosition: 'outside' }}>{items}</ol>
        : <ul key={key()} style={{ margin: '0 0 10px', paddingLeft: 20, listStyleType: 'disc', listStylePosition: 'outside' }}>{items}</ul>
    );
    list = null;
  };
  const flushQuote = () => {
    if (!quote.length) return;
    blocks.push(
      <blockquote key={key()} style={{
        margin: '0 0 10px', padding: '2px 0 2px 12px',
        borderLeft: '3px solid var(--dw-border)', color: 'var(--dw-text-muted)',
      }}>{inline(quote.join(' '), key)}</blockquote>
    );
    quote = [];
  };
  const flushAll = () => { flushPara(); flushList(); flushQuote(); };

  for (const raw of lines) {
    const line = raw.trimEnd();

    if (!line.trim()) { flushAll(); continue; }

    const h = HEADING.exec(line);
    if (h) {
      flushAll();
      const level = Math.min(h[1].length, 6);
      // Keep headings close to body size — these sit inside a chat bubble.
      const size = [17, 16, 15, 14, 14, 14][level - 1];
      blocks.push(
        <div key={key()} role="heading" aria-level={level} style={{
          fontWeight: 700, fontSize: size, lineHeight: 1.35,
          margin: blocks.length ? '12px 0 6px' : '0 0 6px',
        }}>{inline(h[2], key)}</div>
      );
      continue;
    }

    if (RULE.test(line)) {
      flushAll();
      blocks.push(<hr key={key()} style={{ border: 0, borderTop: '1px solid var(--dw-border)', margin: '12px 0' }} />);
      continue;
    }

    const q = QUOTE.exec(line);
    if (q) { flushPara(); flushList(); quote.push(q[1]); continue; }

    const o = ORDERED.exec(line);
    if (o) {
      flushPara(); flushQuote();
      if (!list || !list.ordered) { flushList(); list = { ordered: true, items: [] }; }
      list.items.push(o[1]);
      continue;
    }

    const b = BULLET.exec(line);
    if (b) {
      flushPara(); flushQuote();
      if (!list || list.ordered) { flushList(); list = { ordered: false, items: [] }; }
      list.items.push(b[1]);
      continue;
    }

    flushList(); flushQuote();
    para.push(line);
  }
  flushAll();

  // .dw-md drops the last child's bottom margin (see index.css) so the bubble
  // doesn't gain a phantom gap under the final paragraph.
  return <div className="dw-md" style={style}>{blocks}</div>;
}
