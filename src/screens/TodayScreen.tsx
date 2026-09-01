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
import { getLang } from '../utils/i18n';
import { getDayNumber } from '../utils/daily-passages';
import { ALL_ASHLEY_JANE_DEVOTIONALS, ALL_ASHLEY_JANE_PASSAGES } from '../data/ashley-jane-plan';
import type { PathwayData, PathwayDay, PathwayProgress } from '../data/pathway-types';
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

function readProgress(): PathwayProgress {
  try {
    const raw = localStorage.getItem('dw_pathway_progress');
    if (raw) {
      const p = JSON.parse(raw);
      return { completedDays: p.completedDays || [], currentDay: p.currentDay || 1, enrolled: !!p.enrolled };
    }
  } catch { /* corrupt or unavailable */ }
  return { completedDays: [], currentDay: 1, enrolled: false };
}

export function TodayScreen() {
  const { setup, saveSetup } = useUser();
  const [lang, setLang] = useState(getLang());
  useEffect(() => {
    const h = () => setLang(getLang());
    window.addEventListener('dw-lang-changed', h);
    return () => window.removeEventListener('dw-lang-changed', h);
  }, []);

  const isNewToFaith = setup?.persona === 'new_to_faith';

  // ── Faith Pathway (new_to_faith only) ──
  const [pathway, setPathway] = useState<PathwayData | null>(null);
  const [progress, setProgress] = useState<PathwayProgress>(readProgress);

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
  useEffect(() => {
    if (!isNewToFaith || progress.enrolled) return;
    const next = { ...progress, enrolled: true };
    setProgress(next);
    try { localStorage.setItem('dw_pathway_progress', JSON.stringify(next)); } catch { /* quota */ }
    syncMisc('dw_pathway_progress', JSON.stringify(next));
  }, [isNewToFaith, progress]);

  // Which pathway day is on screen. Progress says where they got to; viewDay
  // says what they're reading — Ashley (1 Sep 2026): they choose how much they
  // want to read, so finishing a day offers the next one immediately and they
  // can go back over any day they've already opened.
  const [viewDay, setViewDay] = useState<number | null>(null);
  const lastDay = pathway?.days?.length || 40;
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
    const completedDays = progress.completedDays.includes(d)
      ? progress.completedDays
      : [...progress.completedDays, d];
    // currentDay is the furthest they've reached — it only ever moves forward,
    // so re-reading an earlier day can never pull their progress backwards.
    const next: PathwayProgress = {
      completedDays,
      currentDay: Math.min(Math.max(progress.currentDay || 1, d + 1), lastDay),
      enrolled: true,
    };
    setProgress(next);
    try { localStorage.setItem('dw_pathway_progress', JSON.stringify(next)); } catch { /* quota */ }
    syncMisc('dw_pathway_progress', JSON.stringify(next));
    recordStreakToday();
    track('pathway_day_complete', String(d));
  };

  // ── Scripture: hidden until asked for ("Read"), then it stays open ──
  const [showScripture, setShowScripture] = useState(false);
  const [passageText, setPassageText] = useState('');
  const [passageState, setPassageState] = useState<'idle' | 'loading' | 'error'>('idle');
  const translation = (localStorage.getItem('dw_translation') || 'ESV') as TranslationCode;
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

  const toggleRead = () => {
    hapticTap();
    if (showScripture) { setShowScripture(false); return; }
    setShowScripture(true);
    if (!passageText) loadPassage();
    recordStreakToday();
    track('today_read', reference);
  };

  // "New to faith? Start here" doesn't navigate anywhere — it switches this
  // person onto the 40-day pathway and Today becomes Day 1 in place. No new
  // screen to understand, no plan to choose.
  const startPathway = () => {
    const fresh: PathwayProgress = { completedDays: [], currentDay: 1, enrolled: true };
    setProgress(fresh);
    try { localStorage.setItem('dw_pathway_progress', JSON.stringify(fresh)); } catch { /* quota */ }
    syncMisc('dw_pathway_progress', JSON.stringify(fresh));
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
          <p className="today-daycount">{c('day', lang)} {content.day} / {pathway?.days?.length || 40}</p>
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
              <ScripturePassage text={passageText} passageRef={reference} fontSize={16} />
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
