/**
 * ComfortCard — Rotating comfort scripture with gentle styling.
 * Only shown to comfort persona. Displays encouraging verse,
 * Listen button, and Pray button.
 */
import { useState, useEffect } from 'react';
import { Heart, Headphones } from 'lucide-react';
import { ListenButton } from './ListenButton';

const COMFORT_SCRIPTURES = [
  { ref: 'Psalm 23:4', text: 'Even though I walk through the darkest valley, I will fear no evil, for you are with me; your rod and your staff, they comfort me.' },
  { ref: 'Isaiah 41:10', text: 'So do not fear, for I am with you; do not be dismayed, for I am your God. I will strengthen you and help you; I will uphold you with my righteous right hand.' },
  { ref: 'Romans 8:28', text: 'And we know that in all things God works for the good of those who love him, who have been called according to his purpose.' },
  { ref: 'Jeremiah 29:11', text: 'For I know the plans I have for you, declares the Lord, plans to prosper you and not to harm you, plans to give you hope and a future.' },
  { ref: 'Matthew 11:28-30', text: 'Come to me, all you who are weary and burdened, and I will give you rest. Take my yoke upon you and learn from me, for I am gentle and humble in heart, and you will find rest for your souls.' },
  { ref: 'Philippians 4:6-7', text: 'Do not be anxious about anything, but in every situation, by prayer and petition, with thanksgiving, present your requests to God. And the peace of God, which transcends all understanding, will guard your hearts and your minds.' },
  { ref: 'Psalm 46:1', text: 'God is our refuge and strength, an ever-present help in trouble.' },
  { ref: '2 Corinthians 1:3-4', text: 'Praise be to the God and Father of our Lord Jesus Christ, the Father of compassion and the God of all comfort, who comforts us in all our troubles, so that we can comfort those in any trouble.' },
  { ref: 'Psalm 34:18', text: 'The Lord is close to the brokenhearted and saves those who are crushed in spirit.' },
  { ref: 'Isaiah 43:2', text: 'When you pass through the waters, I will be with you; and when you pass through the rivers, they will not sweep over you.' },
  { ref: 'Psalm 147:3', text: 'He heals the brokenhearted and binds up their wounds.' },
  { ref: 'Romans 8:38-39', text: 'For I am convinced that neither death nor life, neither angels nor demons, neither the present nor the future, nor any powers, neither height nor depth, nor anything else in all creation, will be able to separate us from the love of God.' },
];

const GUIDED_PRAYERS = [
  'Lord, I bring my heavy heart to You today. You know what I am carrying, even the things I cannot put into words. Hold me close. Give me strength for this moment, and peace that passes understanding. I trust that You are working even when I cannot see it. Amen.',
  'Father, I feel overwhelmed and weary. Remind me that I do not carry this alone. You are my refuge and my strength. Help me to rest in Your presence and to believe that Your plans for me are good. Amen.',
  'God of all comfort, meet me right where I am. I don\'t need to pretend with You. You see my pain and You are near. Fill me with hope today. Help me take one step at a time, knowing You walk beside me. Amen.',
  'Jesus, You said "Come to me, all who are weary." I come to You now. I lay down my worry, my fear, my sadness. Replace them with Your peace. Help me to trust You more today than I did yesterday. Amen.',
];

export function ComfortCard() {
  const [showPrayer, setShowPrayer] = useState(false);

  // Pick scripture and prayer based on day
  const dayIdx = Math.floor(Date.now() / 86400000) % COMFORT_SCRIPTURES.length;
  const scripture = COMFORT_SCRIPTURES[dayIdx];
  const prayer = GUIDED_PRAYERS[dayIdx % GUIDED_PRAYERS.length];

  // Auto-close prayer after opening
  useEffect(() => {
    if (showPrayer) {
      const t = setTimeout(() => setShowPrayer(false), 30000);
      return () => clearTimeout(t);
    }
  }, [showPrayer]);

  return (
    <div style={{
      background: 'linear-gradient(135deg, #E8EAF6 0%, #E1F5FE 50%, #F3E5F5 100%)',
      borderRadius: 16,
      padding: '20px 18px',
      marginBottom: 16,
    }}>
      {/* Scripture */}
      <div style={{ marginBottom: 14 }}>
        <p style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: '#5C6BC0',
          fontFamily: 'var(--font-sans)',
          marginBottom: 8,
        }}>
          A Word of Comfort
        </p>
        <p style={{
          fontSize: 16,
          lineHeight: 1.6,
          color: '#2C3E50',
          fontFamily: 'var(--font-serif-text, Georgia, serif)',
          fontStyle: 'italic',
          margin: '0 0 6px',
        }}>
          "{scripture.text}"
        </p>
        <p style={{
          fontSize: 13,
          color: '#5C6BC0',
          fontFamily: 'var(--font-sans)',
          fontWeight: 600,
          margin: 0,
        }}>
          — {scripture.ref}
        </p>
      </div>

      {/* Buttons */}
      <div style={{ display: 'flex', gap: 10 }}>
        <ListenButton
          text={`${scripture.ref}. ${scripture.text}`}
          size="md"
          label="Listen"
        />
        <button
          onClick={() => setShowPrayer(!showPrayer)}
          style={{
            display: 'flex',
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
          }}
        >
          <Heart size={14} /> Pray
        </button>
      </div>

      {/* Guided prayer — expandable */}
      {showPrayer && (
        <div style={{
          marginTop: 14,
          padding: '14px 16px',
          background: 'rgba(255,255,255,0.7)',
          borderRadius: 12,
          animation: 'fadeIn 0.3s ease',
        }}>
          <p style={{
            fontSize: 14,
            lineHeight: 1.7,
            color: '#37474F',
            fontFamily: 'var(--font-serif-text, Georgia, serif)',
            fontStyle: 'italic',
            margin: 0,
          }}>
            {prayer}
          </p>
          <div style={{ marginTop: 10 }}>
            <ListenButton text={prayer} size="sm" label="Listen to prayer" />
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
