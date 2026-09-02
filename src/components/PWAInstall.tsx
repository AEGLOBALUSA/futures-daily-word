/**
 * Add-to-Home-Screen — the missing half of the install path.
 *
 * main.tsx already captures beforeinstallprompt and exposes __pwaInstall.
 * This is the UI that actually calls it (Chrome/Android) and the iOS
 * Share → Add to Home Screen instructions that Safari requires.
 */
import { useEffect, useState } from 'react';
import { Share, PlusSquare, X, Smartphone } from 'lucide-react';
import { t } from '../utils/i18n';
import { track } from '../utils/analytics';
import { hapticTap } from '../utils/haptics';
import {
  isStandaloneDisplay,
  isIosDevice,
  isEmbeddedApp,
  canNativeInstall,
  promptPwaInstall,
  isInstallDismissed,
  dismissInstall,
} from '../utils/pwa';

function useInstallState() {
  const [standalone, setStandalone] = useState(isStandaloneDisplay);
  const [canPrompt, setCanPrompt] = useState(canNativeInstall);
  const [dismissed, setDismissed] = useState(isInstallDismissed);
  const ios = isIosDevice();
  const embedded = isEmbeddedApp();

  useEffect(() => {
    const onAvail = () => setCanPrompt(true);
    const onInstalled = () => { setStandalone(true); setCanPrompt(false); };
    window.addEventListener('pwa-install-available', onAvail);
    window.addEventListener('pwa-installed', onInstalled);
    const mq = window.matchMedia?.('(display-mode: standalone)');
    const onMq = () => setStandalone(isStandaloneDisplay());
    mq?.addEventListener?.('change', onMq);
    return () => {
      window.removeEventListener('pwa-install-available', onAvail);
      window.removeEventListener('pwa-installed', onInstalled);
      mq?.removeEventListener?.('change', onMq);
    };
  }, []);

  const hide = standalone || embedded;
  return { hide, canPrompt, dismissed, ios, setDismissed };
}

async function handleInstallTap(ios: boolean, canPrompt: boolean, onIos: () => void) {
  hapticTap();
  if (ios) {
    track('pwa_ios_hint', 'share_sheet');
    onIos();
    return;
  }
  if (canPrompt) {
    const result = await promptPwaInstall();
    track('pwa_install', result);
    return;
  }
  // Browser never fired beforeinstallprompt (Firefox, desktop Safari, in-app browsers).
  track('pwa_install', 'unavailable');
  onIos(); // reuse the instruction sheet as a generic "use the browser menu" hint
}

/** One-time card on Home — after the reader has a real reason to come back. */
export function PWAInstallBanner() {
  const { hide, canPrompt, dismissed, ios, setDismissed } = useInstallState();
  const [sheet, setSheet] = useState(false);
  const [hasRead, setHasRead] = useState(() => {
    try { return !!localStorage.getItem('dw_reading_done'); } catch { return false; }
  });

  useEffect(() => {
    const h = () => setHasRead(true);
    window.addEventListener('dw-reading-completed', h);
    return () => window.removeEventListener('dw-reading-completed', h);
  }, []);

  useEffect(() => {
    if (!hide && !dismissed && hasRead) track('pwa_install_prompt_shown', ios ? 'ios' : canPrompt ? 'native' : 'hint');
  }, [hide, dismissed, hasRead, ios, canPrompt]);

  if (hide || dismissed || !hasRead) return null;

  return (
    <>
      <div
        className="dw-pwa-banner"
        role="region"
        aria-label={t('pwa_install_title')}
        style={{
          margin: '8px 0 20px',
          padding: '18px 18px 16px',
          borderRadius: 18,
          background: 'var(--dw-card)',
          border: '1px solid var(--dw-border)',
          boxShadow: '0 8px 28px rgba(30,20,10,0.06)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div
            aria-hidden="true"
            style={{
              width: 40, height: 40, borderRadius: 12, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'var(--dw-accent-bg)', color: 'var(--dw-accent)',
            }}
          >
            <Smartphone size={20} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{
              margin: '0 0 4px', fontFamily: 'var(--font-serif)',
              fontSize: 17, fontWeight: 500, color: 'var(--dw-text-primary)', letterSpacing: '-0.01em',
            }}>
              {t('pwa_install_title')}
            </p>
            <p style={{
              margin: 0, fontFamily: 'var(--font-sans)',
              fontSize: 13, lineHeight: 1.5, color: 'var(--dw-text-muted)',
            }}>
              {t('pwa_install_body')}
            </p>
          </div>
          <button
            type="button"
            onClick={() => { dismissInstall(); setDismissed(true); track('pwa_install', 'dismissed'); }}
            aria-label={t('pwa_install_dismiss')}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--dw-text-muted)', padding: 4, margin: '-4px -4px 0 0',
            }}
          >
            <X size={18} />
          </button>
        </div>
        <button
          type="button"
          onClick={() => handleInstallTap(ios, canPrompt, () => setSheet(true))}
          style={{
            width: '100%', marginTop: 14, minHeight: 44,
            border: 'none', borderRadius: 12, cursor: 'pointer',
            background: 'var(--dw-accent)', color: '#fff',
            fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 700,
          }}
        >
          {t('pwa_install_cta')}
        </button>
      </div>
      {sheet && <InstallHintSheet ios={ios} onClose={() => setSheet(false)} />}
    </>
  );
}

