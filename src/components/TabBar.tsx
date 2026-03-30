import { useState, useEffect } from 'react';
import { Home, PenLine, MessageCircle, Calendar, Settings } from 'lucide-react';

export type TabId = 'home' | 'journal' | 'messages' | 'plans' | 'more' | 'sermon-notes';

interface TabBarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

const TAB_LABELS: Record<string, Record<string, string>> = {
  home:     { en: 'Home',     es: 'Inicio',         pt: 'In\u00edcio',   id: 'Beranda' },
  journal:  { en: 'Notes',    es: 'Notas',          pt: 'Notas',          id: 'Catatan' },
  messages: { en: 'Campus',   es: 'Sede',           pt: 'Campus',         id: 'Kampus' },
  plans:    { en: 'Plans',    es: 'Planes',         pt: 'Planos',         id: 'Rencana' },
  more:     { en: 'Settings', es: 'Ajustes',        pt: 'Configura\u00e7\u00f5es', id: 'Pengaturan' },
};

const tabs: { id: TabId; icon: typeof Home }[] = [
  { id: 'home', icon: Home },
  { id: 'journal', icon: PenLine },
  { id: 'messages', icon: MessageCircle },
  { id: 'plans', icon: Calendar },
  { id: 'more', icon: Settings },
];

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

  return (
    <nav className="tab-bar">
      {tabs.map(({ id, icon: Icon }) => (
        <button
          key={id}
          className={`tab-bar-item ${activeTab === id ? 'active' : ''}`}
          onClick={() => onTabChange(id)}
          aria-label={label(id)}
        >
          <Icon size={22} strokeWidth={activeTab === id ? 2.2 : 1.5} />
          <span>{label(id)}</span>
        </button>
      ))}
    </nav>
  );
}
