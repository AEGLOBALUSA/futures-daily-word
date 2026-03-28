export function BibleAIPromptSection({ onOpenAI, persona }: { onOpenAI: () => void; persona: string }) {
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

  const msg = messages[persona] || messages.congregation;

  return (
    <button
      onClick={onOpenAI}
      style={{
        width: '100%',
        padding: '18px 20px',
        background: 'var(--dw-surface)',
        border: '1px solid var(--dw-border)',
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
            padding: '3px 8px',
            borderRadius: 6,
            background: 'var(--dw-accent)',
            color: '#fff',
            fontFamily: 'var(--font-sans)',
          }}
        >
          AI
        </span>
        <span
          style={{
            fontSize: 15,
            fontWeight: 600,
            color: 'var(--dw-text-primary)',
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
          lineHeight: 1.5,
        }}
      >
        {msg.subtitle}
      </p>
    </button>
  );
}
