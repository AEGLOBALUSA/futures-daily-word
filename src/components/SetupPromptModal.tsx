import { useState } from 'react';
import { X, BookOpen, Headphones, Check, ChevronRight } from 'lucide-react';
import { PLAN_CATALOGUE } from '../data/plans';
import { getLang, tField } from '../utils/i18n';

interface Props {
  onComplete: (chaptersPerDay: number, planIds: string[]) => void;
  onDismiss: () => void;
}

const CHAPTER_OPTIONS = [1, 2, 3, 4, 5];

// Default featured plans (shown for all personas)
const DEFAULT_FEATURED = [
  'ashley-jane-daily-word',
  'faith-pathway',
  'gospel-john',
  'psalms-30',
  'prayer-life',
  'acts-28',
];

// Persona-specific plans surfaced at the top (V7 + legacy)
const PERSONA_PLANS: Record<string, string[]> = {
  new_to_faith: ['ashley-jane-daily-word', 'faith-pathway', 'gospel-john', 'acts-28', 'prayer-life', 'armor-of-god'],
  congregation: ['ashley-jane-daily-word', 'faith-pathway', 'gospel-john', 'psalms-30', 'prayer-life', 'acts-28'],
  deeper_study: ['nt-60', 'wisdom-lit', 'gospels-89', 'through-bible-year', 'psalms-proverbs'],
  pastor_leader: ['book-church', 'gospels-acts', 'nt-60', 'faith-pathway', 'acts-28'],
  comfort: ['psalms-30', 'prayer-life', 'armor-of-god', 'faith-pathway', 'psalms-proverbs'],
  new_returning: ['ashley-jane-daily-word', 'faith-pathway', 'gospel-john', 'acts-28', 'prayer-life', 'armor-of-god'],
  pastor: ['book-church', 'gospels-acts', 'nt-60', 'faith-pathway', 'acts-28'],
  deeper: ['nt-60', 'wisdom-lit', 'gospels-89', 'through-bible-year', 'psalms-proverbs'],
  difficult: ['psalms-30', 'prayer-life', 'armor-of-god', 'faith-pathway', 'psalms-proverbs'],
};

// Persona-friendly label for plan step header
const PERSONA_LABELS: Record<string, string> = {
  new_to_faith: 'Plans for your faith journey',
  congregation: 'Plans for your daily walk',
  deeper_study: 'Plans for going deeper',
  pastor_leader: 'Plans for ministry & leadership',
  comfort: 'Plans for your current season',
  new_returning: 'Plans for your faith journey',
  pastor: 'Plans for ministry & leadership',
  deeper: 'Plans for going deeper',
  difficult: 'Plans for your current season',
};

