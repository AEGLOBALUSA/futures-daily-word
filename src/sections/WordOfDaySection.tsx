import { Card } from '../components/Card';
import { useHome } from './HomeContext';

const DAILY_WORDS = [
  { word: 'Agape', lang: 'Greek', pronunciation: 'ah-GAH-pay', meaning: 'Unconditional, self-giving love — the highest form of love in the New Testament', verse: 'John 3:16', original: '\u03B1\u03B3\u03AC\u03C0\u03B7', ntCount: 143, otCount: 0, family: 'Love/Charity' },
  { word: 'Shalom', lang: 'Hebrew', pronunciation: 'sha-LOME', meaning: 'Peace, wholeness, and completeness — far deeper than the absence of conflict', verse: 'Numbers 6:26', original: '\u05E9\u05C8\u05DC\u05D5\u05B9\u05DD', ntCount: 0, otCount: 237, family: 'Peace/Wholeness' },
  { word: 'Charis', lang: 'Greek', pronunciation: 'KAH-ris', meaning: 'Grace — unmerited divine favor freely given', verse: 'Ephesians 2:8', original: '\u03C7\u03AC\u03C1\u03B9\u03C2', ntCount: 156, otCount: 0, family: 'Grace/Gift' },
  { word: 'Hesed', lang: 'Hebrew', pronunciation: 'HEH-sed', meaning: 'Lovingkindness, steadfast covenant love and loyalty', verse: 'Psalm 136:1', original: '\u05D7\u05B6\u05E1\u05B6\u05D3', ntCount: 0, otCount: 248, family: 'Covenant Love/Mercy' },
  { word: 'Logos', lang: 'Greek', pronunciation: 'LOH-gos', meaning: 'The Word — divine reason, wisdom, and the spoken expression of God', verse: 'John 1:1', original: '\u03BB\u03CC\u03B3\u03BF\u03C2', ntCount: 330, otCount: 0, family: 'Word/Reason/Wisdom' },
];

function getDailyWord() {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  return DAILY_WORDS[dayOfYear % DAILY_WORDS.length];
}

export function WordOfDaySection() {
  const { personaConfig } = useHome();
  if (personaConfig.features.wordOfDay === 'hidden') return null;

  const dailyWord = getDailyWord();

  return (
    <Card style={{ marginBottom: 16, background: 'linear-gradient(135deg, rgba(154,123,46,0.08) 0%, rgba(107,26,34,0.08) 100%)', borderLeft: '3px solid #9A7B2E' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <h2 className="text-section-header" style={{ color: '#9A7B2E' }}>WORD OF THE DAY</h2>
        <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--dw-text-muted)', background: 'rgba(154,123,46,0.12)', padding: '2px 8px', borderRadius: 999, fontFamily: 'var(--font-sans)' }}>
          {dailyWord.lang}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 6 }}>
        <p style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 700, color: 'var(--dw-text-primary)', margin: 0 }}>
          {dailyWord.word}
        </p>
        <p style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: '#9A7B2E', margin: 0 }}>
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

      {/* Expanded info for deeper_study and pastor_leader personas */}
      {personaConfig.features.wordOfDay === 'full' && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(154,123,46,0.15)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            {dailyWord.ntCount > 0 && (
              <div>
                <p style={{ fontSize: 11, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)', margin: '0 0 2px', fontWeight: 500 }}>
                  NT Appearances
                </p>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#9A7B2E', fontFamily: 'var(--font-sans)', margin: 0 }}>
                  {dailyWord.ntCount}x
                </p>
              </div>
            )}
            {dailyWord.otCount > 0 && (
              <div>
                <p style={{ fontSize: 11, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)', margin: '0 0 2px', fontWeight: 500 }}>
                  OT Appearances
                </p>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#9A7B2E', fontFamily: 'var(--font-sans)', margin: 0 }}>
                  {dailyWord.otCount}x
                </p>
              </div>
            )}
          </div>
          {dailyWord.family && (
            <div>
              <p style={{ fontSize: 11, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)', margin: '0 0 4px', fontWeight: 500 }}>
                Word Family
              </p>
              <p style={{ fontSize: 12, color: 'var(--dw-text)', fontFamily: 'var(--font-sans)', margin: 0, fontStyle: 'italic' }}>
                {dailyWord.family}
              </p>
            </div>
          )}
        </div>
      )}

    </Card>
  );
}
