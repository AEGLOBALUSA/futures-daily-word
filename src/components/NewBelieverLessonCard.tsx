/**
 * NewBelieverLessonCard — the Faith-Pathway day lesson card shown for the
 * new_to_faith persona (replaces the devotion). Extracted from HomeScreen. Pure
 * render reading HomeScreen state via props; plan completion routes through the
 * savePathwayProgress callback.
 */
import type { ReactNode } from 'react';
import { Share2, Loader2, Pause, Headphones, BookOpen } from 'lucide-react';
import { Card } from './Card';
import { ScripturePassage } from './ScripturePassage';
import { AudioWave } from './AudioWave';
import { shareContent } from '../utils/share';
import type { TranslationCode } from '../utils/api';
import type { PathwayDay, PathwayData, PathwayProgress } from '../data/pathway-types';

interface NewBelieverLessonCardProps {
  pathwayData: PathwayData;
  pathwayProgress: PathwayProgress;
  lang: string;
  t: (key: string) => string;
  translation: TranslationCode;
  translations: TranslationCode[];
  passageTexts: Record<string, string>;
  loadingPassages: Set<string>;
  greekHebrewMode: boolean;
  scriptureFontSize: number;
  audioPlaying: boolean;
  audioLoading: boolean;
  audioCurrentPassage: string | null;
  savePathwayProgress: (p: PathwayProgress) => void;
  handleTranslationChange: (t: TranslationCode) => void;
  handleListen: (passage: string) => void;
  loadPassage: (passage: string) => void;
  renderScripture: (text: string, passage: string) => ReactNode;
}

