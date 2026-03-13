import { useState, useEffect } from 'react';
import { Card } from '../components/Card';
import { ThemeToggle } from '../components/ThemeToggle';
import { BookOpen, Scroll, MapPin, Clock, Sparkles, ChevronLeft, Loader2 } from 'lucide-react';

/* ── Essay TOC + section types ── */
interface EssaySection { title: string; file: string; }
interface EssayTOC { title: string; author: string; sections: EssaySection[]; }

/* ── Library categories ── */
interface LibraryItem {
  id: string;
  title: string;
  description: string;
  icon: typeof BookOpen;
  type: 'essay' | 'characters' | 'locations' | 'timeline' | 'words';
}

const LIBRARY_ITEMS: LibraryItem[] = [
  { id: 'knocking-on-the-door', title: 'Knocking on the Door', description: 'A guide on conflict personas and biblical guard rails', icon: BookOpen, type: 'essay' },
  { id: 'characters', title: 'Bible Characters', description: 'Key figures from the Old and New Testament', icon: Sparkles, type: 'characters' },
  { id: 'locations', title: 'Bible Locations', description: 'Significant places in scripture', icon: MapPin, type: 'locations' },
  { id: 'timeline', title: 'Bible Timeline', description: 'A chronological journey through biblical history', icon: Clock, type: 'timeline' },
  { id: 'words', title: 'Word Studies', description: 'Deep dives into important biblical words', icon: Scroll, type: 'words' },
];

interface LibraryScreenProps {
  onBack?: () => void;
}

