import { getGreeting } from '../utils/persona-config';
import { useHome } from './HomeContext';
import { useState, useEffect } from 'react';
import { getLang } from '../utils/i18n';

const MILESTONE_STREAKS = [7, 14, 21, 30, 40, 50, 60, 75, 100, 150, 200, 300, 365];

export function GreetingSection() {
  const { personaConfig, userProfile, streakCount } = useHome();
  const greetingText = getGreeting(personaConfig.persona, userProfile?.firstName || '', streakCount, getLang());
  const [showMilestoneCelebration, setShowMilestoneCelebration] = useState(false);

  useEffect(() => {
    if (MILESTONE_STREAKS.includes(streakCount)) {
      const celebrationKey = `dw_streak_celebrated_${streakCount}`;
      const alreadyCelebrated = sessionStorage.getItem(celebrationKey);

      if (!alreadyCelebrated) {
        setShowMilestoneCelebration(true);
      }
    }
  }, [streakCount]);

  const dismissMilestone = () => {
    sessionStorage.setItem(`dw_streak_celebrated_${streakCount}`, 'true');
    setShowMilestoneCelebration(false);
  };

  return (
    <>
      {showMilestoneCelebration && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(215,180,33,0.15) 0%, rgba(215,180,33,0.08) 100%)',
          border: '1px solid rgba(215,180,33,0.3)',
          borderRadius: 14,
          padding: '14px 16px',
          marginBottom: 14,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'relative',
        }}>
          <div style={{ flex: 1 }}>
            <p style={{
              fontSize: 12,
              fontFamily: 'var(--font-sans)',
              fontWeight: 600,
              color: 'var(--dw-text-muted)',
              margin: '0 0 4px',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
            }}>
              🔥 Milestone Reached
            </p>
            <p style={{
              fontSize: 16,
              fontFamily: 'var(--font-serif)',
              color: 'var(--dw-text)',
              margin: 0,
              fontWeight: 500,
            }}>
              You've got a {streakCount}-day streak!
            </p>
            <p style={{
              fontSize: 13,
              fontFamily: 'var(--font-sans)',
              color: 'var(--dw-text-secondary)',
              margin: '6px 0 0',
            }}>
              Keep the momentum going. You're amazing.
            </p>
          </div>
          <button
            onClick={dismissMilestone}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 18,
              color: 'var(--dw-text-muted)',
              cursor: 'pointer',
              padding: 0,
              marginLeft: 12,
              flexShrink: 0,
              opacity: 0.6,
              transition: 'opacity 0.2s',
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '0.6')}
          >
            ✕
          </button>
        </div>
      )}
      <p style={{
        fontFamily: 'var(--font-serif)',
        fontSize: 17,
        color: 'var(--dw-text-secondary)',
        textAlign: 'center',
        marginBottom: 16,
        lineHeight: 1.5,
        letterSpacing: '0.01em',
      }}>
        {greetingText}
      </p>
    </>
  );
}
