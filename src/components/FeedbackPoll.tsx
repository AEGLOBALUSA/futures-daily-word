/**
 * FeedbackPoll — floating "Help Us Improve" button that opens a 2-question modal.
 * Responses go to Supabase via /api/poll. Auto-hides after submission or after
 * the poll window expires (7 days from POLL_START).
 */
import { useState, useEffect } from 'react';
import { X, CheckCircle, MessageCircle } from 'lucide-react';

// ── Poll configuration ──
const POLL_VERSION = 'v1';
const POLL_START = new Date('2026-03-14T00:00:00Z'); // poll goes live
const POLL_DAYS = 7; // auto-expires after 7 days
const POLL_END = new Date(POLL_START.getTime() + POLL_DAYS * 86400000);
const LS_KEY = `dw_poll_submitted_${POLL_VERSION}`;

// ── Questions ──
const Q1_OPTIONS = [
  { id: 'clean', label: "It's clean and easy to use" },
  { id: 'busy', label: 'It feels a bit busy' },
  { id: 'lost', label: "I'm not sure where to find things" },
  { id: 'redesign', label: 'It needs a full redesign' },
];

const Q2_OPTIONS = [
  { id: 'devotion', label: "Today's devotion" },
  { id: 'campus', label: 'My campus' },
  { id: 'events', label: 'Upcoming events' },
  { id: 'giving', label: 'Giving' },
  { id: 'sermon', label: 'Sermon / message' },
  { id: 'prayer', label: 'Prayer requests' },
  { id: 'plan', label: 'Bible reading plan' },
  { id: 'community', label: 'Community / connection' },
];

interface Props {
  userCampus?: string | null;
}

