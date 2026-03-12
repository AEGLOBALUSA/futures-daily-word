import { useState } from 'react';
import { Card } from '../components/Card';
import { ThemeToggle } from '../components/ThemeToggle';
import { useUser } from '../contexts/UserContext';
import { subscribePush, unsubscribePush, isPushSubscribed } from '../utils/push';
import { CAMPUSES } from '../data/tokens';
import type { TranslationCode } from '../utils/api';

import {
  User, Globe, Bell, Type, Info, Shield, Mail,
  Download, Languages, MapPin, Heart, ChevronDown,
  BookOpen, Link, Music
} from 'lucide-react';

const TRANSLATIONS: TranslationCode[] = ['ESV', 'NLT', 'KJV', 'NKJV', 'NIV', 'AMP', 'NASB', 'WEB'];

const PERSONAS = [
  { id: 'new_returning', label: 'New to Faith / Returning to Faith', desc: 'Starting or reigniting your faith journey' },
  { id: 'pastor', label: 'Pastor / Leader', desc: 'Ministry and leadership' },
  { id: 'deeper', label: 'Going Deeper', desc: 'Deeper study and theology' },
  { id: 'difficult', label: 'Difficult Season', desc: 'Comfort and encouragement' },
];

const FONT_SIZES = [
  { value: 0.85, label: 'Small' },
  { value: 1, label: 'Medium' },
  { value: 1.35, label: 'Large' },
];

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español' },
  { value: 'pt', label: 'Português' },
  { value: 'id', label: 'Bahasa Indonesia' },
];

