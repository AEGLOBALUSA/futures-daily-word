/**
 * EmailNudgeCard — slim post-first-reading backup nudge (Ashley, 26 Aug 2026).
 * Read-only users' streak/journal live only in this device's localStorage and
 * the church captures no email. After the FIRST real reading (and only once the
 * push prompt has been dealt with — the two post-reading moments never stack),
 * offer the account hand-off via the existing requireEmail() gate.
 */
import { useEffect, useState } from 'react';
import { CloudUpload } from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import { getStreak } from '../utils/streak';
import { t, getLang } from '../utils/i18n';

const DISMISS_KEY = 'dw_email_nudge_dismissed';

export function EmailNudgeCard() {
  const { userProfile, requireEmail } = useUser();
  const lang = getLang();
  const [dismissed, setDismissed] = useState(() => {
    try { return !!localStorage.getItem(DISMISS_KEY); } catch { return false; }
  });
  const [hasRead, setHasRead] = useState(() => {
    try { return !!getStreak().lastDate; } catch { return false; }
  });
  const [pushDone, setPushDone] = useState(() => {
    try { return !!localStorage.getItem('dw_push_onboarded'); } catch { return false; }
  });
  useEffect(() => {
    const h = () => {
      setHasRead(true);
      try { setPushDone(!!localStorage.getItem('dw_push_onboarded')); } catch { /* ignore */ }
    };
    window.addEventListener('dw-streak-recorded', h);
    return () => window.removeEventListener('dw-streak-recorded', h);
  }, []);

  if (dismissed || !hasRead || !pushDone || userProfile?.email) return null;

  return (
    <div style={{
      background: 'var(--dw-card)',
      border: '1px solid var(--dw-border)',
      borderRadius: 14,
      padding: '14px 16px',
      marginBottom: 16,
      display: 'flex',
      alignItems: 'center',
      gap: 12,
    }}>
      <CloudUpload size={20} style={{ color: 'var(--dw-accent)', flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--dw-text-primary)', fontFamily: 'var(--font-sans)', margin: '0 0 2px' }}>
          {t('email_nudge_title', lang)}
        </p>
        <p style={{ fontSize: 12, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)', margin: 0, lineHeight: 1.4 }}>
          {t('email_nudge_body', lang)}
        </p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
        <button
          onClick={() => requireEmail()}
          style={{
            padding: '8px 12px', borderRadius: 8, border: 'none',
            background: 'var(--dw-accent)', color: '#fff',
            fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-sans)',
            cursor: 'pointer', minHeight: 32, whiteSpace: 'nowrap',
          }}
        >
          {t('email_nudge_cta', lang)}
        </button>
        <button
          onClick={() => {
            try { localStorage.setItem(DISMISS_KEY, '1'); } catch { /* quota */ }
            setDismissed(true);
          }}
          style={{
            padding: '4px 12px', borderRadius: 8, border: 'none',
            background: 'transparent', color: 'var(--dw-text-muted)',
            fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-sans)',
            cursor: 'pointer', minHeight: 24, whiteSpace: 'nowrap',
          }}
        >
          {t('email_nudge_later', lang)}
        </button>
      </div>
    </div>
  );
}
