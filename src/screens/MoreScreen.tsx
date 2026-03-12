import { useState } from 'react';
import { Card } from '../components/Card';
import { ThemeToggle } from '../components/ThemeToggle';
import { useUser } from '../contexts/UserContext';
import { subscribePush, unsubscribePush, isPushSubscribed } from '../utils/push';

import {
  User, Globe, Bell, Type, Book, Info, Shield, Mail,
  ChevronRight, Download, Languages, Church, Loader2
} from 'lucide-react';

interface SettingsRow {
  icon: typeof User;
  label: string;
  value?: string;
  action?: () => void;
}

export function MoreScreen() {
  const { userProfile, profilePic, requireEmail, setup } = useUser();
  const [pushState, setPushState] = useState<'idle' | 'loading'>(
    'idle'
  );
  const [pushSubscribed, setPushSubscribed] = useState(isPushSubscribed);
  const [downloadingKJV, setDownloadingKJV] = useState(false);

  const displayName = userProfile?.firstName
    ? `${userProfile.firstName}${userProfile.lastName ? ' ' + userProfile.lastName : ''}`
    : 'Guest';

  const translation = localStorage.getItem('dw_translation') || 'ESV';
  const fontScale = parseFloat(localStorage.getItem('dw_fontscale') || '1');
  const fontLabel = fontScale <= 0.9 ? 'Small' : fontScale >= 1.3 ? 'Large' : 'Medium';
  const lang = localStorage.getItem('dw_lang') || 'en';
  const langLabel = lang === 'es' ? 'Español' : lang === 'pt' ? 'Português' : 'English';
  const kjvDownloaded = localStorage.getItem('dw_kjv_downloaded') === 'true';

  const campusName = userProfile?.campus
    ? (userProfile.campus.replace(/^futures-/, '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()))
    : 'Not set';

  const handlePushToggle = async () => {
    if (pushSubscribed) {
      await unsubscribePush();
      setPushSubscribed(false);
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
      // Pre-cache KJV bible files via service worker
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
        // Fetch chapter 1 to prime the cache; SW will cache on fetch
        chapters.push(`/bible/kjv/${book}/1.json`);
      }

      // Batch fetch in groups of 10
      for (let i = 0; i < chapters.length; i += 10) {
        const batch = chapters.slice(i, i + 10);
        await Promise.allSettled(batch.map(url => fetch(url)));
      }

      localStorage.setItem('dw_kjv_downloaded', 'true');
    } catch {
      // Partial download is fine — SW will cache what it can
    } finally {
      setDownloadingKJV(false);
    }
  };

  const cycleFontSize = () => {
    const current = parseFloat(localStorage.getItem('dw_fontscale') || '1');
    let next: number;
    if (current <= 0.9) next = 1;
    else if (current >= 1.3) next = 0.85;
    else next = 1.35;
    localStorage.setItem('dw_fontscale', String(next));
    document.documentElement.style.setProperty('--dw-font-scale', String(next));
    window.location.reload();
  };

  const cycleLang = () => {
    const current = localStorage.getItem('dw_lang') || 'en';
    const next = current === 'en' ? 'es' : current === 'es' ? 'pt' : 'en';
    localStorage.setItem('dw_lang', next);
    window.location.reload();
  };

  const profileRows: SettingsRow[] = [
    { icon: User, label: 'Profile', value: displayName, action: () => requireEmail() },
    { icon: Church, label: 'Campus', value: campusName },
    { icon: Mail, label: 'Email', value: userProfile?.email || 'Not set', action: () => requireEmail() },
  ];

  const preferenceRows: SettingsRow[] = [
    { icon: Globe, label: 'Translation', value: translation },
    { icon: Type, label: 'Font Size', value: fontLabel, action: cycleFontSize },
    { icon: Languages, label: 'Language', value: langLabel, action: cycleLang },
    {
      icon: Bell,
      label: 'Notifications',
      value: pushState === 'loading' ? 'Subscribing...' : pushSubscribed ? 'On' : 'Off',
      action: handlePushToggle,
    },
  ];

  const contentRows: SettingsRow[] = [
    { icon: Book, label: 'Library', value: 'Books & essays' },
    {
      icon: Download,
      label: 'Offline Bible',
      value: downloadingKJV ? 'Downloading...' : kjvDownloaded ? 'KJV — Downloaded' : 'KJV — Tap to download',
      action: handleKJVDownload,
    },
  ];

  const aboutRows: SettingsRow[] = [
    { icon: Info, label: 'About Daily Word' },
    { icon: Shield, label: 'Privacy Policy' },
  ];

  function SettingsSection({ title, rows }: { title: string; rows: SettingsRow[] }) {
    return (
      <div style={{ marginBottom: 24 }}>
        <p className="text-section-header" style={{ marginBottom: 10, paddingLeft: 4 }}>{title}</p>
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          {rows.map((row, i) => (
            <button
              key={row.label}
              onClick={row.action}
              style={{
                display: 'flex',
                alignItems: 'center',
                width: '100%',
                padding: '14px 16px',
                background: 'none',
                border: 'none',
                borderBottom: i < rows.length - 1 ? '1px solid var(--dw-border-subtle)' : 'none',
                cursor: row.action ? 'pointer' : 'default',
                color: 'var(--dw-text-primary)',
                fontFamily: 'var(--font-sans)',
                fontSize: 14,
                textAlign: 'left',
                minHeight: 48,
                transition: 'background var(--transition-fast)',
              }}
            >
              <row.icon size={18} style={{ color: 'var(--dw-text-muted)', marginRight: 12, flexShrink: 0 }} />
              <span style={{ flex: 1 }}>{row.label}</span>
              {row.value && (
                <span style={{ color: 'var(--dw-text-muted)', fontSize: 13, marginRight: 8 }}>
                  {row.value}
                </span>
              )}
              <ChevronRight size={16} style={{ color: 'var(--dw-text-faint)' }} />
            </button>
          ))}
        </Card>
      </div>
    );
  }

  return (
    <div className="screen-container">
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
            Settings
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
              style={{
                width: 72, height: 72, borderRadius: '50%',
                objectFit: 'cover', marginBottom: 10,
                border: '2px solid var(--dw-accent)',
              }}
            />
          ) : (
            <div style={{
              width: 72, height: 72, borderRadius: '50%',
              background: 'var(--dw-accent-bg)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 10, border: '2px solid var(--dw-accent)',
            }}>
              <User size={32} style={{ color: 'var(--dw-accent)' }} />
            </div>
          )}
          <p style={{ color: 'var(--dw-text-primary)', fontSize: 16, fontWeight: 500, fontFamily: 'var(--font-sans)' }}>
            {displayName}
          </p>
          {setup?.persona && (
            <p style={{ color: 'var(--dw-accent)', fontSize: 12, fontFamily: 'var(--font-sans)', marginTop: 2, textTransform: 'capitalize' }}>
              {setup.persona.replace(/_/g, ' ')}
            </p>
          )}
          <p style={{ color: 'var(--dw-text-muted)', fontSize: 13, fontFamily: 'var(--font-sans)', marginTop: 2 }}>
            {userProfile?.email || 'Tap to set up your profile'}
          </p>
        </div>

        <SettingsSection title="PROFILE" rows={profileRows} />
        <SettingsSection title="PREFERENCES" rows={preferenceRows} />
        <SettingsSection title="CONTENT" rows={contentRows} />
        <SettingsSection title="ABOUT" rows={aboutRows} />

        {/* Version */}
        <p style={{
          textAlign: 'center',
          color: 'var(--dw-text-faint)',
          fontSize: 11,
          fontFamily: 'var(--font-sans)',
          paddingBottom: 24,
        }}>
          Futures Daily Word v2.0 · Futures Church
        </p>
      </div>
    </div>
  );
}
