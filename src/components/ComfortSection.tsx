/**
 * ComfortSection — the auto-served "A Word For You Today" comfort-reading flow,
 * extracted from HomeScreen. Shown only for the comfort persona. Owns its own
 * comfort state; shares the passage cache + audio playback with HomeScreen via props.
 */
import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { Loader2, Pause, Headphones, BookOpen } from 'lucide-react';
import { Card } from './Card';
import { ScripturePassage } from './ScripturePassage';
import { AudioWave } from './AudioWave';
import { COMFORT_CHAPTERS, COMFORT_DEVOTIONS } from '../data/comfort';
import { tField } from '../utils/i18n';
import { syncMisc } from '../utils/cloudSync';
import type { TranslationCode } from '../utils/api';

interface ComfortSectionProps {
  translation: TranslationCode;
  translations: TranslationCode[];
  handleTranslationChange: (t: TranslationCode) => void;
  lang: string;
  t: (key: string) => string;
  passageTexts: Record<string, string>;
  loadingPassages: Set<string>;
  loadPassage: (passage: string) => void;
  audioPlaying: boolean;
  audioLoading: boolean;
  audioCurrentPassage: string | null;
  handleListen: (passage: string) => void;
  renderScripture: (text: string, passage: string) => ReactNode;
  greekHebrewMode: boolean;
  scriptureFontSize: number;
}

