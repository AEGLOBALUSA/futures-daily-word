import { useState } from 'react';
import { Search, X } from 'lucide-react';

interface BibleSearchProps {
  isOpen: boolean;
  onClose: () => void;
  onSearch: (query: string) => void;
}

export function BibleSearch({ isOpen, onClose, onSearch }: BibleSearchProps) {
  const [query, setQuery] = useState('');

  if (!isOpen) return null;

  function handleSubmit() {
    if (!query.trim()) return;
    onSearch(`Find key Bible verses about: ${query.trim()}. List the most important passages with brief context for each.`);
    setQuery('');
    onClose();
  }

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.4)',
          zIndex: 100,
        }}
      />
      <div
        style={{
          position: 'fixed',
          top: '15%',
          left: 16,
          right: 16,
          maxWidth: 440,
          margin: '0 auto',
          background: 'var(--dw-canvas, #1A1A1A)',
          borderRadius: 16,
          padding: 20,
          zIndex: 101,
          boxShadow: '0 12px 40px rgba(0,0,0,0.4)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3
            style={{
              margin: 0,
              fontSize: 18,
              fontFamily: 'var(--font-serif)',
              color: 'var(--dw-text)',
            }}
          >
            Search the Bible
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--dw-text-muted)',
              padding: 4,
            }}
          >
            <X size={20} />
          </button>
        </div>
        <p
          style={{
            fontSize: 13,
            color: 'var(--dw-text-muted)',
            fontFamily: 'var(--font-sans)',
            margin: '0 0 12px',
            lineHeight: 1.4,
          }}
        >
          Search by topic, keyword, or phrase — Bible AI will find relevant passages across Scripture.
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--dw-text-muted)',
              }}
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              placeholder={'e.g. "fear not" or "God\'s promises"'}
              autoFocus
              style={{
                width: '100%',
                padding: '12px 14px 12px 36px',
                borderRadius: 10,
                border: '1px solid var(--dw-border, #333)',
                background: 'var(--dw-surface, #222)',
                color: 'var(--dw-text)',
                fontSize: 15,
                fontFamily: 'var(--font-sans)',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>
          <button
            onClick={handleSubmit}
            disabled={!query.trim()}
            style={{
              padding: '0 18px',
              borderRadius: 10,
              border: 'none',
              background: query.trim() ? 'var(--dw-accent, #A8323B)' : 'var(--dw-border, #333)',
              color: '#fff',
              fontSize: 14,
              fontWeight: 600,
              cursor: query.trim() ? 'pointer' : 'default',
              fontFamily: 'var(--font-sans)',
              transition: 'background 0.2s',
            }}
          >
            Search
          </button>
        </div>
      </div>
    </>
  );
}
