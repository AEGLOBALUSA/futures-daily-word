import { useHome } from './HomeContext';

const BOOK_INFO: Record<string, { title: string; description: string; color: string }> = {
  'grace-and-truth': { title: 'Grace & Truth', description: 'Biblical foundations for living', color: '#6B4C8A' },
  'no-more-fear': { title: 'No More Fear', description: 'Living boldly in faith', color: '#2E6B5A' },
};

export function BookCardsSection() {
  const { personaConfig } = useHome();
  const bookCards = personaConfig.features.bookCards;
  if (bookCards.length === 0) return null;

  return (
    <div style={{ marginBottom: 20, overflowX: 'auto', display: 'flex', gap: 12, scrollbarWidth: 'none' }}>
      {bookCards.map((bookId: string) => {
        const info = BOOK_INFO[bookId] || { title: bookId, description: '', color: '#6B1A22' };
        return (
          <div
            key={bookId}
            style={{
              minWidth: 180,
              background: `linear-gradient(135deg, ${info.color}, ${info.color}CC)`,
              borderRadius: 16,
              padding: '20px 16px',
              color: '#fff',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.7, marginBottom: 8, fontFamily: 'var(--font-sans)' }}>
              RECOMMENDED
            </p>
            <p style={{ fontSize: 16, fontWeight: 700, fontFamily: 'var(--font-serif)', marginBottom: 4 }}>
              {info.title}
            </p>
            <p style={{ fontSize: 12, opacity: 0.8, fontFamily: 'var(--font-sans)' }}>
              {info.description}
            </p>
          </div>
        );
      })}
    </div>
  );
}
