/**
 * App navigation — bottom tab bar on mobile/tablet, top nav at 1024+.
 * JourneySelector lives in the top nav on desktop (header row on mobile).
 */
import { TabBar, type TabId } from './TabBar';
import { Home, PenLine, MessageCircle, Calendar, Settings } from 'lucide-react';
import { useEffect, useState } from 'react';
import { hapticTap } from '../utils/haptics';
import { JourneySelector } from './JourneySelector';
import { useUser } from '../contexts/UserContext';
import type { Persona } from '../utils/persona-config';
import { flushNow } from '../utils/cloudSync';
import { track } from '../utils/analytics';

const TAB_LABELS: Record<string, Record<string, string>> = {
  home:     { en: 'Home',     es: 'Inicio',         pt: 'Início',   id: 'Beranda' },
  journal:  { en: 'Notes',    es: 'Notas',          pt: 'Notas',          id: 'Catatan' },
  messages: { en: 'Campus',   es: 'Sede',           pt: 'Campus',         id: 'Kampus' },
  plans:    { en: 'Plans',    es: 'Planes',         pt: 'Planos',         id: 'Rencana' },
  more:     { en: 'Settings', es: 'Ajustes',        pt: 'Configurações', id: 'Pengaturan' },
};

const tabs: { id: TabId; icon: typeof Home }[] = [
  { id: 'home', icon: Home },
  { id: 'journal', icon: PenLine },
  { id: 'messages', icon: MessageCircle },
  { id: 'plans', icon: Calendar },
  { id: 'more', icon: Settings },
];

interface AppNavProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

export function AppNav({ activeTab, onTabChange }: AppNavProps) {
  const [lang, setLang] = useState('en');
  const { setup, saveSetup } = useUser();

  useEffect(() => {
    const stored = localStorage.getItem('dw_lang');
    if (stored) setLang(stored);
    const h = () => setLang(localStorage.getItem('dw_lang') || 'en');
    window.addEventListener('storage', h);
    window.addEventListener('dw-lang-changed', h);
    return () => {
      window.removeEventListener('storage', h);
      window.removeEventListener('dw-lang-changed', h);
    };
  }, []);

  const label = (id: string) => TAB_LABELS[id]?.[lang] || TAB_LABELS[id]?.en || id;

  return (
    <>
      <nav className="dw-top-nav" aria-label="Main">
        <div className="dw-top-nav-inner">
          <div className="dw-top-nav-tabs">
            {tabs.map(({ id, icon: Icon }) => (
              <button
                key={id}
                type="button"
                className={`dw-top-nav-item${activeTab === id ? ' is-current' : ''}`}
                onClick={() => { if (id !== activeTab) hapticTap(); onTabChange(id); }}
                aria-current={activeTab === id ? 'page' : undefined}
              >
                <Icon size={18} strokeWidth={activeTab === id ? 2.2 : 1.5} aria-hidden />
                {label(id)}
              </button>
            ))}
          </div>
          <JourneySelector
            persona={setup?.persona || 'congregation'}
            onPersonaChange={(id: Persona) => {
              saveSetup({ persona: id, source: 'settings' });
              flushNow();
              track('persona_change', id);
            }}
          />
        </div>
      </nav>
      <TabBar activeTab={activeTab} onTabChange={onTabChange} />
    </>
  );
}
