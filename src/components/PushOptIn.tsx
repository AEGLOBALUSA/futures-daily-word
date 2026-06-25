import { useState } from 'react';
import { Bell } from 'lucide-react';
import { subscribePush, updatePushTime } from '../utils/push';

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

  const enable = async () => {
    if (busy) return;
    setBusy(true);
    try {
      localStorage.setItem('dw_push_hour', String(hour));
      const email = (() => {
        try { return JSON.parse(localStorage.getItem('dw_profile') || '{}').email || ''; } catch { return ''; }
      })();
      const ok = await subscribePush(email);
      if (ok) await updatePushTime(hour);
    } catch { /* permission denied / unsupported — fall through, it's optional */ }
    setBusy(false);
    onDone();
  };

  return (
    <div
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
          style={{
            fontSize: 26, fontWeight: 700, lineHeight: 1.2, margin: '0 0 10px',
            fontFamily: 'var(--font-serif-text, Georgia, serif)', color: 'var(--dw-text-primary)',
          }}
        >
          One gentle nudge a day
        </h1>
        <p
          style={{
            fontSize: 15, lineHeight: 1.5, margin: '0 0 24px',
            fontFamily: 'var(--font-sans)', color: 'var(--dw-text-muted)',
          }}
        >
          We&rsquo;ll send today&rsquo;s Word at the time that fits your rhythm. No spam — just a daily invitation to show up.
        </p>

        <label
          htmlFor="dw-onboard-hour"
          style={{ display: 'block', fontSize: 13, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)', marginBottom: 8 }}
        >
          Remind me at
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
          {busy ? 'Turning on…' : 'Turn on daily reminders'}
        </button>
        <button
          onClick={() => { if (!busy) onDone(); }}
          style={{
            width: '100%', padding: '12px', borderRadius: 14, border: 'none', background: 'transparent',
            color: 'var(--dw-text-muted)', fontSize: 15, fontWeight: 600,
            fontFamily: 'var(--font-sans)', cursor: 'pointer',
          }}
        >
          Maybe later
        </button>
      </div>
    </div>
  );
}
