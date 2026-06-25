import { useEffect } from 'react';
import { Check } from 'lucide-react';

/**
 * A calm "you've read today's Word" moment, shown when the user deliberately marks
 * today's reading done. Auto-dismisses after a few seconds or on tap. Milestone days
 * are handled separately by the existing milestone modal — this is the everyday close.
 */
export function DoneCelebration({ streakCount, onClose }: { streakCount: number; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3600);
    return () => clearTimeout(t);
  }, [onClose]);

  const message =
    streakCount >= 2
      ? `${streakCount} days and counting — you're building something.`
      : 'You showed up today. That’s how it starts.';

  return (
    <div
      onClick={onClose}
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9998,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        background: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(3px)',
        WebkitBackdropFilter: 'blur(3px)',
        animation: 'dwFadeIn 0.25s ease-out',
      }}
    >
      <div
        className="dw-done-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 340,
          width: '100%',
          textAlign: 'center',
          padding: '32px 24px 22px',
          borderRadius: 22,
          background: 'var(--dw-surface)',
          border: '1px solid var(--dw-border)',
          boxShadow: '0 18px 60px rgba(0,0,0,0.45)',
          animation: 'dwPopIn 0.34s cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        <div
          aria-hidden="true"
          style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            margin: '0 auto 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--dw-success)',
            boxShadow: '0 0 0 8px rgba(62,107,74,0.15)',
          }}
        >
          <Check size={32} color="#fff" strokeWidth={3} />
        </div>
        <p
          style={{
            fontSize: 21,
            fontWeight: 700,
            fontFamily: 'var(--font-serif-text, Georgia, serif)',
            color: 'var(--dw-text-primary)',
            margin: '0 0 6px',
          }}
        >
          Today&rsquo;s reading, done.
        </p>
        <p
          style={{
            fontSize: 14,
            color: 'var(--dw-text-muted)',
            fontFamily: 'var(--font-sans)',
            margin: '0 0 18px',
            lineHeight: 1.5,
          }}
        >
          {message}
        </p>
        {streakCount >= 2 && (
          <p
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: 'var(--dw-accent)',
              fontFamily: 'var(--font-sans)',
              margin: '0 0 18px',
            }}
          >
            🔥 {streakCount}-day streak
          </p>
        )}
        <button
          onClick={onClose}
          style={{
            width: '100%',
            padding: '12px',
            borderRadius: 12,
            border: 'none',
            background: 'var(--dw-accent)',
            color: '#fff',
            fontSize: 15,
            fontWeight: 700,
            fontFamily: 'var(--font-sans)',
            cursor: 'pointer',
          }}
        >
          Amen
        </button>
      </div>
    </div>
  );
}
