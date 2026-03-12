import { useState, useEffect, useRef } from 'react';
import { Card } from '../components/Card';
import { ThemeToggle } from '../components/ThemeToggle';
import { ChevronLeft, ChevronRight, Share2, Search, Loader2, MapPin, User, ChevronDown, Headphones, Pause, BookOpen } from 'lucide-react';
import { getDailyPassages, getDateString, getDailyDevotionIndex, getDailyQuoteIndex } from '../utils/daily-passages';
import { fetchPassage, fetchAudio } from '../utils/api';
import type { TranslationCode } from '../utils/api';
import { DEVOTIONS } from '../data/devotions';
import { QUOTES } from '../data/quotes';
import { COMMENTARY } from '../data/commentary';
import { CAMPUSES } from '../data/tokens';
import { useUser } from '../contexts/UserContext';

const TRANSLATIONS: TranslationCode[] = ['ESV', 'NLT', 'KJV', 'NKJV', 'NIV', 'AMP', 'NASB', 'WEB'];

const PERSONAS = [
  { id: 'new_returning', label: 'New to Faith / Returning to Faith', desc: 'Starting or reigniting your faith journey' },
  { id: 'pastor', label: 'Pastor / Leader', desc: 'Ministry and leadership' },
  { id: 'deeper', label: 'Going Deeper', desc: 'Deeper study and theology' },
  { id: 'difficult', label: 'Difficult Season', desc: 'Comfort and encouragement' },
];

/* ── Faith Pathway types ── */
interface PathwayDay {
  day: number;
  title: string;
  titleEs?: string;
  titlePt?: string;
  titleId?: string;
  theme: string;
  themeEs?: string;
  themePt?: string;
  themeId?: string;
  passages?: string[];
  reflection?: string;
}

interface PathwayData {
  title: string;
  titleEs?: string;
  titlePt?: string;
  titleId?: string;
  days: PathwayDay[];
}

interface PathwayProgress {
  completedDays: number[];
  currentDay: number;
  enrolled: boolean;
}

