import { useState } from 'react';
import { Search, X, ChevronRight, Loader2 } from 'lucide-react';
import { API_BASE } from '../utils/api-base';
import { getLang } from '../utils/i18n';

interface BibleSearchProps {
  isOpen: boolean;
  onClose: () => void;
  /** Hands a ready-made prompt to Bible AI (prefill + open). */
  onSearch: (query: string) => void;
}

interface PassageHit {
  ref: string;
  reason: string;
}

/** Parse the model's line list ("Reference — why it fits") into structured hits. */
function parseHits(text: string): PassageHit[] {
  const hits: PassageHit[] = [];
  for (const raw of text.split('\n')) {
    // Strip leading bullets / numbering
    const line = raw.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, '').trim();
    if (!line) continue;
    const m = line.match(/^(.+?)\s*[—–-]\s*(.+)$/);
    if (!m) continue;
    const ref = m[1].trim();
    const reason = m[2].trim();
    // A reference should contain a digit (chapter/verse) and be short.
    if (!/\d/.test(ref) || ref.length > 40) continue;
    hits.push({ ref, reason });
    if (hits.length >= 8) break;
  }
  return hits;
}

export function BibleSearch({ isOpen, onClose, onSearch }: BibleSearchProps) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [hits, setHits] = useState<PassageHit[]>([]);
  const [error, setError] = useState(false);
  const [searched, setSearched] = useState(false);

  if (!isOpen) return null;

  async function runSearch() {
    const q = query.trim();
    if (!q || loading) return;
    setLoading(true);
    setError(false);
    setSearched(true);
    setHits([]);
    const lang = getLang();
    const langName = lang === 'es' ? 'Spanish' : lang === 'pt' ? 'Portuguese' : lang === 'id' ? 'Indonesian' : 'English';
    const system =
      `You are a Bible concordance for Futures Church Daily Word. The user gives a topic, ` +
      `keyword, feeling, or phrase. Return up to 8 of the most relevant Bible passages. ` +
      `Respond with ONE passage per line in EXACTLY this format:\n` +
      `Reference — one short sentence on why it fits\n` +
      `Use standard references (e.g. "Philippians 4:6-7"). Write the reason in ${langName}. ` +
      `No numbering, no headings, no extra commentary.`;
    try {
      const res = await fetch(`${API_BASE}/.netlify/functions/claude`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: `Find Bible passages about: ${q}` }],
          system,
          max_tokens: 500,
        }),
      });
      if (!res.ok) throw new Error(`search error ${res.status}`);
      const data = await res.json();
      const text: string = data?.content?.[0]?.text || '';
      const parsed = parseHits(text);
      if (parsed.length === 0) throw new Error('no hits');
      setHits(parsed);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  function openHit(ref: string) {
    onSearch(`Show me ${ref} and explain what it means and how to apply it.`);
    onClose();
  }

  function askAI() {
    const q = query.trim();
    if (!q) return;
    onSearch(`Find key Bible verses about: ${q}. List the most important passages with brief context for each.`);
    onClose();
  }

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 100 }}
      />
      <div
        style={{
          position: 'fixed', top: '12%', left: 16, right: 16, maxWidth: 440, margin: '0 auto',
          background: 'var(--dw-canvas)', borderRadius: 16, padding: 20, zIndex: 101,
          boxShadow: '0 12px 40px rgba(0,0,0,0.4)',
          maxHeight: '76vh', display: 'flex', flexDirection: 'column',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: 18, fontFamily: 'var(--font-serif)', color: 'var(--dw-text)' }}>
            Search Scripture
          </h3>
          <button aria-label="Close search" onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--dw-text-muted)', padding: 4 }}>
            <X size={20} />
          </button>
        </div>
        <p style={{ fontSize: 13, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)', margin: '0 0 12px', lineHeight: 1.4 }}>
          Search by topic, keyword, feeling, or phrase — we'll find the passages that fit. Tap any result to open it.
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--dw-text-muted)' }} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && runSearch()}
              placeholder={'e.g. "fear not" or "God\'s promises"'}
              autoFocus
              style={{
                width: '100%', padding: '12px 14px 12px 36px', borderRadius: 10,
                border: '1px solid var(--dw-border)', background: 'var(--dw-surface)',
                color: 'var(--dw-text)', fontSize: 15, fontFamily: 'var(--font-sans)',
                outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>
          <button
            onClick={runSearch}
            disabled={!query.trim() || loading}
            style={{
              padding: '0 18px', borderRadius: 10, border: 'none',
              background: query.trim() ? 'var(--dw-accent)' : 'var(--dw-border)',
              color: '#fff', fontSize: 14, fontWeight: 600,
              cursor: query.trim() && !loading ? 'pointer' : 'default',
              fontFamily: 'var(--font-sans)', transition: 'background 0.2s',
              display: 'flex', alignItems: 'center',
            }}
          >
            {loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : 'Search'}
          </button>
        </div>

        {/* Results */}
        <div style={{ overflowY: 'auto', marginTop: hits.length || loading || (searched && error) ? 14 : 0 }}>
          {loading && (
            <p style={{ fontSize: 13, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)', textAlign: 'center', padding: '16px 0' }}>
              Searching Scripture…
            </p>
          )}

          {!loading && hits.map((hit) => (
            <button
              key={hit.ref}
              onClick={() => openHit(hit.ref)}
              style={{
                width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10,
                padding: '11px 12px', marginBottom: 8, borderRadius: 12,
                background: 'var(--dw-card)', border: '1px solid var(--dw-border)',
                cursor: 'pointer', fontFamily: 'var(--font-sans)',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--dw-accent)', margin: '0 0 2px' }}>
                  {hit.ref}
                </p>
                <p style={{ fontSize: 12, color: 'var(--dw-text-secondary)', margin: 0, lineHeight: 1.45 }}>
                  {hit.reason}
                </p>
              </div>
              <ChevronRight size={16} style={{ color: 'var(--dw-text-faint)', flexShrink: 0 }} />
            </button>
          ))}

          {!loading && searched && error && (
            <div style={{ textAlign: 'center', padding: '8px 0 4px' }}>
              <p style={{ fontSize: 13, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)', marginBottom: 10 }}>
                Couldn't find passages just now.
              </p>
              <button
                onClick={askAI}
                style={{
                  padding: '9px 16px', borderRadius: 10, border: '1px solid var(--dw-border)',
                  background: 'transparent', color: 'var(--dw-text)', fontSize: 13, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'var(--font-sans)',
                }}
              >
                Ask Bible AI instead
              </button>
            </div>
          )}

          {!loading && hits.length > 0 && (
            <button
              onClick={askAI}
              style={{
                width: '100%', marginTop: 4, padding: '10px', borderRadius: 10,
                border: '1px solid var(--dw-border)', background: 'transparent',
                color: 'var(--dw-text-muted)', fontSize: 13, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'var(--font-sans)',
              }}
            >
              Go deeper with Bible AI
            </button>
          )}
        </div>
      </div>
    </>
  );
}
