import { useState, useEffect } from 'react';
import { Home, Sun, BookOpen, User } from 'lucide-react';
import { hapticTap } from '../utils/haptics';

export type TabId = 'home' | 'journal' | 'messages' | 'plans' | 'more' | 'sermon-notes' | 'me';

interface TabBarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

const TAB_LABELS: Record<string, Record<string, string>> = {
  // Three tabs, and only three (Ashley, 1 Sep 2026):
  //   Today = effortless · Bible = exploration · Me = personal.
  // The old Notes / Campus / Settings tabs are not gone — they live under Me,
  // which is why they still keep their TabIds and are still routable.
  home:     { en: 'Today',    es: 'Hoy',            pt: 'Hoje',           id: 'Hari Ini' },
  plans:    { en: 'Bible',    es: 'Biblia',         pt: 'B\u00edblia',      id: 'Alkitab' },
  me:       { en: 'Me',       es: 'Yo',             pt: 'Eu',             id: 'Saya' },
};

const tabs: { id: TabId; icon: typeof Home }[] = [
  { id: 'home', icon: Sun },
  { id: 'plans', icon: BookOpen },
  { id: 'me', icon: User },
];

/** Screens that live under Me keep the Me tab lit while you're in them. */
const UNDER_ME: TabId[] = ['journal', 'messages', 'more', 'sermon-notes'];

export function TabBar({ activeTab, onTabChange }: TabBarProps) {
  const [lang, setLang] = useState('en');

  useEffect(() => {
    const stored = localStorage.getItem('dw_lang');
    if (stored) setLang(stored);

    const onStorage = (e: StorageEvent) => {
      if (e.key === 'dw_lang' && e.newValue) setLang(e.newValue);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Listen for same-tab language changes
  useEffect(() => {
    const h = () => {
      const current = localStorage.getItem('dw_lang') || 'en';
      setLang(prev => prev !== current ? current : prev);
    };
    window.addEventListener('dw-lang-changed', h);
    return () => window.removeEventListener('dw-lang-changed', h);
  }, []);

  const label = (id: string) => TAB_LABELS[id]?.[lang] || TAB_LABELS[id]?.['en'] || id;

  // 'me' owns the highlight for every screen filed beneath it.
  const lit: TabId = UNDER_ME.includes(activeTab) ? 'me' : activeTab;

  return (
    <nav className="tab-bar">
      {tabs.map(({ id, icon: Icon }) => (
        <button
          key={id}
          className={`tab-bar-item ${lit === id ? 'active' : ''}`}
          onClick={() => { if (id !== lit) hapticTap(); onTabChange(id); }}
          aria-label={label(id)}
          aria-current={lit === id ? 'page' : undefined}
        >
          <Icon size={22} strokeWidth={lit === id ? 2.2 : 1.5} />
          <span>{label(id)}</span>
        </button>
      ))}
    </nav>
  );
}
