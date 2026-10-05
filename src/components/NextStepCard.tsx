import { useId } from 'react';
import type { JSX, ReactNode } from 'react';
import type { HomeNextStep } from '../utils/useHomeNextStep';
import type { NextAction, SetupAsk } from '../utils/nextStep';
import { ScriptureSkeleton } from '../components/Skeleton';

export interface NextStepCardProps {
  next: HomeNextStep;
  onAction: (action: NextAction) => void;
  busy?: string;
  notice?: string;
  error?: string;
  /** Home renders the set-up ask's own component (install / email / upgrade) with its `next` prop. */
  renderAsk?: (ask: SetupAsk) => ReactNode;
}

export function NextStepCard({ next, onAction, busy, notice, error, renderAsk }: NextStepCardProps): JSX.Element {
  const whyId = useId();
  const errorId = useId();
  const { step, loading, label, why, alt } = next;

  return (
    <section className={step.kind === 'setup_ask' && !loading && !notice ? 'dw-nextstep dw-nextstep--ask' : 'dw-nextstep'} aria-label={notice || label} aria-busy={loading || !!busy || undefined}>
      {notice ? (
        <p className="dw-reminder-feedback" role="status">{notice}</p>
      ) : loading ? (
        <ScriptureSkeleton />
      ) : step.kind === 'done' ? (
        <p className="dw-nextstep-done" data-testid="next-step-done">{label}</p>
      ) : step.kind === 'setup_ask' ? (
        <div onClickCapture={next.onTapped}>{renderAsk?.(step.action as SetupAsk)}</div>
      ) : step.action === 'none' ? (
        <p className="dw-nextstep-done" data-testid="next-step-quiet">{label}</p>
      ) : (
        <>
          {why && <p className="dw-nextstep-why" id={whyId}>{why}</p>}
          <button
            type="button"
            className="dw-next dw-campus-main dw-nextstep-btn"
            data-testid="next-step-button"
            disabled={!!busy}
            aria-describedby={[why && whyId, error && errorId].filter(Boolean).join(' ') || undefined}
            onClick={() => { if (busy) return; next.onTapped(); onAction(next.step.action); }}
          >
            {busy || label}
          </button>
          {alt && (
            <button
              type="button"
              className="dw-nextstep-alt"
              data-testid="next-step-alt"
              disabled={!!busy}
              onClick={() => { if (!busy) onAction(alt.action); }}
            >
              {alt.label}
            </button>
          )}
          {error && <p className="dw-reminder-feedback" id={errorId} role="alert">{error}</p>}
        </>
      )}
    </section>
  );
}
