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
import { getLang } from '../utils/i18n';
import { getStreak } from '../utils/streak';
import { hapticTap } from '../utils/haptics';
import type { TabId } from '../components/TabBar';

type Dest = { tab: TabId; journalTab?: 'today' | 'saved' | 'prayer' | 'sermon' };

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
      </div>
    </div>
  );
}