export function FeedbackPoll({ userCampus }: Props) {
  const [visible, setVisible] = useState(false);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'q1' | 'q2' | 'done'>(() => {
    // If already submitted, don't show
    if (localStorage.getItem(LS_KEY)) return 'done';
    return 'q1';
  });
  const [q1, setQ1] = useState<string | null>(null);
  const [q2, setQ2] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  // Show the floating button after 1.5s delay, only if poll is active
  useEffect(() => {
    const now = new Date();
    if (now < POLL_START || now > POLL_END) return;
    if (localStorage.getItem(LS_KEY)) return;

    const timer = setTimeout(() => setVisible(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  // Poll expired or not yet visible — render nothing
  if (!visible) return null;

  const toggleQ2 = (id: string) => {
    setQ2(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < 3) {
        next.add(id);
      }
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!q1 || q2.size === 0) return;
    setSubmitting(true);
    try {
      await fetch('/api/poll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          poll_version: POLL_VERSION,
          campus: userCampus || null,
          home_clutter: q1,
          home_priority: [...q2],
        }),
      });
    } catch {
      // Silent fail — still mark as submitted so we don't nag
    }
    localStorage.setItem(LS_KEY, new Date().toISOString());
    setStep('done');
    setSubmitting(false);
    // Close modal after brief success state
    setTimeout(() => {
      setOpen(false);
      setVisible(false);
    }, 2000);
  };

  // ── Inline banner card ──
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '12px 16px',
          marginTop: 12,
          marginBottom: 4,
          background: '#0A84FF',
          color: '#fff',
          border: 'none',
          borderRadius: 12,
          fontSize: 14,
          fontWeight: 600,
          boxShadow: '0 4px 14px rgba(10,132,255,0.4)',
          fontFamily: 'var(--font-sans)',
          cursor: 'pointer',
          textAlign: 'left',
          animation: 'fadeIn 0.4s ease',
        }}
      >
        <MessageCircle size={16} style={{ flexShrink: 0 }} />
        <span style={{ flex: 1 }}>Help us improve — quick 2-question survey</span>
        <span style={{ fontSize: 11, opacity: 0.6, flexShrink: 0 }}>Tap</span>
      </button>
    );
  }

  // ── Modal ──
  return (
    <>
      {/* Backdrop */}
      <div
        onClick={() => setOpen(false)}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          zIndex: 1000, animation: 'fadeIn 0.2s ease',
        }}
      />

      {/* Modal panel */}
      <div style={{
        position: 'fixed',
        bottom: 0, left: 0, right: 0,
        maxHeight: '85vh',
        background: 'var(--dw-canvas)',
        borderRadius: '22px 22px 0 0',
        zIndex: 1001,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: '0 -8px 48px rgba(0,0,0,0.28)',
        animation: 'slideUp 0.3s ease',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '18px 20px 14px',
          borderBottom: '1px solid var(--dw-border)',
        }}>
          <div>
            <p style={{
              fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 400,
              color: 'var(--dw-text-primary)', margin: 0,
            }}>
              Help Us Improve
            </p>
            <p style={{
              fontFamily: 'var(--font-sans)', fontSize: 12,
              color: 'var(--dw-text-muted)', margin: '4px 0 0',
            }}>
              Quick anonymous survey · 2 questions
            </p>
          </div>
          <button
            onClick={() => setOpen(false)}
            style={{ background: 'none', border: 'none', color: 'var(--dw-text-muted)', cursor: 'pointer', padding: 4 }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 32px' }}>
          {step === 'done' ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <CheckCircle size={40} style={{ color: 'var(--dw-accent)', marginBottom: 12 }} />
              <p style={{ fontFamily: 'var(--font-serif)', fontSize: 20, color: 'var(--dw-text-primary)', margin: '0 0 8px' }}>
                Thank you!
              </p>
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--dw-text-muted)' }}>
                Your feedback helps us build something better for our church family.
              </p>
            </div>
          ) : step === 'q1' ? (
            <>
              {/* Step indicator */}
              <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
                <div style={{ flex: 1, height: 3, borderRadius: 2, background: 'var(--dw-accent)' }} />
                <div style={{ flex: 1, height: 3, borderRadius: 2, background: 'var(--dw-border)' }} />
              </div>

              <p style={{
                fontFamily: 'var(--font-serif-text)', fontSize: 17, fontWeight: 500,
                color: 'var(--dw-text-primary)', marginBottom: 16, lineHeight: 1.4,
              }}>
                How do you feel about the home screen?
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {Q1_OPTIONS.map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => setQ1(opt.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '14px 16px',
                      background: q1 === opt.id ? 'var(--dw-accent)' : 'var(--dw-surface)',
                      color: q1 === opt.id ? '#fff' : 'var(--dw-text-primary)',
                      border: q1 === opt.id ? '2px solid var(--dw-accent)' : '1px solid var(--dw-border)',
                      borderRadius: 12,
                      fontSize: 14,
                      fontFamily: 'var(--font-sans)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s',
                      minHeight: 48,
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              <button
                onClick={() => q1 && setStep('q2')}
                disabled={!q1}
                style={{
                  width: '100%', marginTop: 20,
                  padding: '14px 20px',
                  background: q1 ? 'var(--dw-accent)' : 'var(--dw-surface)',
                  color: q1 ? '#fff' : 'var(--dw-text-muted)',
                  border: 'none', borderRadius: 12,
                  fontSize: 14, fontWeight: 600,
                  fontFamily: 'var(--font-sans)',
                  cursor: q1 ? 'pointer' : 'default',
                  opacity: q1 ? 1 : 0.5,
                }}
              >
                Next
              </button>
            </>
          ) : (
            <>
              {/* Step indicator */}
              <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
                <div style={{ flex: 1, height: 3, borderRadius: 2, background: 'var(--dw-accent)' }} />
                <div style={{ flex: 1, height: 3, borderRadius: 2, background: 'var(--dw-accent)' }} />
              </div>

              <p style={{
                fontFamily: 'var(--font-serif-text)', fontSize: 17, fontWeight: 500,
                color: 'var(--dw-text-primary)', marginBottom: 6, lineHeight: 1.4,
              }}>
                What matters most to you on the home screen?
              </p>
              <p style={{
                fontFamily: 'var(--font-sans)', fontSize: 12,
                color: 'var(--dw-text-muted)', marginBottom: 16,
              }}>
                Pick your top 3
              </p>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {Q2_OPTIONS.map(opt => {
                  const selected = q2.has(opt.id);
                  const maxed = q2.size >= 3 && !selected;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => toggleQ2(opt.id)}
                      disabled={maxed}
                      style={{
                        padding: '10px 16px',
                        background: selected ? 'var(--dw-accent)' : 'var(--dw-surface)',
                        color: selected ? '#fff' : maxed ? 'var(--dw-text-faint)' : 'var(--dw-text-primary)',
                        border: selected ? '2px solid var(--dw-accent)' : '1px solid var(--dw-border)',
                        borderRadius: 999,
                        fontSize: 13,
                        fontFamily: 'var(--font-sans)',
                        fontWeight: selected ? 600 : 400,
                        cursor: maxed ? 'default' : 'pointer',
                        opacity: maxed ? 0.4 : 1,
                        transition: 'all 0.15s',
                      }}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                <button
                  onClick={() => setStep('q1')}
                  style={{
                    flex: 1, padding: '14px 20px',
                    background: 'var(--dw-surface)',
                    color: 'var(--dw-text-secondary)',
                    border: '1px solid var(--dw-border)', borderRadius: 12,
                    fontSize: 14, fontWeight: 500,
                    fontFamily: 'var(--font-sans)', cursor: 'pointer',
                  }}
                >
                  Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={q2.size === 0 || submitting}
                  style={{
                    flex: 2, padding: '14px 20px',
                    background: q2.size > 0 ? 'var(--dw-accent)' : 'var(--dw-surface)',
                    color: q2.size > 0 ? '#fff' : 'var(--dw-text-muted)',
                    border: 'none', borderRadius: 12,
                    fontSize: 14, fontWeight: 600,
                    fontFamily: 'var(--font-sans)',
                    cursor: q2.size > 0 ? 'pointer' : 'default',
                    opacity: q2.size > 0 ? 1 : 0.5,
                  }}
                >
                  {submitting ? 'Sending...' : 'Submit'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
      `}</style>
    </>
  );
}
