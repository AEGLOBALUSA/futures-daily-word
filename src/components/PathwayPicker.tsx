/**
 * Path chooser — five journey cards. Selecting a card does not start Day 1.
 * NewFaithCTA is the only control that begins the New to Faith journey.
 */
import { isNewChristianPersona, type Persona } from '../utils/persona-config';
import { t, getLang } from '../utils/i18n';
import { useModalA11y } from '../utils/useModalA11y';
import { JourneyChoiceList } from './JourneyChoiceCard';
import { NewFaithCTA } from './NewFaithCTA';

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

  const headingTag = embedded ? 'h2' : 'h1';
  const Heading = headingTag as 'h1' | 'h2';

  const body = (
    <>
      <Heading id="dw-path-chooser-title" className="dw-path-title">
        {t('path_chooser_title', lang)}
      </Heading>
      <p className="dw-path-sub">{t('path_chooser_sub', lang)}</p>
      <JourneyChoiceList
        value={currentPersona || ''}
        labelledBy="dw-path-chooser-title"
        onChange={handleSelect}
      />
      {onBeginDay1 && isNewChristianPersona(currentPersona) && (
        <div style={{ marginTop: 16 }}>
          <NewFaithCTA onClick={onBeginDay1}>
            {t('begin_day1', lang)}
          </NewFaithCTA>
        </div>
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
