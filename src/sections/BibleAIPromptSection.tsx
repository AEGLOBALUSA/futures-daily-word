import { t, getLang } from '../utils/i18n';

export function BibleAIPromptSection({ onOpenAI, persona }: { onOpenAI: () => void; persona: string }) {
  const lang = getLang();

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
    { titleKey: string; subKey: string }
  > = {
    new_to_faith: {
      titleKey: 'ai_teaser_new_title',
      subKey: 'ai_teaser_new_sub',
    },
    congregation: {
      titleKey: 'ai_teaser_cong_title',
      subKey: 'ai_teaser_cong_sub',
    },
    deeper_study: {
      titleKey: 'ai_teaser_study_title',
      subKey: 'ai_teaser_study_sub',
    },
    pastor_leader: {
      titleKey: 'ai_teaser_pastor_title',
      subKey: 'ai_teaser_pastor_sub',
    },
    comfort: {
      titleKey: 'ai_teaser_comfort_title',
      subKey: 'ai_teaser_comfort_sub',
    },
  };

  const msgKeys = messages[persona] || messages.congregation;
  const msg = { title: t(msgKeys.titleKey, lang), subtitle: t(msgKeys.subKey, lang) };

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
