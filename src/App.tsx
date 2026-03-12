import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { ThemeProvider } from './contexts/ThemeContext';
import { UserProvider, useUser } from './contexts/UserContext';
import { TabBar } from './components/TabBar';
import { EmailGate } from './components/EmailGate';
import type { TabId } from './components/TabBar';
import { HomeScreen } from './screens/HomeScreen';
import { JournalScreen } from './screens/JournalScreen';
import { MessagesScreen } from './screens/MessagesScreen';
import { PlansScreen } from './screens/PlansScreen';
import { MoreScreen } from './screens/MoreScreen';
import { hideSplash, registerNativePush, isNative } from './utils/native';

function AppContent() {
  const [activeTab, setActiveTab] = useState<TabId>('home');
  const { userProfile } = useUser();

  // Native startup: hide splash + register push
  useEffect(() => {
    hideSplash();
    if (isNative() && userProfile?.email) {
      registerNativePush((token) => {
        // Send native push token to server
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
