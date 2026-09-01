/**
 * TodayScreen — the whole product, on one screen.
 *
 * Ashley's rule (1 Sep 2026): when somebody opens futuresdailyword.com there
 * should be almost nothing to figure out. The screen answers one question —
 * "What is God saying to me today?" — and it answers it the same way for a
 * 70-year-old and a 17-year-old, in under three seconds.
 *
 *   TODAY — <date>
 *   Title
 *   Scripture reference
 *   ▶ Listen   Read
 *   [the devotional, immediately — no cards asking what you want to do first]
 *   [New to faith? Start here]
 *
 * What deliberately is NOT here: plan selection, feature cards, competing
 * coloured buttons, notes controls, settings, secondary Bible tools, and any
 * explanation of what the app does. Those exist one level down, under Bible
 * (exploration) and Me (personal). Do not add a second call to action here.
 *
 * The ONE variant is `new_to_faith`: that persona gets the 40-day Faith Pathway
 * (`/books/faith-pathway.json`) — one lesson a day, opening up as they go —
 * instead of the daily devotional. Same layout, different content.
 */
import { useState, useEffect, useCallback } from 'react';
import { ArrowRight, BookOpen, Check, Loader2 } from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import { isNewChristianPersona } from '../utils/persona-config';
import { getLang, t as tI18n } from '../utils/i18n';
import { getDayNumber } from '../utils/daily-passages';
import { ALL_ASHLEY_JANE_DEVOTIONALS, ALL_ASHLEY_JANE_PASSAGES } from '../data/ashley-jane-plan';
import type { PathwayData, PathwayDay, PathwayProgress } from '../data/pathway-types';
import { ensureGraceSeriesEnrolled, readPathwayProgress, GRACE_SERIES_TOTAL_DAYS, GRACE_SERIES_TITLE } from '../utils/coldStart';
import { fetchPassage } from '../utils/api';
import type { TranslationCode } from '../utils/api';
import { recordStreakToday } from '../utils/streak';
import { syncMisc } from '../utils/cloudSync';
import { hapticTap } from '../utils/haptics';
import { track } from '../utils/analytics';
import { ListenButton } from '../components/ListenButton';
import { MarkdownText } from '../components/MarkdownText';
import { ScripturePassage } from '../components/ScripturePassage';
import { NewToFaithButton } from '../components/NewToFaithButton';

const DATE_LOCALE: Record<string, string> = { en: 'en-US', es: 'es-ES', pt: 'pt-BR', id: 'id-ID' };

const COPY: Record<string, Record<string, string>> = {
  today:   { en: 'TODAY',            es: 'HOY',              pt: 'HOJE',            id: 'HARI INI' },
  listen:  { en: 'Listen',           es: 'Escuchar',         pt: 'Ouvir',           id: 'Dengarkan' },
  read:    { en: 'Read',             es: 'Leer',             pt: 'Ler',             id: 'Baca' },
  hide:    { en: 'Hide',             es: 'Ocultar',          pt: 'Ocultar',         id: 'Sembunyikan' },
  step:    { en: 'Take a Next Step', es: 'Da el Siguiente Paso', pt: 'Dê o Próximo Passo', id: 'Ambil Langkah Berikutnya' },
  day:     { en: 'Day',              es: 'Día',              pt: 'Dia',             id: 'Hari' },
  nextDay: { en: 'Read the next day', es: 'Leer el siguiente día', pt: 'Ler o próximo dia', id: 'Baca hari berikutnya' },
  prevDay: { en: 'Previous day', es: 'Día anterior', pt: 'Dia anterior', id: 'Hari sebelumnya' },
  done:    { en: 'Mark complete', es: 'Marcar como completado', pt: 'Marcar como concluído', id: 'Tandai selesai' },
  doneOk:  { en: 'Complete',         es: 'Completado',       pt: 'Concluído',       id: 'Selesai' },
  failed:  { en: "Couldn't load the passage. Tap to try again.", es: 'No se pudo cargar el pasaje. Toca para reintentar.', pt: 'Não foi possível carregar a passagem. Toque para tentar novamente.', id: 'Tidak dapat memuat bacaan. Ketuk untuk mencoba lagi.' },
};
const c = (k: string, lang: string) => COPY[k]?.[lang] || COPY[k]?.en || k;

