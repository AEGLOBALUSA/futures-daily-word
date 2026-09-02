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
import { useEffect, useState } from 'react';
import { ChevronLeft, Loader2, Share2 } from 'lucide-react';
import { t as trans } from '../utils/i18n';
import { Card } from './Card';
import { ScripturePassage } from './ScripturePassage';
import { NewFaithCTA } from './NewFaithCTA';
import { shareContent } from '../utils/share';
import { useSubView } from '../utils/useSubView';
import { useModalA11y } from '../utils/useModalA11y';
import type { PathwayDay, PathwayData, PathwayProgress } from '../data/pathway-types';

interface NewBelieverLessonCardProps {
  pathwayData: PathwayData;
  pathwayProgress: PathwayProgress;
  /** The day HomeScreen is showing today — same day the journey hero is on. */
  displayDay: number;
  lang: string;
  t: (key: string) => string;
  scriptureFontSize: number;
  savePathwayProgress: (p: PathwayProgress) => void;
  /** Close the full-screen surface (back button / browser back). */
  onClose: () => void;
  /** Today's chapter text from HomeScreen's passageTexts — undefined while loading. */
  passageText?: string;
  /** Translation actually served for the chapter (may differ offline). */
  servedTranslation?: string;
}

export function NewBelieverLessonCard({
  pathwayData, pathwayProgress, displayDay, lang, t: _t, scriptureFontSize,
  savePathwayProgress, onClose, passageText, servedTranslation,
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
  // One history entry while open, so the back gesture closes this surface
  // instead of ejecting the user from the tab.
  useSubView(true, onClose);
  const dialogRef = useModalA11y(true, onClose);
  const today = new Date().toLocaleDateString('en-CA');
  const completedToday = pathwayProgress.lastCompletedDate === today
    ? (pathwayProgress.lastCompletedDay ?? null)
    : null;
  const currentDay = showNext ? (pathwayProgress.currentDay || 1) : displayDay;
  // Peeking tomorrow shows its title/theme/lesson only — tomorrow's chapter
  // arrives with the journey hero tomorrow, so the verses panel hides in peek.
  const isPeek = currentDay !== displayDay;
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
  const chapterRef = dayReading ? `${dayReading.book} ${dayReading.chapter}` : '';
  const pathTitle = trans('persona_new', lang);
  const isCompleted = pathwayProgress.completedDays.includes(currentDay);

  return (
    // The wrapper keeps the historical scroll-anchor id for deep links.
    <div
      id="pathway-lesson-card"
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="dw-journey-day-title"
      className="dw-day-n"
    >
      <div className="dw-day-n-inner">
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

        <h1 id="dw-journey-day-title" className="dw-day-n-title">{pathTitle}</h1>
        <p className="dw-day-n-meta">
          {trans('day_n_of_40', lang).replace('{n}', String(currentDay))}
        </p>

        <Card className="dw-new-journey" style={{ marginBottom: 16 }}>
          <div style={{ height: 4, background: 'var(--dw-border)', borderRadius: 2, overflow: 'hidden', marginBottom: 12 }}>
            <div style={{
              width: `${(completed / totalDays) * 100}%`,
              height: '100%',
              background: 'var(--dw-new)',
              borderRadius: 2,
              transition: 'width 0.3s',
            }} />
          </div>
          <p className="text-card-title" style={{ marginBottom: 4 }}>{dayTitle}</p>
          <p style={{ color: 'var(--dw-text-muted)', fontSize: 14, fontFamily: 'var(--font-sans)', margin: 0 }}>
            {dayTheme}
          </p>
        </Card>

        {/* The day's verses — already open. Same light paper surface as the hero
            reading (white in BOTH themes, dark upright scripture — see CLAUDE.md);
            ScripturePassage gives verse-tap highlighting + the study sheet. */}
        {!isPeek && chapterRef && (
          <div className="dw-reading-surface" style={{
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
              {dayReading?.ref || chapterRef}
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
                  text={passageText}
                  passageRef={chapterRef}
                  fontSize={scriptureFontSize}
                  newPath
                />
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
          {dayLesson && (
            <p className="text-devotion" style={{ whiteSpace: 'pre-line', fontSize: scriptureFontSize + 2 }}>{dayLesson}</p>
          )}
          {/* Actions row */}
          <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            {isCompleted ? (
              <span style={{
                fontSize: 14, fontWeight: 600, color: 'var(--dw-text-muted)',
                fontFamily: 'var(--font-sans)',
              }}>
                {trans('completed_check', lang)}
              </span>
            ) : (
              <NewFaithCTA
                onClick={() => {
                  const newCompleted = [...pathwayProgress.completedDays, currentDay];
                  const nextDay = Math.min(totalDays, currentDay + 1);
                  setShowNext(false);
                  savePathwayProgress({
                    ...pathwayProgress,
                    completedDays: newCompleted,
                    currentDay: nextDay,
                    lastCompletedDay: currentDay,
                    lastCompletedDate: today,
                    totalDays,
                  });
                }}
              >
                {trans('mark_as_read', lang)}
              </NewFaithCTA>
            )}
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

          {/* Completion moment — shown until the reader asks for the next lesson */}
          {completedToday !== null && !showNext && (
            <div style={{
              marginTop: 12, padding: '12px 14px',
              background: 'var(--dw-surface)', border: '1px solid var(--dw-border)',
              borderRadius: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
            }}>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--dw-text-secondary)', fontFamily: 'var(--font-sans)' }}>
                {completedToday < totalDays
                  ? trans('pathway_day_complete', lang)
                      .replace('{x}', String(completedToday))
                      .replace('{y}', String(completedToday + 1))
                  : trans('pathway_day_complete_final', lang).replace('{x}', String(completedToday))}
              </p>
              {completedToday < totalDays && (
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
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
