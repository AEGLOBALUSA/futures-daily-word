/**
 * ReadingActionBar — a calm, always-reachable toolbar pinned above the tab bar
 * while the expanded chapter is on screen. Keeps the reading actions (note,
 * listen, compare, ask AI, bookmark) one tap away without boxing the scripture
 * itself in chrome — the text scrolls freely, the actions stay put.
 */
import { PenLine, Headphones, Pause, BookCopy, Sparkles, Bookmark, BookmarkCheck } from 'lucide-react';
import { t } from '../utils/i18n';
import { hapticTap } from '../utils/haptics';

interface ReadingActionBarProps {
  playing: boolean;         // hero audio currently playing (not paused)
  canCompare: boolean;      // persona-gated: deeper_study / pastor_leader only
  compareActive: boolean;
  bookmarked: boolean;
  onNote: () => void;
  onListen: () => void;
  onCompare: () => void;
  onAskAI: () => void;
  onBookmark: () => void;
  /** I'm New path — active icons use --dw-new instead of terracotta. */
  newPath?: boolean;
}

export function ReadingActionBar({
  playing, canCompare, compareActive, bookmarked,
  onNote, onListen, onCompare, onAskAI, onBookmark, newPath,
}: ReadingActionBarProps) {
  const items: { key: string; label: string; icon: React.ReactNode; onClick: () => void; active?: boolean }[] = [
    { key: 'note', label: t('note_label'), icon: <PenLine size={18} />, onClick: onNote },
    {
      key: 'listen',
      label: playing ? t('pause_label') : t('listen_label'),
      icon: playing ? <Pause size={18} /> : <Headphones size={18} />,
      onClick: onListen,
      active: playing,
    },
    ...(canCompare ? [{
      key: 'compare',
      label: t('compare_label'),
      icon: <BookCopy size={18} />,
      onClick: onCompare,
      active: compareActive,
    }] : []),
    { key: 'ask-ai', label: t('ask_ai_label'), icon: <Sparkles size={18} />, onClick: onAskAI },
    {
      key: 'bookmark',
      label: bookmarked ? t('bookmarked_label') : t('bookmark_label'),
      icon: bookmarked ? <BookmarkCheck size={18} /> : <Bookmark size={18} />,
      onClick: onBookmark,
      active: bookmarked,
    },
  ];

  return (
    <div
      className="dw-reading-bar"
      role="toolbar"
      aria-label="Reading actions"
      style={{
        position: 'fixed',
        left: '50%',
        transform: 'translateX(-50%)',
        bottom: 'calc(64px + var(--safe-bottom) + 10px)',
        zIndex: 95,
        display: 'flex',
        alignItems: 'stretch',
        width: 'min(calc(100% - 24px), 440px)',
        background: 'var(--dw-card, #FFFFFF)',
        border: '1px solid var(--dw-border)',
        borderRadius: 18,
        boxShadow: '0 8px 28px rgba(30,20,10,0.16)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        padding: '4px 6px',
      }}
    >
      {items.map(item => (
        <button
          key={item.key}
          onClick={() => { hapticTap(); item.onClick(); }}
          aria-label={item.label}
          aria-pressed={item.active || undefined}
          style={{
            flex: 1,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: 3,
            minHeight: 50,
            padding: '6px 2px',
            background: 'transparent',
            border: 'none',
            borderRadius: 12,
            cursor: 'pointer',
            color: item.active ? (newPath ? 'var(--dw-new)' : 'var(--dw-accent)') : 'var(--dw-text-muted)',
            transition: 'color 0.15s ease',
          }}
        >
          {item.icon}
          <span style={{
            fontSize: 10, fontWeight: 600, fontFamily: 'var(--font-sans)',
            letterSpacing: '0.02em', whiteSpace: 'nowrap',
          }}>
            {item.label}
          </span>
        </button>
      ))}
    </div>
  );
}
