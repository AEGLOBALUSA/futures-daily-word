import { useState } from 'react';
import { Card } from '../components/Card';
import { Plus, BookOpen, PenLine, Bookmark } from 'lucide-react';

interface JournalEntry {
  id: string;
  date: string;
  title: string;
  preview: string;
  tags: string[];
}

// Sample data — will be replaced with localStorage dw_journal in Stage 4
const SAMPLE_ENTRIES: JournalEntry[] = [
  {
    id: '1',
    date: 'March 10, 2026',
    title: 'Morning Reflection',
    preview: 'Today I was reminded of God\'s faithfulness through the reading in Psalms...',
    tags: ['reflection', 'psalms'],
  },
  {
    id: '2',
    date: 'March 9, 2026',
    title: 'Prayer for Direction',
    preview: 'Lord, guide my steps this week as I make decisions about...',
    tags: ['prayer', 'guidance'],
  },
  {
    id: '3',
    date: 'March 8, 2026',
    title: 'Sermon Notes — Grace',
    preview: 'Key takeaway: Grace is not just forgiveness, it\'s empowerment...',
    tags: ['sermon', 'grace'],
  },
];

export function JournalScreen() {
  const [activeTab, setActiveTab] = useState<'journal' | 'sermons' | 'saved'>('journal');

  const tabs = [
    { id: 'journal' as const, label: 'Journal', icon: PenLine },
    { id: 'sermons' as const, label: 'Sermons', icon: BookOpen },
    { id: 'saved' as const, label: 'Saved', icon: Bookmark },
  ];

  return (
    <div className="screen-container">
      <div style={{ padding: '24px 24px 0' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h1 style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 26,
            fontWeight: 400,
            color: 'var(--dw-text-primary)',
            letterSpacing: '-0.02em',
          }}>
            Journal
          </h1>
          <button style={{
            background: 'var(--dw-accent)',
            border: 'none',
            borderRadius: 10,
            padding: '8px 16px',
            color: '#fff',
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            minHeight: 44,
            fontFamily: 'var(--font-sans)',
          }}>
            <Plus size={16} />
            New Entry
          </button>
        </div>

        {/* Sub-tabs */}
        <div style={{
          display: 'flex',
          gap: 4,
          background: 'var(--dw-surface)',
          borderRadius: 12,
          padding: 4,
          marginBottom: 24,
        }}>
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              style={{
                flex: 1,
                background: activeTab === id ? 'var(--dw-accent)' : 'transparent',
                color: activeTab === id ? '#fff' : 'var(--dw-text-muted)',
                border: 'none',
                borderRadius: 8,
                padding: '10px 0',
                fontSize: 12,
                fontWeight: 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                minHeight: 44,
                fontFamily: 'var(--font-sans)',
                transition: 'all var(--transition-fast)',
              }}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        {/* Entries */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {SAMPLE_ENTRIES.map(entry => (
            <Card key={entry.id} onClick={() => {}}>
              <p style={{ color: 'var(--dw-text-muted)', fontSize: 11, fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 6, fontFamily: 'var(--font-sans)' }}>
                {entry.date}
              </p>
              <p className="text-card-title" style={{ marginBottom: 8 }}>{entry.title}</p>
              <p style={{ color: 'var(--dw-text-secondary)', fontSize: 14, lineHeight: 1.5, fontFamily: 'var(--font-sans)' }}>
                {entry.preview}
              </p>
              {entry.tags.length > 0 && (
                <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                  {entry.tags.map(tag => (
                    <span key={tag} style={{
                      background: 'var(--dw-accent-bg)',
                      color: 'var(--dw-accent)',
                      fontSize: 11,
                      padding: '3px 10px',
                      borderRadius: 999,
                      fontFamily: 'var(--font-sans)',
                      fontWeight: 500,
                    }}>
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
