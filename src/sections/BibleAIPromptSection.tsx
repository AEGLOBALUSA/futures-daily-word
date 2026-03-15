import { useHome } from './HomeContext';

export function BibleAIPromptSection({ onOpenAI }: { onOpenAI: () => void }) {
  const { personaConfig } = useHome();

  // Check if user has ever used AI
  const hasUsedAI = (() => {
    try {
      const events = JSON.parse(localStorage.getItem('dw_behavior_v1') || '[]');
      return events.some((e: { type: string }) => e.type === 'ai_prompt');
    } catch {
      return false;
    }
  })();

  if (hasUsedAI) return null;

  // Persona-specific messaging
  const messages: Record<
    string,
    { title: string; subtitle: string }
  > = {
    new_to_faith: {
      title: 'New here? Ask Bible AI anything',
      subtitle:
        "Not sure what this passage means? Tap here — it's like having a friend who knows the Bible really well.",
    },
    congregation: {
      title: 'Go deeper with Bible AI',
      subtitle:
        "Ask questions about today's reading, get historical context, or explore how it applies to your life.",
    },
    deeper_study: {
      title: 'Explore the original languages',
      subtitle:
        'Bible AI can break down Greek and Hebrew words, cross-reference passages, and provide scholarly context.',
    },
    pastor_leader: {
      title: 'Bible AI for sermon prep',
      subtitle:
        "Get teaching angles, illustration ideas, and deeper context for today's passage.",
    },
    comfort: {
      title: 'Talk to Bible AI about what you\'re feeling',
      subtitle:
        'You can ask anything — even the hard questions. Bible AI responds with compassion and Scripture.',
    },
  };

  const msg = messages[personaConfig.persona] || messages.congregation;

  return (
    <button
      onClick={onOpenAI}
      style={{
        width: '100%',
        padding: '16px 18px',
        background: 'linear-gradient(135deg, rgba(200,146,14,0.12) 0%, rgba(200,146,14,0.04) 100%)',
        border: '1px solid rgba(200,146,14,0.25)',
        borderRadius: 14,
        cursor: 'pointer',
        textAlign: 'left',
        margin: '0 0 16px',
        transition: 'all 0.2s ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        <span
          style={{
            fontSize: 9,
            fontWeight: 800,
            letterSpacing: '0.08em',
            padding: '2px 6px',
            borderRadius: 5,
            background: 'linear-gradient(135deg, #7A5200, #C8920E, #F5C842)',
            color: '#fff',
            fontFamily: 'var(--font-sans)',
          }}
        >
          BIBLE AI
        </span>
        <span
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: 'var(--dw-text)',
            fontFamily: 'var(--font-sans)',
          }}
        >
          {msg.title}
        </span>
      </div>
      <p
        style={{
          fontSize: 13,
          color: 'var(--dw-text-muted)',
          fontFamily: 'var(--font-sans)',
          margin: 0,
          lineHeight: 1.45,
        }}
      >
        {msg.subtitle}
      </p>
    </button>
  );
}
