/**
 * PastorSignIn — the "Pastor account" card in Settings. Staff sign in with their
 * work email and the same password as /staff, and the app becomes their named
 * pastor account: pastor_leader persona, profile name + email from the roster,
 * staff token kept so re-opens skip the login. Password only — no magic links,
 * no OAuth. Backend is netlify/functions/intake.js (auth_status / set_password /
 * login / me / logout, plus change_password for the signed-in card's disclosure).
 */
import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, FormEvent } from 'react';
import { ShieldCheck, LogOut } from 'lucide-react';
import { Card } from './Card';
import { campusName as campusNameOf } from '../data/campuses';
import { intake, setStaffToken } from '../staff/api';
import { useUser } from '../contexts/UserContext';
import { useStaffIdentity } from '../utils/useStaffIdentity';
import {
  isAppStaffSignedIn, looksLikeStaffEmail, resetStaffSessionCache, restoreStaffSession, setAppStaffSignIn,
  STAFF_SESSION_EVENT, type StaffRecord,
} from '../utils/staffIdentity';
import { track } from '../utils/analytics';
import { markLockSignedIn } from '../utils/moLock';
import { t, getLang } from '../utils/i18n';

type View = 'loading' | 'closed' | 'email' | 'password' | 'set_password' | 'signed_in';

const ROLE_KEYS: Record<string, string> = {
  admin: 'pastor_role_admin',
  hub: 'pastor_role_hub',
  campus: 'pastor_role_campus',
  media: 'pastor_role_media',
};

function roleLabel(role: string, lang: string): string {
  const key = ROLE_KEYS[role];
  return key ? t(key, lang) : role;
}

function campusName(id: string | null | undefined): string {
  if (!id) return '';
  return campusNameOf(id);
}

/** The server's known refusals, shown in the card's language. */
const SERVER_MESSAGE_KEYS: Record<string, string> = {
  'Sign-in is unavailable right now. Try again shortly.': 'pastor_unavailable',
  'Too many attempts. Try again later.': 'pastor_too_many_attempts',
  'That code did not work. Check it, or email yourself a new one.': 'pastor_code_refused',
  'Invalid email or password': 'pastor_wrong_password',
  'Use at least 10 characters.': 'pastor_password_too_short',
  'Do not use your email as the password.': 'pastor_password_is_email',
  'Password is too long.': 'pastor_password_too_long',
  'Enter a valid email.': 'pastor_valid_email',
};

/** Server error text where the server answered; a connectivity line where it didn't. */
export function messageFor(err: unknown, lang: string): string {
  const status = (err as { status?: number } | null)?.status;
  const msg = err instanceof Error ? err.message : '';
  if (!status) return t('pastor_offline_error', lang);
  if (status === 503) return t('pastor_unavailable', lang);
  const key = SERVER_MESSAGE_KEYS[msg];
  if (key) return t(key, lang);
  return msg || t('pastor_offline_error', lang);
}