/** Localized "September 1" — no year, no weekday. The eyebrow carries "TODAY". */
function todayLabel(lang: string): string {
  return new Date().toLocaleDateString(DATE_LOCALE[lang] || 'en-US', { month: 'long', day: 'numeric' });
}

interface TodayContent {
  title: string;
  /** Scripture reference, e.g. "Ephesians 2:8-9" */
  reference: string;
  body: string;
  /** Pathway only — the day number, so the screen can show progress */
  day?: number;
}

/** The devotional everyone else gets: the Ashley & Jane corpus, one a day. */
function devotionalForToday(lang: string): TodayContent {
  const n = ALL_ASHLEY_JANE_DEVOTIONALS.length;
  // Positive modulo — getDayNumber is an epoch day count, never negative in
  // practice, but a device clock set before 1970 shouldn't crash the app.
  const i = ((getDayNumber(0) % n) + n) % n;
  const d = ALL_ASHLEY_JANE_DEVOTIONALS[i];
  return {
    title: lang === 'id' ? d.titleId : d.title,
    reference: ALL_ASHLEY_JANE_PASSAGES[i] || '',
    body: lang === 'id' ? d.bodyId : d.body,
  };
}

function pathwayContent(data: PathwayData, day: number, lang: string): TodayContent | null {
  const d: PathwayDay | undefined = data.days?.find(x => x.day === day);
  if (!d) return null;
  const localized = <T extends string>(base: T, es?: string, pt?: string, id?: string) =>
    (lang === 'es' && es) || (lang === 'pt' && pt) || (lang === 'id' && id) || base;
  return {
    title: localized(d.title, d.titleEs, d.titlePt, d.titleId),
    reference: d.reading?.ref || d.passages?.[0] || '',
    body: localized(d.lesson || '', d.lessonEs, d.lessonPt, d.lessonId),
    day: d.day,
  };
}



