import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { ThemeProvider } from './contexts/ThemeContext';
import { UserProvider, useUser } from './contexts/UserContext';
import { TabBar } from './components/TabBar';
import { EmailGate } from './components/EmailGate';
import { BibleAI } from './components/BibleAI';
import type { TabId } from './components/TabBar';
import { HomeScreen } from './screens/HomeScreen';
import { JournalScreen } from './screens/JournalScreen';
import { MessagesScreen } from './screens/MessagesScreen';
import { PlansScreen } from './screens/PlansScreen';
import { MoreScreen } from './screens/MoreScreen';
import { hideSplash, registerNativePush, isNative } from './utils/native';
import { Sparkles } from 'lucide-react';

function AppContent() {
  const [activeTab, setActiveTab] = useState<TabId>('home');
  const [showBibleAI, setShowBibleAI] = useState(false);
  const { userProfile } = useUser();

  useEffect(() => {
    hideSplash();
    if (isNative() && userProfile?.email) {
      registerNativePush((token) => {
        fetch('/api/subscribe-push', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: userProfile.email,
            nativeToken: token,
            platform: (window as unknown as Record<string, unknown>).Capacitor ? 'native' : 'web',
          }),
        }).catch(() => {});
      });
    }
  }, [userProfile?.email]);

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
      <EmailGate />
      <button
        onClick={() => setShowBibleAI(true)}
        style={{
          position: 'fixed',
          bottom: 'calc(72px + var(--safe-bottom))',
          right: 20, width: 56, height: 56,
          borderRadius: '50%',
          background: 'var(--dw-accent)',
          border: 'none', color: '#fff', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(168, 50, 59, 0.3)',
          zIndex: 40, minHeight: 56, minWidth: 56,
        }}
      >
        <Sparkles size={24} />
      </button>
      <BibleAI isOpen={showBibleAI} onClose={() => setShowBibleAI(false)} />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <UserProvider>
        <AppContent />
      </UserProvider>
    </ThemeProvider>
  );
}
