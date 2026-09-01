/**
 * Path chooser — five live persona buttons that filter matching plans.
 * Available from the Plans tab. Not a first-run gate (that was the leak).
 * Superdesign: https://p.superdesign.dev/draft/5464ab28-53b4-4f18-b635-cdd156f9afb7
 */
import type { Persona } from '../utils/persona-config';
import { ALL_PERSONAS, isNewChristianPersona } from '../utils/persona-config';
import { t, getLang } from '../utils/i18n';
import { useModalA11y } from '../utils/useModalA11y';
import { Check } from 'lucide-react';

const PERSONA_I18N: Record<Persona, string> = {
  new_to_faith: 'persona_new',
  congregation: 'persona_member',
  deeper_study: 'persona_study',
  pastor_leader: 'persona_leader',
  comfort: 'persona_comfort',
};

const WORDMARK = 'https://futuresdailyword.com/images/futures-wordmark.png';

interface Props {
  onSelect: (persona: Persona) => void;
  onBeginDay1?: () => void;
  currentPersona?: string;
  /** Inline on the Plans screen — buttons and catalog stay visible together. */
  embedded?: boolean;
}

export function PathwayPicker({ onSelect, onBeginDay1, currentPersona, embedded }: Props) {
  const lang = getLang();
  const dialogRef = useModalA11y(!embedded);

  function handleSelect(persona: Persona) {
    const hasManualTranslation = localStorage.getItem('dw_translation_manual');
    if (!hasManualTranslation) {
      const translationMap: Record<string, string> = {
        new_to_faith: 'NIV',
        congregation: 'ESV',
        deeper_study: 'ESV',
        pastor_leader: 'ESV',
        comfort: 'NIV',
      };
      const suggested = translationMap[persona];
      if (suggested) localStorage.setItem('dw_translation', suggested);
    }
    onSelect(persona);
  }

  const body = (
    <>
      <h1 id="dw-path-chooser-title" className="dw-path-title">
        {t('path_chooser_title', lang)}
      </h1>
      <p className="dw-path-sub">{t('path_chooser_sub', lang)}</p>
      <div className="dw-path-list">
        {ALL_PERSONAS.map(persona => {
          const isCurrent = currentPersona === persona;
          return (
            <button
              key={persona}
              type="button"
              className={`dw-path-card${isCurrent ? ' is-current' : ''}${isNewChristianPersona(persona) ? ' dw-path-new' : ''}`}
              onClick={() => handleSelect(persona)}
            >
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, width: '100%' }}>
                <span className="dw-path-card-label">{t(PERSONA_I18N[persona], lang)}</span>
                {isCurrent && isNewChristianPersona(persona) && (
                  <Check size={18} strokeWidth={2.5} color="var(--dw-new-on-fill)" aria-hidden />
                )}
              </span>
              <span className="dw-path-card-desc">{t(PERSONA_I18N[persona] + '_desc', lang)}</span>
            </button>
          );
        })}
      </div>
      {onBeginDay1 && (
        <button type="button" className="dw-path-secondary" onClick={onBeginDay1}>
          {t('not_sure_begin_day1', lang)}
        </button>
      )}
    </>
  );

  if (embedded) {
    return (
      <section className="dw-path-embedded" aria-labelledby="dw-path-chooser-title">
        {body}
      </section>
    );
  }

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="dw-path-chooser-title"
      className="dw-path-chooser"
    >
      <header className="dw-day1-header">
        <img
          src={WORDMARK}
          alt="Futures Daily Word"
          className="dw-day1-wordmark"
          width={160}
          height={16}
        />
      </header>
      <main className="dw-path-main">{body}</main>
    </div>
  );
}