export function SetupPromptModal({ onComplete, onDismiss }: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [chapters, setChapters] = useState(2);
  const [selectedPlans, setSelectedPlans] = useState<string[]>([]);
  const lang = getLang();

  const persona = (() => {
    try { return JSON.parse(localStorage.getItem('dw_setup') || '{}').persona || ''; } catch { return ''; }
  })();

  const featuredIds = PERSONA_PLANS[persona] || DEFAULT_FEATURED;
  const featuredPlans = featuredIds.map(id => PLAN_CATALOGUE.find(p => p.id === id)).filter(Boolean) as typeof PLAN_CATALOGUE;
  const otherPlans = PLAN_CATALOGUE.filter(p => !featuredIds.includes(p.id));
  const planStepLabel = PERSONA_LABELS[persona] || 'Pick a reading plan';

  const togglePlan = (id: string) => {
    setSelectedPlans(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const handleDone = () => {
    onComplete(chapters, selectedPlans);
  };

  return (
    // Backdrop
    <div
      onClick={onDismiss}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(4px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
      }}
    >
      {/* Sheet — stops backdrop click */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 480,
          background: 'var(--dw-surface)',
          borderRadius: '20px 20px 0 0',
          padding: '0 0 32px',
          maxHeight: '88vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Handle + header */}
        <div style={{ padding: '12px 20px 0', flexShrink: 0 }}>
          <div style={{
            width: 36, height: 4, borderRadius: 2,
            background: 'var(--dw-border)',
            margin: '0 auto 16px',
          }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)', textTransform: 'uppercase' }}>
              {step === 1 ? 'Step 1 of 2' : step === 2 ? 'Step 2 of 2' : 'All set'}
            </span>
            <button
              onClick={onDismiss}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--dw-text-muted)', padding: 4, display: 'flex', alignItems: 'center' }}
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
          <h2 style={{
            fontSize: 22, fontWeight: 700, color: 'var(--dw-text-primary)',
            fontFamily: 'var(--font-sans)', margin: '0 0 4px',
          }}>
            {step === 1 && 'How much do you want to read?'}
            {step === 2 && planStepLabel}
            {step === 3 && 'You\'re ready to go!'}
          </h2>
          <p style={{ fontSize: 14, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)', margin: '0 0 20px' }}>
            {step === 1 && 'Choose how many chapters to read each day. You can change this anytime.'}
            {step === 2 && 'A plan keeps you on track. Pick one or skip for now.'}
            {step === 3 && 'Your daily reading is set up. Tap Listen to hear it now.'}
          </p>

          {/* Step indicators */}
          {step < 3 && (
            <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
              {[1, 2].map(s => (
                <div key={s} style={{
                  height: 3, flex: 1, borderRadius: 2,
                  background: s <= step ? 'var(--dw-accent)' : 'var(--dw-border)',
                  transition: 'background 0.3s',
                }} />
              ))}
            </div>
          )}
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px' }}>

          {/* ── Step 1: Chapters per day ── */}
          {step === 1 && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 24 }}>
                {CHAPTER_OPTIONS.map(n => (
                  <button
                    key={n}
                    onClick={() => setChapters(n)}
                    style={{
                      aspectRatio: '1',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: chapters === n ? 'var(--dw-accent)' : 'var(--dw-surface-hover)',
                      border: chapters === n ? 'none' : '1px solid var(--dw-border)',
                      borderRadius: 12,
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      gap: 2,
                    }}
                  >
                    <span style={{ fontSize: 24, fontWeight: 700, color: chapters === n ? '#fff' : 'var(--dw-text-primary)', fontFamily: 'var(--font-sans)' }}>
                      {n}
                    </span>
                    <span style={{ fontSize: 10, color: chapters === n ? 'rgba(255,255,255,0.75)' : 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)', fontWeight: 500 }}>
                      {n === 1 ? 'chapter' : 'chapters'}
                    </span>
                  </button>
                ))}
              </div>

              {/* Time estimate */}
              <div style={{
                background: 'var(--dw-accent-bg)',
                border: '1px solid var(--dw-accent)',
                borderRadius: 10,
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                marginBottom: 8,
              }}>
                <Headphones size={16} style={{ color: 'var(--dw-accent)', flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: 'var(--dw-accent)', fontFamily: 'var(--font-sans)', fontWeight: 500 }}>
                  About {chapters * 4}–{chapters * 6} min to listen · {chapters * 3}–{chapters * 5} min to read
                </span>
              </div>
            </div>
          )}

          {/* ── Step 2: Pick a plan ── */}
          {step === 2 && (
            <div>
              {/* Featured */}
              <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: 'var(--dw-text-muted)', textTransform: 'uppercase', fontFamily: 'var(--font-sans)', marginBottom: 10 }}>
                {persona ? 'Recommended for you' : 'Popular'}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                {featuredPlans.map(plan => {
                  const active = selectedPlans.includes(plan.id);
                  return (
                    <button
                      key={plan.id}
                      onClick={() => togglePlan(plan.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '12px 14px',
                        background: active ? 'var(--dw-accent-bg)' : 'var(--dw-surface-hover)',
                        border: active ? '1px solid var(--dw-accent)' : '1px solid var(--dw-border)',
                        borderRadius: 12,
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.15s',
                        width: '100%',
                      }}
                    >
                      <div style={{
                        width: 24, height: 24, borderRadius: 6,
                        background: active ? 'var(--dw-accent)' : 'var(--dw-border)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0, transition: 'all 0.15s',
                      }}>
                        {active && <Check size={14} color="#fff" />}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--dw-text-primary)', fontFamily: 'var(--font-sans)', margin: 0 }}>
                          {tField(plan, 'title', lang)}
                        </p>
                        <p style={{ fontSize: 12, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)', margin: '2px 0 0' }}>
                          {plan.totalDays} days · {plan.category}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Other plans */}
              {otherPlans.length > 0 && (
                <>
                  <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: 'var(--dw-text-muted)', textTransform: 'uppercase', fontFamily: 'var(--font-sans)', marginBottom: 10 }}>
                    More Plans
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                    {otherPlans.map(plan => {
                      const active = selectedPlans.includes(plan.id);
                      return (
                        <button
                          key={plan.id}
                          onClick={() => togglePlan(plan.id)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            padding: '12px 14px',
                            background: active ? 'var(--dw-accent-bg)' : 'var(--dw-surface-hover)',
                            border: active ? '1px solid var(--dw-accent)' : '1px solid var(--dw-border)',
                            borderRadius: 12,
                            cursor: 'pointer',
                            textAlign: 'left',
                            transition: 'all 0.15s',
                            width: '100%',
                          }}
                        >
                          <div style={{
                            width: 24, height: 24, borderRadius: 6,
                            background: active ? 'var(--dw-accent)' : 'var(--dw-border)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0,
                          }}>
                            {active && <Check size={14} color="#fff" />}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--dw-text-primary)', fontFamily: 'var(--font-sans)', margin: 0 }}>
                              {tField(plan, 'title', lang)}
                            </p>
                            <p style={{ fontSize: 12, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)', margin: '2px 0 0' }}>
                              {plan.totalDays} days · {plan.category}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── Step 3: Done ── */}
          {step === 3 && (
            <div style={{ textAlign: 'center', padding: '16px 0 8px' }}>
              <div style={{
                width: 64, height: 64, borderRadius: '50%',
                background: 'var(--dw-accent)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px',
              }}>
                <BookOpen size={28} color="#fff" />
              </div>
              <p style={{ fontSize: 15, color: 'var(--dw-text-secondary)', fontFamily: 'var(--font-sans)', lineHeight: 1.6, marginBottom: 8 }}>
                <strong>{chapters} chapter{chapters > 1 ? 's' : ''} per day</strong>
                {selectedPlans.length > 0 && (
                  <> · <strong>{selectedPlans.length} plan{selectedPlans.length > 1 ? 's' : ''} started</strong></>
                )}
              </p>
              <p style={{ fontSize: 13, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)' }}>
                Your reading will appear on the home screen every day.
              </p>
            </div>
          )}
        </div>

        {/* Footer CTA */}
        <div style={{ padding: '16px 20px 0', flexShrink: 0 }}>
          {step === 1 && (
            <button
              onClick={() => setStep(2)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: 8, background: 'var(--dw-accent)', border: 'none', borderRadius: 12,
                padding: '14px 20px', fontSize: 15, fontWeight: 700, cursor: 'pointer',
                color: '#fff', fontFamily: 'var(--font-sans)', minHeight: 50,
              }}
            >
              Next <ChevronRight size={18} />
            </button>
          )}
          {step === 2 && (
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setStep(1)}
                style={{
                  flex: 1, background: 'var(--dw-surface-hover)', border: '1px solid var(--dw-border)',
                  borderRadius: 12, padding: '14px', fontSize: 14, fontWeight: 600,
                  cursor: 'pointer', color: 'var(--dw-text-secondary)', fontFamily: 'var(--font-sans)', minHeight: 50,
                }}
              >
                Back
              </button>
              <button
                onClick={() => setStep(3)}
                style={{
                  flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  gap: 8, background: 'var(--dw-accent)', border: 'none', borderRadius: 12,
                  padding: '14px 20px', fontSize: 15, fontWeight: 700, cursor: 'pointer',
                  color: '#fff', fontFamily: 'var(--font-sans)', minHeight: 50,
                }}
              >
                {selectedPlans.length > 0 ? `Start ${selectedPlans.length} Plan${selectedPlans.length > 1 ? 's' : ''}` : 'Skip Plans'}
                <ChevronRight size={18} />
              </button>
            </div>
          )}
          {step === 3 && (
            <button
              onClick={handleDone}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: 8, background: 'var(--dw-accent)', border: 'none', borderRadius: 12,
                padding: '14px 20px', fontSize: 15, fontWeight: 700, cursor: 'pointer',
                color: '#fff', fontFamily: 'var(--font-sans)', minHeight: 50,
              }}
            >
              <Headphones size={18} /> Let's Go
            </button>
          )}

          {step === 1 && (
            <button
              onClick={onDismiss}
              style={{
                width: '100%', background: 'none', border: 'none', padding: '12px',
                fontSize: 13, color: 'var(--dw-text-muted)', cursor: 'pointer',
                fontFamily: 'var(--font-sans)', marginTop: 4,
              }}
            >
              Skip for now
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
