/**
 * "Where this comes from" — a full-screen sub-view of the reading screen that
 * shows the same source/licence attribution as StudySourcesCard (Settings),
 * opened from a commentary block on Home.
 *
 * Mounted with a live `open` prop (never conditionally rendered) so
 * useSubView can register/consume its pushed history entry across the whole
 * open/close cycle — see the NewBelieverLessonCard comment at
 * HomeScreen.tsx:4472-4474 for why unconditional mounting matters here.
 *
 * No focus trap here: useSubView alone drives the history entry (a
 * modal focus-trap hook fights sibling overlays on the reading screen —
 * same call as ChoosePathSheet/CongregationSheet).
 */
import { t } from '../../utils/i18n';
import { useSubView } from '../../utils/useSubView';
import { StudySourcesCard } from '../StudySourcesCard';

export function StudySourcesSheet({
  open,
  onClose,
  lang,
}: {
  open: boolean;
  onClose: () => void;
  lang: string;
}) {
  useSubView(open, onClose);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-labelledby="dw-study-sources-sheet-title"
      data-testid="study-sources-sheet"
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        display: 'flex', flexDirection: 'column',
        background: 'var(--dw-bg)',
      }}
    >
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 16px 12px', flexShrink: 0,
        borderBottom: '1px solid var(--dw-border)',
      }}>
        <h2 id="dw-study-sources-sheet-title" style={{
          margin: 0, fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 400,
          lineHeight: 1.2, letterSpacing: '-0.02em', color: 'var(--dw-text)',
        }}>
          {t('commentary_where_from', lang)}
        </h2>
        <button
          type="button"
          onClick={onClose}
          data-testid="study-sources-sheet-close"
          style={{
            border: '1px solid var(--dw-border)', borderRadius: 999,
            padding: '6px 14px', fontSize: 13, fontFamily: 'var(--font-sans)',
            background: 'transparent', color: 'var(--dw-text)', cursor: 'pointer',
          }}
        >
          {t('j_close', lang)}
        </button>
      </div>
      <div style={{
        flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch',
        padding: '16px 16px 32px',
      }}>
        <p style={{
          margin: '0 0 16px', fontSize: 13, lineHeight: 1.5,
          color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)',
        }}>
          {t('study_sources_scripture_note', lang)}
        </p>
        <StudySourcesCard lang={lang} />
      </div>
    </div>
  );
}
