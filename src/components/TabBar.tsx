import { Home, PenLine, MessageCircle, Calendar, Settings } from 'lucide-react';

export type TabId = 'home' | 'journal' | 'messages' | 'plans' | 'more' | 'sermon-notes';

interface TabBarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

const tabs: { id: TabId; label: string; icon: typeof Home }[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'journal', label: 'Notes', icon: PenLine },
  { id: 'messages', label: 'Campus', icon: MessageCircle },
  { id: 'plans', label: 'Plans', icon: Calendar },
  { id: 'more', label: 'Settings', icon: Settings },
];

export function TabBar({ activeTab, onTabChange }: TabBarProps) {
  return (
    <nav className="tab-bar">
      {tabs.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          className={`tab-bar-item ${activeTab === id ? 'active' : ''}`}
          onClick={() => onTabChange(id)}
          aria-label={label}
        >
          <Icon size={22} strokeWidth={activeTab === id ? 2.2 : 1.5} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}
