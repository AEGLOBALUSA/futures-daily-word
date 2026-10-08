/**
 * Free-account invite. Reading and listening stay open without an account.
 * This is the visible way to start one — the email gate already signs in
 * an existing address or registers a new one (no separate providers).
 */
import { useUser } from '../contexts/UserContext';
import { t, getLang } from '../utils/i18n';

export function FreeAccountInvite({ variant = 'home' }: { variant?: 'home' | 'day1' }) {
  const { userProfile, requireEmail } = useUser();
  if (userProfile?.email) return null;

  const lang = getLang();
  const day1 = variant === 'day1';

  return (
    <section
      data-testid="free-account-invite"
      aria-label={t('account_invite_title', lang)}
      style={{
        margin: day1 ? '8px 0 0' : '0 0 16px',
        padding: '14px 16px 12px',
        borderRadius: 16,
        background: day1 ? '#FFFFFF' : 'var(--dw-card)',
        border: day1 ? '1px solid #ECE3D4' : '1px solid var(--dw-border)',
        textAlign: 'left',
      }}
    >
      <p style={{
        margin: '0 0 4px',
        fontFamily: 'var(--font-serif)',
        fontSize: 18,
        fontWeight: 500,
        color: day1 ? '#241E17' : 'var(--dw-text-primary)',
      }}>
        {t('account_invite_title', lang)}
      </p>
      <p style={{
        margin: '0 0 12px',
        fontFamily: 'var(--font-sans)',
        fontSize: 15,
        lineHeight: 1.45,
        color: day1 ? '#5C5146' : 'var(--dw-text-secondary)',
      }}>
        {t('account_invite_body', lang)}
      </p>
      <button
        type="button"
        data-testid="free-account-cta"
        onClick={() => requireEmail()}
        style={{
          width: '100%',
          minHeight: 48,
          border: 'none',
          borderRadius: 12,
          background: 'var(--dw-accent)',
          color: '#fff',
          fontFamily: 'var(--font-sans)',
          fontSize: 16,
          fontWeight: 700,
          cursor: 'pointer',
        }}
      >
        {t('account_invite_cta', lang)}
      </button>
      <button
        type="button"
        data-testid="free-account-signin"
        onClick={() => requireEmail()}
        style={{
          width: '100%',
          minHeight: 44,
          marginTop: 4,
          border: 'none',
          background: 'transparent',
          color: day1 ? '#3F5E46' : 'var(--dw-accent)',
          fontFamily: 'var(--font-sans)',
          fontSize: 15,
          fontWeight: 600,
          cursor: 'pointer',
          textDecoration: 'underline',
          textUnderlineOffset: 3,
        }}
      >
        {t('account_invite_signin', lang)}
      </button>
    </section>
  );
}
