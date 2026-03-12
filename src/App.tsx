import { useState } from 'react';
import type { ReactNode } from 'react';
import { ThemeProvider } from './contexts/ThemeContext';
import { TabBar } from './components/TabBar';
import type { TabId } from './components/TabBar';
import { HomeScreen } from './screens/HomeScreen';
import { JournalScreen } from './screens/JournalScreen';
import { MessagesScreen } from './screens/MessagesScreen';
import { PlansScreen } from './screens/PlansScreen';
import { MoreScreen } from './screens/MoreScreen';

function AppContent() {
  const [activeTab, setActiveTab] = useState<TabId>('home');

  const screens: Record<TabId, ReactNode> = {
    home: <HomeScreen />,
    journal: <JournalScreen />,
    messages: <MessagesScreen />,
    plans: <PlansScreen />,
    more: <MoreScreen />,
  };

  return (
    <div style={{ height: '100%', width: '100%', position: 'relative', background: 'var(--dw-canvas)' }}>
      {screens[activeTab]}
      <TabBar activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}
