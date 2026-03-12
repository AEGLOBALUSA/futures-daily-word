import { useState } from 'react';
import { Card } from '../components/Card';
import { CheckCircle, Clock, ArrowRight } from 'lucide-react';

interface Plan {
  id: string;
  title: string;
  description: string;
  totalDays: number;
  completedDays: number;
  category: string;
}

// Sample data — will be replaced with data/plans.js + localStorage dw_activeplans in Stage 4
const SAMPLE_PLANS: Plan[] = [
  {
    id: 'faith-pathway',
    title: '30-Day Faith Pathway',
    description: 'A guided journey through the foundations of faith for new believers.',
    totalDays: 30,
    completedDays: 12,
    category: 'Foundation',
  },
  {
    id: 'psalms-30',
    title: 'Psalms in 30 Days',
    description: 'Read through the entire book of Psalms with daily reflections.',
    totalDays: 30,
    completedDays: 0,
    category: 'Bible Reading',
  },
  {
    id: 'prayer-life',
    title: 'Building a Prayer Life',
    description: 'Learn different prayer models and build a consistent prayer habit.',
    totalDays: 14,
    completedDays: 14,
    category: 'Spiritual Growth',
  },
];

export function PlansScreen() {
  const [activeView, setActiveView] = useState<'active' | 'browse'>('active');

  return (
    <div className="screen-container">
      <div style={{ padding: '24px 24px 0' }}>
        {/* Header */}
        <h1 style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 26,
          fontWeight: 400,
          color: 'var(--dw-text-primary)',
          letterSpacing: '-0.02em',
          marginBottom: 4,
        }}>
          Reading Plans
        </h1>
        <p style={{ color: 'var(--dw-text-muted)', fontSize: 13, marginBottom: 20, fontFamily: 'var(--font-sans)' }}>
          Stay on track with guided reading and growth plans
        </p>

        {/* Tabs */}
        <div style={{
          display: 'flex',
          gap: 4,
          background: 'var(--dw-surface)',
          borderRadius: 12,
          padding: 4,
          marginBottom: 24,
        }}>
          {(['active', 'browse'] as const).map(view => (
            <button
              key={view}
              onClick={() => setActiveView(view)}
              style={{
                flex: 1,
                background: activeView === view ? 'var(--dw-accent)' : 'transparent',
                color: activeView === view ? '#fff' : 'var(--dw-text-muted)',
                border: 'none',
                borderRadius: 8,
                padding: '10px 0',
                fontSize: 12,
                fontWeight: 500,
                cursor: 'pointer',
                minHeight: 44,
                fontFamily: 'var(--font-sans)',
                textTransform: 'capitalize',
                transition: 'all var(--transition-fast)',
              }}
            >
              {view === 'active' ? 'My Plans' : 'Browse All'}
            </button>
          ))}
        </div>

        {/* Plan cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {SAMPLE_PLANS.map(plan => {
            const progress = plan.totalDays > 0 ? (plan.completedDays / plan.totalDays) * 100 : 0;
            const isComplete = plan.completedDays >= plan.totalDays;

            return (
              <Card key={plan.id} onClick={() => {}}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div style={{ flex: 1 }}>
                    <span style={{
                      background: 'var(--dw-accent-bg)',
                      color: 'var(--dw-accent)',
                      fontSize: 10,
                      fontWeight: 600,
                      padding: '3px 8px',
                      borderRadius: 999,
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                      fontFamily: 'var(--font-sans)',
                    }}>
                      {plan.category}
                    </span>
                    <p className="text-card-title" style={{ marginTop: 8 }}>{plan.title}</p>
                  </div>
                  {isComplete ? (
                    <CheckCircle size={22} style={{ color: '#6ac895', flexShrink: 0 }} />
                  ) : (
                    <ArrowRight size={18} style={{ color: 'var(--dw-text-muted)', flexShrink: 0, marginTop: 4 }} />
                  )}
                </div>
                <p style={{ color: 'var(--dw-text-secondary)', fontSize: 13, lineHeight: 1.5, marginBottom: 12, fontFamily: 'var(--font-sans)' }}>
                  {plan.description}
                </p>

                {/* Progress bar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    flex: 1,
                    height: 4,
                    background: 'var(--dw-border)',
                    borderRadius: 2,
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      width: `${progress}%`,
                      height: '100%',
                      background: isComplete ? '#6ac895' : 'var(--dw-accent)',
                      borderRadius: 2,
                      transition: 'width 300ms ease',
                    }} />
                  </div>
                  <span style={{
                    color: 'var(--dw-text-muted)',
                    fontSize: 11,
                    fontWeight: 500,
                    fontFamily: 'var(--font-sans)',
                    whiteSpace: 'nowrap',
                  }}>
                    {plan.completedDays}/{plan.totalDays}
                  </span>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Reading streak */}
        <Card style={{ marginTop: 24, textAlign: 'center' }}>
          <Clock size={24} style={{ color: 'var(--dw-accent)', marginBottom: 8 }} />
          <p className="text-card-title" style={{ marginBottom: 4 }}>7 Day Streak</p>
          <p style={{ color: 'var(--dw-text-muted)', fontSize: 13, fontFamily: 'var(--font-sans)' }}>
            Keep going! You've read for 7 days in a row.
          </p>
        </Card>
      </div>
    </div>
  );
}