export function MoreScreen() {
  const { userProfile, profilePic, requireEmail, setup, saveProfile, saveSetup } = useUser();
  const [pushState, setPushState] = useState<'idle' | 'loading'>('idle');
  const [pushSubscribed, setPushSubscribed] = useState(isPushSubscribed);
  const [downloadingKJV, setDownloadingKJV] = useState(false);

  const displayName = userProfile?.firstName
    ? `${userProfile.firstName}${userProfile.lastName ? ' ' + userProfile.lastName : ''}`
    : 'Guest';

  const translation = localStorage.getItem('dw_translation') || 'ESV';
  const fontScale = parseFloat(localStorage.getItem('dw_fontscale') || '1');
  const lang = localStorage.getItem('dw_lang') || 'en';
  const kjvDownloaded = localStorage.getItem('dw_kjv_downloaded') === 'true';
  const [chaptersPerDay, setChaptersPerDay] = useState<number>(() => {
    return parseInt(localStorage.getItem('dw_chapters_per_day') || '3', 10);
  });
  const [personalMediaUrl, setPersonalMediaUrl] = useState<string>(() => {
    return localStorage.getItem('dw_personal_media_url') || '';
  });
  const campusData = CAMPUSES.find(c => c.id === userProfile?.campus);
  const currentPersona = PERSONAS.find(p => p.id === setup?.persona);

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
    window.location.reload();
  };

  const handleFontSelect = (val: number) => {
    localStorage.setItem('dw_fontscale', String(val));
    document.documentElement.style.setProperty('--dw-font-scale', String(val));
    window.location.reload();
  };

  const handleLangSelect = (val: string) => {
    localStorage.setItem('dw_lang', val);
    window.location.reload();
  };

  const handlePersonaSelect = (personaId: string) => {
    saveSetup({ persona: personaId, source: setup?.source || 'settings' });
  };

  const handleChaptersPerDaySelect = (val: number) => {
    setChaptersPerDay(val);
    localStorage.setItem('dw_chapters_per_day', String(val));
  };

  const handlePersonalMediaUrlChange = (url: string) => {
    setPersonalMediaUrl(url);
    localStorage.setItem('dw_personal_media_url', url);
  };

  const handleCampusSelect = (campusId: string) => {
    if (userProfile) {
      saveProfile({ ...userProfile, campus: campusId });
    } else {
      requireEmail();
    }
  };

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
          {currentPersona && (
            <p style={{ color: 'var(--dw-accent)', fontSize: 12, fontFamily: 'var(--font-sans)', marginTop: 2 }}>
              {currentPersona.label}
            </p>
          )}
          <p style={{ color: 'var(--dw-text-muted)', fontSize: 13, fontFamily: 'var(--font-sans)', marginTop: 2 }}>
            {userProfile?.email || 'Tap to set up your profile'}
          </p>
        </div>

        {/* ─── PROFILE ─── */}
        <div style={{ marginBottom: 24 }}>
          <p className="text-section-header" style={{ marginBottom: 10, paddingLeft: 4 }}>PROFILE</p>
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            <button onClick={() => requireEmail()} style={rowStyle}>
              <User size={18} style={iconStyle} />
              <span style={{ flex: 1 }}>Name</span>
              <span style={valStyle}>{displayName}</span>
            </button>
            <div style={dividerStyle} />
            <button onClick={() => requireEmail()} style={rowStyle}>
              <Mail size={18} style={iconStyle} />
              <span style={{ flex: 1 }}>Email</span>
              <span style={valStyle}>{userProfile?.email || 'Not set'}</span>
            </button>
          </Card>
        </div>

        {/* ─── PERSONA ─── */}
        <div style={{ marginBottom: 24 }}>
          <p className="text-section-header" style={{ marginBottom: 10, paddingLeft: 4 }}>
            <Heart size={12} style={{ marginRight: 6, verticalAlign: 'middle' }} />
            YOUR JOURNEY
          </p>
          <Card style={{ padding: 12 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {PERSONAS.map(p => (
                <button
                  key={p.id}
                  onClick={() => handlePersonaSelect(p.id)}
                  style={{
                    background: setup?.persona === p.id ? 'var(--dw-accent)' : 'var(--dw-surface-hover)',
                    color: setup?.persona === p.id ? '#fff' : 'var(--dw-text-primary)',
                    border: 'none',
                    borderRadius: 10,
                    padding: '12px 16px',
                    fontSize: 14,
                    fontWeight: 500,
                    cursor: 'pointer',
                    fontFamily: 'var(--font-sans)',
                    minHeight: 44,
                    textAlign: 'left',
                  }}
                >
                  <div style={{ fontWeight: 500, marginBottom: 2 }}>{p.label}</div>
                  <div style={{ fontSize: 12, opacity: 0.7 }}>{p.desc}</div>
                </button>
              ))}
            </div>
          </Card>
        </div>

        {/* ─── TRANSLATION ─── */}
        <div style={{ marginBottom: 24 }}>
          <p className="text-section-header" style={{ marginBottom: 10, paddingLeft: 4 }}>
            <Globe size={12} style={{ marginRight: 6, verticalAlign: 'middle' }} />
            BIBLE TRANSLATION
          </p>
          <Card style={{ padding: 12 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {TRANSLATIONS.map(t => (
                <button
                  key={t}
                  onClick={() => handleTranslationSelect(t)}
                  style={{
                    background: t === translation ? 'var(--dw-accent)' : 'var(--dw-surface-hover)',
                    color: t === translation ? '#fff' : 'var(--dw-text-secondary)',
                    border: 'none', borderRadius: 10,
                    padding: '10px 18px', fontSize: 14, fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'var(--font-sans)', minHeight: 44,
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </Card>
        </div>

        {/* ─── CAMPUS ─── */}
        <div style={{ marginBottom: 24 }}>
          <p className="text-section-header" style={{ marginBottom: 10, paddingLeft: 4 }}>
            <MapPin size={12} style={{ marginRight: 6, verticalAlign: 'middle' }} />
            YOUR CAMPUS
          </p>
          <Card style={{ padding: 12 }}>
            <div style={{ position: 'relative' }}>
              <select
                value={userProfile?.campus || ''}
                onChange={e => handleCampusSelect(e.target.value)}
                style={{
                  width: '100%',
                  background: 'var(--dw-canvas)',
                  color: 'var(--dw-text-primary)',
                  border: '1px solid var(--dw-border)',
                  borderRadius: 10,
                  padding: '14px 40px 14px 16px',
                  fontSize: 14,
                  fontWeight: 500,
                  fontFamily: 'var(--font-sans)',
                  cursor: 'pointer',
                  appearance: 'none',
                  WebkitAppearance: 'none',
                  minHeight: 48,
                  outline: 'none',
                }}
              >
                <option value="">Select your campus</option>
                {['Australia', 'North America', 'Indonesia', 'Brazil', 'Other'].map(region => {
                  const regionCampuses = CAMPUSES.filter(c => c.region === region);
                  if (!regionCampuses.length) return null;
                  return (
                    <optgroup key={region} label={region}>
                      {regionCampuses.map(c => (
                        <option key={c.id} value={c.id}>{c.name} — {c.city}</option>
                      ))}
                    </optgroup>
                  );
                })}
              </select>
              <ChevronDown
                size={18}
                style={{
                  position: 'absolute',
                  right: 14,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--dw-text-muted)',
                  pointerEvents: 'none',
                }}
              />
            </div>
          </Card>
        </div>

        {/* ─── FONT SIZE ─── */}
        <div style={{ marginBottom: 24 }}>
          <p className="text-section-header" style={{ marginBottom: 10, paddingLeft: 4 }}>
            <Type size={12} style={{ marginRight: 6, verticalAlign: 'middle' }} />
            FONT SIZE
          </p>
          <Card style={{ padding: 12 }}>
            <div style={{ display: 'flex', gap: 8 }}>
           IZES.map(fs => (
                <button
                  key={fs.value}
                  onClick={() => handleFontSelect(fs.value)}
                  style={{
                    flex: 1,
                    background: Math.abs(fontScale - fs.value) < 0.1 ? 'var(--dw-accent)' : 'var(--dw-surface-hover)',
                    color: Math.abs(fontScale - fs.value) < 0.1 ? '#fff' : 'var(--dw-text-secondary)',
                    border: 'none', borderRadius: 10,
                    padding: '12px 0', fontSize: 14, fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'var(--font-sans)', minHeight: 44,
                    textAlign: 'center',
                  }}
                >
                  {fs.label}
                </button>
              ))}
            </div>
          </Card>
        </div>

        {/* ── LANGUAGE ── */}
        <div style={{ marginBottom: 24 }}>
          <p className="text-section-header" style={{ marginBottom: 10, paddingLeft: 4 }}>
            <Languages size={12} style={{ marginRight: 6, verticalAlign: 'middle' }} />
            LANGUAGE
          </p>
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
          <p className="text-section-header" style={{ marginBottom: 10, paddingLeft: 4 }}>
            <BookOpen size={12} style={{ marginRight: 6, verticalAlign: 'middle' }} />
            DAILY READING
          </p>
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
          <p className="text-section-header" style={{ marginBottom: 10, paddingLeft: 4 }}>
            <Music size={12} style={{ marginRight: 6, verticalAlign: 'middle' }} />
            MEDIA
          </p>
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            {/* Locked campus stream URL */}
            <div style={rowStyle}>
              <Link size={18} style={iconStyle} />
              <div style={{ flex: 1 }}>
                <span style={{ display: 'block', fontWeight: 500 }}>Church Stream</span>
                <span style={{ display: 'block', fontSize: 12, color: 'var(--dw-text-muted)', marginTop: 2, wordBreak: 'break-all' }}>
                  {campusData?.videoUrl || 'Set your campus to see stream URL'}
                </span>
              </div>
              <span style={{ ...valStyle, fontSize: 11, background: 'var(--dw-surface-hover)', padding: '4px 8px', borderRadius: 6 }}>Locked</span>
            </div>
            <div style={dividerStyle} />
            {/* Personal media URL */}
            <div style={{ padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <Music size={18} style={iconStyle} />
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 500, color: 'var(--dw-text-primary)' }}>Your Media URL</span>
              </div>
              <input
                type="url"
                placeholder="Paste Spotify, YouTube, or podcast link..."
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
          <p className="text-section-header" style={{ marginBottom: 10, paddingLeft: 4 }}>
            <Bell size={12} style={{ marginRight: 6, verticalAlign: 'middle' }} />
            NOTIFICATIONS
          </p>
          <Card style={{ padding: 12 }}>
            <button
              onClick={handlePushToggle}
              style={{
                width: '100%',
                background: pushSubscribed ? 'var(--dw-accent)' : 'var(--dw-surface-hover)',
                color: pushSubscribed ? '#fff' : 'var(--dw-text-primary)',
                border: 'none', borderRadius: 10,
                padding: '14px 16px', fontSize: 14, fontWeight: 500,
                cursor: 'pointer', fontFamily: 'var(--font-sans)', minHeight: 48,
                textAlign: 'center',
              }}
            >
              {pushState === 'loading' ? 'Subscribing...' : pushSubscribed ? 'Push Notifications — On' : 'Turn On Push Notifications'}
            </button>
          </Card>
        </div>

        {/* ── CONTENT ── */}
        <div style={{ marginBottom: 24 }}>
          <p className="text-section-header" style={{ marginBottom: 10, paddingLeft: 4 }}>CONTENT</p>
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            <button onClick={handleKJVDownload} style={rowStyle}>
              <Download size={18} style={iconStyle} />
              <span style={{ flex: 1 }}>Offline Bible</span>
              <span style={valStyle}>
                {downloadingKJV ? 'Downloading...' : kjvDownloaded ? 'KJV — Downloaded' : 'KJV — Tap to download'}
              </span>
            </button>
          </Card>
        </div>

        {/* ── ABOUT ── */}
        <div style={{ marginBottom: 24 }}>
          <p className="text-section-header" style={{ marginBottom: 10, paddingLeft: 4 }}>ABOUT</p>
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            <div style={rowStyle}>
              <Info size={18} style={iconStyle} />
              <span style={{ flex: 1 }}>About Daily Word</span>
              <span style={valStyle}>v2.0</span>
            </div>
            <div style={dividerStyle} />
            <div style={rowStyle}>
              <Shield size={18} style={iconStyle} />
              <span style={{ flex: 1 }}>Privacy Policy</span>
            </div>
          </Card>
        </div>

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
