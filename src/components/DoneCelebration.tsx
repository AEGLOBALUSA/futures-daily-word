import { useEffect } from 'react';
import { Check, PartyPopper } from 'lucide-react';

/**
 * A calm "you've read today's Word" moment, shown when the user deliberately marks
 * today's reading done. With `planFinish`, it becomes the bigger "you finished the whole
 * plan" finish-line. Auto-dismisses or on tap. Streak milestones are handled separately
 * by the existing milestone modal.
 */
export function DoneCelebration({
  streakCount,
  planFinish,
  onClose,
}: {
  streakCount: number;
  planFinish?: { title: string; days: number };
  onClose: () => void;
}) {
  const isPlan = !!planFinish;
  useEffect(() => {
    const t = setTimeout(onClose, isPlan ? 5200 : 3600);
    return () => clearTimeout(t);
  }, [onClose, isPlan]);

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
            background: isPlan ? 'var(--dw-gold, #C8906B)' : 'var(--dw-success)',
            boxShadow: isPlan ? '0 0 0 8px rgba(200,144,107,0.18)' : '0 0 0 8px rgba(62,107,74,0.15)',
          }}
        >
          {isPlan ? <PartyPopper size={32} color="#fff" strokeWidth={2.4} /> : <Check size={32} color="#fff" strokeWidth={3} />}
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
          {isPlan ? 'Plan complete 🎉' : <>Today&rsquo;s reading, done.</>}
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
          {planFinish
            ? `${planFinish.title} — ${planFinish.days} days in the Word. You finished.`
            : message}
        </p>
        {!isPlan && streakCount >= 2 && (
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
