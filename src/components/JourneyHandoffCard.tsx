/**
 * Journey Handoff — a soft, dismissable nudge toward a Connect Group, shown
 * once the reader has completed 14 days, and again (durably) once they
 * finish the whole journey. Never a modal, never blocking.
 */
import { useEffect, useState } from 'react';
import { t as trans } from '../utils/i18n';
import { track } from '../utils/analytics';
import { handoffStage, markHandoff, shouldShowHandoff, type HandoffStage } from '../utils/journeyClose';

export interface JourneyHandoffCardProps {
  completedCount: number;
  totalDays: number;
  lang: string;
  onOpenCampus: () => void;
  onChoosePath?: () => void;
}

export function JourneyHandoffCard({ completedCount, totalDays, lang, onOpenCampus, onChoosePath }: JourneyHandoffCardProps) {
  const stage: HandoffStage | null = handoffStage(completedCount, totalDays);
  const [hidden, setHidden] = useState(() => !(stage && shouldShowHandoff(stage)));

  useEffect(() => {
    setHidden(!(stage && shouldShowHandoff(stage)));
  }, [stage]);

  if (!stage || hidden) return null;

  const title = stage === 'd14'
    ? trans('j_handoff_title', lang)
    : trans('j_handoff_done_title', lang).replace('{n}', String(totalDays));
  const body = stage === 'd14'
    ? trans('j_handoff_body', lang)
    : trans('j_handoff_done_body', lang);

  return (
    <div
      role="group"
      aria-label={title}
      style={{
        background: 'var(--dw-surface)',
        border: '1px solid var(--dw-border)',
        borderRadius: 12,
        padding: 14,
        marginTop: 12,
      }}
    >
      <p style={{ margin: '0 0 6px', fontSize: 14, fontWeight: 700, color: 'var(--dw-text-secondary)', fontFamily: 'var(--font-sans)' }}>
        {title}
      </p>
      <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)' }}>
        {body}
      </p>
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
        <button
          onClick={() => {
            markHandoff(stage, 'opened');
            track('journey_handoff_open', stage);
            onOpenCampus();
          }}
          style={{
            padding: '8px 16px',
            background: 'var(--dw-new)',
            color: 'var(--dw-new-on-fill)',
            border: 'none',
            borderRadius: 10,
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 600,
            fontFamily: 'var(--font-sans)',
            minHeight: 44,
          }}
        >
          {trans('j_handoff_cta', lang)}
        </button>
        {stage === 'd40' && onChoosePath && (
          <button
            onClick={onChoosePath}
            style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: 0,
              color: 'var(--dw-new)', fontSize: 13, fontWeight: 600,
              fontFamily: 'var(--font-sans)', textDecoration: 'underline', minHeight: 44,
            }}
          >
            {trans('j_handoff_next', lang)}
          </button>
        )}
        <button
          onClick={() => {
            markHandoff(stage, 'dismissed');
            track('journey_handoff_dismiss', stage);
            setHidden(true);
          }}
          style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
            color: 'var(--dw-text-muted)', fontSize: 13, fontWeight: 600,
            fontFamily: 'var(--font-sans)', minHeight: 44,
          }}
        >
          {trans('j_handoff_later', lang)}
        </button>
      </div>
    </div>
  );
}
