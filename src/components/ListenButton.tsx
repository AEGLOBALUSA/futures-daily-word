/**
 * Reusable listen button — drop next to any text block to add audio playback.
 * Uses ElevenLabs → Polly → silence (never browser TTS).
 *
 * Usage:
 *   <ListenButton text="The Lord is my shepherd..." />
 *   <ListenButton text={longText} size="lg" label="Listen to all" />
 */
import { useState, useRef } from 'react';
import { Volume2, Loader2, Square } from 'lucide-react';
import { registerAudio } from '../utils/audioManager';

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
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();

    // Toggle off
    if (playing) {
      audioRef.current?.pause();
      audioRef.current = null;
      setPlaying(false);
      return;
    }

    if (!text.trim()) return;

    setLoading(true);
    try {
      const { fetchAudio } = await import('../utils/api');
      const activeTranslation = (translation || localStorage.getItem('dw_translation') || 'ESV') as import('../utils/api').TranslationCode;
      const url = await fetchAudio(text.slice(0, 20000), activeTranslation, passageRef);
      if (url) {
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onended = () => { setPlaying(false); audioRef.current = null; };
        audio.onerror = () => { setPlaying(false); audioRef.current = null; };
        audio.addEventListener('pause', () => { setPlaying(false); audioRef.current = null; });
        registerAudio(audio);
        await audio.play();
        setPlaying(true);
      }
    } catch {
      // silent fail
    } finally {
      setLoading(false);
    }
  };

  const accentColor = color || 'var(--dw-accent)';
  const iconSize = size === 'lg' ? 16 : size === 'md' ? 14 : 13;
  const displayLabel = label || (playing ? 'Stop' : 'Listen');

  if (size === 'lg') {
    return (
      <button
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
      <button
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
    <button
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
