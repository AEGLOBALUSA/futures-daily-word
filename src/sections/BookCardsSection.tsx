import { useHome } from './HomeContext';

const BOOK_INFO: Record<string, { title: string; description: string; color: string; planId?: string }> = {
  'grace-and-truth': { title: 'Grace & Truth', description: 'Biblical foundations for living', color: '#6B4C8A' },
  'no-more-fear': { title: 'No More Fear', description: 'Living boldly in faith', color: '#2E6B5A', planId: 'book-no-more-fear' },
};

export function BookCardsSection() {
  const { personaConfig, startPlanFromHome } = useHome();
  const bookCards = personaConfig.features.bookCards;
  if (bookCards.length === 0) return null;

  return (
    <div style={{ marginBottom: 20, overflowX: 'auto', display: 'flex', gap: 12, scrollbarWidth: 'none' }}>
      {bookCards.map((bookId: string) => {
        const info = BOOK_INFO[bookId] || { title: bookId, description: '', color: '#6B1A22' };

        const activePlans: Record<string, unknown> = (() => { try { return JSON.parse(localStorage.getItem('dw_activeplans') || '{}'); } catch { return {}; } })();
        const isActive = info.planId ? !!activePlans[info.planId] : false;

        return (
          <div
            key={bookId}
            onClick={() => {
              if (info.planId && !isActive && startPlanFromHome) {
                startPlanFromHome(info.planId);
                window.location.reload();
              }
            }}
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
              {isActive ? 'READING NOW' : 'RECOMMENDED'}
            </p>
            <p style={{ fontSize: 16, fontWeight: 700, fontFamily: 'var(--font-serif)', marginBottom: 4 }}>
              {info.title}
            </p>
            <p style={{ fontSize: 12, opacity: 0.8, fontFamily: 'var(--font-sans)' }}>
              {isActive ? 'Tap to continue reading' : info.description}
            </p>
          </div>
        );
      })}
    </div>
  );
}
