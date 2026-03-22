import { useState } from 'react';
import { Card } from '../components/Card';
import { ListenButton } from '../components/ListenButton';
import { useHome } from './HomeContext';

const WEEK_REVIEW_QUESTIONS = [
  'What stood out most in what you read this week?',
  'Was there a verse that stayed with you?',
  'What is one thing God is saying to you?',
  'How did your reading shape your week?',
];

function getWeekReviewData(): { weekLabel: string; daysRead: number; streak: number; question: string } | null {
  try {
    const today = new Date();
    if (today.getDay() !== 0) return null;
    const weekKey = `${today.getFullYear()}-W${Math.ceil(today.getDate() / 7)}-${today.getMonth()}`;
    const dismissed = localStorage.getItem('dw_week_review_dismissed');
    if (dismissed === weekKey) return null;
    const streakData = JSON.parse(localStorage.getItem('dw_streak_v2') || '{"count":0}');
    const streak = streakData.count || 0;
    if (streak < 3) return null;
    const daysRead = Math.min(streak, 7);
    const question = WEEK_REVIEW_QUESTIONS[Math.floor(today.getDate() / 7) % WEEK_REVIEW_QUESTIONS.length];
    const weekLabel = today.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
    return { weekLabel, daysRead, streak, question };
  } catch { return null; }
}

export function WeeklyReviewSection() {
  const { personaConfig } = useHome();
  const [weekReview] = useState(() => getWeekReviewData());
  const [dismissed, setDismissed] = useState(false);

  if (!personaConfig.features.weeklyReview) return null;
  if (!weekReview || dismissed) return null;

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
        setDismissed(true);
      }} style={{
        position: 'absolute', top: 12, right: 12,
        background: 'none', border: 'none', cursor: 'pointer',
        color: 'var(--dw-text-muted)', fontSize: 18, lineHeight: 1, padding: 0,
      }}>&times;</button>
      <h2 className="text-section-header" style={{ color: 'var(--dw-accent)', marginBottom: 4 }}>YOUR WEEK IN THE WORD</h2>
      <p style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--dw-text-muted)', marginBottom: 12 }}>Week of {weekReview.weekLabel}</p>
      <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
        {[
          { value: weekReview.daysRead, label: 'days this week' },
          { value: weekReview.streak, label: 'day streak' },
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
      <div style={{ marginTop: 10, display: 'flex', justifyContent: 'flex-end' }}>
        <ListenButton text={weekReview.question} size="sm" />
      </div>
    </Card>
  );
}