export function LibraryScreen({ onBack }: LibraryScreenProps) {
  const [activeItem, setActiveItem] = useState<string | null>(null);
  const [essayTOC, setEssayTOC] = useState<EssayTOC | null>(null);
  const [essaySection, setEssaySection] = useState<number | null>(null);
  const [sectionContent, setSectionContent] = useState<string>('');
  const [loading, setLoading] = useState(false);

  // Fetch essay TOC when selected
  useEffect(() => {
    if (activeItem !== 'knocking-on-the-door') return;
    setLoading(true);
    fetch('/essays/knocking-on-the-door/toc.json')
      .then(r => r.json())
      .then((toc: EssayTOC) => setEssayTOC(toc))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [activeItem]);

  // Fetch essay section content
  useEffect(() => {
    if (essaySection === null || !essayTOC) return;
    setLoading(true);
    setSectionContent('');
    const sec = essayTOC.sections[essaySection];
    if (!sec) return;
    fetch(`/essays/knocking-on-the-door/${sec.file}`)
      .then(r => r.json())
      .then((data: { content?: string; text?: string; body?: string; paragraphs?: string[] }) => {
        setSectionContent(data.content || data.text || data.body || (data.paragraphs ? data.paragraphs.join('\n\n') : JSON.stringify(data)));
      })
      .catch(() => setSectionContent('Could not load section.'))
      .finally(() => setLoading(false));
  }, [essaySection]);

  const handleBack = () => {
    if (essaySection !== null) {
      setEssaySection(null);
      setSectionContent('');
    } else if (activeItem) {
      setActiveItem(null);
      setEssayTOC(null);
    } else if (onBack) {
      onBack();
    }
  };

  // Fetch data file content (characters, locations, etc.)
  const [dataContent, setDataContent] = useState<Record<string, string>[]>([]);

  useEffect(() => {
    if (!activeItem || activeItem === 'knocking-on-the-door') return;
    setLoading(true);
    setDataContent([]);
    fetch(`/data/${activeItem}.js`)
      .then(r => r.text())
      .then(text => {
        // Try to extract the data — these are JS files with exports
        // We'll show them as readable content
        try {
          // Simple extraction: find array content between [ and ]
          const match = text.match(/\[[\s\S]*\]/);
          if (match) {
            // eslint-disable-next-line no-eval
            const arr = JSON.parse(match[0].replace(/'/g, '"').replace(/,\s*}/g, '}').replace(/,\s*]/g, ']'));
            if (Array.isArray(arr)) {
              setDataContent(arr.slice(0, 50)); // Show first 50 entries
            }
          }
        } catch {
          // If parsing fails, just show raw text snippet
          setDataContent([{ name: 'Content', description: text.slice(0, 2000) }]);
        }
      })
      .catch(() => setDataContent([{ name: 'Error', description: 'Could not load content.' }]))
      .finally(() => setLoading(false));
  }, [activeItem]);

  return (
    <div className="screen-container">
      <div style={{ padding: '24px 24px 0' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          {(activeItem || onBack) ? (
            <button
              onClick={handleBack}
              style={{ background: 'none', border: 'none', color: 'var(--dw-accent)', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-sans)', fontSize: 14, minHeight: 44 }}
            >
              <ChevronLeft size={18} /> {activeItem ? 'Back' : 'Settings'}
            </button>
          ) : (
            <h1 style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 26, fontWeight: 400,
              color: 'var(--dw-text-primary)',
              letterSpacing: '-0.02em',
            }}>
              Library
            </h1>
          )}
          <ThemeToggle />
        </div>

        {!activeItem && (
          <p style={{ color: 'var(--dw-text-muted)', fontSize: 13, marginBottom: 20, fontFamily: 'var(--font-sans)' }}>
            Books, essays, and reference material
          </p>
        )}

        {/* Browse view */}
        {!activeItem && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {LIBRARY_ITEMS.map(item => (
              <Card key={item.id} style={{ cursor: 'pointer' }} onClick={() => setActiveItem(item.id)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 12,
                    background: 'var(--dw-accent-bg)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <item.icon size={20} style={{ color: 'var(--dw-accent)' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ color: 'var(--dw-text-primary)', fontSize: 15, fontWeight: 500, fontFamily: 'var(--font-sans)', marginBottom: 2 }}>
                      {item.title}
                    </p>
                    <p style={{ color: 'var(--dw-text-muted)', fontSize: 12, fontFamily: 'var(--font-sans)' }}>
                      {item.description}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Essay TOC view */}
        {activeItem === 'knocking-on-the-door' && essayTOC && essaySection === null && (
          <div>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 400, color: 'var(--dw-text-primary)', marginBottom: 4 }}>
              {essayTOC.title}
            </h2>
            <p style={{ color: 'var(--dw-text-muted)', fontSize: 13, marginBottom: 20, fontFamily: 'var(--font-sans)' }}>
              by {essayTOC.author}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {essayTOC.sections.map((sec, i) => (
                <Card key={i} style={{ cursor: 'pointer' }} onClick={() => setEssaySection(i)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ color: 'var(--dw-accent)', fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-sans)', minWidth: 24 }}>
                      {i + 1}
                    </span>
                    <p style={{ color: 'var(--dw-text-primary)', fontSize: 14, fontFamily: 'var(--font-sans)' }}>
                      {sec.title}
                    </p>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Essay section reader */}
        {activeItem === 'knocking-on-the-door' && essaySection !== null && (
          <div>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 400, color: 'var(--dw-text-primary)', marginBottom: 16 }}>
              {essayTOC?.sections[essaySection]?.title || 'Section'}
            </h2>
            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '20px 0' }}>
                <Loader2 size={16} style={{ color: 'var(--dw-accent)', animation: 'spin 1s linear infinite' }} />
                <span style={{ color: 'var(--dw-text-muted)', fontSize: 13 }}>Loading...</span>
              </div>
            ) : (
              <Card>
                <p style={{ color: 'var(--dw-text-secondary)', fontSize: 15, lineHeight: 1.7, fontFamily: 'var(--font-serif)', whiteSpace: 'pre-wrap' }}>
                  {sectionContent}
                </p>
              </Card>
            )}
          </div>
        )}

        {/* Data content view (characters, locations, etc.) */}
        {activeItem && activeItem !== 'knocking-on-the-door' && (
          <div>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 400, color: 'var(--dw-text-primary)', marginBottom: 16 }}>
              {LIBRARY_ITEMS.find(i => i.id === activeItem)?.title || activeItem}
            </h2>
            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '20px 0' }}>
                <Loader2 size={16} style={{ color: 'var(--dw-accent)', animation: 'spin 1s linear infinite' }} />
                <span style={{ color: 'var(--dw-text-muted)', fontSize: 13 }}>Loading...</span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {dataContent.map((item, i) => (
                  <Card key={i}>
                    {item.name && (
                      <p style={{ color: 'var(--dw-text-primary)', fontSize: 15, fontWeight: 500, fontFamily: 'var(--font-sans)', marginBottom: 4 }}>
                        {item.name}
                      </p>
                    )}
                    {item.description && (
                      <p style={{ color: 'var(--dw-text-secondary)', fontSize: 13, lineHeight: 1.6, fontFamily: 'var(--font-sans)' }}>
                        {typeof item.description === 'string' ? item.description.slice(0, 300) : JSON.stringify(item.description).slice(0, 300)}
                      </p>
                    )}
                    {item.reference && (
                      <p style={{ color: 'var(--dw-accent)', fontSize: 12, fontFamily: 'var(--font-sans)', marginTop: 4 }}>
                        {item.reference}
                      </p>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Loading state for initial essay fetch */}
        {activeItem === 'knocking-on-the-door' && !essayTOC && loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '20px 0' }}>
            <Loader2 size={16} style={{ color: 'var(--dw-accent)', animation: 'spin 1s linear infinite' }} />
            <span style={{ color: 'var(--dw-text-muted)', fontSize: 13 }}>Loading essay...</span>
          </div>
        )}

        <div style={{ height: 24 }} />
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
