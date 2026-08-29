/**
 * NewBelieverLessonCard — the Faith-Pathway day lesson for the new_to_faith
 * persona (replaces the devotion). Pure render reading HomeScreen state via
 * props; completion routes through the savePathwayProgress callback.
 *
 * The card deliberately does NOT render the day's chapter: the hero directly
 * above it already serves that exact chapter, expanded, with its own
 * translation picker, audio and "Mark as read". Rendering it here too put the
 * same chapter on screen twice with two sets of controls.
 */
import { useState } from 'react';
import { Share2 } from 'lucide-react';
import { t as trans } from '../utils/i18n';
import { Card } from './Card';
import { shareContent } from '../utils/share';
import type { PathwayDay, PathwayData, PathwayProgress } from '../data/pathway-types';

interface NewBelieverLessonCardProps {
  pathwayData: PathwayData;
  pathwayProgress: PathwayProgress;
  /** The day HomeScreen is showing today — same day the hero reading is from. */
  displayDay: number;
  lang: string;
  t: (key: string) => string;
  scriptureFontSize: number;
  savePathwayProgress: (p: PathwayProgress) => void;
}

export function NewBelieverLessonCard({
  pathwayData, pathwayProgress, displayDay, lang, t, scriptureFontSize, savePathwayProgress,
}: NewBelieverLessonCardProps) {
  // Completion moment: hold the just-completed lesson on screen (with a
  // "Day N complete" note) instead of instantly swapping to tomorrow's. The day
  // comes from HomeScreen so the lesson and the hero reading can never drift
  // apart, and it survives a reload — this used to be component state, so
  // refreshing handed out the next lesson early.
  const [showNext, setShowNext] = useState(false);
  const today = new Date().toLocaleDateString('en-CA');
  const completedToday = pathwayProgress.lastCompletedDate === today
    ? (pathwayProgress.lastCompletedDay ?? null)
    : null;
  const currentDay = showNext ? (pathwayProgress.currentDay || 1) : displayDay;
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
    // The wrapper carries the scroll anchor deep links target (Card does not
    // forward an id prop).
    <div id="pathway-lesson-card">
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
      {/* Scripture reference — the chapter itself is in the hero above */}
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
              setShowNext(false);
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
                color: 'var(--dw-accent)', fontFamily: 'var(--font-sans)',
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
  );
}
