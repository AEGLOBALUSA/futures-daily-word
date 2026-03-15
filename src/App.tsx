import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { ThemeProvider } from './contexts/ThemeContext';
import { UserProvider, useUser } from './contexts/UserContext';
import { ScriptureSelectionProvider, useScriptureSelection } from './contexts/ScriptureSelectionContext';
import { TabBar } from './components/TabBar';
import { EmailGate } from './components/EmailGate';
import { BibleAI } from './components/BibleAI';
import { PathwayPicker } from './components/PathwayPicker';
import type { TabId } from './components/TabBar';
import type { Persona } from './utils/persona-config';
import { HomeScreen } from './screens/HomeScreen';
import { JournalScreen } from './screens/JournalScreen';
import { MessagesScreen } from './screens/MessagesScreen';
import { PlansScreen } from './screens/PlansScreen';
import { MoreScreen } from './screens/MoreScreen';
import { hideSplash, registerNativePush, isNative } from './utils/native';

function AppContent() {
  const [activeTab, setActiveTab] = useState<TabId>('home');
  const [showBibleAI, setShowBibleAI] = useState(false);
  const { userProfile, setup, saveSetup } = useUser();
  const { selection } = useScriptureSelection();

  // Show PathwayPicker if no persona set, first run, or every 10th open
  // BUT skip entirely during Sunday window (Sat 6pm – end of Sunday)
  const [showPathway, setShowPathway] = useState(() => {
    const now = new Date();
    const day = now.getDay();
    const hour = now.getHours();
    const isSundayWindow = day === 0 || (day === 6 && hour >= 18);
    if (isSundayWindow) return false; // people heading to church — no gate
    const v7Done = localStorage.getItem('dw_v7_pathway_done');
    if (!setup?.persona || !v7Done) return true;
    const count = parseInt(localStorage.getItem('dw_open_count') || '0', 10) + 1;
    localStorage.setItem('dw_open_count', String(count));
    return count % 10 === 0;
  });

  function handlePathwaySelect(persona: Persona) {
    saveSetup({ persona, source: setup?.source || '' });
    localStorage.setItem('dw_v7_pathway_done', 'true');
    setShowPathway(false);
  }

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
    home: <HomeScreen onNavigate={setActiveTab} />,
    journal: <JournalScreen />,
    messages: <MessagesScreen />,
    plans: <PlansScreen />,
    more: <MoreScreen />,
  };

  // Full-screen pathway picker — renders INSTEAD of app when needed
  if (showPathway) {
    return <PathwayPicker onSelect={handlePathwaySelect} currentPersona={setup?.persona} />;
  }

  return (
    <div style={{ height: '100%', width: '100%', position: 'relative', background: 'var(--dw-canvas)' }}>
      {screens[activeTab]}
      <TabBar activeTab={activeTab} onTabChange={setActiveTab} />
      <EmailGate />
      <BibleAI
        isOpen={showBibleAI}
        onClose={() => setShowBibleAI(false)}
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
