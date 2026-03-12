import { useState } from 'react';
import { Card } from '../components/Card';
import { MessageCircle, Heart, Globe, Users } from 'lucide-react';

interface Prayer {
  id: string;
  name: string;
  campus: string;
  text: string;
  prayerCount: number;
  date: string;
}

// Sample data — will be replaced with /api/prayer-wall in Stage 4
const SAMPLE_PRAYERS: Prayer[] = [
  {
    id: '1',
    name: 'Maria',
    campus: 'Futures Alpharetta',
    text: 'Please pray for my family as we navigate a difficult season. God is faithful.',
    prayerCount: 14,
    date: '2 hours ago',
  },
  {
    id: '2',
    name: 'David',
    campus: 'Futures Lagos',
    text: 'Praying for breakthrough in my career and that God opens doors of opportunity.',
    prayerCount: 8,
    date: '5 hours ago',
  },
  {
    id: '3',
    name: 'Anonymous',
    campus: 'Futures Online',
    text: 'Lord, grant me peace and wisdom in the decisions ahead. I trust your timing.',
    prayerCount: 22,
    date: '1 day ago',
  },
];

export function MessagesScreen() {
  const [filter, setFilter] = useState<'all' | 'campus'>('all');

  return (
    <div className="screen-container">
      <div style={{ padding: '24px 24px 0' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <h1 style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 26,
            fontWeight: 400,
            color: 'var(--dw-text-primary)',
            letterSpacing: '-0.02em',
          }}>
            Prayer Wall
          </h1>
          <button className="dw-btn-primary" style={{ fontSize: 13, padding: '8px 16px' }}>
            + Prayer
          </button>
        </div>
        <p style={{ color: 'var(--dw-text-muted)', fontSize: 13, marginBottom: 20, fontFamily: 'var(--font-sans)' }}>
          Lift each other up in prayer across all campuses
        </p>

        {/* Filter */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          <button
            onClick={() => setFilter('all')}
            style={{
              background: filter === 'all' ? 'var(--dw-accent)' : 'var(--dw-surface)',
              color: filter === 'all' ? '#fff' : 'var(--dw-text-muted)',
              border: filter === 'all' ? 'none' : '1px solid var(--dw-border)',
              borderRadius: 999,
              padding: '8px 18px',
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              minHeight: 44,
              fontFamily: 'var(--font-sans)',
            }}
          >
            <Globe size={14} />
            All Campuses
          </button>
          <button
            onClick={() => setFilter('campus')}
            style={{
              background: filter === 'campus' ? 'var(--dw-accent)' : 'var(--dw-surface)',
              color: filter === 'campus' ? '#fff' : 'var(--dw-text-muted)',
              border: filter === 'campus' ? 'none' : '1px solid var(--dw-border)',
              borderRadius: 999,
              padding: '8px 18px',
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              minHeight: 44,
              fontFamily: 'var(--font-sans)',
            }}
          >
            <Users size={14} />
            My Campus
          </button>
        </div>

        {/* Bible AI Card */}
        <Card style={{ marginBottom: 16, borderLeft: '3px solid var(--dw-accent)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <MessageCircle size={20} style={{ color: 'var(--dw-accent)' }} />
            <p className="text-card-title">Bible AI</p>
          </div>
          <p style={{ color: 'var(--dw-text-secondary)', fontSize: 14, lineHeight: 1.5, marginBottom: 12, fontFamily: 'var(--font-sans)' }}>
            Ask questions about scripture, get context on passages, or explore biblical topics with AI.
          </p>
          <button className="dw-btn-secondary" style={{ fontSize: 13, padding: '8px 16px' }}>
            Start Conversation
          </button>
        </Card>

        {/* Prayer entries */}
        <p className="text-section-header" style={{ marginBottom: 12 }}>RECENT PRAYERS</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {SAMPLE_PRAYERS.map(prayer => (
            <Card key={prayer.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div>
                  <p style={{ color: 'var(--dw-text-primary)', fontSize: 14, fontWeight: 500, fontFamily: 'var(--font-sans)' }}>
                    {prayer.name}
                  </p>
                  <p style={{ color: 'var(--dw-text-muted)', fontSize: 11, fontFamily: 'var(--font-sans)' }}>
                    {prayer.campus} · {prayer.date}
                  </p>
                </div>
              </div>
              <p style={{ color: 'var(--dw-text-secondary)', fontSize: 14, lineHeight: 1.6, marginBottom: 12, fontFamily: 'var(--font-serif)' }}>
                {prayer.text}
              </p>
              <button style={{
                background: 'var(--dw-accent-bg)',
                border: 'none',
                borderRadius: 999,
                padding: '6px 14px',
                color: 'var(--dw-accent)',
                fontSize: 12,
                fontWeight: 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                minHeight: 36,
                fontFamily: 'var(--font-sans)',
              }}>
                <Heart size={13} />
                Praying · {prayer.prayerCount}
              </button>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
