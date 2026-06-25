/**
 * WeeklyReviewCard — the Sundays-only "Your Week in the Word" review card,
 * extracted from HomeScreen. Pure render of the `weekReview` value; dismissal is
 * routed back to HomeScreen via the `onDismiss` callback (HomeScreen owns the
 * `weekReviewDismissed` state and the localStorage write happens here on dismiss).
 */
import { Card } from './Card';

interface WeekReview {
  weekLabel: string;
  daysRead: number;
  streak: number;
  question: string;
}

interface WeeklyReviewCardProps {
  weekReview: WeekReview;
  onDismiss: () => void;
  t: (key: string) => string;
}

export function WeeklyReviewCard({ weekReview, onDismiss, t }: WeeklyReviewCardProps) {
          const weekKey = `${new Date().getFullYear()}-W${Math.ceil(new Date().getDate() / 7)}-${new Date().getMonth()}`;
          return (
            <Card style={{
              marginBottom: 16,
              background: 'linear-gradient(135deg, rgba(107,26,34,0.10) 0%, rgba(154,123,46,0.07) 100%)',
              border: '1px solid rgba(154,123,46,0.25)',
              position: 'relative',
            }}>
              <button onClick={() => {
                localStorage.setItem('dw_week_review_dismissed', weekKey);
                onDismiss();
              }} style={{
                position: 'absolute', top: 12, right: 12,
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--dw-text-muted)', fontSize: 18, lineHeight: 1, padding: 0,
              }}>×</button>
              <h2 className="text-section-header" style={{ color: 'var(--dw-accent)', marginBottom: 4 }}>YOUR WEEK IN THE WORD</h2>
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--dw-text-muted)', marginBottom: 12 }}>Week of {weekReview.weekLabel}</p>
              <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
                {[
                  { value: weekReview.daysRead, label: t('days_this_week') },
                  { value: weekReview.streak, label: t('day_streak') },
                ].map(({ value, label }) => (
                  <div key={label} style={{
                    flex: 1, background: 'var(--dw-surface)', borderRadius: 12, padding: '12px 10px', textAlign: 'center',
                  }}>
                    <p style={{ fontFamily: 'var(--font-serif)', fontSize: 28, fontWeight: 700, color: 'var(--dw-accent)', margin: 0 }}>{value}</p>
                    <p style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: 'var(--dw-text-muted)', margin: '2px 0 0' }}>{label}</p>
                  </div>
                ))}
              </div>
              <p style={{ fontFamily: 'var(--font-serif-text)', fontSize: 14, fontStyle: 'italic', color: 'var(--dw-text-secondary)', lineHeight: 1.5 }}>
                {weekReview.question}
              </p>
            </Card>
          );
}