export function ComfortSection({
  translation, translations, handleTranslationChange, lang, t,
  passageTexts, loadingPassages, loadPassage,
  audioPlaying, audioLoading, audioCurrentPassage, handleListen,
  renderScripture, greekHebrewMode, scriptureFontSize,
}: ComfortSectionProps) {
  const [comfortChapterIndex, setComfortChapterIndex] = useState<number>(() => {
    return Math.floor(Date.now() / 86400000) % COMFORT_CHAPTERS.length;
  });
  const [comfortChaptersServed, setComfortChaptersServed] = useState(0);
  const [comfortPostRead, setComfortPostRead] = useState<null | 'devotion' | 'ask_more' | 'ask_lock' | 'done'>(null);
  const [comfortDailyAmount, setComfortDailyAmount] = useState<number>(() => {
    try { return parseInt(localStorage.getItem('dw_comfort_daily') || '0', 10) || 0; } catch { return 0; }
  });

  // Auto-load the current comfort chapter (this component only mounts for the comfort persona).
  useEffect(() => {
    const passage = COMFORT_CHAPTERS[comfortChapterIndex % COMFORT_CHAPTERS.length];
    if (passage) loadPassage(passage);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comfortChapterIndex, translation]);

          const comfortPassage = COMFORT_CHAPTERS[comfortChapterIndex % COMFORT_CHAPTERS.length];
          const comfortTKey = `${comfortPassage}_${translation}`;
          const comfortText = passageTexts[comfortTKey];
          const comfortIsLoading = loadingPassages.has(comfortPassage);
          const comfortIsPlaying = audioPlaying && audioCurrentPassage === comfortPassage;
          const comfortIsLoadingAudio = audioLoading && audioCurrentPassage === comfortPassage;

          return (
            <div style={{ marginBottom: 16 }}>
              {/* Current comfort chapter — auto-loaded */}
              <Card style={{ marginBottom: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <h2 className="text-section-header" style={{ margin: 0 }}>A WORD FOR YOU TODAY</h2>
                  <span style={{ fontSize: 11, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)' }}>
                    Take your time
                  </span>
                </div>

                {/* Translation picker — simple, 3 options */}
                <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
                  {translations.map(t => (
                    <button
                      key={t}
                      onClick={() => handleTranslationChange(t)}
                      style={{
                        padding: '5px 12px', borderRadius: 20,
                        fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-sans)',
                        letterSpacing: '0.04em', cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        border: t === translation ? '1.5px solid var(--dw-slate-fill)' : '1.5px solid var(--dw-border)',
                        background: t === translation ? 'var(--dw-slate-fill)' : 'transparent',
                        color: t === translation ? '#fff' : 'var(--dw-text-muted)',
                      }}
                    >
                      {t}
                    </button>
                  ))}
                </div>

                {/* Chapter heading + listen */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <p style={{ fontWeight: 700, fontSize: 17, color: 'var(--dw-text-primary)', fontFamily: 'var(--font-sans)', margin: 0 }}>
                    {comfortPassage}
                  </p>
                  <button
                    onClick={() => handleListen(comfortPassage)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      background: comfortIsPlaying ? '#4A6070' : 'var(--dw-slate-fill)',
                      border: 'none', borderRadius: 10, padding: '8px 14px',
                      fontSize: 13, fontWeight: 600, cursor: 'pointer',
                      color: '#fff', fontFamily: 'var(--font-sans)',
                    }}
                  >
                    {comfortIsLoadingAudio ? (
                      <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Loading…</>
                    ) : comfortIsPlaying ? (
                      <><AudioWave height={14} color="#fff" /> <Pause size={14} /> Pause</>
                    ) : (
                      <><Headphones size={14} /> Listen</>
                    )}
                  </button>
                </div>

                {/* Scripture text — auto-loaded */}
                {comfortIsLoading ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 0' }}>
                    <Loader2 size={14} style={{ color: 'var(--dw-slate)', animation: 'spin 1s linear infinite' }} />
                    <span style={{ fontSize: 14, color: 'var(--dw-text-muted)', fontStyle: 'italic', fontFamily: 'var(--font-sans)' }}>Loading…</span>
                  </div>
                ) : comfortText ? (
                  <ScripturePassage
                    text={comfortText}
                    passageRef={comfortPassage}
                    renderScripture={renderScripture}
                    greekHebrewMode={greekHebrewMode}
                    fontSize={scriptureFontSize}
                  />
                ) : (
                  <button
                    onClick={() => loadPassage(comfortPassage)}
                    style={{
                      background: 'rgba(92,107,192,0.1)', border: '1px solid var(--dw-slate-fill)',
                      borderRadius: 10, padding: '10px 16px', fontSize: 13, fontWeight: 600,
                      cursor: 'pointer', color: 'var(--dw-slate)', fontFamily: 'var(--font-sans)',
                      display: 'flex', alignItems: 'center', gap: 6,
                    }}
                  >
                    <BookOpen size={16} /> Read {comfortPassage}
                  </button>
                )}

                {/* Sit with this — gentle reflection */}
                {comfortText && comfortPostRead === null && (
                  <div style={{
                    marginTop: 16, padding: '14px 16px',
                    background: 'linear-gradient(135deg, rgba(92,107,192,0.08) 0%, rgba(92,107,192,0.03) 100%)',
                    borderRadius: 10,
                    border: '1px solid rgba(92,107,192,0.12)',
                    textAlign: 'center',
                  }}>
                    <p style={{ fontSize: 14, color: 'var(--dw-text-secondary)', fontFamily: 'var(--font-serif-text, Georgia, serif)', margin: '0 0 14px', fontStyle: 'italic' }}>
                      Which words brought you the most peace?
                    </p>
                    <button
                      className="dw-btn-dark"
                      onClick={() => {
                        setComfortChaptersServed(prev => prev + 1);
                        setComfortPostRead('devotion');
                      }}
                      style={{
                        background: 'var(--dw-slate-fill)', border: 'none', borderRadius: 10,
                        padding: '10px 20px', fontSize: 14, fontWeight: 600,
                        cursor: 'pointer', color: '#fff', fontFamily: 'var(--font-sans)',
                      }}
                    >
                      I've finished reading
                    </button>
                  </div>
                )}
              </Card>

              {/* Post-read devotion — encouraging reflection from the chapter */}
              {comfortPostRead === 'devotion' && (() => {
                const devotion = COMFORT_DEVOTIONS[comfortPassage];
                if (!devotion) {
                  // No devotion for this chapter, skip to ask_more
                  setComfortPostRead(comfortChaptersServed >= 2 ? 'ask_lock' : 'ask_more');
                  return null;
                }
                return (
                  <Card style={{
                    marginTop: 12,
                    padding: '20px 18px',
                    background: 'linear-gradient(135deg, rgba(92,107,192,0.06) 0%, rgba(92,107,192,0.02) 100%)',
                    border: '1px solid rgba(92,107,192,0.12)',
                  }}>
                    <p style={{
                      fontSize: 11, fontWeight: 600, letterSpacing: '0.08em',
                      textTransform: 'uppercase', color: 'var(--dw-slate)',
                      fontFamily: 'var(--font-sans)', marginBottom: 10,
                    }}>
                      A THOUGHT FROM THIS CHAPTER
                    </p>
                    <p style={{
                      fontSize: 17, fontWeight: 700, color: 'var(--dw-text-primary)',
                      fontFamily: 'var(--font-serif)', marginBottom: 10, lineHeight: 1.4,
                    }}>
                      {tField(devotion, 'title', lang)}
                    </p>
                    <p style={{
                      fontSize: 15, lineHeight: 1.75, color: 'var(--dw-text-secondary)',
                      fontFamily: 'var(--font-serif-text, Georgia, serif)',
                      margin: '0 0 16px',
                    }}>
                      {tField(devotion, 'body', lang)}
                    </p>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14 }}>
                    </div>
                    <button
                      className="dw-btn-dark"
                      onClick={() => setComfortPostRead(comfortChaptersServed >= 2 ? 'ask_lock' : 'ask_more')}
                      style={{
                        width: '100%', padding: '12px 16px', borderRadius: 10,
                        background: 'var(--dw-slate-fill)', border: 'none',
                        fontSize: 14, fontWeight: 600, cursor: 'pointer',
                        color: '#fff', fontFamily: 'var(--font-sans)',
                      }}
                    >
                      Continue
                    </button>
                  </Card>
                );
              })()}

              {/* Post-read flow — gentle multiple choice */}
              {comfortPostRead === 'ask_more' && (
                <Card style={{ marginTop: 12, textAlign: 'center', padding: '20px 16px' }}>
                  <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--dw-text-primary)', fontFamily: 'var(--font-sans)', marginBottom: 14 }}>
                    Would you like to read another passage from God's Word?
                  </p>
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                    <button
                      className="dw-btn-dark"
                      onClick={() => {
                        setComfortChapterIndex(prev => (prev + 1) % COMFORT_CHAPTERS.length);
                        setComfortPostRead(null);
                      }}
                      style={{
                        padding: '10px 20px', borderRadius: 10,
                        background: 'var(--dw-slate-fill)', border: 'none',
                        fontSize: 14, fontWeight: 600, cursor: 'pointer',
                        color: '#fff', fontFamily: 'var(--font-sans)',
                      }}
                    >
                      Yes, keep going
                    </button>
                    <button
                      onClick={() => setComfortPostRead('done')}
                      style={{
                        padding: '10px 20px', borderRadius: 10,
                        background: 'var(--dw-surface)', border: '1px solid var(--dw-border)',
                        fontSize: 14, fontWeight: 600, cursor: 'pointer',
                        color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)',
                      }}
                    >
                      That's enough for today
                    </button>
                  </div>
                </Card>
              )}

              {comfortPostRead === 'ask_lock' && (
                <Card style={{ marginTop: 12, textAlign: 'center', padding: '20px 16px' }}>
                  <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--dw-text-primary)', fontFamily: 'var(--font-sans)', marginBottom: 6 }}>
                    You're doing great.
                  </p>
                  <p style={{ fontSize: 13, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)', marginBottom: 16, lineHeight: 1.5 }}>
                    Would you like to set a daily reading amount so we can have something ready for you each day?
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 260, margin: '0 auto' }}>
                    {[
                      { n: 1, label: t('chapters_1'), sub: t('chapters_1_desc') },
                      { n: 2, label: t('chapters_2'), sub: t('chapters_2_desc') },
                      { n: 3, label: t('chapters_3'), sub: t('chapters_3_desc') },
                    ].map(opt => (
                      <button
                        key={opt.n}
                        onClick={() => {
                          setComfortDailyAmount(opt.n);
                          syncMisc('dw_comfort_daily', String(opt.n));
                          setComfortPostRead('done');
                        }}
                        style={{
                          padding: '12px 16px', borderRadius: 10,
                          background: 'var(--dw-surface)', border: '1px solid var(--dw-border)',
                          cursor: 'pointer', textAlign: 'left',
                        }}
                      >
                        <p style={{ fontWeight: 600, fontSize: 14, color: 'var(--dw-text-primary)', fontFamily: 'var(--font-sans)', margin: 0 }}>{opt.label}</p>
                        <p style={{ fontSize: 12, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)', margin: '2px 0 0' }}>{opt.sub}</p>
                      </button>
                    ))}
                    <button
                      className="dw-btn-dark"
                      onClick={() => {
                        setComfortChapterIndex(prev => (prev + 1) % COMFORT_CHAPTERS.length);
                        setComfortPostRead(null);
                      }}
                      style={{
                        padding: '10px 16px', borderRadius: 10,
                        background: 'var(--dw-slate-fill)', border: 'none',
                        fontSize: 14, fontWeight: 600, cursor: 'pointer',
                        color: '#fff', fontFamily: 'var(--font-sans)',
                      }}
                    >
                      Just give me one more for now
                    </button>
                    <button
                      onClick={() => setComfortPostRead('done')}
                      style={{
                        padding: '8px 16px', borderRadius: 10,
                        background: 'transparent', border: 'none',
                        fontSize: 13, cursor: 'pointer',
                        color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)',
                      }}
                    >
                      I'm good for today
                    </button>
                  </div>
                </Card>
              )}

              {comfortPostRead === 'done' && (
                <Card style={{ marginTop: 12, textAlign: 'center', padding: '16px' }}>
                  <p style={{ fontSize: 14, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)', margin: 0, fontStyle: 'italic' }}>
                    {comfortDailyAmount > 0
                      ? `You're set for ${comfortDailyAmount} chapter${comfortDailyAmount > 1 ? 's' : ''} a day. We'll have something ready for you tomorrow.`
                      : 'God is with you. Come back whenever you need Him.'}
                  </p>
                </Card>
              )}
            </div>
          );
}
