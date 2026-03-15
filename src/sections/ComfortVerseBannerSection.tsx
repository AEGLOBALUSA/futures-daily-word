import { useHome } from './HomeContext';

const COMFORT_VERSES = [
  { ref: 'Psalm 34:18', text: 'The LORD is close to the brokenhearted and saves those who are crushed in spirit.' },
  { ref: 'Matthew 11:28', text: 'Come to me, all you who are weary and burdened, and I will give you rest.' },
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
];

export function ComfortVerseBannerSection() {
  const { personaConfig } = useHome();

  if (personaConfig.persona !== 'comfort') return null;

  const dayIndex = Math.floor(Date.now() / 86400000) % COMFORT_VERSES.length;
  const verse = COMFORT_VERSES[dayIndex];

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
        fontStyle: 'italic',
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
        margin: 0,
        fontWeight: 600,
      }}>
        — {verse.ref}
      </p>
    </div>
  );
}
