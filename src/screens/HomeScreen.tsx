import { useState, useEffect, useRef } from 'react';
import { Card } from '../components/Card';
import { ThemeToggle } from '../components/ThemeToggle';
import { ChevronLeft, ChevronRight, Volume2, VolumeX, Share2, Search, BookOpen, Loader2, MapPin, User, ChevronDown, Headphones, Pause } from 'lucide-react';
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
  { id: 'new_believer', label: 'New Believer', desc: 'Just starting my faith journey' },
  { id: 'returning', label: 'Returning to Faith', desc: 'Coming back to church' },
  { id: 'pastor', label: 'Pastor / Leader', desc: 'Ministry and leadership' },
  { id: 'deeper', label: 'Going Deeper', desc: 'Deeper study and theology' },
  { id: 'worship', label: 'Worship', desc: 'Prayer and worship focused' },
  { id: 'difficult', label: 'Difficult Season', desc: 'Comfort and encouragement' },
];

export function HomeScreen() {
  const { userProfile, setup, profilePic, saveProfile, saveSetup, requireEmail } = useUser();
  const [dayOffset, setDayOffset] = useState(0);
  const [translation, setTranslation] = useState<TranslationCode>(() => {
    return (localStorage.getItem('dw_translation') as TranslationCode) || 'ESV';
  });
  const [passageTexts, setPassageTexts] = useState<Record<string, string>>({});
  const [loadingPassages, setLoadingPassages] = useState<Set<string>>(new Set());
  const [expandedPassage, setExpandedPassage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCampusPicker, setShowCampusPicker] = useState(false);
  const [showPersonaPicker, setShowPersonaPicker] = useState(false);

  // Audio state
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const currentCampus = CAMPUSES.find(c => c.id === userProfile?.campus);
  const currentPersona = PERSONAS.find(p => p.id === setup?.persona);
  const displayName = userProfile?.firstName || 'Friend';

  const handleCampusSelect = (campusId: string) => {
    if (userProfile) {
      saveProfile({ ...userProfile, campus: campusId });
    } else {
      // Need email first
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

  // Auto-fetch primary passage text on load (for hero listen button)
  useEffect(() => {
    if (!primaryPassage) return;
    const key = `${primaryPassage}_${translation}`;
    if (passageTexts[key]) return;

    fetchPassage(primaryPassage, translation)
      .then(text => {
        setPassageTexts(prev => ({ ...prev, [key]: text }));
      })
      .catch(() => {});
  }, [primaryPassage, translation]);

  // Fetch passage text when a passage is expanded
  useEffect(() => {
    if (!expandedPassage) return;
    const key = `${expandedPassage}_${translation}`;
    if (passageTexts[key]) return;

    setLoadingPassages(prev => new Set(prev).add(expandedPassage));
    fetchPassage(expandedPassage, translation)
      .then(text => {
        setPassageTexts(prev => ({ ...prev, [key]: text }));
      })
      .finally(() => {
        setLoadingPassages(prev => {
          const next = new Set(prev);
          next.delete(expandedPassage);
          return next;
        });
      });
  }, [expandedPassage, translation]);

  // Clean up audio on unmount or passage change
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [expandedPassage]);

  const handleTranslationChange = (t: TranslationCode) => {
    setTranslation(t);
    localStorage.setItem('dw_translation', t);
    setPassageTexts({});
    stopAudio();
  };

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setAudioPlaying(false);
    setAudioUrl(null);
  };

  const handleAudio = async (passage: string) => {
    // If already playing this passage, stop
    if (audioPlaying) {
      stopAudio();
      return;
    }

    const textKey = `${passage}_${translation}`;
    const text = passageTexts[textKey];
    if (!text) return;

    setAudioLoading(true);
    try {
      // For ESV, fetchAudio hits /api/esv-audio; for others, uses /api/polly-tts
      const url = await fetchAudio(text.slice(0, 3000), translation);
      if (url) {
        setAudioUrl(url);
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onended = () => {
          setAudioPlaying(false);
          setAudioUrl(null);
        };
        audio.onerror = () => {
          setAudioPlaying(false);
          setAudioUrl(null);
        };
        await audio.play();
        setAudioPlaying(true);
      }
    } catch {
      // Audio not available
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
      } catch {
        // User cancelled
      }
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

        {/* Date Navigation */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          margin: '20px 0',
        }}>
          <button
            onClick={() => { setDayOffset(d => d - 1); setExpandedPassage(null); stopAudio(); }}
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
            onClick={() => { setDayOffset(d => d + 1); setExpandedPassage(null); stopAudio(); }}
            disabled={dayOffset >= 30}
            style={{ background: 'none', border: 'none', color: dayOffset >= 30 ? 'var(--dw-text-faint)' : 'var(--dw-text-muted)', cursor: dayOffset >= 30 ? 'default' : 'pointer', padding: 8, minHeight: 44, minWidth: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            aria-label="Next day"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Hero Listen Button — Audio First */}
        <button
          onClick={() => handleAudio(primaryPassage)}
          disabled={audioLoading}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            background: audioPlaying ? 'var(--dw-surface)' : 'var(--dw-accent)',
            color: audioPlaying ? 'var(--dw-accent)' : '#fff',
            border: audioPlaying ? '2px solid var(--dw-accent)' : '2px solid transparent',
            borderRadius: 14,
            padding: '16px 24px',
            fontSize: 16,
            fontWeight: 600,
            fontFamily: 'var(--font-sans)',
            cursor: 'pointer',
            minHeight: 56,
            marginBottom: 8,
            transition: 'all var(--transition-normal)',
          }}
        >
          {audioLoading ? (
            <>
              <Loader2 size={22} style={{ animation: 'spin 1s linear infinite' }} />
              Loading audio...
            </>
          ) : audioPlaying ? (
            <>
              <Pause size={22} />
              Pause — {primaryPassage}
            </>
          ) : (
            <>
              <Headphones size={22} />
              Listen to Today's Reading
            </>
          )}
        </button>

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
            "{quote.text}"
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

        {/* 4. Daily Passages / Chapters */}
        <p className="text-section-header" style={{ marginBottom: 10, paddingLeft: 4 }}>TODAY'S CHAPTERS</p>
        {passages.map((p) => {
          const isExpanded = expandedPassage === p.passage;
          const textKey = `${p.passage}_${translation}`;
          const text = passageTexts[textKey];
          const isLoading = loadingPassages.has(p.passage);

          return (
            <Card
              key={p.passage}
              style={{ marginBottom: 12, cursor: 'pointer' }}
              onClick={() => { setExpandedPassage(isExpanded ? null : p.passage); if (!isExpanded) stopAudio(); }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: isExpanded ? 16 : 0 }}>
                <span style={{ fontSize: 20 }}>{p.sectionEmoji}</span>
                <div style={{ flex: 1 }}>
                  <p style={{
                    color: 'var(--dw-accent)',
                    fontSize: 14,
                    fontWeight: 500,
                    fontFamily: 'var(--font-sans)',
                  }}>
                    {p.passage}
                  </p>
                  <p style={{ color: 'var(--dw-text-muted)', fontSize: 11, fontFamily: 'var(--font-sans)' }}>
                    {p.sectionLabel}
                  </p>
                </div>
                <BookOpen size={16} style={{ color: 'var(--dw-text-faint)' }} />
              </div>

              {isExpanded && (
                <div>
                  {isLoading ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '16px 0' }}>
                      <Loader2 size={16} style={{ color: 'var(--dw-accent)', animation: 'spin 1s linear infinite' }} />
                      <span style={{ color: 'var(--dw-text-muted)', fontSize: 13 }}>Loading {translation}...</span>
                    </div>
                  ) : text ? (
                    <div>
                      <p className="text-scripture" style={{ fontSize: 22, marginBottom: 12 }}>
                        {text}
                      </p>
                      <div style={{ display: 'flex', gap: 12 }}>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleAudio(p.passage); }}
                          style={{
                            background: 'none', border: 'none',
                            color: audioPlaying ? 'var(--dw-accent)' : 'var(--dw-text-muted)',
                            cursor: 'pointer', padding: 4, minHeight: 44, minWidth: 44,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}
                          aria-label={audioPlaying ? 'Stop audio' : 'Listen'}
                        >
                          {audioLoading ? (
                            <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                          ) : audioPlaying ? (
                            <VolumeX size={18} />
                          ) : (
                            <Volume2 size={18} />
                          )}
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleShare(p.passage); }}
                          style={{ background: 'none', border: 'none', color: 'var(--dw-text-muted)', cursor: 'pointer', padding: 4, minHeight: 44, minWidth: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          aria-label="Share"
                        >
                          <Share2 size={18} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p style={{ color: 'var(--dw-text-muted)', fontSize: 13, padding: '8px 0' }}>
                      Tap to load passage in {translation}
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

        {/* Bottom spacing */}
        <div style={{ height: 24 }} />
      </div>

      {/* Spinner keyframe */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