export function PastorSignIn({ lang: langProp }: { lang?: string }) {
  const lang = langProp || getLang();
  const { userProfile } = useUser();
  const { applyStaffIdentity, clearStaffIdentity } = useStaffIdentity();
  const [view, setView] = useState<View>('loading');
  const [staff, setStaff] = useState<StaffRecord | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [setupCode, setSetupCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sendError, setSendError] = useState('');
  const [sendStatus, setSendStatus] = useState('');
  const [sending, setSending] = useState(false);
  const [sentTo, setSentTo] = useState('');
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setError('');
    setSendError('');
    setSendStatus('');
    if (view !== 'set_password') setSentTo('');
  }, [view]);

  useEffect(() => {
    if (view === 'set_password' && sentTo) codeRef.current?.focus();
  }, [view, sentTo]);
  // "Change password" disclosure in the signed-in card. `password` / `confirm`
  // above double as the new password and its confirmation.
  const [pwOpen, setPwOpen] = useState(false);
  const [pwDone, setPwDone] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const viewRef = useRef<View>('loading');
  viewRef.current = view;

  // Stored staff token → signed-in card straight away (one cached `me` call,
  // shared with the App boot restore).
  useEffect(() => {
    let alive = true;
    // A hung `me` must not leave the row disabled forever — fall back to the
    // sign-in row and let a late answer still promote it.
    const timer = setTimeout(() => {
      if (alive) setView(v => (v === 'loading' ? 'closed' : v));
    }, 12000);
    restoreStaffSession().then(s => {
      if (!alive) return;
      clearTimeout(timer);
      if (s) { setStaff(s); setView('signed_in'); }
      else setView(v => (v === 'loading' ? 'closed' : v));
    });
    return () => { alive = false; clearTimeout(timer); };
  }, []);

  // The session can change while this card is mounted (every tab stays mounted):
  // the Home chip's "Sign out of pastor account", or a token rejected at boot.
  // Follow it — a card still reading "Signed in as …" after a sign-out would show
  // the previous pastor to whoever holds the device next. Our own sign-in fires
  // this too, mid-form, and is ignored (the form finishes on its own).
  useEffect(() => {
    let alive = true;
    const onSession = () => {
      if (!isAppStaffSignedIn()) {
        if (viewRef.current === 'signed_in' || viewRef.current === 'loading') {
          setStaff(null);
          setPwOpen(false);
          setPwDone(false);
          setCurrentPassword('');
          setView('closed');
        }
        return;
      }
      if (viewRef.current !== 'closed') return;
      restoreStaffSession().then(s => {
        if (!alive || !s || viewRef.current !== 'closed') return;
        setStaff(s);
        setView('signed_in');
      });
    };
    window.addEventListener(STAFF_SESSION_EVENT, onSession);
    return () => { alive = false; window.removeEventListener(STAFF_SESSION_EVENT, onSession); };
  }, []);

  const typedEmail = email.trim().toLowerCase();
  const currentEmail = (userProfile?.email || '').trim().toLowerCase();
  const switchingAccount = !!currentEmail && !!typedEmail && typedEmail !== currentEmail;

  const finish = async (data: { token: string; staff: StaffRecord }) => {
    setStaffToken(data.token);
    markLockSignedIn(); // the lock loads on /staff only; it reads this one-shot cookie there
    setAppStaffSignIn(true); // this app issued the session — see staffIdentity
    resetStaffSessionCache();
    await applyStaffIdentity(data.staff);
    track('pastor_sign_in', data.staff.role || '');
    setStaff(data.staff);
    setPassword('');
    setConfirm('');
    setSetupCode('');
    setCurrentPassword('');
    setPwOpen(false);
    setPwDone(false);
    setError('');
    setView('signed_in');
  };

  const submitEmail = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setError('');
    if (!typedEmail) { setError(t('pastor_type_email', lang)); return; }
    if (!looksLikeStaffEmail(typedEmail)) { setError(t('pastor_not_staff', lang)); return; }
    setBusy(true);
    try {
      const status = await intake<{ setup?: boolean }>('auth_status', { email: typedEmail });
      setView(status.setup ? 'set_password' : 'password');
    } catch (err) {
      setError(messageFor(err, lang));
    }
    setBusy(false);
  };

  // Leaving a screen (Back, Cancel, a new address) retires any code request
  // still in flight, so a late answer cannot pull the person back.
  const codeRequest = useRef(0);
  useEffect(() => () => { codeRequest.current += 1; setSending(false); }, [view]);

  const sendCode = async () => {
    if (sending) return;
    setSendError('');
    setSendStatus('');
    setSending(true);
    const request = ++codeRequest.current;
    const resending = view === 'set_password';
    try {
      await intake('email_setup_code', { email: typedEmail, lang });
      if (request !== codeRequest.current) return;
      setSetupCode('');
      if (!resending) { setPassword(''); setConfirm(''); }
      setError(''); setSendError('');
      if (resending) setSendStatus(t('pastor_code_sent_again', lang));
      setSentTo(typedEmail);
      setView('set_password');
      codeRef.current?.focus();
    } catch (err) {
      if (request !== codeRequest.current) return;
      setSendError((err as { status?: number } | null)?.status === 429
        ? t('pastor_too_many_codes', lang)
        : messageFor(err, lang));
    }
    setSending(false);
  };

  const submitPassword = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setError('');
    if (view === 'set_password') {
      if (!setupCode.trim()) { setError(t('pastor_type_code', lang)); return; }
      if (password.length < 10) { setError(t('pastor_password_too_short', lang)); return; }
      if (password !== confirm) { setError(t('pastor_passwords_mismatch', lang)); return; }
    } else if (!password) { setError(t('pastor_type_password', lang)); return; }
    setBusy(true);
    try {
      // A live setup code chooses or resets the password.
      const data = view === 'set_password'
        ? await intake<{ token: string; staff: StaffRecord }>('set_password', { email: typedEmail, password, setupCode })
        : await intake<{ token: string; staff: StaffRecord }>('login', { email: typedEmail, password });
      await finish(data);
    } catch (err) {
      setError(messageFor(err, lang));
    }
    setBusy(false);
  };

  const signOut = async () => {
    if (busy) return;
    setBusy(true);
    await clearStaffIdentity();
    track('pastor_sign_out');
    setStaff(null);
    setEmail('');
    setPassword('');
    setConfirm('');
    setSetupCode('');
    setCurrentPassword('');
    setPwOpen(false);
    setPwDone(false);
    setError('');
    setView('closed');
    setBusy(false);
  };

  const cancel = () => {
    setEmail('');
    setPassword('');
    setConfirm('');
    setSetupCode('');
    setError('');
    setView('closed');
  };

  const openChangePassword = () => {
    setPwDone(false);
    setCurrentPassword('');
    setPassword('');
    setConfirm('');
    setError('');
    setPwOpen(true);
  };

  const closeChangePassword = () => {
    setCurrentPassword('');
    setPassword('');
    setConfirm('');
    setError('');
    setPwOpen(false);
  };

  const submitChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setError('');
    // The form is noValidate (iOS stops a `required` form without a word), so every check is
    // ours: the first box that needs something gets the words beside the button and the cursor.
    const refuse = (key: string, fieldId: string) => {
      setError(t(key, lang));
      (document.getElementById(fieldId) as HTMLInputElement | null)?.focus();
    };
    if (!currentPassword) { refuse('pastor_type_current_password', 'dw-pastor-current'); return; }
    if (password.length < 10) { refuse('pastor_password_too_short', 'dw-pastor-new'); return; }
    if (staff?.email && password.toLowerCase() === staff.email.trim().toLowerCase()) { refuse('pastor_password_is_email', 'dw-pastor-new'); return; }
    if (password !== confirm) { refuse('pastor_passwords_mismatch', 'dw-pastor-new-confirm'); return; }
    if (password === currentPassword) { refuse('pastor_password_same', 'dw-pastor-new'); return; }
    setBusy(true);
    try {
      // The server keeps THIS session and revokes every other one for the email.
      await intake('change_password', { currentPassword, newPassword: password });
      closeChangePassword();
      setPwDone(true);
    } catch (err) {
      setError(messageFor(err, lang));
    }
    setBusy(false);
  };

  return (
    <div style={{ marginBottom: 24 }}>
      <h2 className="text-section-header" style={{ marginBottom: 10, paddingLeft: 4 }}>
        <ShieldCheck size={12} style={{ marginRight: 6, verticalAlign: 'middle' }} />
        {t('pastor_account', lang)}
      </h2>
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {(view === 'loading' || view === 'closed') && (
          <>
            <button
              type="button"
              onClick={() => setView('email')}
              disabled={view === 'loading'}
              style={{ ...rowStyle, opacity: view === 'loading' ? 0.5 : 1 }}
            >
              <ShieldCheck size={18} style={iconStyle} />
              <span style={{ flex: 1 }}>{t('pastor_sign_in', lang)}</span>
              <span style={valStyle}>→</span>
            </button>
            <p style={{ ...hintStyle, padding: '0 16px 14px' }}>{t('pastor_sign_in_hint', lang)}</p>
          </>
        )}

        {view === 'email' && (
          <form noValidate onSubmit={submitEmail} style={{ padding: '14px 16px 16px' }}>
            <label htmlFor="dw-pastor-email" style={labelStyle}>{t('pastor_work_email', lang)}</label>
            <input
              id="dw-pastor-email"
              type="email"
              inputMode="email"
              autoComplete="username"
              autoCapitalize="none"
              autoFocus
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="name@futures.church"
              style={inputStyle}
            />
            <p style={{ ...hintStyle, marginTop: 8 }}>{t('pastor_sign_in_hint', lang)}</p>
            {error && <p role="alert" style={errorStyle}>{error}</p>}
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button type="button" onClick={cancel} style={btnGhost}>{t('pastor_cancel', lang)}</button>
              <button type="submit" disabled={busy} style={{ ...btnPrimary, flex: 1 }}>
                {busy ? t('pastor_please_wait', lang) : t('pastor_continue', lang)}
              </button>
            </div>
          </form>
        )}

        {(view === 'password' || view === 'set_password') && (
          <form noValidate onSubmit={submitPassword} style={{ padding: '14px 16px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12 }}>
              <span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 500, color: 'var(--dw-text-primary)', fontFamily: 'var(--font-sans)', overflowWrap: 'anywhere' }}>
                {typedEmail}
              </span>
              <button type="button" onClick={() => { setView('email'); setError(''); setPassword(''); setConfirm(''); setSetupCode(''); }} style={linkBtnStyle}>
                {t('pastor_change_email', lang)}
              </button>
            </div>
            {view === 'set_password' && (
              <>
                <p id={sentTo ? 'dw-pastor-code-sent' : undefined} style={{ ...hintStyle, marginBottom: 10 }}>
                  {sentTo ? t('pastor_code_sent', lang).replace('{email}', sentTo) : t('pastor_first_visit', lang)}
                </p>
                <label htmlFor="dw-pastor-setup-code" style={labelStyle}>{t('pastor_setup_code', lang)}</label>
                <input
                  id="dw-pastor-setup-code"
                  ref={codeRef}
                  type="text"
                  autoComplete="one-time-code"
                  autoCapitalize="characters"
                  spellCheck={false}
                  autoFocus
                  required
                  placeholder="XXXXX-XXXXX"
                  value={setupCode}
                  onChange={e => setSetupCode(e.target.value)}
                  style={{ ...inputStyle, marginBottom: 10, letterSpacing: '0.1em' }}
                />
              </>
            )}
            <label htmlFor="dw-pastor-password" style={labelStyle}>
              {view === 'set_password' ? t('pastor_new_password', lang) : t('pastor_password', lang)}
            </label>
            <input
              id="dw-pastor-password"
              type="password"
              autoComplete={view === 'set_password' ? 'new-password' : 'current-password'}
              autoFocus={view !== 'set_password'}
              required
              minLength={view === 'set_password' ? 10 : undefined}
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={inputStyle}
            />
            {view === 'set_password' && (
              <>
                <p style={{ ...hintStyle, marginTop: 10 }}>{t('pastor_password_hint', lang)}</p>
                <label htmlFor="dw-pastor-confirm" style={{ ...labelStyle, marginTop: 10 }}>{t('pastor_confirm_password', lang)}</label>
                <input
                  id="dw-pastor-confirm"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={10}
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  style={inputStyle}
                />
              </>
            )}
            {switchingAccount && (
              <p style={{ ...hintStyle, marginTop: 10 }}>
                {t('pastor_switch_notice', lang).replace('{email}', currentEmail)}
              </p>
            )}
            {error && <p role="alert" style={errorStyle}>{error}</p>}
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button type="button" onClick={cancel} style={btnGhost}>{t('pastor_cancel', lang)}</button>
              <button type="submit" disabled={busy} style={{ ...btnPrimary, flex: 1 }}>
                {busy
                  ? t('pastor_please_wait', lang)
                  : view === 'set_password' ? t('pastor_save_password', lang) : t('pastor_sign_in_btn', lang)}
              </button>
            </div>
            {view === 'password' ? (
              <>
                <p style={{ ...hintStyle, marginTop: 12 }}>{t('pastor_first_time_ask', lang)}</p>
                <button id="dw-pastor-email-code" type="button" onClick={sendCode} disabled={sending} style={{ ...btnGhost, marginTop: 8 }}>
                  {sending ? t('pastor_please_wait', lang) : t('pastor_email_me_code', lang)}
                </button>
                {sendError && <p role="alert" style={errorStyle}>{sendError}</p>}
                <p style={{ ...hintStyle, marginTop: 12 }}>
                  <button type="button" onClick={() => { setView('set_password'); setError(''); setSendError(''); setSentTo(''); setSetupCode(''); setPassword(''); setConfirm(''); }} style={{ ...linkBtnStyle, minHeight: 44 }}>
                    {t('pastor_have_code', lang)}
                  </button>
                </p>
              </>
            ) : (
              <>
                <button id="dw-pastor-send-another" type="button" onClick={sendCode} disabled={sending} style={{ ...btnGhost, marginTop: 12 }}>
                  {sending ? t('pastor_please_wait', lang) : t('pastor_send_another', lang)}
                </button>
                {sendStatus && <p role="status" style={{ ...hintStyle, marginTop: 8 }}>{sendStatus}</p>}
                {sendError && <p role="alert" style={errorStyle}>{sendError}</p>}
                <p style={{ ...hintStyle, marginTop: 12 }}>
                  <button id="dw-pastor-back-to-sign-in" type="button" onClick={() => { setView('password'); setError(''); setSendError(''); setSentTo(''); setPassword(''); setConfirm(''); setSetupCode(''); }} style={{ ...linkBtnStyle, minHeight: 44 }}>
                    {t('pastor_back_to_sign_in', lang)}
                  </button>
                </p>
              </>
            )}
          </form>
        )}

        {view === 'signed_in' && staff && (
          <div style={{ padding: '14px 16px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <ShieldCheck size={18} style={{ ...iconStyle, color: 'var(--dw-accent)', marginTop: 2 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--dw-text-primary)', fontFamily: 'var(--font-sans)' }}>
                  {t('pastor_signed_in_as', lang)} {staff.name || staff.email}
                </p>
                <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)', overflowWrap: 'anywhere' }}>
                  {staff.email}
                  {' · '}{roleLabel(staff.role, lang)}
                  {staff.role === 'campus' && staff.campusId ? ` · ${campusName(staff.campusId)}` : ''}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={signOut}
              disabled={busy}
              style={{ ...btnGhost, width: '100%', marginTop: 14, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: busy ? 0.6 : 1 }}
            >
              <LogOut size={14} />
              {busy ? t('pastor_please_wait', lang) : t('pastor_sign_out', lang)}
            </button>
            {!pwOpen && (
              <button
                id="dw-pastor-change-password"
                type="button"
                onClick={openChangePassword}
                disabled={busy}
                style={{ ...linkBtnStyle, display: 'block', width: '100%', padding: '12px 0 2px', textAlign: 'center', opacity: busy ? 0.6 : 1 }}
              >
                {t('pastor_change_password', lang)}
              </button>
            )}
            {pwDone && !pwOpen && (
              <p id="dw-pastor-password-changed" style={{ ...hintStyle, marginTop: 8, textAlign: 'center' }}>
                {t('pastor_password_changed', lang)}
              </p>
            )}
            {pwOpen && (
              <form onSubmit={submitChangePassword} noValidate style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--dw-border)' }}>
                <label htmlFor="dw-pastor-current" style={labelStyle}>{t('pastor_current_password', lang)}</label>
                <input
                  id="dw-pastor-current"
                  type="password"
                  autoComplete="current-password"
                  autoFocus
                  required
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  style={inputStyle}
                />
                <label htmlFor="dw-pastor-new" style={{ ...labelStyle, marginTop: 10 }}>{t('pastor_new_password', lang)}</label>
                <input
                  id="dw-pastor-new"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={10}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  style={inputStyle}
                />
                <label htmlFor="dw-pastor-new-confirm" style={{ ...labelStyle, marginTop: 10 }}>{t('pastor_confirm_password', lang)}</label>
                <input
                  id="dw-pastor-new-confirm"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={10}
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  style={inputStyle}
                />
                {error && <p role="alert" style={errorStyle}>{error}</p>}
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button type="button" onClick={closeChangePassword} disabled={busy} style={btnGhost}>{t('pastor_cancel', lang)}</button>
                  <button
                    type="submit"
                    disabled={busy}
                    style={{ ...btnPrimary, flex: 1 }}
                  >
                    {busy ? t('pastor_please_wait', lang) : t('pastor_change_password', lang)}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}

/* ── Styles — mirror MoreScreen's rows and the staff portal's form ── */
const rowStyle: CSSProperties = {
  display: 'flex', alignItems: 'center', width: '100%',
  padding: '14px 16px', background: 'none', border: 'none', cursor: 'pointer',
  color: 'var(--dw-text-primary)', fontFamily: 'var(--font-sans)', fontSize: 14,
  textAlign: 'left', minHeight: 48,
};
const iconStyle: CSSProperties = { color: 'var(--dw-text-muted)', marginRight: 12, flexShrink: 0 };
const valStyle: CSSProperties = { color: 'var(--dw-text-muted)', fontSize: 13 };
const hintStyle: CSSProperties = {
  margin: 0, fontSize: 12, lineHeight: 1.5, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)',
};
const labelStyle: CSSProperties = {
  display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6,
  color: 'var(--dw-text-secondary)', fontFamily: 'var(--font-sans)',
};
const inputStyle: CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  background: 'var(--dw-surface)', border: '1px solid var(--dw-border)', borderRadius: 10,
  padding: '12px 14px', fontSize: 15, fontFamily: 'var(--font-sans)',
  color: 'var(--dw-text-primary)', outline: 'none',
};
const errorStyle: CSSProperties = {
  margin: '10px 0 0', fontSize: 13, lineHeight: 1.45, color: 'var(--dw-text-christ)', fontFamily: 'var(--font-sans)',
};
const btnPrimary: CSSProperties = {
  background: 'var(--dw-accent)', color: '#fff', border: 'none', borderRadius: 10,
  padding: '12px 16px', fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-sans)',
  cursor: 'pointer', minHeight: 44,
};
const btnGhost: CSSProperties = {
  background: 'transparent', color: 'var(--dw-text-secondary)', border: '1px solid var(--dw-border)',
  borderRadius: 10, padding: '12px 16px', fontSize: 14, fontWeight: 600,
  fontFamily: 'var(--font-sans)', cursor: 'pointer', minHeight: 44,
};
const linkBtnStyle: CSSProperties = {
  background: 'none', border: 'none', padding: 0, cursor: 'pointer',
  color: 'var(--dw-accent)', fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-sans)',
};
