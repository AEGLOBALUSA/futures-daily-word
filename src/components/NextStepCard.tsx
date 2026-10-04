import { useId } from 'react';
import type { JSX, ReactNode } from 'react';
import type { HomeNextStep } from '../utils/useHomeNextStep';
import type { NextAction, SetupAsk } from '../utils/nextStep';
import { ScriptureSkeleton } from '../components/Skeleton';

export interface NextStepCardProps {
  next: HomeNextStep;
  onAction: (action: NextAction) => void;
  /** Home renders the set-up ask's own component (install / email / upgrade) with its `next` prop. */
  renderAsk?: (ask: SetupAsk) => ReactNode;
}

export function NextStepCard({ next, onAction, renderAsk }: NextStepCardProps): JSX.Element {
  const whyId = useId();
  const { step, loading, label, why } = next;

  return (
    <section className={step.kind === 'setup_ask' && !loading ? 'dw-nextstep dw-nextstep--ask' : 'dw-nextstep'} aria-label={label} aria-busy={loading || undefined}>
      {loading ? (
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
            aria-describedby={why ? whyId : undefined}
            onClick={() => { next.onTapped(); onAction(next.step.action); }}
          >
            {label}
          </button>
        </>
      )}
    </section>
  );
}
