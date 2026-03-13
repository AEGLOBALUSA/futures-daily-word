import { useState, useEffect } from 'react';
import { VolumeX } from 'lucide-react';
import { stopAllAudio, onAudioCountChange } from '../utils/audioManager';

/**
 * Floating "Stop All Audio" button.
 * Only visible when ≥1 audio is playing. Kills everything on tap.
 */
export function StopAllAudio() {
  const [count, setCount] = useState(0);

  useEffect(() => onAudioCountChange(setCount), []);

  if (count === 0) return null;

  return (
    <button
      onClick={(e) => { e.stopPropagation(); stopAllAudio(); }}
      style={{
        position: 'fixed',
        bottom: 80,
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
