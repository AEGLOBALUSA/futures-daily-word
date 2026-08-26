/**
 * Reusable listen button — drop next to any text block to add audio playback.
 * Uses the global AudioPlayer (single Audio element, iOS-safe).
 *
 * Play/Pause toggle in one button with animated equalizer wave when playing.
 *
 * Usage:
 * <ListenButton text="The Lord is my shepherd..." />
 * <ListenButton text={longText} size="lg" label="Listen to all" />
 */
import { useState, useEffect, useRef } from 'react';
import { Headphones, Pause, Play, Loader2 } from 'lucide-react';
import { AudioWave } from './AudioWave';
import { t, getLang } from '../utils/i18n';
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
  const [paused, setPaused] = useState(false);
  const [loading, setLoading] = useState(false);

  // Subscribe to global player state
  useEffect(() => {
    return AP.onStateChange((st, passage) => {
      const mine = passage === keyRef.current;
      setPlaying(st === 'playing' && mine);
      setPaused(st === 'paused' && mine);
      setLoading(st === 'loading' && mine);
    });
  }, []);

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();

    // Pause keeps the position — the old stop() discarded it, so "pausing" an
    // 8-minute listen restarted from 0:00 (and re-billed TTS on the re-fetch).
    if (AP.isPlaying(keyRef.current)) {
      AP.pause();
      return;
    }
    if (AP.isPaused(keyRef.current)) {
      await AP.resume();
      return;
    }

    if (!text.trim()) return;

    const activeTranslation = translation || localStorage.getItem('dw_translation') || 'ESV';

    AP.setMediaSession({ title: passageRef || label || t('daily_word_title', getLang()) });
    try {
      await AP.play(keyRef.current, text.slice(0, 20000), activeTranslation, passageRef);
    } catch {
      AP.stop();
    }
  };

  const accentColor = color || 'var(--dw-accent)';
  const lang = getLang();
  const idleLabel = label || t('listen_now', lang);
  const playingLabel = label ? label : t('pause', lang) || 'Pause';
  const pausedLabel = label ? label : t('paused_label', lang);
  // State-aware accessible name — a static "Toggle audio" told SR users
  // nothing about what pressing it would do.
  const ariaLabel = loading ? t('j_loading', lang)
    : playing ? t('pause', lang)
    : idleLabel;

  if (size === 'lg') {
    return (
      <button aria-label={ariaLabel}
        onClick={handleClick}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          padding: '16px 20px',
          background: playing ? accentColor : 'transparent',
          border: `1.5px solid ${playing || loading || paused ? accentColor : 'var(--dw-border)'}`,
          borderRadius: 14,
          cursor: 'pointer',
          color: playing || loading ? '#fff' : 'var(--dw-text-primary)',
          fontSize: 16,
          fontWeight: 600,
          fontFamily: 'var(--font-sans)',
          transition: 'all 0.15s',
          minHeight: 52,
          boxShadow: 'none',
        }}
      >
        {loading ? (
          <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> {t('j_loading', lang)}…</>
        ) : playing ? (
          <><AudioWave height={16} /> <Pause size={16} /> {playingLabel}</>
        ) : paused ? (
          <><Play size={16} /> {pausedLabel}</>
        ) : (
          <><Headphones size={16} /> {idleLabel}</>
        )}
      </button>
    );
  }

  if (size === 'md') {
    return (
      <button aria-label={ariaLabel}
        onClick={handleClick}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          padding: '6px 12px',
          background: playing || loading ? accentColor : 'var(--dw-surface, #f5f5f5)',
          border: `1px solid ${playing || loading || paused ? accentColor : 'var(--dw-text-muted, #888)'}`,
          borderRadius: 999,
          cursor: 'pointer',
          color: playing || loading ? '#fff' : 'var(--dw-text-primary, #333)',
          fontSize: 12,
          fontWeight: 500,
          fontFamily: 'var(--font-sans)',
          transition: 'all 0.15s',
          minHeight: 32,
          flexShrink: 0,
        }}
      >
        {loading ? (
          <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> {t('j_loading', lang)}…</>
        ) : playing ? (
          <><AudioWave height={12} /> <Pause size={12} /></>
        ) : paused ? (
          <><Play size={14} /> {pausedLabel}</>
        ) : (
          <><Headphones size={14} /> {idleLabel}</>
        )}
      </button>
    );
  }

  // sm — icon only
  return (
    <button aria-label={ariaLabel}
      onClick={handleClick}
      title={playing ? t('pause', lang) : paused ? t('resume_label', lang) : t('j_listen', lang)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 28,
        height: 28,
        padding: 0,
        background: playing || loading ? accentColor : 'transparent',
        border: 'none',
        borderRadius: '50%',
        cursor: 'pointer',
        color: playing || loading ? '#fff' : 'var(--dw-text-muted)',
        transition: 'all 0.15s',
        flexShrink: 0,
      }}
    >
      {loading ? (
        <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
      ) : playing ? (
        <AudioWave bars={3} height={12} />
      ) : paused ? (
        <Play size={13} />
      ) : (
        <Headphones size={13} />
      )}
    </button>
  );
}
