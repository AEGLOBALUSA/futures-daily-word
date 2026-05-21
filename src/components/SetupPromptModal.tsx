import { useState } from 'react';
import { X, Check, ChevronRight } from 'lucide-react';
import { PLAN_CATALOGUE } from '../data/plans';
import { getLang, tField } from '../utils/i18n';

interface Props {
  onComplete: (chaptersPerDay: number, planIds: string[]) => void;
  onDismiss: () => void;
}

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

// Persona-friendly header label
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

// Smart default reading volume by persona — set silently, adjustable later in Settings.
// (Replaces the old "How much do you want to read?" onboarding step.)
const PERSONA_CHAPTERS: Record<string, number> = {
  deeper_study: 4, deeper: 4,
  pastor_leader: 4, pastor: 4,
  comfort: 1, difficult: 1,
};

export function SetupPromptModal({ onComplete, onDismiss }: Props) {
  const [selectedPlans, setSelectedPlans] = useState<string[]>([]);
  const lang = getLang();

  const persona = (() => {
    try { return JSON.parse(localStorage.getItem('dw_setup') || '{}').persona || ''; } catch { return ''; }
  })();

  // Reading volume is a smart default now, not an onboarding decision.
  const chapters = PERSONA_CHAPTERS[persona] ?? 2;

  const featuredIds = PERSONA_PLANS[persona] || DEFAULT_FEATURED;
  const featuredPlans = featuredIds.map(id => PLAN_CATALOGUE.find(p => p.id === id)).filter(Boolean) as typeof PLAN_CATALOGUE;
  const otherPlans = PLAN_CATALOGUE.filter(p => !featuredIds.includes(p.id));
  const planLabel = PERSONA_LABELS[persona] || 'Pick a reading plan';

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
              Start reading
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
            {planLabel}
          </h2>
          <p style={{ fontSize: 14, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)', margin: '0 0 20px' }}>
            A plan keeps you on track. Pick one or skip for now.
          </p>
        </div>

        {/* Scrollable content — plan picker */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px' }}>
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

        {/* Footer CTA */}
        <div style={{ padding: '16px 20px 0', flexShrink: 0 }}>
          <button
            onClick={handleDone}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 8, background: 'var(--dw-accent)', border: 'none', borderRadius: 12,
              padding: '14px 20px', fontSize: 15, fontWeight: 700, cursor: 'pointer',
              color: '#fff', fontFamily: 'var(--font-sans)', minHeight: 50,
            }}
          >
            {selectedPlans.length > 0 ? `Start ${selectedPlans.length} Plan${selectedPlans.length > 1 ? 's' : ''}` : 'Skip Plans'}
            <ChevronRight size={18} />
          </button>
          <button
            onClick={onDismiss}
            style={{
              width: '100%', background: 'none', border: 'none', padding: '12px',
              fontSize: 13, color: 'var(--dw-text-muted)', cursor: 'pointer',
              fontFamily: 'var(--font-sans)', marginTop: 4,
            }}
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}
