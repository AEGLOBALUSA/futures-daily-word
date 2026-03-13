import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { ThemeProvider } from './contexts/ThemeContext';
import { UserProvider, useUser } from './contexts/UserContext';
import { ScriptureSelectionProvider, useScriptureSelection } from './contexts/ScriptureSelectionContext';
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

function AppContent() {
  const [activeTab, setActiveTab] = useState<TabId>('home');
  const [showBibleAI, setShowBibleAI] = useState(false);
  const { userProfile } = useUser();
  const { selection } = useScriptureSelection();

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
            platform: (window as unknown as Record<string, unknown>).Capacitor,
          }),
        }).catch(() => {});
      });
    }
  }, [userProfile?.email]);

  // Auto-open AI when Go Deeper is triggered from a selection
  useEffect(() => {
    if (selection?.text && selection.source === 'range') {
      setShowBibleAI(true);
    }
  }, [selection?.text]);

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
      <BibleAI
        isOpen={showBibleAI}
        onClose={() => setShowBibleAI(prev => !prev)}
        selectedText={selection?.text}
      />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <UserProvider>
        <ScriptureSelectionProvider>
          <AppContent />
        </ScriptureSelectionProvider>
      </UserProvider>
    </ThemeProvider>
  );
}
