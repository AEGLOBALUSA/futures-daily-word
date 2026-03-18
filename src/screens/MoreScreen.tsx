// Build: 2026-03-18T10:55:15.514226
import { useState } from 'react';
import { Card } from '../components/Card';
import { ThemeToggle } from '../components/ThemeToggle';
import { useUser } from '../contexts/UserContext';
import { subscribePush, unsubscribePush, isPushSubscribed } from '../utils/push';
import { CAMPUSES } from '../data/tokens';
import type { TranslationCode } from '../utils/api';
import { LibraryScreen } from './LibraryScreen';

import {
  User, Globe, Bell, Type, Info, Shield, Mail,
  Download, Languages, MapPin, Heart, ChevronDown,
  BookOpen, Link, Music, BarChart3
} from 'lucide-react';
import { PollDashboard } from '../components/PollDashboard';
import { ALL_PERSONAS, PERSONA_CONFIGS } from '../utils/persona-config';

const TRANSLATIONS: TranslationCode[] = ['ESV', 'NLT', 'KJV', 'NKJV', 'NIV', 'AMP', 'NASB', 'WEB'];

const PERSONAS = ALL_PERSONAS.map(id => ({
  id,
  label: PERSONA_CONFIGS[id].label,
  desc: PERSONA_CONFIGS[id].description,
}));

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
  const [showLibrary, setShowLibrary] = useState(false);
  const [showPollDashboard, setShowPollDashboard] = useState(false);
  const [pollAdminCode, setPollAdminCode] = useState('');

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
  const [userStory, setUserStory] = useState<string>(() => {
    return localStorage.getItem('dw_user_story') || '';
  });
  const [storySaved, setStorySaved] = useState(false);
  const [pendingPersona, setPendingPersona] = useState<string | null>(null);
  const [personaSaved, setPersonaSaved] = useState(false);
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
    localStorage.setItem('dw_translation_manual', 'true');
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

  const handleUserStorySave = (story: string) => {
    localStorage.setItem('dw_user_story', story);
    setUserStory(story);
    setStorySaved(true);
    setTimeout(() => setStorySaved(false), 2000);
  };

  const handlePersonaSelect = (personaId: string) => {
    // If they tap the already-active persona, do nothing
    if (personaId === setup?.persona && !pendingPersona) return;
    setPendingPersona(personaId);
    setPersonaSaved(false);
  };

  const handlePersonaSave = () => {
    if (!pendingPersona) return;
    saveSetup({ persona: pendingPersona, source: setup?.source || 'settings' });
    setPersonaSaved(true);
    setPendingPersona(null);
    setTimeout(() => setPersonaSaved(false), 2500);
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

  if (showLibrary) {
    return <LibraryScreen onBack={() => setShowLibrary(false)} />;
  }

  if (showPollDashboard) {
    return <PollDashboard pastorCode={pollAdminCode} onClose={() => setShowPollDashboard(false)} />;
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
              {PERSONAS.map(p => {
                const isActive = setup?.persona === p.id && !pendingPersona;
                const isPending = pendingPersona === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => handlePersonaSelect(p.id)}
                    style={{
                      background: isActive ? 'var(--dw-accent)' : isPending ? '#9A7B2E' : 'var(--dw-surface-hover)',
                      color: isActive || isPending ? '#fff' : 'var(--dw-text-primary)',
                      border: isPending ? '2px solid #9A7B2E' : 'none',
                      borderRadius: 10,
                      padding: '12px 16px',
                      fontSize: 14,
                      fontWeight: 500,
                      cursor: 'pointer',
                      fontFamily: 'var(--font-sans)',
                      minHeight: 44,
                      textAlign: 'left',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <div style={{ fontWeight: 500, marginBottom: 2 }}>{p.label}</div>
                    <div style={{ fontSize: 12, opacity: 0.7 }}>{p.desc}</div>
                  </button>
                );
              })}
            </div>
            {/* Save button — appears when a new persona is selected */}
            {pendingPersona && pendingPersona !== setup?.persona && (
              <button
                onClick={handlePersonaSave}
                style={{
                  marginTop: 10, width: '100%',
                  padding: '12px 16px', borderRadius: 10,
                  background: '#9A7B2E', border: 'none',
                  fontSize: 15, fontWeight: 700,
                  cursor: 'pointer', color: '#fff',
                  fontFamily: 'var(--font-sans)',
                  transition: 'all 0.2s ease',
                }}
              >
                Save & Apply
              </button>
            )}
            {personaSaved && (
              <p style={{
                marginTop: 8, textAlign: 'center',
                fontSize: 13, fontWeight: 600,
                color: '#4CAF50', fontFamily: 'var(--font-sans)',
              }}>
                Saved! Your experience has been updated.
              </p>
            )}
          </Card>
        </div>

        {/* ─── MY STORY ─── */}
        <div style={{ marginBottom: 24 }}>
          <p className="text-section-header" style={{ marginBottom: 4, paddingLeft: 4 }}>
            <User size={12} style={{ marginRight: 6, verticalAlign: 'middle' }} />
            MY SEASON &amp; CONTEXT
          </p>
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
              placeholder={"E.g. I'm walking through grief after losing my father. I lead a small group studying Paul's letters. I'm preparing a sermon series on prayer. I'm new to Christianity and want to understand the Gospels…"}
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
                {userStory.length} / 600 characters
              </span>
              <button
                onClick={() => handleUserStorySave(userStory.slice(0, 600))}
                disabled={storySaved}
                style={{
                  background: storySaved ? '#2563EB' : 'var(--dw-accent)',
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
              {FONT_SIZES.map(fs => (
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
            <div style={rowStyle}>
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

        {/* ── LIBRARY ── */}
        <div style={{ marginBottom: 24 }}>
          <p className="text-section-header" style={{ marginBottom: 10, paddingLeft: 4 }}>LIBRARY</p>
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            <button onClick={() => setShowLibrary(true)} style={rowStyle}>
              <BookOpen size={18} style={iconStyle} />
              <span style={{ flex: 1 }}>Essays &amp; Bible Resources</span>
              <span style={valStyle}>→</span>
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

        {/* ── PASTORAL CARE (Comfort Persona Only) ── */}
        {setup?.persona === 'comfort' && (
          <div style={{ marginBottom: 24 }}>
            <p className="text-section-header" style={{ marginBottom: 10, paddingLeft: 4 }}>PASTORAL CARE</p>
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
          <p className="text-section-header" style={{ marginBottom: 10, paddingLeft: 4 }}>ABOUT</p>
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            <div style={rowStyle}>
              <Info size={18} style={iconStyle} />
              <span style={{ flex: 1 }}>About Daily Word</span>
              <span style={valStyle}>v2.1</span>
            </div>
            <div style={dividerStyle} />
            <div style={rowStyle}>
              <Shield size={18} style={iconStyle} />
              <span style={{ flex: 1 }}>Privacy Policy</span>
            </div>
          </Card>
        </div>

        {/* Admin — Poll Results */}
        {(setup?.persona === 'pastor_leader' || setup?.persona === 'pastor') && (
          <div style={{ marginBottom: 20 }}>
            <p style={{
              fontFamily: 'var(--font-sans)', fontSize: 10, fontWeight: 700,
              letterSpacing: '0.1em', textTransform: 'uppercase',
              color: 'var(--dw-text-muted)', marginBottom: 10, paddingLeft: 4,
            }}>ADMIN</p>
            <Card>
              <div
                style={rowStyle}
                onClick={() => {
                  const code = prompt('Enter admin code:');
                  if (code) {
                    setPollAdminCode(code.trim().toUpperCase());
                    setShowPollDashboard(true);
                  }
                }}
              >
                <BarChart3 size={18} style={iconStyle} />
                <span style={{ flex: 1 }}>Poll Results</span>
              </div>
            </Card>
          </div>
        )}

        {/* Version */}
        <p style={{
          textAlign: 'center',
          color: 'var(--dw-text-faint)',
          fontSize: 11,
          fontFamily: 'var(--font-sans)',
          paddingBottom: 24,
        }}>
          Futures Daily Word v2.1  -  Futures Church
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
