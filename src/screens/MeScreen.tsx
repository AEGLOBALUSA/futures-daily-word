/**
 * MeScreen — the "Me" tab: everything personal, one level down from Today.
 *
 * Ashley's rule (1 Sep 2026): Today = effortless. Bible = exploration.
 * Me = personal stuff — notes, saved verses, progress, campus, settings, account.
 *
 * This is a hub, not a screen with its own content: it routes to the existing
 * screens, which keep working exactly as they did. Nothing was deleted from the
 * app in the 5→3 tab collapse; it moved here.
 */
import { useState, useEffect } from 'react';
import { PenLine, Bookmark, Flame, MapPin, FileText, Settings, ChevronRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { getLang, t as tI18n, dateLocale } from '../utils/i18n';
import { getStreak } from '../utils/streak';
import { hapticTap } from '../utils/haptics';
import { WeeklyReviewCard } from '../components/WeeklyReviewCard';
import { FeedbackPoll } from '../components/FeedbackPoll';
import { PromoAds } from '../components/PromoAds';
import type { TabId } from '../components/TabBar';

type Dest = { tab: TabId; journalTab?: 'today' | 'saved' | 'prayer' };

const COPY: Record<string, Record<string, string>> = {
  me:       { en: 'Me',            es: 'Yo',              pt: 'Eu',              id: 'Saya' },
  notes:    { en: 'Notes',         es: 'Notas',           pt: 'Notas',           id: 'Catatan' },
  saved:    { en: 'Saved verses',  es: 'Versículos guardados', pt: 'Versículos salvos', id: 'Ayat tersimpan' },
  progress: { en: 'Progress',      es: 'Progreso',        pt: 'Progresso',       id: 'Kemajuan' },
  campus:   { en: 'My campus',     es: 'Mi sede',         pt: 'Meu campus',      id: 'Kampus saya' },
  sermon:   { en: 'Sermon notes',  es: 'Notas del sermón', pt: 'Notas do sermão', id: 'Catatan khotbah' },
  settings: { en: 'Settings & account', es: 'Ajustes y cuenta', pt: 'Configurações e conta', id: 'Pengaturan & akun' },
  days:     { en: 'day streak',    es: 'días seguidos',   pt: 'dias seguidos',   id: 'hari berturut' },
};
const c = (k: string, lang: string) => COPY[k]?.[lang] || COPY[k]?.en || k;

/* ── Weekly review — moved here from the old Home screen (1 Sep 2026). Looking
   back over your week is personal, not part of "what is God saying to me
   today", so it lives under Me with the rest of your progress. ── */
const WEEK_REVIEW_QUESTIONS = [
  'What stood out most in what you read this week?',
  'Was there a verse that stayed with you?',
  'What is one thing God is saying to you?',
  'How did your reading shape your week?',
];

function getWeekReviewData(): { weekLabel: string; daysRead: number; streak: number; question: string } | null {
  try {
    const today = new Date();
    if (today.getDay() !== 0) return null; // Sundays only
    const weekKey = `${today.getFullYear()}-W${Math.ceil(today.getDate() / 7)}-${today.getMonth()}`;
    if (localStorage.getItem('dw_week_review_dismissed') === weekKey) return null;
    const streak = getStreak().count;
    if (streak < 3) return null;
    const daysRead = Math.min(streak, 7);
    const question = WEEK_REVIEW_QUESTIONS[Math.floor(today.getDate() / 7) % WEEK_REVIEW_QUESTIONS.length];
    const weekLabel = today.toLocaleDateString(dateLocale(), { month: 'long', day: 'numeric' });
    return { weekLabel, daysRead, streak, question };
  } catch { return null; }
}

const ROWS: { key: string; icon: LucideIcon; dest: Dest }[] = [
  { key: 'notes',    icon: PenLine,  dest: { tab: 'journal', journalTab: 'today' } },
  { key: 'saved',    icon: Bookmark, dest: { tab: 'journal', journalTab: 'saved' } },
  { key: 'campus',   icon: MapPin,   dest: { tab: 'messages' } },
  { key: 'sermon',   icon: FileText, dest: { tab: 'sermon-notes' } },
  { key: 'settings', icon: Settings, dest: { tab: 'more' } },
];

export function MeScreen({ onNavigate }: { onNavigate: (tab: TabId, journalTab?: string) => void }) {
  const [lang, setLang] = useState(getLang());
  useEffect(() => {
    const h = () => setLang(getLang());
    window.addEventListener('dw-lang-changed', h);
    return () => window.removeEventListener('dw-lang-changed', h);
  }, []);

  const streak = getStreak();
  const [weekReview, setWeekReview] = useState(getWeekReviewData);
  const campus = (() => { try { return JSON.parse(localStorage.getItem('dw_profile') || '{}').campus || null; } catch { return null; } })();

  return (
    <div className="screen-container me-screen">
      <h1 className="me-title">{c('me', lang)}</h1>
      <div className="me-inner">
        {/* Progress is the one thing worth showing rather than linking to. */}
        <div className="me-streak">
          <Flame size={20} strokeWidth={1.8} aria-hidden="true" />
          <span className="me-streak-n">{streak.count}</span>
          <span className="me-streak-label">{c('days', lang)}</span>
        </div>

        {weekReview && (
          <WeeklyReviewCard
            weekReview={weekReview}
            onDismiss={() => setWeekReview(null)}
            t={(k: string) => tI18n(k, lang)}
          />
        )}

        <nav className="me-list">
          {ROWS.map(({ key, icon: Icon, dest }) => (
            <button
              key={key}
              className="me-row"
              onClick={() => { hapticTap(); onNavigate(dest.tab, dest.journalTab); }}
            >
              <Icon size={19} strokeWidth={1.7} aria-hidden="true" />
              <span className="me-row-label">{c(key, lang)}</span>
              <ChevronRight size={18} strokeWidth={1.7} aria-hidden="true" className="me-row-chev" />
            </button>
          ))}
        </nav>
        <PromoAds />
      </div>
      {/* Product feedback belongs where the personal stuff is, not on Today. */}
      <FeedbackPoll userCampus={campus} />
    </div>
  );
}
