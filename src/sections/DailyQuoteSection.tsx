import { QUOTES } from '../data/quotes';
import { getDailyQuoteIndex } from '../utils/daily-passages';
import { useHome } from './HomeContext';

export function DailyQuoteSection() {
  const { dayOffset, setSelection } = useHome();
  const quoteIndex = getDailyQuoteIndex(dayOffset, QUOTES.length);
  const quote = QUOTES[quoteIndex];

  return (
    <div style={{
      marginBottom: 20,
      padding: '8px 0',
      textAlign: 'center',
    }}>
      <p
        onClick={() => setSelection({ text: `"${quote.text}" — ${quote.author}`, verseRefs: [], source: 'tap' })}
        style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 19,
          fontStyle: 'normal',
          color: 'var(--dw-text-primary)',
          lineHeight: 1.8,
          cursor: 'pointer',
          WebkitUserSelect: 'text',
          userSelect: 'text',
          letterSpacing: '0.01em',
        }}
      >
        &ldquo;{quote.text}&rdquo;
      </p>
      <p style={{
        color: 'var(--dw-text-muted)',
        fontSize: 13,
        fontWeight: 500,
        marginTop: 10,
        fontFamily: 'var(--font-sans)',
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
      }}>
        &mdash; {quote.author}
      </p>
    </div>
  );
}
