/**
 * Path arrival strip — one dismissible line under the Home greeting, shown once
 * after a path is saved (Ashley, 2 Sep 2026: "how do I know as a pastor that
 * I'm in the right place?"). Names the path in the person's words and points
 * at what is already open. For the pastor path it also shows the sign-in
 * state: "Signed in as pastor · Campus" or a link to sign in for campus tools.
 */
import { X } from 'lucide-react';
import { t } from '../utils/i18n';
import { useIsPastorSignedIn } from '../utils/useStaffIdentity';
import { CAMPUSES } from '../data/tokens';
import type { TabId } from './TabBar';

const COPY: Record<string, string> = {
  pastor_leader: 'path_arrival_pastor',
  congregation: 'path_arrival_member',
  deeper_study: 'path_arrival_study',
  new_to_faith: 'path_arrival_new',
  comfort: 'path_arrival_comfort',
};

export function PathArrivalStrip({
  persona,
  lang,
  campusId,
  onNavigate,
  onDismiss,
}: {
  persona: string;
  lang: string;
  campusId?: string;
  onNavigate?: (tab: TabId) => void;
  onDismiss: () => void;
}) {
  const signedIn = useIsPastorSignedIn();
  const key = COPY[persona];
  if (!key) return null;
  const isPastor = persona === 'pastor_leader';
  const campus = CAMPUSES.find(c => c.id === campusId);
  const campusLabel = campus ? campus.name.replace(/^Futures /, '').replace(/^Futuros /, '') : '';

  return (
    <div
      role="status"
      className="dw-cp-arrival"
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 10,
        margin: '0 0 16px', padding: '12px 12px 12px 14px',
        background: 'var(--dw-new-soft)', border: '1px solid var(--dw-new)',
        borderRadius: 14, fontFamily: 'var(--font-sans)',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <span className="dw-cp-marker" style={{
          display: 'block', fontSize: 10, fontWeight: 700, letterSpacing: '0.12em',
          textTransform: 'uppercase', marginBottom: 4, '--cp-tone': 'var(--dw-new)',
        } as React.CSSProperties}>
          {t('path_arrival_eyebrow', lang)}
        </span>
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: 'var(--dw-text)' }}>
          {t(key, lang)}
        </p>
        {isPastor && (signedIn ? (
          <p style={{ margin: '6px 0 0', fontSize: 12, lineHeight: 1.4, color: 'var(--dw-text-muted)' }}>
            {t('path_arrival_signed_in', lang)}{campusLabel ? ` · ${campusLabel}` : ''}
          </p>
        ) : (
          <button
            type="button"
            onClick={() => onNavigate?.('more')}
            className="dw-cp-marker"
            style={{
              display: 'inline-block', margin: '6px 0 0', padding: '2px 0',
              background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600,
              textDecoration: 'underline', textUnderlineOffset: 3, '--cp-tone': 'var(--dw-new)',
            } as React.CSSProperties}
          >
            {t('path_arrival_sign_in', lang)} →
          </button>
        ))}
      </div>
      <button
        type="button"
        aria-label={t('path_arrival_dismiss', lang)}
        onClick={onDismiss}
        style={{
          background: 'none', border: 'none', cursor: 'pointer', padding: 4, margin: -4,
          color: 'var(--dw-text-muted)', display: 'flex', flexShrink: 0, minWidth: 32, minHeight: 32,
          alignItems: 'center', justifyContent: 'center',
        }}
      >
        <X size={16} strokeWidth={2} aria-hidden />
      </button>
    </div>
  );
}
