import { useState } from 'react';
import { Card } from '../components/Card';
import { ThemeToggle } from '../components/ThemeToggle';
import { ChevronLeft, ChevronRight, Volume2, Share2, Search } from 'lucide-react';

// Sample data — will be replaced with real data from bible-sections.js in Stage 2
const SAMPLE_VERSE = `"For I know the plans I have for you," declares the Lord, "plans to prosper you and not to harm you, plans to give you hope and a future."`;
const SAMPLE_REF = 'Jeremiah 29:11';
const SAMPLE_DEVOTION = `Today's passage reminds us that God's plans for us are rooted in love and purpose. Even in seasons of uncertainty, we can trust that He is working all things together for our good. Take a moment to reflect on the areas of your life where you need to surrender your plans and trust in His.`;

export function HomeScreen() {
  const [dayOffset, setDayOffset] = useState(0);

  const today = new Date();
  today.setDate(today.getDate() + dayOffset);
  const dateStr = today.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="screen-container">
      <div style={{ padding: '24px 24px 0' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div>
            <h1 style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 26,
              fontWeight: 400,
              color: 'var(--dw-text-primary)',
              letterSpacing: '-0.02em',
            }}>
              Daily Word
            </h1>
            <p style={{ color: 'var(--dw-text-muted)', fontSize: 13, marginTop: 2 }}>
              Futures Church
            </p>
          </div>
          <ThemeToggle />
        </div>

        {/* Date Navigation */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          margin: '20px 0',
        }}>
          <button
            onClick={() => setDayOffset(d => d - 1)}
            style={{ background: 'none', border: 'none', color: 'var(--dw-text-muted)', cursor: 'pointer', padding: 8, minHeight: 44, minWidth: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            aria-label="Previous day"
          >
            <ChevronLeft size={20} />
          </button>
          <div style={{ textAlign: 'center' }}>
            <p className="text-section-header" style={{ marginBottom: 4 }}>TODAY'S READING</p>
            <p style={{ color: 'var(--dw-text-secondary)', fontSize: 14, fontFamily: 'var(--font-sans)' }}>
              {dateStr}
            </p>
          </div>
          <button
            onClick={() => setDayOffset(d => d + 1)}
            disabled={dayOffset >= 30}
            style={{ background: 'none', border: 'none', color: dayOffset >= 30 ? 'var(--dw-text-faint)' : 'var(--dw-text-muted)', cursor: dayOffset >= 30 ? 'default' : 'pointer', padding: 8, minHeight: 44, minWidth: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            aria-label="Next day"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Scripture Card */}
        <Card style={{ marginBottom: 16 }}>
          <p className="text-scripture" style={{ marginBottom: 16 }}>
            {SAMPLE_VERSE}
          </p>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ color: 'var(--dw-accent)', fontSize: 14, fontWeight: 500, fontFamily: 'var(--font-sans)' }}>
              {SAMPLE_REF}
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button style={{ background: 'none', border: 'none', color: 'var(--dw-text-muted)', cursor: 'pointer', padding: 4, minHeight: 44, minWidth: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }} aria-label="Listen">
                <Volume2 size={18} />
              </button>
              <button style={{ background: 'none', border: 'none', color: 'var(--dw-text-muted)', cursor: 'pointer', padding: 4, minHeight: 44, minWidth: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }} aria-label="Share">
                <Share2 size={18} />
              </button>
            </div>
          </div>
        </Card>

        {/* Devotion Card */}
        <Card style={{ marginBottom: 16 }}>
          <p className="text-section-header" style={{ marginBottom: 12 }}>DEVOTION OF THE DAY</p>
          <p className="text-devotion">{SAMPLE_DEVOTION}</p>
        </Card>

        {/* Scripture Search */}
        <Card style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Search size={18} style={{ color: 'var(--dw-text-muted)', flexShrink: 0 }} />
            <input
              type="text"
              placeholder="Search scripture or topic..."
              style={{
                flex: 1,
                background: 'none',
                border: 'none',
                outline: 'none',
                color: 'var(--dw-text-primary)',
                fontSize: 15,
                fontFamily: 'var(--font-sans)',
              }}
            />
          </div>
        </Card>

        {/* Daily Quote */}
        <Card style={{ marginBottom: 16, borderLeft: '3px solid var(--dw-accent)' }}>
          <p style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 15,
            fontStyle: 'italic',
            color: 'var(--dw-text-secondary)',
            lineHeight: 1.6,
          }}>
            "Prayer is not asking. It is a longing of the soul."
          </p>
          <p style={{ color: 'var(--dw-text-muted)', fontSize: 12, marginTop: 8, fontFamily: 'var(--font-sans)' }}>
            — Mahatma Gandhi
          </p>
        </Card>

        {/* Translation Picker Pill */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
          <button style={{
            background: 'var(--dw-accent-bg)',
            border: '1px solid var(--dw-accent)',
            borderRadius: 999,
            padding: '8px 20px',
            color: 'var(--dw-accent)',
            fontSize: 13,
            fontWeight: 500,
            fontFamily: 'var(--font-sans)',
            cursor: 'pointer',
            minHeight: 44,
          }}>
            ESV ▾
          </button>
        </div>
      </div>
    </div>
  );
}