export function HomeScreen() {
  const { userProfile, setup, profilePic, saveProfile, saveSetup, requireEmail } = useUser();
  const [dayOffset, setDayOffset] = useState(0);
  const [translation, setTranslation] = useState<TranslationCode>(() => {
    return (localStorage.getItem('dw_translation') as TranslationCode) || 'ESV';
  });
  const [passageTexts, setPassageTexts] = useState<Record<string, string>>({});
  const [loadingPassages, setLoadingPassages] = useState<Set<string>>(new Set());
  const [expandedPassages, setExpandedPassages] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [showCampusPicker, setShowCampusPicker] = useState(false);
  const [showPersonaPicker, setShowPersonaPicker] = useState(false);

  // Faith Pathway state
  const [pathwayData, setPathwayData] = useState<PathwayData | null>(null);
  const [pathwayProgress, setPathwayProgress] = useState<PathwayProgress>(() => {
    try {
      return JSON.parse(localStorage.getItem('dw_pathway_progress') || '{}') as PathwayProgress;
    } catch { return { completedDays: [], currentDay: 1, enrolled: false }; }
  });

  // Audio state
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);
  const [audioCurrentPassage, setAudioCurrentPassage] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const currentCampus = CAMPUSES.find(c => c.id === userProfile?.campus);
  const currentPersona = PERSONAS.find(p => p.id === setup?.persona);
  const displayName = userProfile?.firstName || 'Friend';
  const lang = localStorage.getItem('dw_lang') || 'en';

  // Load Faith Pathway for new_returning persona
  useEffect(() => {
    if (setup?.persona === 'new_returning') {
      if (!pathwayProgress.enrolled) {
        const updated = { ...pathwayProgress, enrolled: true, completedDays: pathwayProgress.completedDays || [], currentDay: pathwayProgress.currentDay || 1 };
        setPathwayProgress(updated);
        try { localStorage.setItem('dw_pathway_progress', JSON.stringify(updated)); } catch {}
      }
      if (!pathwayData) {
        fetch('/books/faith-pathway.json')
          .then(r => r.json())
          .then((data: PathwayData) => setPathwayData(data))
          .catch(() => {});
      }
    }
  }, [setup?.persona]);

  const savePathwayProgress = (p: PathwayProgress) => {
    setPathwayProgress(p);
    try { localStorage.setItem('dw_pathway_progress', JSON.stringify(p)); } catch {}
  };

  const handleCampusSelect = (campusId: string) => {
    if (userProfile) {
      saveProfile({ ...userProfile, campus: campusId });
    } else {
      requireEmail(() => {});
    }
    setShowCampusPicker(false);
  };

  const handlePersonaSelect = (personaId: string) => {
    saveSetup({ persona: personaId, source: setup?.source || '' });
    setShowPersonaPicker(false);
  };

  const passages = getDailyPassages(dayOffset);
  const dateStr = getDateString(dayOffset);
  const devIndex = getDailyDevotionIndex(dayOffset);
  const quoteIndex = getDailyQuoteIndex(dayOffset, QUOTES.length);
  const devotion = DEVOTIONS[devIndex];
  const quote = QUOTES[quoteIndex];

  // Find commentary for today's primary passage
  const primaryPassage = passages[0]?.passage || '';
  const commentarySources = COMMENTARY as Record<string, Record<string, string>>;
  let commentaryText = '';
  let commentarySource = '';
  for (const [source, entries] of Object.entries(commentarySources)) {
    if (entries[primaryPassage]) {
      commentaryText = entries[primaryPassage];
      commentarySource = source;
      break;
    }
  }

  // Fetch a single passage on demand (tap to read)
  const loadPassage = (passage: string) => {
    const key = `${passage}_${translation}`;
    if (passageTexts[key]) return; // already loaded
    if (loadingPassages.has(passage)) return; // already loading

    setLoadingPassages(prev => new Set(prev).add(passage));
    fetchPassage(passage, translation)
      .then(text => {
        setPassageTexts(prev => ({ ...prev, [key]: text }));
      })
      .catch(() => {})
      .finally(() => {
        setLoadingPassages(prev => {
          const next = new Set(prev);
          next.delete(passage);
          return next;
        });
      });
  };

  // Pending audio — when user taps Listen before text is loaded
  const pendingAudioRef = useRef<string | null>(null);

  // Watch for text to arrive so we can auto-play audio
  useEffect(() => {
    if (!pendingAudioRef.current) return;
    const passage = pendingAudioRef.current;
    const key = `${passage}_${translation}`;
    if (passageTexts[key]) {
      pendingAudioRef.current = null;
      handleAudio(passage);
    }
  }, [passageTexts]);

  // Read: expand + load. Listen: expand + load + play audio when ready.
  const handleRead = (passage: string) => {
    if (!expandedPassages.has(passage)) {
      setExpandedPassages(prev => new Set(prev).add(passage));
      loadPassage(passage);
    }
  };

  const handleListen = (passage: string) => {
    const key = `${passage}_${translation}`;
    // If already playing this passage, stop
    if (audioPlaying && audioCurrentPassage === passage) {
      stopAudio();
      return;
    }
    // Expand and load if needed
    if (!expandedPassages.has(passage)) {
      setExpandedPassages(prev => new Set(prev).add(passage));
    }
    if (passageTexts[key]) {
      // Text already loaded, play immediately
      handleAudio(passage);
    } else {
      // Load text first, audio will auto-play via the useEffect above
      loadPassage(passage);
      pendingAudioRef.current = passage;
      setAudioLoading(true);
      setAudioCurrentPassage(passage);
    }
  };

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, []);

  // Reset expanded passages when day or translation changes
  useEffect(() => {
    setExpandedPassages(new Set());
    setPassageTexts({});
    stopAudio();
  }, [dayOffset, translation]);

  const handleTranslationChange = (t: TranslationCode) => {
    setTranslation(t);
    localStorage.setItem('dw_translation', t);
  };

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setAudioPlaying(false);
    setAudioUrl(null);
    setAudioCurrentPassage(null);
  };

  const handleAudio = async (passage: string) => {
    if (audioPlaying && audioCurrentPassage === passage) {
      stopAudio();
      return;
    }
    if (audioPlaying) stopAudio();

    const textKey = `${passage}_${translation}`;
    const text = passageTexts[textKey];
    if (!text) return;

    setAudioLoading(true);
    setAudioCurrentPassage(passage);
    try {
      const url = await fetchAudio(text.slice(0, 5000), translation, passage);
      if (url) {
        setAudioUrl(url);
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onended = () => {
          setAudioPlaying(false);
          setAudioUrl(null);
          setAudioCurrentPassage(null);
        };
        audio.onerror = () => {
          setAudioPlaying(false);
          setAudioUrl(null);
          setAudioCurrentPassage(null);
        };
        await audio.play();
        setAudioPlaying(true);
      }
    } catch {
      setAudioCurrentPassage(null);
    } finally {
      setAudioLoading(false);
    }
  };

  const handleShare = async (passage: string) => {
    const textKey = `${passage}_${translation}`;
    const text = passageTexts[textKey];
    const shareText = text
      ? `${passage} (${translation})\n\n${text.slice(0, 500)}\n\n— Futures Daily Word`
      : `${passage} — Futures Daily Word`;
    if (navigator.share) {
      try {
        await navigator.share({ title: passage, text: shareText });
      } catch { /* User cancelled */ }
    } else {
      await navigator.clipboard.writeText(shareText);
    }
  };

  return (
    <div className="screen-container">
      <div style={{ padding: '24px 24px 0' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div>
            <h1 style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 26,
              fontWeight: 400,
              color: 'var(--dw-text-primary)',
              letterSpacing: '-0.02em',
            }}>
              Daily Word
            </h1>
            <p style={{ color: 'var(--dw-text-muted)', fontSize: 13, marginTop: 2 }}>
              Futures Church
            </p>
          </div>
          <ThemeToggle />
        </div>

        {/* Persona Greeting */}
        <Card style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
          {profilePic ? (
            <img
              src={profilePic}
              alt="Profile"
              style={{
                width: 44, height: 44, borderRadius: '50%',
                objectFit: 'cover', flexShrink: 0,
                border: '2px solid var(--dw-accent)',
              }}
            />
          ) : (
            <div style={{
              width: 44, height: 44, borderRadius: '50%',
              background: 'var(--dw-accent-bg)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, border: '2px solid var(--dw-accent)',
            }}>
              <User size={20} style={{ color: 'var(--dw-accent)' }} />
            </div>
          )}
          <div style={{ flex: 1 }}>
            <p style={{
              color: 'var(--dw-text-primary)',
              fontSize: 15,
              fontWeight: 500,
              fontFamily: 'var(--font-sans)',
            }}>
              Welcome, {displayName}
            </p>
            <button
              onClick={() => setShowPersonaPicker(!showPersonaPicker)}
              style={{
                background: 'none', border: 'none', padding: 0,
                color: 'var(--dw-accent)', fontSize: 12,
                fontFamily: 'var(--font-sans)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 4, marginTop: 2,
              }}
            >
              {currentPersona ? currentPersona.label : 'Set your journey type'}
              <ChevronDown size={12} />
            </button>
          </div>
        </Card>

        {/* Persona Picker Dropdown */}
        {showPersonaPicker && (
          <Card style={{ marginBottom: 16, padding: 12 }}>
            <p className="text-section-header" style={{ marginBottom: 10 }}>YOUR JOURNEY</p>
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
        )}

        {/* ── FAITH PATHWAY CARD ── for new_returning persona */}
        {pathwayProgress.enrolled && pathwayData && setup?.persona === 'new_returning' && (() => {
          const completed = pathwayProgress.completedDays?.length || 0;
          const currentDay = pathwayProgress.currentDay || 1;
          const today = pathwayData.days?.find((d: PathwayDay) => d.day === currentDay);
          const totalDays = pathwayData.days?.length || 40;
          const pathTitle = lang === 'es' ? (pathwayData.titleEs || pathwayData.title)
            : lang === 'pt' ? (pathwayData.titlePt || pathwayData.title)
            : lang === 'id' ? (pathwayData.titleId || pathwayData.title)
            : pathwayData.title;

          if (completed >= totalDays) {
            return (
              <div style={{
                background: 'linear-gradient(135deg, var(--dw-accent), #8C2830)',
                color: 'white',
                padding: 20,
                borderRadius: 16,
                marginBottom: 16,
                cursor: 'pointer',
              }}>
                <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1.5, opacity: 0.9, marginBottom: 6 }}>
                  Journey Complete
                </div>
                <div style={{ fontSize: 14, opacity: 0.85 }}>
                  You've completed {pathTitle}! Start again or explore other plans.
                </div>
              </div>
            );
          }

          const todayTitle = today
            ? (lang === 'es' ? (today.titleEs || today.title)
              : lang === 'pt' ? (today.titlePt || today.title)
              : lang === 'id' ? (today.titleId || today.title)
              : today.title)
            : '';
          const todayTheme = today
            ? (lang === 'es' ? (today.themeEs || today.theme)
              : lang === 'pt' ? (today.themePt || today.theme)
              : lang === 'id' ? (today.themeId || today.theme)
              : today.theme)
            : '';

          return (
            <div
              onClick={() => {
                // Mark the current day as complete, advance to next
                if (today) {
                  const newCompleted = pathwayProgress.completedDays.includes(currentDay)
                    ? pathwayProgress.completedDays
                    : [...pathwayProgress.completedDays, currentDay];
                  const nextDay = Math.min(totalDays, Math.max(...newCompleted, currentDay) + 1);
                  savePathwayProgress({ ...pathwayProgress, completedDays: newCompleted, currentDay: nextDay });
                }
              }}
              style={{
                background: 'linear-gradient(135deg, #2c3e50, #34495e)',
                color: 'white',
                padding: 20,
                borderRadius: 16,
                marginBottom: 16,
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1.5, opacity: 0.8 }}>
                  {pathTitle}
                </div>
                <div style={{ fontSize: 11, opacity: 0.7 }}>
                  {completed} of {totalDays} completed
                </div>
              </div>
              <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 4 }}>
                Today's Lesson: {todayTitle}
              </div>
              <div style={{ fontSize: 13, opacity: 0.8, marginBottom: 12 }}>
                {todayTheme}
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.2)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{
                    width: `${(completed / totalDays) * 100}%`,
                    height: '100%',
                    background: '#D4A574',
                    borderRadius: 2,
                    transition: 'width 0.3s',
                  }} />
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#D4A574' }}>
                  Continue Journey &rarr;
                </div>
              </div>
            </div>
          );
        })()}

        {/* Date Navigation */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          margin: '20px 0',
        }}>
          <button
            onClick={() => setDayOffset(d => d - 1)}
            style={{ background: 'none', border: 'none', color: 'var(--dw-text-muted)', cursor: 'pointer', padding: 8, minHeight: 44, minWidth: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            aria-label="Previous day"
          >
            <ChevronLeft size={20} />
          </button>
          <div style={{ textAlign: 'center' }}>
            <p className="text-section-header" style={{ marginBottom: 4 }}>TODAY'S READING</p>
            <p style={{ color: 'var(--dw-text-secondary)', fontSize: 14, fontFamily: 'var(--font-sans)' }}>
              {dateStr}
            </p>
          </div>
          <button
            onClick={() => setDayOffset(d => d + 1)}
            disabled={dayOffset >= 30}
            style={{ background: 'none', border: 'none', color: dayOffset >= 30 ? 'var(--dw-text-faint)' : 'var(--dw-text-muted)', cursor: dayOffset >= 30 ? 'default' : 'pointer', padding: 8, minHeight: 44, minWidth: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            aria-label="Next day"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Translation Selector — always visible */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          marginBottom: 20,
          flexWrap: 'wrap',
        }}>
          {TRANSLATIONS.map(t => (
            <button
              key={t}
              onClick={() => handleTranslationChange(t)}
              style={{
                background: t === translation ? 'var(--dw-accent)' : 'transparent',
                color: t === translation ? '#fff' : 'var(--dw-text-muted)',
                border: t === translation ? 'none' : '1px solid var(--dw-border-subtle)',
                borderRadius: 8,
                padding: '6px 12px',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'var(--font-sans)',
                minHeight: 32,
                transition: 'all var(--transition-fast)',
              }}
            >
              {t}
            </button>
          ))}
        </div>

        {/* 1. Daily Quote */}
        <Card style={{ marginBottom: 16, borderLeft: '3px solid var(--dw-accent)' }}>
          <p style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 15,
            fontStyle: 'italic',
            color: 'var(--dw-text-secondary)',
            lineHeight: 1.6,
          }}>
            &ldquo;{quote.text}&rdquo;
          </p>
          <p style={{ color: 'var(--dw-text-muted)', fontSize: 12, marginTop: 8, fontFamily: 'var(--font-sans)' }}>
            — {quote.author}
          </p>
        </Card>

        {/* 2. Devotion of the Day */}
        <Card style={{ marginBottom: 16 }}>
          <p className="text-section-header" style={{ marginBottom: 8 }}>DEVOTION OF THE DAY</p>
          <p className="text-card-title" style={{ marginBottom: 6 }}>{devotion.title}</p>
          <p style={{ color: 'var(--dw-accent)', fontSize: 13, fontWeight: 500, fontFamily: 'var(--font-sans)', marginBottom: 12 }}>
            {devotion.verse}
          </p>
          <p className="text-devotion">{devotion.body}</p>
          <p style={{ color: 'var(--dw-text-muted)', fontSize: 12, marginTop: 10, fontFamily: 'var(--font-sans)' }}>
            — {devotion.author}
          </p>
        </Card>

        {/* 3. Scripture Search */}
        <Card style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Search size={18} style={{ color: 'var(--dw-text-muted)', flexShrink: 0 }} />
            <input
              type="text"
              placeholder="Search scripture or topic..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                flex: 1,
                background: 'none',
                border: 'none',
                outline: 'none',
                color: 'var(--dw-text-primary)',
                fontSize: 15,
                fontFamily: 'var(--font-sans)',
              }}
            />
          </div>
        </Card>

        {/* 4. Daily Passages / Chapters — TAP TO EXPAND, load one at a time */}
        <p className="text-section-header" style={{ marginBottom: 10, paddingLeft: 4 }}>TODAY'S CHAPTERS</p>
        {passages.map((p) => {
          const textKey = `${p.passage}_${translation}`;
          const text = passageTexts[textKey];
          const isLoading = loadingPassages.has(p.passage);
          const isExpanded = expandedPassages.has(p.passage);
          const isPlayingThis = audioPlaying && audioCurrentPassage === p.passage;
          const isLoadingThis = audioLoading && audioCurrentPassage === p.passage;

          return (
            <Card key={p.passage} style={{ marginBottom: 16 }}>
              {/* Passage header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <span style={{ fontSize: 20 }}>{p.sectionEmoji}</span>
                <div style={{ flex: 1 }}>
                  <p style={{
                    color: 'var(--dw-accent)',
                    fontSize: 14,
                    fontWeight: 600,
                    fontFamily: 'var(--font-sans)',
                  }}>
                    {p.passage}
                  </p>
                  <p style={{ color: 'var(--dw-text-muted)', fontSize: 11, fontFamily: 'var(--font-sans)' }}>
                    {p.sectionLabel}
                  </p>
                </div>
                {/* Share button — always visible */}
                {text && (
                  <button
                    onClick={() => handleShare(p.passage)}
                    style={{ background: 'none', border: 'none', color: 'var(--dw-text-muted)', cursor: 'pointer', padding: 4, minHeight: 36, minWidth: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    aria-label="Share"
                  >
                    <Share2 size={16} />
                  </button>
                )}
              </div>

              {/* READ + LISTEN buttons — always visible */}
              <div style={{ display: 'flex', gap: 8, marginBottom: isExpanded ? 14 : 0 }}>
                <button
                  onClick={() => handleRead(p.passage)}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    background: isExpanded ? 'var(--dw-surface-hover)' : 'var(--dw-accent-bg)',
                    color: isExpanded ? 'var(--dw-text-secondary)' : 'var(--dw-accent)',
                    border: isExpanded ? '1px solid var(--dw-border)' : '1px solid var(--dw-accent)',
                    borderRadius: 10,
                    padding: '10px 16px',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'var(--font-sans)',
                    minHeight: 42,
                    transition: 'all var(--transition-fast)',
                  }}
                >
                  <BookOpen size={16} />
                  {isExpanded ? 'Reading' : 'Read'}
                </button>
                <button
                  onClick={() => handleListen(p.passage)}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    background: isPlayingThis ? 'var(--dw-accent)' : 'var(--dw-surface-hover)',
                    color: isPlayingThis ? '#fff' : 'var(--dw-text-primary)',
                    border: isPlayingThis ? '1px solid var(--dw-accent)' : '1px solid var(--dw-border)',
                    borderRadius: 10,
                    padding: '10px 16px',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'var(--font-sans)',
                    minHeight: 42,
                    transition: 'all var(--transition-fast)',
                  }}
                >
                  {isLoadingThis ? (
                    <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Loading...</>
                  ) : isPlayingThis ? (
                    <><Pause size={16} /> Pause</>
                  ) : (
                    <><Headphones size={16} /> Listen</>
                  )}
                </button>
              </div>

              {/* Scripture text — only shown when expanded */}
              {isExpanded && (
                <div>
                  {isLoading ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 0' }}>
                      <Loader2 size={16} style={{ color: 'var(--dw-accent)', animation: 'spin 1s linear infinite' }} />
                      <span style={{ color: 'var(--dw-text-muted)', fontSize: 13 }}>Loading {translation}...</span>
                    </div>
                  ) : text ? (
                    <p className="text-scripture" style={{ fontSize: 20 }}>
                      {text}
                    </p>
                  ) : (
                    <p style={{ color: 'var(--dw-text-faint)', fontSize: 13, padding: '8px 0', fontStyle: 'italic' }}>
                      Loading...
                    </p>
                  )}
                </div>
              )}
            </Card>
          );
        })}

        {/* 5. Commentary (if available for today's passage) */}
        {commentaryText && (
          <Card style={{ marginBottom: 16 }}>
            <p className="text-section-header" style={{ marginBottom: 8 }}>COMMENTARY — {commentarySource.toUpperCase()}</p>
            <p style={{ color: 'var(--dw-text-secondary)', fontSize: 14, lineHeight: 1.65, fontFamily: 'var(--font-serif)' }}>
              {commentaryText}
            </p>
          </Card>
        )}

        {/* 6. Campus Section */}
        <Card style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: showCampusPicker ? 14 : 0 }}>
            <MapPin size={18} style={{ color: 'var(--dw-accent)', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <p className="text-section-header" style={{ marginBottom: 2 }}>YOUR CAMPUS</p>
              <p style={{
                color: 'var(--dw-text-primary)',
                fontSize: 15,
                fontWeight: 500,
                fontFamily: 'var(--font-sans)',
              }}>
                {currentCampus?.name || 'Select your campus'}
              </p>
              {currentCampus?.city && (
                <p style={{ color: 'var(--dw-text-muted)', fontSize: 12, fontFamily: 'var(--font-sans)', marginTop: 1 }}>
                  {currentCampus.city}
                </p>
              )}
            </div>
            <button
              onClick={() => setShowCampusPicker(!showCampusPicker)}
              style={{
                background: 'var(--dw-accent-bg)',
                border: '1px solid var(--dw-accent)',
                borderRadius: 8,
                padding: '8px 14px',
                color: 'var(--dw-accent)',
                fontSize: 12,
                fontWeight: 500,
                cursor: 'pointer',
                fontFamily: 'var(--font-sans)',
                minHeight: 36,
              }}
            >
              {currentCampus ? 'Change' : 'Select'}
            </button>
          </div>

          {showCampusPicker && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {['Australia', 'North America', 'Indonesia', 'Brazil', 'Other'].map(region => {
                const regionCampuses = CAMPUSES.filter(c => c.region === region);
                if (!regionCampuses.length) return null;
                return (
                  <div key={region}>
                    <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--dw-text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6, paddingLeft: 4, fontFamily: 'var(--font-sans)' }}>
                      {region}
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {regionCampuses.map(c => (
                        <button
                          key={c.id}
                          onClick={() => handleCampusSelect(c.id)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            width: '100%',
                            padding: '10px 14px',
                            background: userProfile?.campus === c.id ? 'var(--dw-accent)' : 'var(--dw-surface-hover)',
                            color: userProfile?.campus === c.id ? '#fff' : 'var(--dw-text-primary)',
                            border: 'none',
                            borderRadius: 10,
                            cursor: 'pointer',
                            fontFamily: 'var(--font-sans)',
                            fontSize: 13,
                            fontWeight: 500,
                            textAlign: 'left',
                            minHeight: 42,
                          }}
                        >
                          <MapPin size={14} style={{ opacity: 0.5, flexShrink: 0 }} />
                          <div>
                            <span style={{ fontSize: 13, fontWeight: 500 }}>{c.name}</span>
                            <span style={{ fontSize: 11, opacity: 0.6, marginLeft: 8 }}>{c.city}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Developer credit */}
        <div style={{
          textAlign: 'center',
          padding: '24px 0 12px',
          marginTop: 24,
          borderTop: '1px solid var(--dw-border-subtle)',
          opacity: 0.45,
          fontSize: 11,
          letterSpacing: 0.5,
          color: 'var(--dw-text-muted)',
        }}>
          Created &amp; Developed by Ashley Evans for Futures Church
        </div>

        {/* Bottom spacing */}
        <div style={{ height: 24 }} />
      </div>

      {/* Spinner keyframe */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