/** Persistent Settings row — always reachable, even if the Home card was dismissed. */
export function PWAInstallRow({ rowStyle, iconStyle, valStyle }: {
  rowStyle: React.CSSProperties;
  iconStyle: React.CSSProperties;
  valStyle: React.CSSProperties;
}) {
  const { hide, canPrompt, ios } = useInstallState();
  const [sheet, setSheet] = useState(false);
  if (hide) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => handleInstallTap(ios, canPrompt, () => setSheet(true))}
        style={rowStyle}
      >
        <Smartphone size={18} style={iconStyle} />
        <span style={{ flex: 1 }}>{t('pwa_install_title')}</span>
        <span style={valStyle}>{t('pwa_install_cta')} →</span>
      </button>
      {sheet && <InstallHintSheet ios={ios} onClose={() => setSheet(false)} />}
    </>
  );
}

/** Settings row plus the hairline under it, so a hidden install doesn't leave a stray divider. */
export function PWAInstallSettingsBlock({ rowStyle, iconStyle, valStyle, dividerStyle }: {
  rowStyle: React.CSSProperties;
  iconStyle: React.CSSProperties;
  valStyle: React.CSSProperties;
  dividerStyle: React.CSSProperties;
}) {
  const { hide } = useInstallState();
  if (hide) return null;
  return (
    <>
      <PWAInstallRow rowStyle={rowStyle} iconStyle={iconStyle} valStyle={valStyle} />
      <div style={dividerStyle} />
    </>
  );
}

function InstallHintSheet({ ios, onClose }: { ios: boolean; onClose: () => void }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="dw-pwa-hint-title"
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 960,
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        background: 'rgba(20,14,8,0.45)',
        padding: 16,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 'min(440px, 100%)',
          background: 'var(--dw-surface)',
          border: '1px solid var(--dw-border)',
          borderRadius: 20,
          padding: '24px 22px 20px',
          boxShadow: '0 18px 50px rgba(0,0,0,0.28)',
        }}
      >
        <p id="dw-pwa-hint-title" style={{
          margin: '0 0 8px', fontFamily: 'var(--font-serif)',
          fontSize: 20, color: 'var(--dw-text-primary)',
        }}>
          {t('pwa_install_title')}
        </p>
        <p style={{
          margin: '0 0 18px', fontFamily: 'var(--font-sans)',
          fontSize: 14, lineHeight: 1.55, color: 'var(--dw-text-secondary)',
        }}>
          {ios ? t('pwa_ios_intro') : t('pwa_browser_intro')}
        </p>
        {ios ? (
          <ol style={{
            margin: '0 0 20px', padding: 0, listStyle: 'none',
            display: 'flex', flexDirection: 'column', gap: 12,
            fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--dw-text-primary)',
          }}>
            <li style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{
                width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'var(--dw-accent-bg)', color: 'var(--dw-accent)',
              }}>
                <Share size={18} />
              </span>
              {t('pwa_ios_step1')}
            </li>
            <li style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{
                width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'var(--dw-accent-bg)', color: 'var(--dw-accent)',
              }}>
                <PlusSquare size={18} />
              </span>
              {t('pwa_ios_step2')}
            </li>
          </ol>
        ) : (
          <p style={{
            margin: '0 0 20px', fontFamily: 'var(--font-sans)',
            fontSize: 14, lineHeight: 1.55, color: 'var(--dw-text-secondary)',
          }}>
            {t('pwa_browser_menu')}
          </p>
        )}
        <button
          type="button"
          onClick={onClose}
          style={{
            width: '100%', minHeight: 44, border: 'none', borderRadius: 12,
            background: 'var(--dw-accent)', color: '#fff', cursor: 'pointer',
            fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 700,
          }}
        >
          {t('amen')}
        </button>
      </div>
    </div>
  );
}
