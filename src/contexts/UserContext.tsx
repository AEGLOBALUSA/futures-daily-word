/**
 * User profile context — manages auth, profile, persona, and email gate.
 * Preserves all v1 localStorage keys: dw_setup, dw_profile, dw_profile_pic
 */
import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type { ReactNode } from 'react';
import { PERSONA_MIGRATION } from '../utils/persona-config';

export interface UserProfile {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  church: string;
  city: string;
  campus: string;
}

export interface SetupState {
  persona: string;
  source: string;
}

interface UserContextType {
  userProfile: UserProfile | null;
  setup: SetupState | null;
  profilePic: string;
  isAuthenticated: boolean;
  showEmailGate: boolean;
  requireEmail: (callback?: () => void) => void;
  setShowEmailGate: (show: boolean) => void;
  saveProfile: (profile: UserProfile) => void;
  saveSetup: (setup: SetupState) => void;
  setProfilePic: (pic: string) => void;
  emailGateCallback: React.MutableRefObject<(() => void) | null>;
}

const UserContext = createContext<UserContextType>({
  userProfile: null,
  setup: null,
  profilePic: '',
  isAuthenticated: false,
  showEmailGate: false,
  requireEmail: () => {},
  setShowEmailGate: () => {},
  saveProfile: () => {},
  saveSetup: () => {},
  setProfilePic: () => {},
  emailGateCallback: { current: null },
});

export function UserProvider({ children }: { children: ReactNode }) {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(() => {
    try {
      return JSON.parse(localStorage.getItem('dw_profile') || 'null');
    } catch { return null; }
  });

  const [setup, setSetup] = useState<SetupState | null>(() => {
    try {
      return JSON.parse(localStorage.getItem('dw_setup') || 'null');
    } catch { return null; }
  });

  const [profilePic, setProfilePicState] = useState(() =>
    localStorage.getItem('dw_profile_pic') || ''
  );

  const [showEmailGate, setShowEmailGate] = useState(false);
  const emailGateCallback = useRef<(() => void) | null>(null);

  const isAuthenticated = !!(userProfile?.email);

  // ── V7 persona migration: map old persona values to new ones ──
  useEffect(() => {
    if (!setup?.persona) return;
    const migrated = PERSONA_MIGRATION[setup.persona];
    if (migrated && migrated !== setup.persona) {
      const updated = { ...setup, persona: migrated };
      localStorage.setItem('dw_setup', JSON.stringify(updated));
      setSetup(updated);
    }
  }, []); // Run once on mount

  // Heartbeat + server sync on startup
  useEffect(() => {
    if (!userProfile?.email) return;

    const persona = setup?.persona || '';
    const lang = localStorage.getItem('dw_lang') || 'en';

    // Heartbeat
    fetch('/api/user-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'heartbeat', email: userProfile.email, persona, lang }),
    }).catch(() => {});

    // Sync profile from server
    fetch('/api/user-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'get', email: userProfile.email }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.profile) {
          const server = data.profile;
          const merged: UserProfile = {
            firstName: server.firstName || userProfile.firstName || '',
            lastName: server.lastName || userProfile.lastName || '',
            email: server.email || userProfile.email,
            phone: server.phone || userProfile.phone || '',
            church: server.church || userProfile.church || '',
            city: server.city || userProfile.city || '',
            campus: server.campus || userProfile.campus || '',
          };
          if (JSON.stringify(merged) !== JSON.stringify(userProfile)) {
            localStorage.setItem('dw_profile', JSON.stringify(merged));
            setUserProfile(merged);
          }
        }
      })
      .catch(() => {});
  }, [userProfile?.email, setup]);

  // Show email gate for first-time users
  useEffect(() => {
    if (!setup) return;
    if (userProfile?.email) return; // Skip for returning users
    setShowEmailGate(true);
  }, [setup]);

  const requireEmail = useCallback((callback?: () => void) => {
    if (userProfile?.email) {
      callback?.();
      return;
    }
    emailGateCallback.current = callback || null;
    setShowEmailGate(true);
  }, [userProfile]);

  const saveProfile = useCallback((profile: UserProfile) => {
    localStorage.setItem('dw_profile', JSON.stringify(profile));
    setUserProfile(profile);
  }, []);

  const saveSetup = useCallback((s: SetupState) => {
    localStorage.setItem('dw_setup', JSON.stringify(s));
    setSetup(s);
  }, []);

  const setProfilePic = useCallback((pic: string) => {
    try { localStorage.setItem('dw_profile_pic', pic); } catch { /* quota */ }
    setProfilePicState(pic);
  }, []);

  return (
    <UserContext.Provider value={{
      userProfile,
      setup,
      profilePic,
      isAuthenticated,
      showEmailGate,
      requireEmail,
      setShowEmailGate,
      saveProfile,
      saveSetup,
      setProfilePic,
      emailGateCallback,
    }}>
      {children}
    </UserContext.Provider>
  );
}

export const useUser = () => useContext(UserContext);
