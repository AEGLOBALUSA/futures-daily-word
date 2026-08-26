/**
 * ComfortVerseBannerSection — the ONE comfort verse card (merged 2026-08-26).
 * Previously this banner and <ComfortCard/> both rendered near-identical daily
 * verse cards (10 of 12 refs shared) for the comfort persona, pushing the
 * "A WORD FOR YOU TODAY" reading below the fold. The card's guided prayer —
 * the crisis-facing feature — now lives here; ComfortCard is retired.
 */
import { useState } from 'react';
import { Heart } from 'lucide-react';
import { localDayIndex } from '../components/ComfortSection';
import { t } from '../utils/i18n';

const COMFORT_VERSES = [
  { ref: 'Psalm 34:18', text: 'The LORD is close to the brokenhearted and saves those who are crushed in spirit.' },
  { ref: 'Matthew 11:28-30', text: 'Come to me, all you who are weary and burdened, and I will give you rest. Take my yoke upon you and learn from me, for I am gentle and humble in heart, and you will find rest for your souls.' },
  { ref: 'Isaiah 41:10', text: 'So do not fear, for I am with you; do not be dismayed, for I am your God.' },
  { ref: 'Psalm 46:1', text: 'God is our refuge and strength, an ever-present help in trouble.' },
  { ref: 'Romans 8:28', text: 'And we know that in all things God works for the good of those who love him.' },
  { ref: 'Psalm 23:4', text: 'Even though I walk through the darkest valley, I will fear no evil, for you are with me.' },
  { ref: '2 Corinthians 1:3-4', text: 'The Father of compassion and the God of all comfort, who comforts us in all our troubles.' },
  { ref: 'Philippians 4:6-7', text: 'Do not be anxious about anything... and the peace of God will guard your hearts and minds.' },
  { ref: 'Psalm 147:3', text: 'He heals the brokenhearted and binds up their wounds.' },
  { ref: 'Isaiah 43:2', text: 'When you pass through the waters, I will be with you.' },
  { ref: 'Nahum 1:7', text: 'The LORD is good, a refuge in times of trouble. He cares for those who trust in him.' },
  { ref: 'Psalm 55:22', text: 'Cast your cares on the LORD and he will sustain you.' },
  { ref: 'John 14:27', text: 'Peace I leave with you; my peace I give you. Do not let your hearts be troubled.' },
  { ref: 'Psalm 121:1-2', text: 'I lift up my eyes to the mountains — where does my help come from? My help comes from the LORD.' },
  { ref: 'Jeremiah 29:11', text: 'For I know the plans I have for you, declares the Lord, plans to prosper you and not to harm you, plans to give you hope and a future.' },
  { ref: 'Romans 8:38-39', text: 'For I am convinced that neither death nor life, neither angels nor demons, neither the present nor the future, nor any powers, neither height nor depth, nor anything else in all creation, will be able to separate us from the love of God.' },
];

const GUIDED_PRAYERS = [
  'Lord, I bring my heavy heart to You today. You know what I am carrying, even the things I cannot put into words. Hold me close. Give me strength for this moment, and peace that passes understanding. I trust that You are working even when I cannot see it. Amen.',
  'Father, I feel overwhelmed and weary. Remind me that I do not carry this alone. You are my refuge and my strength. Help me to rest in Your presence and to believe that Your plans for me are good. Amen.',
  'God of all comfort, meet me right where I am. I don\'t need to pretend with You. You see my pain and You are near. Fill me with hope today. Help me take one step at a time, knowing You walk beside me. Amen.',
  'Jesus, You said "Come to me, all who are weary." I come to You now. I lay down my worry, my fear, my sadness. Replace them with Your peace. Help me to trust You more today than I did yesterday. Amen.',
];

export function ComfortVerseBannerSection({ persona }: { persona: string }) {
  // The guided prayer stays open until the reader closes it (the Pray button
  // toggles) — never auto-dismiss a prayer someone may be reading slowly.
  const [showPrayer, setShowPrayer] = useState(false);
  if (persona !== 'comfort') return null;

  // LOCAL day index (repo invariant) — a UTC index flips the verse mid-evening.
  const dayIndex = localDayIndex() % COMFORT_VERSES.length;
  const verse = COMFORT_VERSES[dayIndex];
  const prayer = GUIDED_PRAYERS[dayIndex % GUIDED_PRAYERS.length];

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(92,107,192,0.12) 0%, rgba(92,107,192,0.04) 100%)',
      border: '1px solid rgba(92,107,192,0.2)',
      borderRadius: 14,
      padding: '16px 18px',
      marginBottom: 16,
      textAlign: 'center',
    }}>
      <p style={{
        fontSize: 15,
        fontStyle: 'normal',
        color: 'var(--dw-text)',
        fontFamily: 'var(--font-serif)',
        lineHeight: 1.55,
        margin: '0 0 8px',
      }}>
        "{verse.text}"
      </p>
      <p style={{
        fontSize: 12,
        color: 'var(--dw-text-muted)',
        fontFamily: 'var(--font-sans)',
        margin: '0 0 12px',
        fontWeight: 600,
      }}>
        — {verse.ref}
      </p>
      <button
        onClick={() => setShowPrayer(!showPrayer)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '8px 14px',
          background: showPrayer ? '#5C6BC0' : 'rgba(92, 107, 192, 0.12)',
          color: showPrayer ? '#fff' : '#5C6BC0',
          border: 'none',
          borderRadius: 8,
          fontSize: 13,
          fontWeight: 600,
          fontFamily: 'var(--font-sans)',
          cursor: 'pointer',
          transition: 'all 0.2s',
          minHeight: 32,
        }}
      >
        <Heart size={14} /> {t('pray_label')}
      </button>
      {showPrayer && (
        <div style={{
          marginTop: 14,
          padding: '14px 16px',
          background: 'rgba(255,255,255,0.7)',
          borderRadius: 12,
          animation: 'fadeIn 0.3s ease',
          textAlign: 'left',
        }}>
          <p style={{
            fontSize: 14,
            lineHeight: 1.7,
            color: '#37474F',
            fontFamily: 'var(--font-serif-text, Georgia, serif)',
            fontStyle: 'normal',
            margin: 0,
          }}>
            {prayer}
          </p>
        </div>
      )}
    </div>
  );
}
