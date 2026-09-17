// Build: 2026-03-18T10:55:15.514226
import { useState, useEffect, useRef } from 'react';
import { track } from '../utils/analytics';
import { Card } from '../components/Card';
import { ScreenHeader } from '../components/ScreenHeader';
import { SeamFooter } from '../components/Seam';
import { ThemeToggle } from '../components/ThemeToggle';
import { useUser } from '../contexts/UserContext';
import { subscribePush, unsubscribePush, isPushSubscribed, getPushHour, updatePushTime, pushSupported, openCalendarReminder } from '../utils/push';
import { pushNow, syncMisc } from '../utils/cloudSync';
import { CAMPUSES } from '../data/tokens';
import type { TranslationCode } from '../utils/api';
import { LibraryScreen } from './LibraryScreen';
import { API_BASE, staffPortalUrl } from '../utils/api-base';
import { CampusSelect } from '../components/CampusSelect';
import { useSubView } from '../utils/useSubView';
import { PromoAds } from '../components/PromoAds';
import { PWAInstallSettingsBlock } from '../components/PWAInstall';
import { PastorSignIn } from '../components/PastorSignIn';
import { StudySourcesCard } from '../components/StudySourcesCard';
import { getPastorCode, PASTOR_CODE_EVENT } from '../utils/staffIdentity';

import {
  User, Globe, Bell, Type, Info, Shield, Mail,
  Download, Languages, MapPin, Heart,
  BookOpen, Link, Music, BarChart3, MessageSquareWarning, Send, ClipboardList
} from 'lucide-react';
import { PollDashboard } from '../components/PollDashboard';
import { AnalyticsDashboard } from '../components/AnalyticsDashboard';
import { isNewChristianPersona } from '../utils/persona-config';
import { PATHS, pathFor, openChoosePath } from '../utils/choosePath';
import { PathNode } from '../components/ChoosePathSheet';
import { t, getLang } from '../utils/i18n';
import { applyLanguage } from '../utils/language';

// Bible translations filtered by selected language
const LANG_TRANSLATIONS: Record<string, TranslationCode[]> = {
  en: ['ESV', 'NLT', 'KJV', 'NKJV', 'NIV', 'AMP', 'NASB', 'WEB'],
  es: ['RV1960', 'NVI'],
  pt: ['ARA'],
  id: ['TB'],
};

// Font sizes in absolute pixels — matches HomeScreen's dw_font_size (default 15, range 13-32)
const FONT_SIZES = [
  { value: 13, labelKey: 'font_small' },
  { value: 15, labelKey: 'font_medium' },
  { value: 20, labelKey: 'font_large' },
];

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español' },
  { value: 'pt', label: 'Português' },
  { value: 'id', label: 'Bahasa Indonesia' },
];

// 12-hour label for the daily-reminder hour picker (5am–10pm).
function formatHour(h: number): string {
  const period = h < 12 ? 'AM' : 'PM';
  const hr = h % 12 === 0 ? 12 : h % 12;
  return `${hr}:00 ${period}`;
}
const REMINDER_HOURS = Array.from({ length: 18 }, (_, i) => i + 5); // 5 → 22

