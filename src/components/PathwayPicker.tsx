/**
 * PathwayPicker — Full-screen first-run pathway selector.
 * Renders INSTEAD of the app when no persona is set.
 * One screen. Five cards. One tap. Under 5 seconds.
 */
import { useState } from 'react';
import { Sprout, Users, BookOpen, Shield, Heart } from 'lucide-react';
import type { Persona } from '../utils/persona-config';
import { PERSONA_CONFIGS, ALL_PERSONAS } from '../utils/persona-config';
import { t, getLang } from '../utils/i18n';
import { useModalA11y } from '../utils/useModalA11y';

const ICONS: Record<string, React.FC<{ size?: number; color?: string }>> = {
  Sprout,
  Users,
  BookOpen,
  Shield,
  Heart,
};

const ACCENT_COLORS: Record<Persona, string> = {
  new_to_faith: '#4CAF50',
  congregation: '#2196F3',
  deeper_study: '#7B1FA2',
  pastor_leader: '#C8920E',
  comfort: '#5C6BC0',
};

// i18n keys for the card label/description per persona (persona_*_desc pairs
// live in i18n.ts for all four languages; config.label is the English source).
const PERSONA_I18N: Record<Persona, string> = {
  new_to_faith: 'persona_new',
  congregation: 'persona_member',
  deeper_study: 'persona_study',
  pastor_leader: 'persona_leader',
  comfort: 'persona_comfort',
};

interface Props {
  onSelect: (persona: Persona) => void;
  currentPersona?: string;
}

export function PathwayPicker({ onSelect, currentPersona }: Props) {
  const isRevisit = !!currentPersona;
  const lang = getLang();
  const [selected, setSelected] = useState<Persona | null>(null);
  const [animatingOut, setAnimatingOut] = useState(false);

  // Dialog semantics: focus in, Tab trap, focus restore. Escape keeps the
  // current path on a revisit; on first run there is no dismiss (a pathway
  // must be picked), so Escape does nothing.
  const dialogRef = useModalA11y(
    true,
    isRevisit
      ? () => {
          if (animatingOut || !currentPersona) return;
          setAnimatingOut(true);
          setTimeout(() => onSelect(currentPersona as Persona), 400);
        }
      : undefined
  );

  function handleSelect(persona: Persona) {
    setSelected(persona);
    setAnimatingOut(true);

    // Auto-suggest translation for persona (only if user hasn't manually chosen)
    const hasManualTranslation = localStorage.getItem('dw_translation_manual');
    if (!hasManualTranslation) {
      const translationMap: Record<string, string> = {
        new_to_faith: 'NIV', // was NLT — NLT is offline until its API key is set
        congregation: 'ESV',
        deeper_study: 'ESV',
        pastor_leader: 'ESV',
        comfort: 'NIV', // was NLT
      };
      const suggested = translationMap[persona];
      if (suggested) localStorage.setItem('dw_translation', suggested);
    }

    setTimeout(() => onSelect(persona), 400);
  }

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="dw-pathway-picker-title"
      style={{
      position: 'fixed',
      inset: 0,
      background: 'var(--dw-canvas, #FAFAF8)',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 20px env(safe-area-inset-bottom, 20px)',
      opacity: animatingOut ? 0 : 1,
      transition: 'opacity 0.35s ease',
      overflowY: 'auto',
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 28, maxWidth: 360 }}>
        <h1 id="dw-pathway-picker-title" style={{
          fontSize: 28,
          fontWeight: 700,
          color: 'var(--dw-text-primary, #1A1A1A)',
          fontFamily: 'var(--font-serif-text, Georgia, serif)',
          margin: '0 0 8px',
          lineHeight: 1.2,
        }}>
          {isRevisit ? t('still_right_fit', lang) : t('welcome_daily_word', lang)}
        </h1>
        <p style={{
          fontSize: 15,
          color: 'var(--dw-text-muted, #777)',
          fontFamily: 'var(--font-sans, system-ui)',
          margin: 0,
          lineHeight: 1.5,
        }}>
          {isRevisit
            ? <>{t('journey_changed', lang)}</>
            : <>{t('everyones_different', lang)}</>
          }
        </p>
      </div>

      {/* Pathway Cards */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        width: '100%',
        maxWidth: 400,
      }}>
        {ALL_PERSONAS.map(persona => {
          const config = PERSONA_CONFIGS[persona];
          const Icon = ICONS[config.icon] || BookOpen;
          const accent = ACCENT_COLORS[persona];
          const isSelected = selected === persona;
          const isCurrent = currentPersona === persona;

          return (
            <button
              key={persona}
              onClick={() => handleSelect(persona)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: '16px 18px',
                background: isSelected ? accent : 'var(--dw-surface, #fff)',
                border: isSelected ? 'none' : isCurrent ? `2px solid ${accent}` : '1px solid var(--dw-border, #E8E6E0)',
                borderRadius: 14,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s ease',
                width: '100%',
                transform: isSelected ? 'scale(0.97)' : 'scale(1)',
              }}
            >
              <div style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: isSelected ? 'rgba(255,255,255,0.2)' : `${accent}15`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <Icon size={22} color={isSelected ? '#fff' : accent} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{
                  fontSize: 16,
                  fontWeight: 600,
                  color: isSelected ? '#fff' : 'var(--dw-text-primary, #1A1A1A)',
                  fontFamily: 'var(--font-sans, system-ui)',
                  margin: 0,
                  lineHeight: 1.3,
                }}>
                  {t(PERSONA_I18N[persona], lang)}
                </p>
                <p style={{
                  fontSize: 13,
                  color: isSelected ? 'rgba(255,255,255,0.8)' : 'var(--dw-text-muted, #777)',
                  fontFamily: 'var(--font-sans, system-ui)',
                  margin: '2px 0 0',
                  lineHeight: 1.4,
                }}>
                  {t(PERSONA_I18N[persona] + '_desc', lang)}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Bottom actions */}
      {isRevisit ? (
        <button
          onClick={() => { if (!currentPersona) return; setAnimatingOut(true); setTimeout(() => onSelect(currentPersona as Persona), 400); }}
          style={{
            marginTop: 16,
            background: 'none',
            border: 'none',
            fontSize: 14,
            fontWeight: 600,
            color: 'var(--dw-accent, #C8920E)',
            cursor: 'pointer',
            fontFamily: 'var(--font-sans, system-ui)',
            padding: '10px 20px',
          }}
        >
          {t('keep_current_path', lang)}
        </button>
      ) : (
        <button
          onClick={() => handleSelect('congregation')}
          style={{
            marginTop: 16,
            background: 'none',
            border: 'none',
            fontSize: 14,
            color: 'var(--dw-accent, #C8920E)',
            cursor: 'pointer',
            fontFamily: 'var(--font-sans, system-ui)',
            fontWeight: 600,
            padding: '10px 20px',
            textDecoration: 'underline',
            textUnderlineOffset: '3px',
          }}
        >
          {t('not_sure_start_member', lang)}
        </button>
      )}
    </div>
  );
}
