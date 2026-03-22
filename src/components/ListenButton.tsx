/**
 * Reusable listen button — drop next to any text block to add audio playback.
 * Uses the global AudioPlayer (single Audio element, iOS-safe).
 *
 * Usage:
 * <ListenButton text="The Lord is my shepherd..." />
 * <ListenButton text={longText} size="lg" label="Listen to all" />
 */
import { useState, useEffect, useRef } from 'react';
import { Volume2, Loader2, Square } from 'lucide-react';
import * as AP from '../utils/audioPlayer';

interface Props {
  /** The text to read aloud */
  text: string;
  /** Optional passage ref for native ESV audio */
  passageRef?: string;
  /** Translation code — defaults to reading from localStorage */
  translation?: string;
  /** Button size: sm = icon only (inline), md = icon + label, lg = full-width bar */
  size?: 'sm' | 'md' | 'lg';
  /** Custom label (only shown for md/lg) */
  label?: string;
  /** Custom accent color */
  color?: string;
}

export function ListenButton({ text, passageRef, translation, size = 'sm', label, color }: Props) {
  const keyRef = useRef(Math.random().toString(36).slice(2));
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);

  // Subscribe to global player state
  useEffect(() => {
    return AP.onStateChange((st, passage) => {
      const mine = passage === keyRef.current;
      setPlaying(st === 'playing' && mine);
      setLoading(st === 'loading' && mine);
    });
  }, []);

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();

    // Toggle off
    if (AP.isPlaying(keyRef.current)) {
      AP.stop();
      return;
    }

    if (!text.trim()) return;

    const activeTranslation = translation || localStorage.getItem('dw_translation') || 'ESV';

    // ── iOS FIX: play() now handles unlock → fetch → play in one call ──
    // unlock() is called synchronously inside play() within this tap gesture,
    // BEFORE any network fetch. This keeps iOS Safari happy.
    try {
      await AP.play(keyRef.current, text.slice(0, 20000), activeTranslation, passageRef);
    } catch {
      AP.stop();
    }
  };

  const accentColor = color || 'var(--dw-accent)';
  const iconSize = size === 'lg' ? 16 : size === 'md' ? 14 : 13;
  const displayLabel = label || (playing ? 'Stop' : 'Listen');

  if (size === 'lg') {
    return (
      <button aria-label="Toggle audio"
        onClick={handleClick}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          padding: '16px 20px',
          background: playing ? accentColor : 'transparent',
          border: `1.5px solid ${playing ? accentColor : 'var(--dw-border)'}`,
          borderRadius: 14,
          cursor: 'pointer',
          color: playing ? '#fff' : 'var(--dw-text-primary)',
          fontSize: 16,
          fontWeight: 600,
          fontFamily: 'var(--font-sans)',
          transition: 'all 0.15s',
          minHeight: 52,
          boxShadow: 'none',
          opacity: playing ? 0.85 : 1,
        }}
      >
        {loading ? (
          <Loader2 size={iconSize} style={{ animation: 'spin 1s linear infinite' }} />
        ) : playing ? (
          <Square size={iconSize} fill="currentColor" />
        ) : (
          <Volume2 size={iconSize} />
        )}
        {displayLabel}
      </button>
    );
  }

  if (size === 'md') {
    return (
      <button aria-label="Toggle audio"
        onClick={handleClick}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          padding: '6px 12px',
          background: playing ? accentColor : 'transparent',
          border: `1px solid ${playing ? accentColor : 'var(--dw-border)'}`,
          borderRadius: 999,
          cursor: 'pointer',
          color: playing ? '#fff' : accentColor,
          fontSize: 12,
          fontWeight: 500,
          fontFamily: 'var(--font-sans)',
          transition: 'all 0.15s',
          minHeight: 32,
          flexShrink: 0,
        }}
      >
        {loading ? (
          <Loader2 size={iconSize} style={{ animation: 'spin 1s linear infinite' }} />
        ) : playing ? (
          <Square size={iconSize - 2} fill="currentColor" />
        ) : (
          <Volume2 size={iconSize} />
        )}
        {displayLabel}
      </button>
    );
  }

  // sm — icon only
  return (
    <button aria-label="Toggle audio"
      onClick={handleClick}
      title={playing ? 'Stop listening' : 'Listen'}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 28,
        height: 28,
        padding: 0,
        background: playing ? accentColor : 'transparent',
        border: 'none',
        borderRadius: '50%',
        cursor: 'pointer',
        color: playing ? '#fff' : 'var(--dw-text-muted)',
        transition: 'all 0.15s',
        flexShrink: 0,
      }}
    >
      {loading ? (
        <Loader2 size={iconSize} style={{ animation: 'spin 1s linear infinite' }} />
      ) : playing ? (
        <Square size={10} fill="currentColor" />
      ) : (
        <Volume2 size={iconSize} />
      )}
    </button>
  );
}