export function MoreScreen({ onBack }: { onBack?: () => void }) {
  const { userProfile, profilePic, requireEmail, setup, saveProfile } = useUser();
  const [lang, setLang] = useState(getLang());
  useEffect(() => { const h = () => setLang(getLang()); window.addEventListener('dw-lang-changed', h); return () => window.removeEventListener('dw-lang-changed', h); }, []);
  // Bump to re-render in place after a translation/font change — the selected-state
  // reads dw_translation / dw_font_size from localStorage per render (was a full reload).
  const [, setSettingsRev] = useState(0);

  const [pushState, setPushState] = useState<'idle' | 'loading'>('idle');
  const [pushSubscribed, setPushSubscribed] = useState(isPushSubscribed);
  const [pushHour, setPushHour] = useState(() => getPushHour());
  // Native push needs a service worker; where there's none (e.g. proxied at
  // futures.church/daily-word) the reminder is a recurring calendar event instead.
  const canPush = pushSupported();
  const [downloadingKJV, setDownloadingKJV] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [showPollDashboard, setShowPollDashboard] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [pollAdminCode, setPollAdminCode] = useState('');
  // Admin section: which row's inline code entry is open, the entered code
  // (prefilled from the remembered campus pastor code), and whether the
  // Administrator row was revealed by long-pressing the version line.
  const [adminTarget, setAdminTarget] = useState<'polls' | 'analytics' | null>(null);
  const [adminCodeInput, setAdminCodeInput] = useState<string>(() => getPastorCode());
  // The pastor sign-in card below provisions dw_pastor_code from the roster —
  // prefill the admin rows in place. Provenance matters on a shared device: a
  // prefill that came from the store is REPLACED (or cleared at sign-out) when
  // the store changes; a value the person typed themselves is left alone.
  const lastStoredCodeRef = useRef<string>(adminCodeInput);
  useEffect(() => {
    const onCode = () => {
      const stored = getPastorCode();
      setAdminCodeInput(v => (!v || v === lastStoredCodeRef.current) ? stored : v);
      lastStoredCodeRef.current = stored;
    };
    window.addEventListener(PASTOR_CODE_EVENT, onCode);
    return () => window.removeEventListener(PASTOR_CODE_EVENT, onCode);
  }, []);
  const [adminRevealed, setAdminRevealed] = useState(false);
  const adminHoldTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Back-gesture support: each full-screen sub-view owns one history entry
  // while open, so Android back / back-swipe closes it instead of leaving the tab.
  useSubView(showLibrary, () => setShowLibrary(false));
  useSubView(showPollDashboard, () => setShowPollDashboard(false));
  useSubView(showAnalytics, () => setShowAnalytics(false));

  // Re-tap of the Settings tab in the tab bar → return to the section root.
  useEffect(() => {
    const onReset = () => {
      setShowLibrary(false);
      setShowPollDashboard(false);
      setShowAnalytics(false);
      setAdminTarget(null);
      document.querySelector('.screen-container')?.scrollTo({ top: 0 });
    };
    window.addEventListener('dw-tab-reset', onReset);
    return () => window.removeEventListener('dw-tab-reset', onReset);
  }, []);

  const displayName = userProfile?.firstName
    ? `${userProfile.firstName}${userProfile.lastName ? ' ' + userProfile.lastName : ''}`
    : t('guest', getLang());

  const translation = localStorage.getItem('dw_translation') || 'ESV';
  const fontSizePx = parseInt(localStorage.getItem('dw_font_size') || '15', 10);
  const kjvDownloaded = localStorage.getItem('dw_kjv_downloaded') === 'true';
  const [chaptersPerDay, setChaptersPerDay] = useState<number>(() => {
    // Default 1 (not 3): with no stored choice, 3 queued THREE plan days as
    // "today" for every default-config user. Users who chose a cadence keep it.
    return parseInt(localStorage.getItem('dw_chapters_per_day') || '1', 10);
  });
  const [personalMediaUrl, setPersonalMediaUrl] = useState<string>(() => {
    return localStorage.getItem('dw_personal_media_url') || '';
  });
  const [userStory, setUserStory] = useState<string>(() => {
    return localStorage.getItem('dw_user_story') || '';
  });
  const [storySaved, setStorySaved] = useState(false);
  const [bugCategory, setBugCategory] = useState<string>('other');
  const [bugMessage, setBugMessage] = useState('');
  const [bugSubmitting, setBugSubmitting] = useState(false);
  const [bugSubmitted, setBugSubmitted] = useState(false);
  const campusData = CAMPUSES.find(c => c.id === userProfile?.campus);
  const currentPersona = PATHS.find(p => p.id === setup?.persona);
  const currentPath = pathFor(setup?.persona);
  const newPathSettings = isNewChristianPersona(setup?.persona);

  const handlePushToggle = async () => {
    if (pushState === 'loading') return; // guard against repeat taps stacking attempts
    if (pushSubscribed) {
      setPushState('loading');
      const ok = await unsubscribePush();
      if (ok) setPushSubscribed(false); // only flip to "off" if we actually revoked it
      setPushState('idle');
      return;
    }
    if (!userProfile?.email) { requireEmail(); return; }
    setPushState('loading');
    const success = await subscribePush(userProfile.email);
    setPushSubscribed(success);
    setPushState('idle');
  };

  const handleKJVDownload = async () => {
    if (kjvDownloaded || downloadingKJV) return;
    setDownloadingKJV(true);
    try {
      const books = ['genesis','exodus','leviticus','numbers','deuteronomy','joshua','judges','ruth',
        '1-samuel','2-samuel','1-kings','2-kings','1-chronicles','2-chronicles','ezra','nehemiah',
        'esther','job','psalms','proverbs','ecclesiastes','song-of-solomon','isaiah','jeremiah',
        'lamentations','ezekiel','daniel','hosea','joel','amos','obadiah','jonah','micah','nahum',
        'habakkuk','zephaniah','haggai','zechariah','malachi','matthew','mark','luke','john','acts',
        'romans','1-corinthians','2-corinthians','galatians','ephesians','philippians','colossians',
        '1-thessalonians','2-thessalonians','1-timothy','2-timothy','titus','philemon','hebrews',
        'james','1-peter','2-peter','1-john','2-john','3-john','jude','revelation'];

      const chapters: string[] = [];
      for (const book of books) {
        chapters.push(`/bible/kjv/${book}/1.json`);
      }
      for (let i = 0; i < chapters.length; i += 10) {
        const batch = chapters.slice(i, i + 10);
        await Promise.allSettled(batch.map(url => fetch(url)));
      }
      localStorage.setItem('dw_kjv_downloaded', 'true');
    } catch {
      // Partial download is fine
    } finally {
      setDownloadingKJV(false);
    }
  };

  const handleTranslationSelect = (t: TranslationCode) => {
    localStorage.setItem('dw_translation', t);
    localStorage.setItem('dw_translation_manual', 'true');
    track('translation_switch', t);
    setSettingsRev(r => r + 1);
    try { window.dispatchEvent(new Event('dw-translation-changed')); } catch { /* ignore */ }
  };

  const handleFontSelect = (val: number) => {
    localStorage.setItem('dw_font_size', String(val));
    setSettingsRev(r => r + 1);
    try { window.dispatchEvent(new Event('dw-font-size-changed')); } catch { /* ignore */ }
  };

  const handleLangSelect = (val: string) => {
    // Shared with the front-page LanguageSwitch: persists, broadcasts dw-lang-changed
    // (this screen re-translates in place), backs up cross-device, re-points the
    // Bible translation to the language default.
    applyLanguage(val);
  };

  const handleUserStorySave = (story: string) => {
    localStorage.setItem('dw_user_story', story);
    pushNow(); // back up "My Season" to the cloud (it syncs via the misc bag)
    setUserStory(story);
    setStorySaved(true);
    setTimeout(() => setStorySaved(false), 2000);
  };

  const handleChaptersPerDaySelect = (val: number) => {
    setChaptersPerDay(val);
    syncMisc('dw_chapters_per_day', String(val));
  };

  const handlePersonalMediaUrlChange = (url: string) => {
    setPersonalMediaUrl(url);
    syncMisc('dw_personal_media_url', url);
  };

  const handleCampusSelect = (campusId: string) => {
    if (userProfile) {
      saveProfile({ ...userProfile, campus: campusId });
    } else {
      requireEmail();
    }
  };

  // Inline replacement for the old window.prompt() flows — prompt() is
  // suppressed in some standalone PWA contexts, so pastors could never get in.
  const submitAdminCode = () => {
    const code = adminCodeInput.trim();
    if (!code || !adminTarget) return;
    if (adminTarget === 'polls') {
      setPollAdminCode(code.toUpperCase()); // campus codes are uppercase server-side
      setShowPollDashboard(true);
    } else {
      setPollAdminCode(code); // admin PIN passes through untouched
      setShowAnalytics(true);
    }
    setAdminTarget(null);
  };

  if (showLibrary) {
    return <LibraryScreen onBack={() => setShowLibrary(false)} />;
  }

  if (showPollDashboard) {
    return <PollDashboard pastorCode={pollAdminCode} onClose={() => setShowPollDashboard(false)} />;
  }

  if (showAnalytics) {
    return <AnalyticsDashboard pastorCode={pollAdminCode} onClose={() => setShowAnalytics(false)} />;
  }

  return (
    <div className="screen-container">
      <ScreenHeader title={t("settings_title", lang)} onBack={onBack} />
      <div style={{ padding: '24px 24px 0' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h1 style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 26,
            fontWeight: 400,
            color: 'var(--dw-text-primary)',
            letterSpacing: '-0.02em',
          }}>
            {t("settings_title", lang)}
          </h1>
          <ThemeToggle />
        </div>

        {/* Profile avatar */}
        <div
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 28, cursor: 'pointer' }}
          onClick={() => requireEmail()}
        >
          {profilePic ? (
            <img
              src={profilePic}
              alt="Profile"
              className={newPathSettings ? 'dw-settings-avatar-new' : undefined}
              style={{
                width: 72, height: 72, borderRadius: '50%',
                objectFit: 'cover', marginBottom: 10,
                border: `2px solid ${newPathSettings ? 'var(--dw-new)' : 'var(--dw-accent)'}`,
              }}
            />
          ) : (
            <div
              className={newPathSettings ? 'dw-settings-avatar-new' : undefined}
              style={{
                width: 72, height: 72, borderRadius: '50%',
                background: newPathSettings ? 'var(--dw-new-soft)' : 'var(--dw-accent-bg)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 10, border: `2px solid ${newPathSettings ? 'var(--dw-new)' : 'var(--dw-accent)'}`,
              }}
            >
              <User size={32} style={{ color: newPathSettings ? 'var(--dw-new)' : 'var(--dw-accent)' }} />
            </div>
          )}
          <p style={{ color: 'var(--dw-text-primary)', fontSize: 16, fontWeight: 500, fontFamily: 'var(--font-sans)' }}>
            {displayName}
          </p>
          {currentPersona && (
            <p className={newPathSettings ? 'dw-new-label' : undefined} style={{ color: newPathSettings ? 'var(--dw-new)' : 'var(--dw-accent)', fontSize: 12, fontFamily: 'var(--font-sans)', marginTop: 2 }}>
              {t(currentPersona.labelKey, lang)}
            </p>
          )}
          <p style={{ color: 'var(--dw-text-muted)', fontSize: 13, fontFamily: 'var(--font-sans)', marginTop: 2 }}>
            {userProfile?.email || t("tap_setup_profile", lang)}
          </p>
        </div>

        {/* ─── PROFILE ─── */}
        <div style={{ marginBottom: 24 }}>
          <h2 className="text-section-header" style={{ marginBottom: 10, paddingLeft: 4 }}>{t("profile", lang)}</h2>
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            <button onClick={() => requireEmail()} style={rowStyle}>
              <User size={18} style={iconStyle} />
              <span style={{ flex: 1 }}>{t("name_label", lang)}</span>
              <span style={valStyle}>{displayName}</span>
            </button>
            <div style={dividerStyle} />
            <button onClick={() => requireEmail()} style={rowStyle}>
              <Mail size={18} style={iconStyle} />
              <span style={{ flex: 1 }}>{t("email_label", lang)}</span>
              <span style={valStyle}>{userProfile?.email || t("not_set", lang)}</span>
            </button>
          </Card>
        </div>

        {/* ─── PERSONA — "Choose your path" opens the one chooser sheet (source 'settings') ─── */}
        <div style={{ marginBottom: 24 }}>
          <h2 className="text-section-header" style={{ marginBottom: 10, paddingLeft: 4 }}>
            <Heart size={12} style={{ marginRight: 6, verticalAlign: 'middle' }} />
            {t("your_journey", lang)}
          </h2>
          <Card style={{ padding: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <PathNode persona={currentPath.id} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--dw-text-primary)', fontFamily: 'var(--font-sans)', lineHeight: 1.25 }}>
                  {t(currentPath.headKey, lang)}
                </div>
                <div style={{ fontSize: 12, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)', marginTop: 3, lineHeight: 1.4 }}>
                  {t(currentPath.promiseKey, lang)}
                </div>
              </div>
            </div>
            <button
              type="button"
              aria-haspopup="dialog"
              onClick={() => openChoosePath('settings')}
              style={{
                marginTop: 12, width: '100%', minHeight: 44,
                padding: '10px 16px', borderRadius: 12,
                background: 'transparent', border: '1.5px solid var(--dw-new)',
                color: 'var(--dw-new)', fontSize: 14, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'var(--font-sans)',
              }}
            >
              {t('path_change_btn', lang)}
            </button>
          </Card>
        </div>

        {/* ─── PASTOR ACCOUNT — staff sign-in; stamps the Leader / Pastor persona above ─── */}
        <PastorSignIn lang={lang} />

        {/* ─── MY STORY ─── */}
        <div style={{ marginBottom: 24 }}>
          <h2 className="text-section-header" style={{ marginBottom: 4, paddingLeft: 4 }}>
            <User size={12} style={{ marginRight: 6, verticalAlign: 'middle' }} />
            {t("my_season", lang)}
          </h2>
          <p style={{
            fontSize: 12, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)',
            paddingLeft: 4, marginBottom: 10, lineHeight: 1.5,
          }}>
            Tell Bible AI about your life right now — season, what you're studying, what you need. This shapes every conversation.
          </p>
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            <textarea
              value={userStory}
              onChange={e => setUserStory(e.target.value)}
              placeholder={t('my_season_placeholder', lang)}
              style={{
                width: '100%', minHeight: 120,
                padding: '14px 16px',
                background: 'transparent',
                border: 'none', outline: 'none',
                color: 'var(--dw-text)',
                fontSize: 14, lineHeight: 1.7,
                fontFamily: 'var(--font-serif)',
                resize: 'none',
                boxSizing: 'border-box',
              }}
            />
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '8px 14px 12px',
              borderTop: '1px solid var(--dw-border)',
            }}>
              <span style={{ fontSize: 11, color: 'var(--dw-text-faint)', fontFamily: 'var(--font-sans)' }}>
                {userStory.length} / 600 {t("characters", lang)}
              </span>
              <button
                onClick={() => handleUserStorySave(userStory.slice(0, 600))}
                disabled={storySaved}
                style={{
                  background: storySaved ? 'var(--dw-success)' : 'var(--dw-accent)',
                  border: 'none', borderRadius: 8,
                  padding: '7px 16px', color: '#fff',
                  fontSize: 12, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'var(--font-sans)',
                  transition: 'background 0.2s',
                }}
              >
                {storySaved ? '✓ Saved' : 'Save'}
              </button>
            </div>
          </Card>
        </div>

        {/* ─── TRANSLATION ─── */}
        <div style={{ marginBottom: 24 }}>
          <h2 className="text-section-header" style={{ marginBottom: 10, paddingLeft: 4 }}>
            <Globe size={12} style={{ marginRight: 6, verticalAlign: 'middle' }} />
            {t("bible_translation", lang)}
          </h2>
          <Card style={{ padding: 12 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {(LANG_TRANSLATIONS[lang] || LANG_TRANSLATIONS['en']).map(tr => (
                <button
                  key={tr}
                  onClick={() => handleTranslationSelect(tr)}
                  style={{
                    background: tr === translation ? 'var(--dw-accent)' : 'var(--dw-surface-hover)',
                    color: tr === translation ? '#fff' : 'var(--dw-text-secondary)',
                    border: 'none', borderRadius: 10,
                    padding: '10px 18px', fontSize: 14, fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'var(--font-sans)', minHeight: 44,
                  }}
                >
                  {tr}
                </button>
              ))}
            </div>
          </Card>
        </div>

        {/* ─── CAMPUS ─── */}
        <div style={{ marginBottom: 24 }}>
          <h2 className="text-section-header" style={{ marginBottom: 10, paddingLeft: 4 }}>
            <MapPin size={12} style={{ marginRight: 6, verticalAlign: 'middle' }} />
            {t("your_campus", lang)}
          </h2>
          <Card style={{ padding: 12 }}>
            <CampusSelect value={userProfile?.campus || ''} onChange={handleCampusSelect} />
          </Card>
        </div>

        {/* ─── FONT SIZE ─── */}
        <div style={{ marginBottom: 24 }}>
          <h2 className="text-section-header" style={{ marginBottom: 10, paddingLeft: 4 }}>
            <Type size={12} style={{ marginRight: 6, verticalAlign: 'middle' }} />
            {t("font_size", lang)}
          </h2>
          <Card style={{ padding: 12 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              {FONT_SIZES.map(fs => (
                <button
                  key={fs.value}
                  onClick={() => handleFontSelect(fs.value)}
                  style={{
                    flex: 1,
                    background: fs.value === FONT_SIZES.reduce((closest, s) => Math.abs(s.value - fontSizePx) < Math.abs(closest.value - fontSizePx) ? s : closest).value ? 'var(--dw-accent)' : 'var(--dw-surface-hover)',
                    color: fs.value === FONT_SIZES.reduce((closest, s) => Math.abs(s.value - fontSizePx) < Math.abs(closest.value - fontSizePx) ? s : closest).value ? '#fff' : 'var(--dw-text-secondary)',
                    border: 'none', borderRadius: 10,
                    padding: '12px 0', fontSize: 14, fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'var(--font-sans)', minHeight: 44,
                    textAlign: 'center',
                  }}
                >
                  {t(fs.labelKey, lang)}
                </button>
              ))}
            </div>
          </Card>
        </div>

        {/* ── LANGUAGE ── */}
        <div style={{ marginBottom: 24 }}>
          <h2 className="text-section-header" style={{ marginBottom: 10, paddingLeft: 4 }}>
            <Languages size={12} style={{ marginRight: 6, verticalAlign: 'middle' }} />
            {t("language_label", lang)}
          </h2>
          <Card style={{ padding: 12 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              {LANGUAGES.map(l => (
                <button
                  key={l.value}
                  onClick={() => handleLangSelect(l.value)}
                  style={{
                    flex: 1,
                    background: lang === l.value ? 'var(--dw-accent)' : 'var(--dw-surface-hover)',
                    color: lang === l.value ? '#fff' : 'var(--dw-text-secondary)',
                    border: 'none', borderRadius: 10,
                    padding: '12px 0', fontSize: 14, fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'var(--font-sans)', minHeight: 44,
                    textAlign: 'center',
                  }}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </Card>
        </div>

        {/* ── DAILY READING ── */}
        <div style={{ marginBottom: 24 }}>
          <h2 className="text-section-header" style={{ marginBottom: 10, paddingLeft: 4 }}>
            <BookOpen size={12} style={{ marginRight: 6, verticalAlign: 'middle' }} />
            DAILY READING
          </h2>
          <Card style={{ padding: 12 }}>
            <p style={{ color: 'var(--dw-text-muted)', fontSize: 13, fontFamily: 'var(--font-sans)', marginBottom: 10 }}>
              Chapters to show on home screen each day
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              {[1, 2, 3, 4, 5].map(n => (
                <button
                  key={n}
                  onClick={() => handleChaptersPerDaySelect(n)}
                  style={{
                    flex: 1,
                    background: chaptersPerDay === n ? 'var(--dw-accent)' : 'var(--dw-surface-hover)',
                    color: chaptersPerDay === n ? '#fff' : 'var(--dw-text-secondary)',
                    border: 'none', borderRadius: 10,
                    padding: '12px 0', fontSize: 16, fontWeight: 700,
                    cursor: 'pointer', fontFamily: 'var(--font-sans)', minHeight: 48,
                    textAlign: 'center',
                  }}
                >
                  {n}
                </button>
              ))}
            </div>
          </Card>
        </div>

        {/* ── MEDIA ── */}
        <div style={{ marginBottom: 24 }}>
          <h2 className="text-section-header" style={{ marginBottom: 10, paddingLeft: 4 }}>
            <Music size={12} style={{ marginRight: 6, verticalAlign: 'middle' }} />
            MEDIA
          </h2>
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            <div
              style={{ ...rowStyle, cursor: campusData?.videoUrl ? 'pointer' : 'default' }}
              onClick={() => campusData?.videoUrl && window.open(campusData.videoUrl, '_blank')}
            >
              <Link size={18} style={iconStyle} />
              <div style={{ flex: 1 }}>
                <span style={{ display: 'block', fontWeight: 500 }}>Church Stream</span>
                <span style={{ display: 'block', fontSize: 12, color: 'var(--dw-text-muted)', marginTop: 2, wordBreak: 'break-all' }}>
                  {campusData?.videoUrl || 'Set your campus above to unlock your stream URL'}
                </span>
              </div>
              <span style={{ ...valStyle, fontSize: 11, background: 'var(--dw-surface-hover)', padding: '4px 8px', borderRadius: 6 }}>Campus only</span>
            </div>
            <div style={dividerStyle} />
            <div style={{ padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <Music size={18} style={iconStyle} />
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 500, color: 'var(--dw-text-primary)' }}>Your Media URL</span>
              </div>
              <input
                type="url"
                placeholder={t('personal_media_placeholder', lang)}
                value={personalMediaUrl}
                onChange={e => handlePersonalMediaUrlChange(e.target.value)}
                style={{
                  width: '100%',
                  background: 'var(--dw-surface)',
                  border: '1px solid var(--dw-border)',
                  borderRadius: 10,
                  padding: '12px 14px',
                  fontSize: 13,
                  fontFamily: 'var(--font-sans)',
                  color: 'var(--dw-text-primary)',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              {personalMediaUrl && (
                <a
                  href={personalMediaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    marginTop: 10,
                    padding: '8px 16px',
                    background: 'var(--dw-accent)',
                    color: '#fff',
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 600,
                    fontFamily: 'var(--font-sans)',
                    textDecoration: 'none',
                  }}
                >
                  <Link size={14} /> Open Media
                </a>
              )}
            </div>
          </Card>
        </div>

        {/* ── NOTIFICATIONS ── */}
        <div style={{ marginBottom: 24 }}>
          <h2 className="text-section-header" style={{ marginBottom: 10, paddingLeft: 4 }}>
            <Bell size={12} style={{ marginRight: 6, verticalAlign: 'middle' }} />
            {t("notifications", lang)}
          </h2>
          <Card style={{ padding: 12 }}>
            {canPush ? (
              <>
                <button
                  onClick={handlePushToggle}
                  disabled={pushState === 'loading'}
                  style={{
                    width: '100%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    background: pushSubscribed ? 'var(--dw-accent)' : 'var(--dw-surface-hover)',
                    color: pushSubscribed ? '#fff' : 'var(--dw-text-primary)',
                    border: pushSubscribed ? 'none' : '1px solid var(--dw-border)',
                    borderRadius: 10,
                    padding: '14px 16px', fontSize: 14, fontWeight: 600,
                    cursor: pushState === 'loading' ? 'default' : 'pointer', fontFamily: 'var(--font-sans)', minHeight: 48,
                    opacity: pushState === 'loading' ? 0.7 : 1,
                    textAlign: 'center', transition: 'all 0.2s ease',
                  }}
                >
                  <Bell size={16} />
                  {pushState === 'loading' ? 'Subscribing...' : pushSubscribed ? 'Push Notifications — On' : t("turn_on_push", lang)}
                </button>
                {pushSubscribed && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--dw-border)' }}>
                    <label
                      htmlFor="dw-reminder-hour"
                      style={{ display: 'block', fontSize: 13, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)', marginBottom: 8 }}
                    >
                      Daily reminder time
                    </label>
                    <select
                      id="dw-reminder-hour"
                      value={pushHour}
                      onChange={(e) => { const h = parseInt(e.target.value, 10); setPushHour(h); updatePushTime(h); }}
                      style={{
                        width: '100%', padding: '12px', borderRadius: 10, fontSize: 14,
                        fontFamily: 'var(--font-sans)', background: 'var(--dw-surface-hover)',
                        color: 'var(--dw-text-primary)', border: '1px solid var(--dw-border)',
                      }}
                    >
                      {REMINDER_HOURS.map(h => (
                        <option key={h} value={h}>{formatHour(h)}</option>
                      ))}
                    </select>
                  </div>
                )}
              </>
            ) : (
              <>
                <label
                  htmlFor="dw-cal-hour"
                  style={{ display: 'block', fontSize: 13, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)', marginBottom: 8 }}
                >
                  Daily reminder time
                </label>
                <select
                  id="dw-cal-hour"
                  value={pushHour}
                  onChange={(e) => { setPushHour(parseInt(e.target.value, 10)); }}
                  style={{
                    width: '100%', padding: '12px', borderRadius: 10, fontSize: 14, marginBottom: 12,
                    fontFamily: 'var(--font-sans)', background: 'var(--dw-surface-hover)',
                    color: 'var(--dw-text-primary)', border: '1px solid var(--dw-border)',
                  }}
                >
                  {REMINDER_HOURS.map(h => (
                    <option key={h} value={h}>{formatHour(h)}</option>
                  ))}
                </select>
                <button
                  onClick={() => openCalendarReminder(pushHour)}
                  style={{
                    width: '100%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    background: 'var(--dw-surface-hover)', color: 'var(--dw-text-primary)',
                    border: '1px solid var(--dw-border)', borderRadius: 10,
                    padding: '14px 16px', fontSize: 14, fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'var(--font-sans)', minHeight: 48,
                  }}
                >
                  <Bell size={16} /> Add to my calendar
                </button>
                <p style={{ marginTop: 10, fontSize: 12, lineHeight: 1.5, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)' }}>
                  Adds a recurring daily event to your calendar.
                </p>
                {/* Bridge to the native origin — push can never work on the church
                    proxy, so give the one pointer a real link + the same-email
                    safety rail. Never auto-redirect. */}
                <p style={{ marginTop: 8, fontSize: 12, lineHeight: 1.5, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)' }}>
                  {t('bridge_line1', lang)}{' '}
                  <a
                    href="https://futuresdailyword.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: 'var(--dw-accent)', fontWeight: 600, textDecoration: 'underline' }}
                  >
                    {t('bridge_continue', lang)}
                  </a>
                  {' — '}{t('bridge_line2', lang)}
                </p>
              </>
            )}
          </Card>
        </div>

        {/* ── LIBRARY ── */}
        <div style={{ marginBottom: 24 }}>
          <h2 className="text-section-header" style={{ marginBottom: 10, paddingLeft: 4 }}>LIBRARY</h2>
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            {/* Pass-through for one release (Ashley, 26 Aug 2026): the Library
                moved to the Read tab's Reference section; this row still opens it
                so nobody loses the path, and says where it went. */}
            <button onClick={() => setShowLibrary(true)} style={rowStyle}>
              <BookOpen size={18} style={iconStyle} />
              <span style={{ flex: 1 }}>{t('reference_title', lang)}</span>
              <span style={valStyle}>{t('now_in_read', lang)} →</span>
            </button>
          </Card>
        </div>

        {/* ── CONTENT ── */}
        <div style={{ marginBottom: 24 }}>
          <h2 className="text-section-header" style={{ marginBottom: 10, paddingLeft: 4 }}>CONTENT</h2>
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            <PWAInstallSettingsBlock rowStyle={rowStyle} iconStyle={iconStyle} valStyle={valStyle} dividerStyle={dividerStyle} />
            <button onClick={handleKJVDownload} style={rowStyle}>
              <Download size={18} style={iconStyle} />
              <span style={{ flex: 1 }}>{t("offline_bible", lang)}</span>
              <span style={valStyle}>
                {downloadingKJV ? 'Downloading...' : kjvDownloaded ? 'KJV — Downloaded' : 'KJV — Tap to download'}
              </span>
            </button>
          </Card>
        </div>

        {/* ── PASTORAL CARE (Comfort Persona Only) ── */}
        {setup?.persona === 'comfort' && (
          <div style={{ marginBottom: 24 }}>
            <h2 className="text-section-header" style={{ marginBottom: 10, paddingLeft: 4 }}>{t('pastoral_care', lang)}</h2>
            <Card style={{ padding: 16 }}>
              <div style={{ marginBottom: 14 }}>
                <p style={{
                  fontSize: 15,
                  fontWeight: 600,
                  color: 'var(--dw-text)',
                  margin: '0 0 6px',
                  fontFamily: 'var(--font-sans)',
                }}>
                  Need to talk to someone?
                </p>
                <p style={{
                  fontSize: 13,
                  color: 'var(--dw-text-secondary)',
                  margin: '0 0 12px',
                  lineHeight: 1.5,
                  fontFamily: 'var(--font-sans)',
                }}>
                  Our pastoral care team is here for you. You don't have to walk through this alone.
                </p>
              </div>
              <a
                href="mailto:care@futures.church"
                style={{
                  display: 'inline-block',
                  background: 'rgba(92,107,192,0.15)',
                  color: 'var(--dw-accent)',
                  border: '1px solid rgba(92,107,192,0.25)',
                  borderRadius: 10,
                  padding: '10px 16px',
                  fontSize: 14,
                  fontWeight: 600,
                  fontFamily: 'var(--font-sans)',
                  textDecoration: 'none',
                  marginBottom: 12,
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(92,107,192,0.25)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(92,107,192,0.15)')}
              >
                Reach Out
              </a>
              <p style={{
                fontSize: 12,
                color: 'var(--dw-text-muted)',
                margin: 0,
                fontFamily: 'var(--font-sans)',
                lineHeight: 1.5,
              }}>
                Crisis support: 988 Suicide & Crisis Lifeline (call or text 988)
              </p>
            </Card>
          </div>
        )}

        {/* ── ABOUT ── */}
        <div style={{ marginBottom: 24 }}>
          <h2 className="text-section-header" style={{ marginBottom: 10, paddingLeft: 4 }}>ABOUT</h2>
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            <div
              style={{ ...rowStyle, cursor: 'pointer' }}
              onClick={() => window.open('https://futuresdailyword.com', '_blank')}
            >
              <Info size={18} style={iconStyle} />
              <span style={{ flex: 1 }}>{t("about_daily_word", lang)}</span>
              <span style={valStyle}>v2.1</span>
            </div>
            <div style={dividerStyle} />
            <div
              style={{ ...rowStyle, cursor: 'pointer' }}
              onClick={() => window.open('https://futuresdailyword.com/privacy', '_blank')}
            >
              <Shield size={18} style={iconStyle} />
              <span style={{ flex: 1 }}>{t("privacy_policy", lang)}</span>
            </div>
            <div style={dividerStyle} />
            <div
              style={{ ...rowStyle, cursor: 'pointer' }}
              onClick={() => window.open('https://futuresdailyword.com/terms', '_blank')}
            >
              <Link size={18} style={iconStyle} />
              <span style={{ flex: 1 }}>Terms of Service</span>
            </div>
          </Card>
        </div>

        {/* ── BIBLE TRANSLATION ATTRIBUTION ── */}
        <div style={{ marginBottom: 24 }}>
          <h2 className="text-section-header" style={{ marginBottom: 10, paddingLeft: 4 }}>SCRIPTURE ATTRIBUTION</h2>
          <Card style={{ padding: 16 }}>
            <div style={{ fontSize: 11, lineHeight: 1.6, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)' }}>
              <p style={{ marginBottom: 8 }}>
                Scripture quotations marked "ESV" are from the ESV<sup>&reg;</sup> Bible (The Holy Bible, English Standard Version<sup>&reg;</sup>),
                copyright &copy; 2001 by Crossway, a publishing ministry of Good News Publishers. Used by permission. All rights reserved.
                Audio provided by ESV.org.
              </p>
              <p style={{ marginBottom: 8 }}>
                Scripture quotations marked "NLT" are taken from the Holy Bible, New Living Translation,
                copyright &copy; 1996, 2004, 2015 by Tyndale House Foundation. Used by permission of Tyndale House Publishers.
              </p>
              <p style={{ marginBottom: 8 }}>
                Scripture quotations marked "NIV" are taken from the Holy Bible, New International Version<sup>&reg;</sup>, NIV<sup>&reg;</sup>.
                Copyright &copy; 1973, 1978, 1984, 2011 by Biblica, Inc.&trade; Used by permission. All rights reserved worldwide.
              </p>
              <p style={{ marginBottom: 8 }}>
                Scripture quotations marked "NKJV" are taken from the New King James Version<sup>&reg;</sup>.
                Copyright &copy; 1982 by Thomas Nelson. Used by permission. All rights reserved.
              </p>
              <p style={{ marginBottom: 8 }}>
                Scripture quotations marked "KJV" are from the King James Version, public domain.
              </p>
              <p style={{ marginBottom: 8 }}>
                Audio narration powered by ESV.org (human reader), AWS Polly, and ElevenLabs.
                Bible text provided via ESV API, API.Bible, and Bolls.Life.
              </p>
              <p style={{ marginBottom: 0 }}>
                Greek and Hebrew word definitions: Strong&rsquo;s Greek Dictionary (James Strong, 1890, public domain;
                XML edition by Ulrik Sandborg-Petersen, CC0) and Strong&rsquo;s Hebrew Dictionary from the Open Scriptures
                Hebrew Bible Project (github.com/openscriptures/HebrewLexicon), licensed under CC BY 4.0.
                Word-level Strong&rsquo;s tagging from the World English Bible (public domain).
              </p>
            </div>
          </Card>
        </div>

        {/* ── STUDY SOURCES (pastor_leader only) ── */}
        {setup?.persona === 'pastor_leader' && <StudySourcesCard lang={lang} />}

        {/* ── REPORT A BUG ── */}
        <div style={{ marginBottom: 24 }}>
          <h2 className="text-section-header" style={{ marginBottom: 10, paddingLeft: 4 }}>
            <MessageSquareWarning size={12} style={{ marginRight: 6, verticalAlign: 'middle' }} />
            {t('report_a_bug', lang)}
          </h2>
          <Card style={{ padding: 16 }}>
            {bugSubmitted ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--dw-text-primary)', fontFamily: 'var(--font-sans)', marginBottom: 6 }}>
                  {t('bug_thank_you', lang)}
                </p>
                <p style={{ fontSize: 13, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)' }}>
                  {t('bug_received', lang)}
                </p>
              </div>
            ) : (
              <>
                <p style={{ fontSize: 13, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)', marginBottom: 14, lineHeight: 1.5 }}>
                  {t('bug_intro', lang)}
                </p>

                {/* Category pills */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
                  {(['audio', 'display', 'navigation', 'other'] as const).map(cat => (
                    <button
                      key={cat}
                      onClick={() => setBugCategory(cat)}
                      style={{
                        padding: '6px 14px', borderRadius: 20,
                        fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-sans)',
                        letterSpacing: '0.03em', textTransform: 'capitalize',
                        cursor: 'pointer', transition: 'all 0.15s',
                        border: bugCategory === cat ? '1.5px solid var(--dw-accent)' : '1.5px solid var(--dw-border)',
                        background: bugCategory === cat ? 'var(--dw-accent-bg)' : 'transparent',
                        color: bugCategory === cat ? 'var(--dw-accent)' : 'var(--dw-text-muted)',
                        minHeight: 32,
                      }}
                    >
                      {t(`bug_cat_${cat}`, lang)}
                    </button>
                  ))}
                </div>

                {/* Message */}
                <textarea
                  value={bugMessage}
                  onChange={e => setBugMessage(e.target.value.slice(0, 600))}
                  placeholder={t('bug_placeholder', lang)}
                  style={{
                    width: '100%', minHeight: 100, padding: '14px 16px',
                    resize: 'none', outline: 'none',
                    border: '1px solid var(--dw-border)',
                    borderRadius: 10,
                    background: 'var(--dw-surface)',
                    color: 'var(--dw-text-primary)',
                    fontSize: 14, lineHeight: 1.6,
                    fontFamily: 'var(--font-sans)',
                    boxSizing: 'border-box',
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                  <span style={{ fontSize: 11, color: 'var(--dw-text-faint)', fontFamily: 'var(--font-sans)' }}>
                    {bugMessage.length} / 600
                  </span>
                  <button
                    disabled={bugSubmitting || !bugMessage.trim()}
                    onClick={async () => {
                      if (!bugMessage.trim() || bugSubmitting) return;
                      setBugSubmitting(true);
                      try {
                        const profile = (() => { try { return JSON.parse(localStorage.getItem('dw_profile') || '{}'); } catch { return {}; } })();
                        await fetch(`${API_BASE}/api/bug-report`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            category: bugCategory,
                            message: bugMessage.trim(),
                            email: profile.email || null,
                            persona: setup?.persona || null,
                            campus: userProfile?.campus || null,
                            lang,
                            userAgent: navigator.userAgent,
                            screenSize: `${window.innerWidth}x${window.innerHeight}`,
                          }),
                        });
                        setBugSubmitted(true);
                        setBugMessage('');
                        setBugCategory('other');
                        setTimeout(() => setBugSubmitted(false), 5000);
                      } catch {
                        // Silent fail — user sees no change, can retry
                      }
                      setBugSubmitting(false);
                    }}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      padding: '12px 24px', borderRadius: 10,
                      fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-sans)',
                      cursor: bugSubmitting || !bugMessage.trim() ? 'default' : 'pointer',
                      border: 'none',
                      background: !bugMessage.trim() ? 'var(--dw-surface-hover)' : 'var(--dw-accent)',
                      color: !bugMessage.trim() ? 'var(--dw-text-faint)' : '#fff',
                      opacity: bugSubmitting ? 0.6 : 1,
                      transition: 'all 0.15s',
                      minHeight: 44,
                    }}
                  >
                    <Send size={13} />
                    {bugSubmitting ? t('bug_sending', lang) : t('bug_send', lang)}
                  </button>
                </div>
              </>
            )}
          </Card>
        </div>

        {/* Admin — one section: Poll Results (pastor persona) + App Analytics
            (pastor persona, or revealed by long-pressing the version line).
            The old flow used window.prompt(), which standalone PWAs can
            suppress; the code entry is now an inline field. */}
        {(setup?.persona === 'pastor_leader' || setup?.persona === 'pastor' || adminRevealed) && (
          <div style={{ marginBottom: 20 }}>
            <p style={{
              fontFamily: 'var(--font-sans)', fontSize: 10, fontWeight: 700,
              letterSpacing: '0.1em', textTransform: 'uppercase',
              color: 'var(--dw-text-muted)', marginBottom: 10, paddingLeft: 4,
            }}>{t('admin_label', lang)}</p>
            <Card style={{ padding: 0, overflow: 'hidden' }}>
              <a href={staffPortalUrl()} style={{ ...rowStyle, textDecoration: 'none', color: 'inherit' }}>
                <ClipboardList size={18} style={iconStyle} />
                <span style={{ flex: 1 }}>{t('staff_intake', lang)}</span>
                <span style={valStyle}>→</span>
              </a>
              <div style={dividerStyle} />
              {(setup?.persona === 'pastor_leader' || setup?.persona === 'pastor') && (
                <>
                  <button
                    style={rowStyle}
                    onClick={() => setAdminTarget(adminTarget === 'polls' ? null : 'polls')}
                  >
                    <BarChart3 size={18} style={iconStyle} />
                    <span style={{ flex: 1 }}>{t('poll_results', lang)}</span>
                    <span style={valStyle}>→</span>
                  </button>
                  <div style={dividerStyle} />
                </>
              )}
              <button
                style={rowStyle}
                onClick={() => setAdminTarget(adminTarget === 'analytics' ? null : 'analytics')}
              >
                <BarChart3 size={18} style={iconStyle} />
                <span style={{ flex: 1 }}>{t('app_analytics', lang)}</span>
                <span style={valStyle}>→</span>
              </button>
              {adminTarget && (
                <div style={{ padding: '4px 16px 14px' }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      type="password"
                      value={adminCodeInput}
                      onChange={e => setAdminCodeInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') submitAdminCode(); }}
                      placeholder={t('enter_pastor_or_admin_code', lang)}
                      autoFocus
                      style={{
                        flex: 1, minWidth: 0,
                        background: 'var(--dw-surface)',
                        border: '1px solid var(--dw-border)',
                        borderRadius: 10, padding: '12px 14px',
                        fontSize: 14, fontFamily: 'var(--font-sans)',
                        color: 'var(--dw-text-primary)', outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                    <button
                      onClick={submitAdminCode}
                      disabled={!adminCodeInput.trim()}
                      style={{
                        background: adminCodeInput.trim() ? 'var(--dw-accent)' : 'var(--dw-surface-hover)',
                        color: adminCodeInput.trim() ? '#fff' : 'var(--dw-text-faint)',
                        border: 'none', borderRadius: 10, padding: '0 18px',
                        fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-sans)',
                        cursor: adminCodeInput.trim() ? 'pointer' : 'default', minHeight: 44,
                      }}
                    >
                      {t('open_label', lang)}
                    </button>
                  </div>
                  <p style={{ marginTop: 8, fontSize: 11, color: 'var(--dw-text-faint)', fontFamily: 'var(--font-sans)', lineHeight: 1.4 }}>
                    {t('pastor_code_hint', lang)}
                  </p>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* Data notice */}
        <div style={{
          textAlign: 'center',
          padding: '16px 20px',
          marginBottom: 16,
          background: 'var(--dw-surface)',
          borderRadius: 10,
          border: '1px solid var(--dw-border-subtle)',
        }}>
          {/* Cloud backup shipped — the old "this device only" claim was false
              and undermined trust in the sync the app actually performs. */}
          <p style={{
            color: 'var(--dw-text-muted)',
            fontSize: 12,
            fontFamily: 'var(--font-sans)',
            lineHeight: 1.5,
          }}>
            {t('data_notice_cloud', lang)}
          </p>
        </div>

        {/* More from Futures — journal back page above the church footer,
            never under © Futures Global. */}
        <div style={{ marginLeft: -24, marginRight: -24 }}>
          <PromoAds />
        </div>

        {/* Futures Church family seam */}
        <SeamFooter />

        {/* Version — long-press reveals the Admin section for non-pastor
            personas (the App Analytics PIN entry used to clutter every user's
            settings; admins know the gesture). */}

        <p
          onPointerDown={() => {
            if (adminHoldTimer.current) clearTimeout(adminHoldTimer.current);
            adminHoldTimer.current = setTimeout(() => setAdminRevealed(true), 600);
          }}
          onPointerUp={() => { if (adminHoldTimer.current) { clearTimeout(adminHoldTimer.current); adminHoldTimer.current = null; } }}
          onPointerLeave={() => { if (adminHoldTimer.current) { clearTimeout(adminHoldTimer.current); adminHoldTimer.current = null; } }}
          onPointerCancel={() => { if (adminHoldTimer.current) { clearTimeout(adminHoldTimer.current); adminHoldTimer.current = null; } }}
          style={{
            textAlign: 'center',
            color: 'var(--dw-text-faint)',
            fontSize: 11,
            fontFamily: 'var(--font-sans)',
            paddingBottom: 24,
            userSelect: 'none',
            WebkitUserSelect: 'none',
          }}
        >
          Futures Daily Word v2.1
          <br />
          Created & Developed by Ashley Evans
        </p>
      </div>
    </div>
  );
}

/* ── Shared styles ── */
const rowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  width: '100%',
  padding: '14px 16px',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  color: 'var(--dw-text-primary)',
  fontFamily: 'var(--font-sans)',
  fontSize: 14,
  textAlign: 'left',
  minHeight: 48,
};

const iconStyle: React.CSSProperties = {
  color: 'var(--dw-text-muted)',
  marginRight: 12,
  flexShrink: 0,
};

const valStyle: React.CSSProperties = {
  color: 'var(--dw-text-muted)',
  fontSize: 13,
};

const dividerStyle: React.CSSProperties = {
  height: 1,
  background: 'var(--dw-border-subtle)',
  margin: '0 16px',
};
