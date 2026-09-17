/**
 * NewBelieverLessonCard — the FULL-SCREEN Day N surface of the 40-day journey
 * (new_to_faith persona). Ashley's flow spec (1 Sep 2026): tapping the journey
 * on Home opens the day they should be reading — title, theme, lesson AND the
 * day's verses, already open. Complete stays on this screen.
 *
 * The verses render through ScripturePassage, so verse-tap highlighting and the
 * simple study sheet work here exactly as on the hero reading — the chapter
 * text arrives via the passageText prop (HomeScreen's passageTexts store, no
 * refetch). Completion routes through the savePathwayProgress callback, which
 * HomeScreen wires to savePathwayProgressFromLesson (stamps dw_reading_done,
 * fires dw-reading-completed — the ruled gate-stack timing is unchanged).
 */
import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, Loader2, Share2 } from 'lucide-react';
import { t as trans } from '../utils/i18n';
import { track } from '../utils/analytics';
import { Card } from './Card';
import { ScripturePassage } from './ScripturePassage';
import { shareContent } from '../utils/share';
import { useSubView } from '../utils/useSubView';
import { closeThenNavigate } from '../utils/closeThenNavigate';
import { PathwayQuestions } from './PathwayAnswer';
import { localizedQuestions } from '../utils/pathwayQuestions';
import { localizedPlain } from '../utils/pathwayPlain';
import { sliceVerseRange } from '../utils/verseRange';
import { CloseTheDay } from './CloseTheDay';
import { JourneyHandoffCard } from './JourneyHandoffCard';
import { openChoosePath } from '../utils/choosePath';
import type { PathwayDay, PathwayData, PathwayProgress } from '../data/pathway-types';
import type { TabId } from './TabBar';


interface NewBelieverLessonCardProps {
  pathwayData: PathwayData;
  pathwayProgress: PathwayProgress;
  /** The day HomeScreen is showing today — same day the journey hero is on. */
  displayDay: number;
  lang: string;
  t: (key: string) => string;
  scriptureFontSize: number;
  savePathwayProgress: (p: PathwayProgress) => void;
  /** Whether the full-screen surface is showing. The component stays MOUNTED
      either way so useSubView can consume its pushed history entry on a
      UI-initiated close — unmount-on-close leaked one entry per open (a dead
      hardware-back press on Android). */
  open: boolean;
  /** Close the full-screen surface (back button / browser back). */
  onClose: () => void;
  /** Today's chapter text from HomeScreen's passageTexts — undefined while loading. */
  passageText?: string;
  /** Translation actually served for the chapter (may differ offline). */
  servedTranslation?: string;
  /** The day's assigned verse range, e.g. '8-9' (books/faith-pathway.json reading.verses). */
  verseSpec?: string;
  /** Human ref for the assigned range, e.g. 'Ephesians 2:8-9' (reading.ref). */
  rangedRef?: string;
  /** Switches tabs for the post-journey handoff (Connect Group door). */
  onNavigate?: (tab: TabId) => void;
}

