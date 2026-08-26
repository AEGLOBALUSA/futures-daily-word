import { useState, useRef, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { subscribePush, updatePushTime, pushSupported, openCalendarReminder, withTimeout } from '../utils/push';
import { t, getLang } from '../utils/i18n';
import { useModalA11y } from '../utils/useModalA11y';

// 12-hour label for the reminder-time picker (5am–10pm).
function formatHour(h: number): string {
  const period = h < 12 ? 'AM' : 'PM';
  const hr = h % 12 === 0 ? 12 : h % 12;
  return `${hr}:00 ${period}`;
}
const HOURS = Array.from({ length: 18 }, (_, i) => i + 5); // 5 → 22

/**
 * First-run "want a daily nudge?" step — shown right after the pathway pick so the
 * notification opt-in lands at the high-intent onboarding moment (not buried in
 * Settings). Skippable. Catches the browser permission prompt on the explicit tap.
 */
export function PushOptIn({ onDone }: { onDone: () => void }) {
  const [hour, setHour] = useState(7);
  const [busy, setBusy] = useState(false);
  // Native push needs a service worker; where there isn't one (e.g. the app
  // proxied at futures.church/daily-word) we add a recurring calendar reminder.
  const canPush = pushSupported();
  // This is a full-screen onboarding gate — if the opt-in ever fails to dismiss, the
  // whole app is stuck behind it. So dismissal is guaranteed: `finish()` runs exactly
  // once from every path (success, skip, or a timed-out attempt), and "Maybe later"
  // stays live even while an attempt is in flight.
  const finished = useRef(false);
  const mounted = useRef(true);
  useEffect(() => () => { mounted.current = false; }, []);

  const finish = () => {
    if (finished.current) return;
    finished.current = true;
    onDone();
  };

  // Dialog semantics: focus in, Tab trap, Escape → "Maybe later", focus restore.
  const dialogRef = useModalA11y(true, finish);

  const enable = async () => {
    if (busy || finished.current) return;
    setBusy(true);
    try {
      localStorage.setItem('dw_push_hour', String(hour));
      if (!canPush) {
        openCalendarReminder(hour);
      } else {
        const email = (() => {
          try { return JSON.parse(localStorage.getItem('dw_profile') || '{}').email || ''; } catch { return ''; }
        })();
        // subscribePush already bounds the permission prompt and the network call; the
        // outer timeout is a hard backstop so the button can never spin indefinitely.
        const ok = await withTimeout(subscribePush(email), 12000, false);
        if (ok) await withTimeout(updatePushTime(hour), 4000, false);
      }
    } catch { /* permission denied / unsupported — fall through, it's optional */ }
    if (mounted.current) setBusy(false);
    finish();
  };

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="dw-push-optin-title"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'var(--dw-canvas, #0F0D0B)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 24px env(safe-area-inset-bottom, 24px)',
        textAlign: 'center',
      }}
    >
      <div style={{ maxWidth: 360, width: '100%' }}>
        <div
          aria-hidden="true"
          style={{
            width: 72, height: 72, borderRadius: '50%', margin: '0 auto 20px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--dw-accent-bg, rgba(220,83,93,0.12))',
            border: '1px solid var(--dw-accent, #DC535D)',
          }}
        >
          <Bell size={32} color="var(--dw-accent, #DC535D)" />
        </div>
        <h1
          id="dw-push-optin-title"
          style={{
            fontSize: 26, fontWeight: 700, lineHeight: 1.2, margin: '0 0 10px',
            fontFamily: 'var(--font-serif-text, Georgia, serif)', color: 'var(--dw-text-primary)',
          }}
        >
          {t('push_optin_title', getLang())}
        </h1>
        <p
          style={{
            fontSize: 15, lineHeight: 1.5, margin: '0 0 24px',
            fontFamily: 'var(--font-sans)', color: 'var(--dw-text-muted)',
          }}
        >
          {canPush
            ? t('push_optin_body_push', getLang())
            : t('push_optin_body_calendar', getLang())}
        </p>
        {/* Church-proxy origin can never do push (no service worker there by
            design) — bridge to the native origin with the same-email safety
            rail. A link only, never an auto-redirect; the calendar fallback
            above stays exactly as it is. */}
        {!canPush && (
          <p
            style={{
              fontSize: 13, lineHeight: 1.5, margin: '-8px 0 24px',
              fontFamily: 'var(--font-sans)', color: 'var(--dw-text-muted)',
            }}
          >
            {t('bridge_line1', getLang())}{' '}
            <a
              href="https://futuresdailyword.com"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--dw-accent, #DC535D)', fontWeight: 600, textDecoration: 'underline' }}
            >
              {t('bridge_continue', getLang())}
            </a>
            {' — '}{t('bridge_line2', getLang())}
          </p>
        )}

        <label
          htmlFor="dw-onboard-hour"
          style={{ display: 'block', fontSize: 13, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)', marginBottom: 8 }}
        >
          {t('remind_me_at', getLang())}
        </label>
        <select
          id="dw-onboard-hour"
          value={hour}
          onChange={(e) => setHour(parseInt(e.target.value, 10))}
          style={{
            width: '100%', padding: '14px', borderRadius: 12, fontSize: 15, marginBottom: 20,
            fontFamily: 'var(--font-sans)', background: 'var(--dw-surface)',
            color: 'var(--dw-text-primary)', border: '1px solid var(--dw-border)',
          }}
        >
          {HOURS.map(h => (
            <option key={h} value={h}>{formatHour(h)}</option>
          ))}
        </select>

        <button
          onClick={enable}
          disabled={busy}
          style={{
            width: '100%', padding: '15px', borderRadius: 14, border: 'none',
            background: 'var(--dw-accent, #DC535D)', color: '#fff', fontSize: 16, fontWeight: 700,
            fontFamily: 'var(--font-sans)', cursor: busy ? 'default' : 'pointer', marginBottom: 10,
            opacity: busy ? 0.7 : 1,
          }}
        >
          {busy
            ? (canPush ? t('turning_on', getLang()) : t('opening_calendar', getLang()))
            : (canPush ? t('turn_on_daily_reminders', getLang()) : t('add_to_calendar', getLang()))}
        </button>
        <button
          onClick={finish}
          style={{
            width: '100%', padding: '12px', borderRadius: 14, border: 'none', background: 'transparent',
            color: 'var(--dw-text-muted)', fontSize: 15, fontWeight: 600,
            fontFamily: 'var(--font-sans)', cursor: 'pointer',
          }}
        >
          {t('maybe_later', getLang())}
        </button>
      </div>
    </div>
  );
}