export function TodayScreen() {
  const { setup, saveSetup } = useUser();
  const [lang, setLang] = useState(getLang());
  useEffect(() => {
    const h = () => setLang(getLang());
    window.addEventListener('dw-lang-changed', h);
    return () => window.removeEventListener('dw-lang-changed', h);
  }, []);

  const isNewToFaith = isNewChristianPersona(setup?.persona);

  // ── Faith Pathway (new_to_faith only) ──
  const [pathway, setPathway] = useState<PathwayData | null>(null);
  const [progress, setProgress] = useState<PathwayProgress>(readPathwayProgress);

  useEffect(() => {
    if (!isNewToFaith || pathway) return;
    const url = lang !== 'en' ? `/books/faith-pathway_${lang}.json` : '/books/faith-pathway.json';
    const load = (u: string) => fetch(u).then(r => { if (!r.ok) throw new Error('not found'); return r.json(); });
    load(url)
      .then((d: PathwayData) => setPathway(d))
      // Translated pathways don't all exist yet — English is the fallback, not an error.
      .catch(() => { if (lang !== 'en') load('/books/faith-pathway.json').then(setPathway).catch(() => {}); });
  }, [isNewToFaith, lang, pathway]);

  // Auto-enrol: reaching Today as new_to_faith IS the enrolment. No picker.
  // Fill-only (coldStart's helper) — never resets a series in progress.
  useEffect(() => {
    if (!isNewToFaith || progress.enrolled) return;
    ensureGraceSeriesEnrolled();
    setProgress(readPathwayProgress());
  }, [isNewToFaith, progress.enrolled]);

  // Which pathway day is on screen. Progress says where they got to; viewDay
  // says what they're reading — Ashley (1 Sep 2026): they choose how much they
  // want to read, so finishing a day offers the next one immediately and they
  // can go back over any day they've already opened.
  const [viewDay, setViewDay] = useState<number | null>(null);
  const lastDay = progress.totalDays || pathway?.days?.length || GRACE_SERIES_TOTAL_DAYS;
  const day = Math.min(viewDay ?? progress.currentDay ?? 1, lastDay);

  const content: TodayContent | null = isNewToFaith
    ? (pathway ? pathwayContent(pathway, day, lang) : null)
    : devotionalForToday(lang);

  const dayComplete = !!content?.day && progress.completedDays.includes(content.day);
  const hasNextDay = !!content?.day && content.day < lastDay;

  const goToDay = (n: number) => {
    setViewDay(n);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    try { document.querySelector('.screen-container')?.scrollTo({ top: 0, behavior: 'smooth' }); } catch { /* ignore */ }
  };

  const completeDay = () => {
    if (!content?.day) return;
    hapticTap();
    const d = content.day;
    // currentDay is the furthest they've reached — it only ever moves forward,
    // so re-reading an earlier day can never pull their progress backwards.
    // LOCAL date (en-CA) — the date-axis rule; also what the Bible tab compares.
    const today = new Date().toLocaleDateString('en-CA');
    // ‼️ Merge into the CURRENTLY-STORED record, not React state — a cloud sync
    // may have landed since mount, and rebuilding from state clobbers it
    // (the exact #64 review BLOCKER: never rebuild a synced dw_* record from
    // React state). Only the keys this action owns change.
    const stored = readPathwayProgress();
    const storedCompleted = stored.completedDays.includes(d)
      ? stored.completedDays
      : [...stored.completedDays, d];
    const next: PathwayProgress = {
      ...stored,
      completedDays: storedCompleted,
      currentDay: Math.min(Math.max(stored.currentDay || 1, d + 1), lastDay),
      enrolled: true,
      lastCompletedDay: d,
      lastCompletedDate: today,
      totalDays: stored.totalDays || GRACE_SERIES_TOTAL_DAYS,
      title: stored.title || GRACE_SERIES_TITLE,
    };
    setProgress(next);
    try { localStorage.setItem('dw_pathway_progress', JSON.stringify(next)); } catch { /* quota */ }
    syncMisc('dw_pathway_progress', JSON.stringify(next));
    try { localStorage.setItem('dw_reading_done', today); } catch { /* quota */ }
    recordStreakToday();
    try { window.dispatchEvent(new Event('dw-reading-completed')); } catch { /* ignore */ }
    track('pathway_day_complete', String(d));
  };

  // ── Scripture: hidden until asked for ("Read"), then it stays open ──
  const [showScripture, setShowScripture] = useState(false);
  const [passageText, setPassageText] = useState('');
  const [passageState, setPassageState] = useState<'idle' | 'loading' | 'error'>('idle');
  // Settings changes land live: MoreScreen fires these after writing localStorage.
  const [settingsRev, setSettingsRev] = useState(0);
  useEffect(() => {
    const onTranslation = () => { setPassageText(''); setPassageState('idle'); setSettingsRev(r => r + 1); };
    const onFont = () => setSettingsRev(r => r + 1);
    window.addEventListener('dw-translation-changed', onTranslation);
    window.addEventListener('dw-font-size-changed', onFont);
    return () => {
      window.removeEventListener('dw-translation-changed', onTranslation);
      window.removeEventListener('dw-font-size-changed', onFont);
    };
  }, []);
  const translation = (localStorage.getItem('dw_translation') || 'ESV') as TranslationCode;
  // dw_font_size: absolute px, 13–32, default 15 — same contract as Settings.
  const scriptureFontSize = Math.min(32, Math.max(13, parseInt(localStorage.getItem('dw_font_size') || '15', 10) || 15));
  void settingsRev; // read so the lint knows the state drives the re-render
  const reference = content?.reference || '';

  const loadPassage = useCallback(() => {
    if (!reference) return;
    setPassageState('loading');
    fetchPassage(reference, translation)
      .then(text => { setPassageText(text); setPassageState('idle'); })
      .catch(() => setPassageState('error'));
  }, [reference, translation]);

  // A new day (or a pathway day advancing) invalidates the loaded passage.
  useEffect(() => { setShowScripture(false); setPassageText(''); setPassageState('idle'); }, [reference]);

  // Re-fetch when the passage was cleared by a translation change while open.
  useEffect(() => {
    if (showScripture && !passageText && passageState === 'idle') loadPassage();
  }, [showScripture, passageText, passageState, loadPassage]);

  const toggleRead = () => {
    hapticTap();
    if (showScripture) { setShowScripture(false); return; }
    setShowScripture(true);
    if (!passageText) loadPassage();
    recordStreakToday();
    // Evidence for the push ask: they have read. Stamp only — the prompt
    // surfaces on the NEXT open, never over the scripture they just opened.
    try {
      if (!localStorage.getItem('dw_reading_done')) {
        localStorage.setItem('dw_reading_done', new Date().toLocaleDateString('en-CA'));
      }
    } catch { /* quota */ }
    track('today_read', reference);
  };

  // "New to faith? Start here" doesn't navigate anywhere — it switches this
  // person onto the 40-day pathway and Today becomes Day 1 in place. No new
  // screen to understand, no plan to choose.
  const startPathway = () => {
    ensureGraceSeriesEnrolled(); // fill-only — resumes a half-done journey rather than wiping it
    const p = readPathwayProgress();
    setProgress(p);
    syncMisc('dw_pathway_progress', JSON.stringify(p));
    saveSetup({ persona: 'new_to_faith', source: 'onboarding' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!content) {
    return (
      <div className="screen-container today-screen" style={{ display: 'grid', placeItems: 'center', minHeight: '60vh' }}>
        <Loader2 size={22} className="dw-spin" style={{ color: 'var(--dw-text-muted)' }} aria-label="Loading" />
      </div>
    );
  }

  return (
    <div className="screen-container today-screen">
      <div className="today-inner">
        {/* ── 1. TODAY — <date> ── */}
        <p className="today-eyebrow">
          {c('today', lang)}
          <span aria-hidden="true"> — </span>
          <span className="today-date">{todayLabel(lang)}</span>
        </p>

        {content.day ? (
          <p className="today-daycount">{c('day', lang)} {content.day} / {lastDay}</p>
        ) : null}
        {content.day && progress.completedDays.length < 3 ? (
          <p className="today-howitworks">{tI18n('pathway_how_it_works', lang)}</p>
        ) : null}

        <h1 className="today-title">{content.title}</h1>
        {reference ? <p className="today-ref">{reference}</p> : null}

        {/* ── Two controls. Only ever two. ── */}
        <div className="today-actions">
          <ListenButton text={content.body} passageRef={reference} size="md" label={c('listen', lang)} />
          {reference ? (
            <button className="today-action" onClick={toggleRead} aria-expanded={showScripture}>
              <BookOpen size={17} strokeWidth={1.8} aria-hidden="true" />
              <span>{showScripture ? c('hide', lang) : c('read', lang)}</span>
            </button>
          ) : null}
        </div>

        {/* Scripture, when asked for */}
        {showScripture && (
          <div className="today-scripture">
            {passageState === 'loading' && (
              <Loader2 size={18} className="dw-spin" style={{ color: 'var(--dw-text-muted)' }} aria-label="Loading" />
            )}
            {passageState === 'error' && (
              <button className="today-retry" onClick={loadPassage}>{c('failed', lang)}</button>
            )}
            {passageState === 'idle' && passageText && (
              <ScripturePassage text={passageText} passageRef={reference} fontSize={scriptureFontSize} newPath={isNewToFaith} />
            )}
          </div>
        )}

        {/* ── 2. The devotional itself, immediately. ── */}
        <MarkdownText text={content.body} style={{ marginTop: 28 }} />

        {/* Pathway only: finish this day, then read on if they want to. */}
        {content.day ? (
          <div className="today-pathway-nav">
            {dayComplete && hasNextDay ? (
              <button className="today-complete" onClick={() => { hapticTap(); goToDay(content.day! + 1); }}>
                <span>{c('nextDay', lang)}</span>
                <ArrowRight size={18} strokeWidth={2} aria-hidden="true" />
              </button>
            ) : (
              <button
                className={`today-complete ${dayComplete ? 'is-done' : ''}`}
                onClick={completeDay}
                disabled={dayComplete}
              >
                <Check size={18} strokeWidth={2.2} aria-hidden="true" />
                <span>{dayComplete ? c('doneOk', lang) : c('done', lang)}</span>
              </button>
            )}
            {content.day > 1 ? (
              <button className="today-prevday" onClick={() => { hapticTap(); goToDay(content.day! - 1); }}>
                {c('prevDay', lang)}
              </button>
            ) : null}
          </div>
        ) : null}

        {/* ── 3. One next step. Never two. ── */}
        {!isNewToFaith && (
          <section className="today-next">
            <h2 className="today-next-label">{c('step', lang)}</h2>
            <NewToFaithButton source="today" onStart={startPathway} />
          </section>
        )}
      </div>
    </div>
  );
}