export function NewBelieverLessonCard({
  pathwayData, pathwayProgress, lang, t, translation, translations,
  passageTexts, loadingPassages, greekHebrewMode, scriptureFontSize,
  audioPlaying, audioLoading, audioCurrentPassage,
  savePathwayProgress, handleTranslationChange, handleListen, loadPassage, renderScripture,
}: NewBelieverLessonCardProps) {
          const currentDay = pathwayProgress.currentDay || 1;
          const dayData = pathwayData.days?.find((d: PathwayDay) => d.day === currentDay);
          if (!dayData) return null;
          const completed = pathwayProgress.completedDays?.length || 0;
          const totalDays = pathwayData.days?.length || 40;
          const dayTitle = lang === 'es' ? (dayData.titleEs || dayData.title)
            : lang === 'pt' ? (dayData.titlePt || dayData.title)
            : lang === 'id' ? (dayData.titleId || dayData.title)
            : dayData.title;
          const dayTheme = lang === 'es' ? (dayData.themeEs || dayData.theme)
            : lang === 'pt' ? (dayData.themePt || dayData.theme)
            : lang === 'id' ? (dayData.themeId || dayData.theme)
            : dayData.theme;
          const dayLesson = lang === 'es' ? (dayData.lessonEs || dayData.lesson)
            : lang === 'pt' ? (dayData.lessonPt || dayData.lesson)
            : lang === 'id' ? (dayData.lessonId || dayData.lesson)
            : dayData.lesson;
          const dayReading = dayData.reading;
          const pathTitle = lang === 'es' ? (pathwayData.titleEs || pathwayData.title)
            : lang === 'pt' ? (pathwayData.titlePt || pathwayData.title)
            : lang === 'id' ? (pathwayData.titleId || pathwayData.title)
            : pathwayData.title;
          const isCompleted = pathwayProgress.completedDays.includes(currentDay);

          return (
            <Card style={{ marginBottom: 16 }}>
              {/* Header: plan name + progress */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <h2 className="text-section-header" style={{ margin: 0 }}>
                  {t('day_label')} {currentDay} {t('of_label')} {totalDays}
                </h2>
                <span style={{ fontSize: 11, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)' }}>
                  {pathTitle}
                </span>
              </div>
              {/* Progress bar */}
              <div style={{ height: 4, background: 'var(--dw-border)', borderRadius: 2, overflow: 'hidden', marginBottom: 12 }}>
                <div style={{
                  width: `${(completed / totalDays) * 100}%`,
                  height: '100%',
                  background: 'var(--dw-accent)',
                  borderRadius: 2,
                  transition: 'width 0.3s',
                }} />
              </div>
              {/* Lesson title & theme */}
              <p className="text-card-title" style={{ marginBottom: 4 }}>{dayTitle}</p>
              <p style={{ color: 'var(--dw-text-muted)', fontSize: 13, fontFamily: 'var(--font-sans)', marginBottom: 6 }}>
                {dayTheme}
              </p>
              {/* Scripture reference */}
              {dayReading?.ref && (
                <p style={{ color: 'var(--dw-accent)', fontSize: 13, fontWeight: 500, fontFamily: 'var(--font-sans)', marginBottom: 12 }}>
                  📖 {dayReading.ref}
                </p>
              )}
              {/* Full lesson text */}
              {dayLesson && (
                <p className="text-devotion" style={{ whiteSpace: 'pre-line', fontSize: scriptureFontSize + 2 }}>{dayLesson}</p>
              )}
              {/* Actions row */}
              <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <button
                  onClick={() => {
                    if (!isCompleted) {
                      const newCompleted = [...pathwayProgress.completedDays, currentDay];
                      const nextDay = Math.min(totalDays, currentDay + 1);
                      savePathwayProgress({ ...pathwayProgress, completedDays: newCompleted, currentDay: nextDay });
                    }
                  }}
                  style={{
                    padding: '8px 16px',
                    background: isCompleted ? 'var(--dw-surface)' : 'var(--dw-accent)',
                    color: isCompleted ? 'var(--dw-text-muted)' : '#fff',
                    border: isCompleted ? '1px solid var(--dw-border)' : 'none',
                    borderRadius: 10,
                    cursor: isCompleted ? 'default' : 'pointer',
                    fontSize: 13,
                    fontWeight: 600,
                    fontFamily: 'var(--font-sans)',
                  }}
                >
                  {isCompleted ? '✓ Completed' : t('mark_complete')}
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button onClick={() => {
                    shareContent({
                      title: `Day ${currentDay}: ${dayTitle}`,
                      text: `${dayTitle}\n\n${(dayLesson || '').substring(0, 200)}...\n\n— Futures Daily Word`,
                      url: 'https://futuresdailyword.com'
                    });
                  }} style={{
                    display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px',
                    background: 'var(--dw-surface)', border: '1px solid var(--dw-border)',
                    borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 500,
                    color: 'var(--dw-text-secondary)', fontFamily: 'var(--font-sans)',
                  }}>
                    <Share2 size={14} /> Share
                  </button>
                </div>
              </div>

              {/* ── Scripture Reading for this day ── */}
              {dayReading && (() => {
                const fullChapter = `${dayReading.book} ${dayReading.chapter}`;
                const tKey = `${fullChapter}_${translation}`;
                const passageText = passageTexts[tKey];
                const isLoading = loadingPassages.has(fullChapter);
                const isPlayingThis = audioPlaying && audioCurrentPassage === fullChapter;
                const isLoadingAudio = audioLoading && audioCurrentPassage === fullChapter;

                return (
                  <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--dw-border)' }}>
                    <h2 className="text-section-header" style={{ marginBottom: 10 }}>{t('todays_reading')}</h2>

                    {/* Translation picker */}
                    <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
                      {translations.map(t => (
                        <button
                          key={t}
                          onClick={() => handleTranslationChange(t)}
                          style={{
                            padding: '5px 12px',
                            borderRadius: 20,
                            fontSize: 12, fontWeight: 700,
                            fontFamily: 'var(--font-sans)',
                            letterSpacing: '0.04em',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            border: t === translation ? '1.5px solid var(--dw-accent)' : '1.5px solid var(--dw-border)',
                            background: t === translation ? 'var(--dw-accent)' : 'transparent',
                            color: t === translation ? '#fff' : 'var(--dw-text-muted)',
                          }}
                        >
                          {t}
                        </button>
                      ))}
                    </div>

                    {/* Chapter heading + listen */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                      <p style={{ fontWeight: 700, fontSize: 15, color: 'var(--dw-text-primary)', fontFamily: 'var(--font-sans)', margin: 0 }}>
                        {fullChapter}
                      </p>
                      <button
                        onClick={() => handleListen(fullChapter)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 6,
                          background: isPlayingThis ? 'var(--dw-accent-hover)' : 'var(--dw-accent)',
                          border: 'none', borderRadius: 10, padding: '8px 14px',
                          fontSize: 13, fontWeight: 600, cursor: 'pointer',
                          color: '#fff', fontFamily: 'var(--font-sans)',
                        }}
                      >
                        {isLoadingAudio ? (
                          <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Loading…</>
                        ) : isPlayingThis ? (
                          <><AudioWave height={14} color="#fff" /> <Pause size={14} /> Pause</>
                        ) : (
                          <><Headphones size={14} /> Listen</>
                        )}
                      </button>
                    </div>

                    {/* Scripture text */}
                    {isLoading ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 0' }}>
                        <Loader2 size={14} style={{ color: 'var(--dw-accent)', animation: 'spin 1s linear infinite' }} />
                        <span style={{ fontSize: 14, color: 'var(--dw-text-muted)', fontStyle: 'italic', fontFamily: 'var(--font-sans)' }}>Loading {translation}…</span>
                      </div>
                    ) : passageText ? (
                      <ScripturePassage
                        text={passageText}
                        passageRef={fullChapter}
                        renderScripture={renderScripture}
                        greekHebrewMode={greekHebrewMode}
                        fontSize={scriptureFontSize}
                      />
                    ) : (
                      <button
                        onClick={() => loadPassage(fullChapter)}
                        style={{
                          background: 'var(--dw-accent-bg)', border: '1px solid var(--dw-accent)',
                          borderRadius: 10, padding: '10px 16px', fontSize: 13, fontWeight: 600,
                          cursor: 'pointer', color: 'var(--dw-accent)', fontFamily: 'var(--font-sans)',
                          display: 'flex', alignItems: 'center', gap: 6,
                        }}
                      >
                        <BookOpen size={16} /> Read {fullChapter}
                      </button>
                    )}
                  </div>
                );
              })()}
            </Card>
          );
}
