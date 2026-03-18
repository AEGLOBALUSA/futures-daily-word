import { useState, useEffect } from 'react';
import { VolumeX } from 'lucide-react';
import * as AP from '../utils/audioPlayer';

/**
 * Floating "Stop All Audio" button.
 * Only visible when audio is playing. Kills everything on tap.
 */
export function StopAllAudio() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    return AP.onStateChange((st) => {
      setVisible(st === 'playing');
    });
  }, []);

  if (!visible) return null;

  return (
    <button
      onClick={(e) => { e.stopPropagation(); AP.stop(); }}
      style={{
        position: 'fixed',
        bottom: 'calc(80px + env(safe-area-inset-bottom, 0px))',
        right: 16,
        zIndex: 999,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        background: '#6B1A22',
        color: '#fff',
        border: 'none',
        borderRadius: 999,
        padding: '10px 18px',
        fontSize: 13,
        fontWeight: 700,
        fontFamily: 'var(--font-sans)',
        cursor: 'pointer',
        boxShadow: '0 4px 20px rgba(107,26,34,0.4)',
        animation: 'stopAllPulse 2s ease-in-out infinite',
        letterSpacing: '0.02em',
      }}
    >
      <VolumeX size={18} />
      Stop All Audio
      <style>{`
        @keyframes stopAllPulse {
          0%, 100% { box-shadow: 0 4px 20px rgba(107,26,34,0.4); }
          50% { box-shadow: 0 4px 28px rgba(107,26,34,0.65); }
        }
      `}</style>
    </button>
  );
}
