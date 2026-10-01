/**
 * "Bring your journal to this device" — the one-time email code sheet.
 *
 * When the server answers a sync with 403 proof_required, cloudSync parks the
 * sync and fires 'dw-proof-required'. This sheet then asks the reader to prove
 * they own the email on the account: we email a 6-digit code (never a link) and
 * they type it here. On success cloudSync runs the sync again.
 *
 * It never sends anything by itself: the code email goes out only when the
 * reader taps "Email me the code". "Not now" closes it; local data stays and
 * nothing is pushed. Same bottom-sheet grammar as ChoosePathSheet.
 * Mounted once at App level.
 */
import { useEffect, useRef, useState } from 'react';
import { Loader2, CheckCircle } from 'lucide-react';
import { API_BASE } from '../utils/api-base';
import { t, getLang } from '../utils/i18n';
import { authHeaders } from '../utils/sessionToken';
import { isProofRequired, retrySyncAfterProof } from '../utils/cloudSync';
import { useSubView } from '../utils/useSubView';

type Step = 'ask' | 'enter' | 'done';

/** a•••@domain.com — enough to recognise the inbox, not enough to read the address. */
export function maskEmail(email: string): string {
  const [user, domain] = String(email).split('@');
  if (!user || !domain) return email;
  return `${user.slice(0, 1)}•••@${domain}`;
}

function readProfileEmail(): string {
  try { return (JSON.parse(localStorage.getItem('dw_profile') || '{}') || {}).email || ''; } catch { return ''; }
}

async function callProfile(action: 'proof-send' | 'proof-verify', extra: Record<string, unknown> = {}) {
  const res = await fetch(`${API_BASE}/api/user-profile`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ action, ...extra }),
  });
  const data = await res.json().catch(() => ({})) as { success?: boolean; alreadyProven?: boolean; error?: string };
  return { status: res.status, data };
}

export function EmailCodePrompt() {
  const lang = getLang();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [step, setStep] = useState<Step>('ask');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [code, setCode] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const close = () => setOpen(false);
  useSubView(open, close);

  useEffect(() => {
    const show = (e?: Event) => {
      const fromEvent = (e as CustomEvent<{ email?: string }> | undefined)?.detail?.email;
      setEmail(fromEvent || readProfileEmail());
      setStep('ask');
      setError('');
      setCode('');
      setOpen(true);
    };
    window.addEventListener('dw-proof-required', show);
    // The sync can park before this sheet has mounted.
    if (isProofRequired()) show();
    return () => {
      window.removeEventListener('dw-proof-required', show);
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, []);

  useEffect(() => {
    if (open && step === 'enter') inputRef.current?.focus({ preventScroll: true });
  }, [open, step]);

  if (!open) return null;

  async function sendCode() {
    setBusy(true);
    setError('');
    try {
      const { status, data } = await callProfile('proof-send');
      if (status === 200 && data.alreadyProven) { await finish(); return; }
      if (status === 200 && data.success) { setStep('enter'); setCode(''); return; }
      setError(t(status === 429 ? 'proof_err_many' : 'proof_err_send', lang));
    } catch {
      setError(t('proof_err_send', lang));
    } finally {
      setBusy(false);
    }
  }

  async function finish() {
    setStep('done');
    void retrySyncAfterProof();
    closeTimer.current = setTimeout(() => setOpen(false), 1600);
  }

  async function checkCode() {
    if (!/^\d{6}$/.test(code)) { setError(t('proof_err_wrong', lang)); return; }
    setBusy(true);
    setError('');
    try {
      const { status, data } = await callProfile('proof-verify', { code });
      if (status === 200 && data.success) { await finish(); return; }
      if (status === 429) setError(t('proof_err_many', lang));
      else if (status === 400) setError(t('proof_err_wrong', lang));
      else setError(t('proof_err_send', lang));
    } catch {
      setError(t('proof_err_send', lang));
    } finally {
      setBusy(false);
    }
  }

  const spinner = <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} aria-hidden />;
  const textBtn = {
    background: 'none', border: 'none', color: 'var(--dw-text-muted)', fontSize: 14, cursor: 'pointer',
    fontFamily: 'var(--font-sans)', padding: 8, minHeight: 48,
  } as const;

  return (
    <div className="dw-cp-sheet-host">
      <div className="dw-cp-sheet-backdrop" onClick={close} aria-hidden />
      <div role="dialog" aria-labelledby="dw-proof-title" className="dw-cp-sheet" data-testid="email-code-prompt">
        <div className="dw-cp-sheet-grip" aria-hidden />

        {step === 'done' ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <CheckCircle size={48} style={{ color: 'var(--dw-plan-light)', marginBottom: 12 }} aria-hidden />
            <h2 id="dw-proof-title" style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 400, color: 'var(--dw-text)' }}>
              {t('proof_done', lang)}
            </h2>
          </div>
        ) : (
          <>
            <h2 id="dw-proof-title" style={{
              margin: '4px 0 6px', fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 400,
              lineHeight: 1.2, letterSpacing: '-0.02em', color: 'var(--dw-text)',
            }}>
              {t('proof_title', lang)}
            </h2>
            <p style={{ margin: '0 0 14px', fontSize: 15, lineHeight: 1.45, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)' }}>
              {step === 'ask'
                ? t('proof_sub', lang).replace('{email}', maskEmail(email))
                : t('proof_sent_next', lang)}
            </p>

            {step === 'enter' && (
              <label style={{ display: 'block', marginBottom: 12 }}>
                <span style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--dw-text)', fontFamily: 'var(--font-sans)' }}>
                  {t('proof_enter_label', lang)}
                </span>
                <input
                  ref={inputRef}
                  value={code}
                  onChange={e => { setCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setError(''); }}
                  onKeyDown={e => { if (e.key === 'Enter' && !busy) void checkCode(); }}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  data-testid="email-code-input"
                  style={{
                    width: '100%', boxSizing: 'border-box', minHeight: 56, borderRadius: 14, padding: '0 16px',
                    border: '1.5px solid var(--dw-border)', background: 'var(--dw-canvas)', color: 'var(--dw-text)',
                    fontSize: 26, letterSpacing: 8, textAlign: 'center', fontFamily: 'var(--font-sans)',
                  }}
                />
              </label>
            )}

            {error && (
              <p role="alert" style={{ margin: '0 0 12px', color: '#e57373', fontSize: 14, fontFamily: 'var(--font-sans)' }}>{error}</p>
            )}

            {step === 'ask' ? (
              <button
                type="button"
                onClick={sendCode}
                disabled={busy}
                className="dw-btn-primary"
                style={{ width: '100%', minHeight: 52, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              >
                {busy ? spinner : null}
                {busy ? t('proof_sending', lang) : t('proof_send', lang)}
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={checkCode}
                  disabled={busy || code.length !== 6}
                  className="dw-btn-primary"
                  style={{ width: '100%', minHeight: 52, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                >
                  {busy ? spinner : null}
                  {busy ? t('proof_checking', lang) : t('proof_check', lang)}
                </button>
                <button type="button" onClick={sendCode} disabled={busy} style={{ ...textBtn, width: '100%' }}>
                  {t('proof_resend', lang)}
                </button>
              </>
            )}

            <button type="button" onClick={close} style={{ ...textBtn, width: '100%' }}>
              {t('proof_not_now', lang)}
            </button>
            <p style={{ margin: '4px 0 0', textAlign: 'center', fontSize: 12, lineHeight: 1.5, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)' }}>
              {t('proof_foot', lang)}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