export function NewBelieverLessonCard({
  pathwayData, pathwayProgress, displayDay, lang, t, scriptureFontSize,
  savePathwayProgress, open, onClose, passageText, servedTranslation,
  verseSpec, rangedRef, onNavigate,
}: NewBelieverLessonCardProps) {
  // Completion moment: hold the just-completed lesson on screen (with a
  // "Day N complete" note) instead of instantly swapping to tomorrow's. The day
  // comes from HomeScreen so the lesson and the journey hero can never drift
  // apart, and it survives a reload — this used to be component state, so
  // refreshing handed out the next lesson early.
  const [showNext, setShowNext] = useState(false);
  // Drop the peek whenever the day being shown moves on — otherwise a tab left
  // open across midnight keeps it set, and completing the new day would jump the
  // card a day ahead of the chapter the journey is on.
  useEffect(() => { setShowNext(false); }, [displayDay]);
  // The verses panel defaults to the day's assigned range; "Read the whole
  // chapter" reveals the rest. Resets whenever the day moves on, so a reader
  // who expanded yesterday's chapter doesn't carry that open into today's.
  const [showWholeChapter, setShowWholeChapter] = useState(false);
  // One history entry while open, so the back gesture closes this surface
  // instead of ejecting the user from the tab. Deliberately no modal focus
  // trap: the study sheet, note drawer and Bible AI mount as DOM siblings
  // above this surface, and a document-level trap made them unreachable by
  // keyboard and let Escape close this surface underneath them (same reason
  // BibleAI relies on the sub-view history entry alone).
  useSubView(open, onClose);
  const today = new Date().toLocaleDateString('en-CA');
  const completedToday = pathwayProgress.lastCompletedDate === today
    ? (pathwayProgress.lastCompletedDay ?? null)
    : null;
  const currentDay = showNext ? (pathwayProgress.currentDay || 1) : displayDay;
  useEffect(() => { setShowWholeChapter(false); }, [currentDay]);
  // Peeking tomorrow shows its title/theme/lesson only — tomorrow's chapter
  // arrives with the journey hero tomorrow, so the verses panel hides in peek.
  const isPeek = currentDay !== displayDay;
  const dayData = pathwayData.days?.find((d: PathwayDay) => d.day === currentDay);
  // Fire once per open/day pair — a re-render while the surface stays open on
  // the same day must not re-emit the open event.
  const openTrackedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!open) return;
    const key = `${open}-${displayDay}`;
    if (openTrackedRef.current === key) return;
    openTrackedRef.current = key;
    track('journey_day_open', String(displayDay));
  }, [open, displayDay]);
  // The reading surface, so "Read it again" (CloseTheDay) can scroll back up
  // to it without a second useSubView or any history push.
  const readingRef = useRef<HTMLDivElement>(null);
  if (!open || !dayData) return null;
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
  const chapterRef = dayReading ? `${dayReading.book} ${dayReading.chapter}` : '';
  // The slice may fail (no [N] markers, or the chapter served short of the
  // named verses) even when verseSpec is set. While passageText is still
  // loading we don't yet know, so keep treating verseSpec as effective —
  // only fall back to the whole-chapter presentation once the loaded text
  // proves the range can't be applied.
  const rangedSlice = passageText !== undefined && verseSpec
    ? sliceVerseRange(passageText, verseSpec)
    : undefined;
  const rangeFailed = passageText !== undefined && !!verseSpec && rangedSlice === null;
  const effectiveVerseSpec = rangeFailed ? undefined : verseSpec;
  const pathTitle = lang === 'es' ? (pathwayData.titleEs || pathwayData.title)
    : lang === 'pt' ? (pathwayData.titlePt || pathwayData.title)
    : lang === 'id' ? (pathwayData.titleId || pathwayData.title)
    : pathwayData.title;
  const isCompleted = pathwayProgress.completedDays.includes(currentDay);
  const plainSentence = localizedPlain(dayData, lang);

  return (
    // The wrapper keeps the historical scroll-anchor id for deep links.
    <div
      id="pathway-lesson-card"
      role="dialog"
      aria-labelledby="dw-journey-day-title"
      style={{
        // Below the highlight toolbar (95) / Bible AI (90) so the study sheet
        // pops over the verses, and below the seam brand bar (200), which keeps
        // framing the app; the top padding clears the seam's fixed height.
        position: 'fixed', inset: 0, zIndex: 60,
        background: 'var(--dw-canvas)',
        overflowY: 'auto', WebkitOverflowScrolling: 'touch',
      }}
    >
      <div style={{
        maxWidth: 640, margin: '0 auto',
        padding: 'calc(34px + env(safe-area-inset-top, 0px) + 10px) 16px calc(env(safe-area-inset-bottom, 0px) + 40px)',
      }}>
        {/* Back row */}
        <button
          onClick={onClose}
          aria-label={trans('back', lang)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            padding: '8px 8px 8px 0', display: 'flex', alignItems: 'center', gap: 4,
            color: 'var(--dw-new)', fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-sans)',
            minHeight: 44,
          }}
        >
          <ChevronLeft size={20} /> {trans('back', lang)}
        </button>

        {/* Day header — the journey's own sage voice */}
        <Card className="dw-new-journey" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <h2 className="text-section-header" style={{ margin: 0, color: 'var(--dw-new)' }}>
              {t('day_label')} {currentDay} {t('of_label')} {totalDays}
            </h2>
            <span style={{ fontSize: 11, color: 'var(--dw-new)', fontFamily: 'var(--font-sans)' }}>
              {pathTitle}
            </span>
          </div>
          {/* Progress bar */}
          <div style={{ height: 4, background: 'var(--dw-border)', borderRadius: 2, overflow: 'hidden', marginBottom: 12 }}>
            <div style={{
              width: `${(completed / totalDays) * 100}%`,
              height: '100%',
              background: 'var(--dw-new)',
              borderRadius: 2,
              transition: 'width 0.3s',
            }} />
          </div>
          <p id="dw-journey-day-title" className="text-card-title" style={{ marginBottom: 4 }}>{dayTitle}</p>
          <p style={{ color: 'var(--dw-text-muted)', fontSize: 13, fontFamily: 'var(--font-sans)', margin: 0 }}>
            {dayTheme}
          </p>
        </Card>

        {/* The day's verses — already open. Same light paper surface as the hero
            reading (white in BOTH themes, dark upright scripture — see CLAUDE.md);
            ScripturePassage gives verse-tap highlighting + the study sheet. */}
        {!isPeek && chapterRef && (
          <div ref={readingRef} className="dw-reading-surface" style={{
            position: 'relative',
            background: '#FFFFFF',
            textShadow: 'none',
            border: '1px solid rgba(150,112,72,0.15)',
            borderRadius: 24,
            padding: '20px 20px 24px',
            marginBottom: 16,
          }}>
            <p style={{
              fontSize: 12, fontWeight: 700, letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--dw-new)',
              fontFamily: 'var(--font-sans)', marginBottom: 20, marginTop: 4,
            }}>
              {(effectiveVerseSpec && !showWholeChapter ? (rangedRef || chapterRef) : chapterRef)}
              {servedTranslation && <span style={{ fontWeight: 500, opacity: 0.6 }}> · {servedTranslation}</span>}
            </p>
            {passageText ? (
              <div style={{
                // Force light-panel ink so scripture reads on the white paper
                // surface even in dark mode (same trap as the hero panel).
                ['--dw-text-secondary' as string]: '#2A2218',
                ['--dw-text-muted' as string]: '#A06A42',
                ['--dw-border' as string]: 'rgba(150,112,72,0.2)',
                ['--dw-surface-raised' as string]: 'rgba(255,255,255,0.06)',
              }}>
                <ScripturePassage
                  text={effectiveVerseSpec && !showWholeChapter ? (rangedSlice as string) : passageText}
                  passageRef={chapterRef}
                  fontSize={scriptureFontSize}
                  newPath
                />
                {/* Never removed and never hidden once the range is showing —
                    the assigned verses are the default, the whole chapter is
                    one tap under it (never the other way round). Hidden
                    entirely when the range couldn't be applied — there's
                    nothing to toggle back to. */}
                {effectiveVerseSpec && (
                  <button
                    onClick={() => setShowWholeChapter((v) => !v)}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      padding: '10px 0 0', marginTop: 4,
                      color: 'var(--dw-new)', fontSize: 13, fontWeight: 600,
                      fontFamily: 'var(--font-sans)', textDecoration: 'underline',
                    }}
                  >
                    {showWholeChapter ? trans('show_days_verses', lang) : trans('read_whole_chapter', lang)}
                  </button>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '40px 0' }}>
                <Loader2 size={20} style={{ color: '#A06A42', animation: 'spin 1s linear infinite' }} />
                <span style={{ color: '#A06A42', fontSize: 15, fontFamily: 'var(--font-sans)' }}>{trans('loading_scripture', lang)}</span>
              </div>
            )}
          </div>
        )}

        {/* The pastoral word + completion */}
        <Card className="dw-new-journey" style={{ marginBottom: 16 }}>
          {plainSentence && (
            <div style={{
              borderLeft: '2px solid var(--dw-new-soft)', paddingLeft: 12, marginBottom: 14,
            }}>
              <p style={{
                margin: '0 0 4px', fontSize: 12, fontWeight: 700, letterSpacing: '0.1em',
                textTransform: 'uppercase', color: 'var(--dw-new)', fontFamily: 'var(--font-sans)',
              }}>
                {trans('j_plain_label', lang)}
              </p>
              <p style={{
                margin: '0 0 4px', fontSize: scriptureFontSize + 2, color: 'var(--dw-text-secondary)',
                fontFamily: 'var(--font-sans)',
              }}>
                {plainSentence}
              </p>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)' }}>
                {trans('j_plain_later', lang)}
              </p>
            </div>
          )}
          {dayLesson && (
            <p className="text-devotion" style={{ whiteSpace: 'pre-line', fontSize: scriptureFontSize + 2 }}>{dayLesson}</p>
          )}
          {/* Reflect & Respond — part of the lesson (Ashley, 2 Sep 2026): directly
              under the teaching, before Mark Complete, in the reader's language. */}
          <PathwayQuestions day={currentDay} questions={localizedQuestions(dayData, lang)} lang={lang} className="dw-journey-questions" />
          {/* Actions row */}
          <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <button
              onClick={() => {
                if (!isCompleted) {
                  const newCompleted = [...pathwayProgress.completedDays, currentDay];
                  const nextDay = Math.min(totalDays, currentDay + 1);
                  setShowNext(false);
                  track('journey_day_complete', String(currentDay));
                  savePathwayProgress({
                    ...pathwayProgress,
                    completedDays: newCompleted,
                    currentDay: nextDay,
                    lastCompletedDay: currentDay,
                    lastCompletedDate: today,
                    totalDays,
                  });
                }
              }}
              style={{
                padding: '8px 16px',
                background: isCompleted ? 'var(--dw-surface)' : 'var(--dw-new)',
                color: isCompleted ? 'var(--dw-text-muted)' : 'var(--dw-new-on-fill)',
                border: isCompleted ? '1px solid var(--dw-border)' : 'none',
                borderRadius: 10,
                cursor: isCompleted ? 'default' : 'pointer',
                fontSize: 13,
                fontWeight: 600,
                fontFamily: 'var(--font-sans)',
              }}
            >
              {isCompleted ? trans('completed_check', lang) : t('mark_complete')}
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
                <Share2 size={14} /> {trans('share', lang)}
              </button>
            </div>
          </div>

          {/* The day's close — sage questions, then (14/40 days) the Connect
              Group handoff. isCompleted (permanent, once the day is in
              completedDays) keeps this visible on a finished day even long
              after lastCompletedDate has moved on; completedToday (only
              today's calendar date) is what still gates the tomorrow line. */}
          {isCompleted && !isPeek && (
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--dw-border)' }}>
              <CloseTheDay
                day={currentDay}
                lang={lang}
                onReread={chapterRef ? () => readingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }) : undefined}
              >
                {/* The end of the forty days is said here, where it cannot be
                    dismissed — the handoff card below can be. */}
                {currentDay >= totalDays && (
                  <p style={{ margin: '4px 0 0', fontSize: 15, fontWeight: 600, color: 'var(--dw-text-secondary)', fontFamily: 'var(--font-sans)' }}>
                    {trans('j_handoff_done_title', lang).replace('{n}', String(totalDays))}
                  </p>
                )}
                {completedToday !== null && completedToday < totalDays && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 4 }}>
                    <p style={{ margin: 0, fontSize: 13, color: 'var(--dw-text-secondary)', fontFamily: 'var(--font-sans)' }}>
                      {trans('j_close_tomorrow', lang).replace('{y}', String(completedToday + 1))}
                    </p>
                    <button
                      onClick={() => setShowNext(true)}
                      style={{
                        background: 'transparent', border: 'none', padding: '4px 6px',
                        fontSize: 13, fontWeight: 600, cursor: 'pointer',
                        color: 'var(--dw-new)', fontFamily: 'var(--font-sans)',
                        textDecoration: 'underline', whiteSpace: 'nowrap',
                      }}
                    >
                      {trans('pathway_show_now', lang)}
                    </button>
                  </div>
                )}
              </CloseTheDay>
              {onNavigate && (
                <JourneyHandoffCard
                  completedCount={completed}
                  totalDays={totalDays}
                  lang={lang}
                  onOpenCampus={() => closeThenNavigate(onClose, () => onNavigate('messages'))}
                  onChoosePath={() => openChoosePath('home')}
                />
              )}
            </div>
          )}
        </Card>

      </div>
    </div>
  );
}
