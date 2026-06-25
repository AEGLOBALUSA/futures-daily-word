/**
 * DailyWordCard — the persona-gated "Word of the Day" Greek/Hebrew word study card,
 * extracted from HomeScreen. Pure render of the `dailyWord` value passed in.
 */
import { Card } from './Card';
import { getDailyWord } from '../data/daily-words';

interface DailyWordCardProps {
  dailyWord: ReturnType<typeof getDailyWord>;
}

export function DailyWordCard({ dailyWord }: DailyWordCardProps) {
  return (
        <Card style={{ marginBottom: 16, background: 'linear-gradient(135deg, rgba(154,123,46,0.08) 0%, rgba(107,26,34,0.08) 100%)', borderLeft: '3px solid var(--dw-gold)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <h2 className="text-section-header" style={{ color: 'var(--dw-gold)' }}>WORD OF THE DAY</h2>
            <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--dw-text-muted)', background: 'rgba(154,123,46,0.12)', padding: '2px 8px', borderRadius: 999, fontFamily: 'var(--font-sans)' }}>
              {dailyWord.lang}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 6 }}>
            <p style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 700, color: 'var(--dw-text-primary)', margin: 0 }}>
              {dailyWord.word}
            </p>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--dw-gold)', margin: 0 }}>
              {dailyWord.original}
            </p>
          </div>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: 'var(--dw-text-muted)', marginBottom: 8, letterSpacing: '0.03em' }}>
            /{dailyWord.pronunciation}/
          </p>
          <p style={{ fontFamily: 'var(--font-serif-text)', fontSize: 14, lineHeight: 1.6, color: 'var(--dw-text-secondary)', marginBottom: 8 }}>
            {dailyWord.meaning}
          </p>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: 'var(--dw-accent)', fontWeight: 600 }}>
            {dailyWord.verse}
          </p>
        </Card>
  );
}
