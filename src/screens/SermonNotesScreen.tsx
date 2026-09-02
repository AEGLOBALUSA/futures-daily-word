import { useState, useEffect, type ReactNode } from 'react';
import { ChevronLeft, Loader2 } from 'lucide-react';
import { t, getLang } from '../utils/i18n';
import { fetchCurrentSermon } from '../utils/currentSermon';
import { SermonNotesSurface, type SermonNotesData } from '../components/SermonNotesSurface';
import { PromoAds } from '../components/PromoAds';

interface SermonNotesScreenProps {
  onBack: () => void;
  embedded?: boolean;
  /** Reading mode: outline only — no fill-in blanks, no response. */
  readOnly?: boolean;
}

const SERMON_BLUE = 'var(--dw-info)';

function AdsBelowNotes() {
  return (
    <div
      data-testid="sermon-notes-ads"
      style={{ padding: 0, background: 'var(--dw-bg)' }}
    >
      <PromoAds variant="banner" />
    </div>
  );
}

function NotesChrome({
  onBack,
  lang,
  children,
  ads,
}: {
  onBack: () => void;
  lang: string;
  children: ReactNode;
  ads?: boolean;
}) {
  return (
    <div className="screen-container" style={{ background: '#FAF6EF', color: '#241E17' }}>
      <div style={{
        display: 'flex', alignItems: 'center', padding: '16px 20px',
        borderBottom: '1px solid #ECE3D4',
        position: 'sticky', top: 0, background: '#FAF6EF', zIndex: 10,
      }}>
        <button aria-label={t('back', lang)} onClick={onBack} style={{
          background: 'none', border: 'none', color: 'var(--dw-accent)',
          cursor: 'pointer', padding: '6px 8px 6px 2px', marginRight: 8, display: 'flex', alignItems: 'center',
          gap: 4, fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-sans)', borderRadius: 8,
        }}>
          <ChevronLeft size={20} />
          {t('back', lang)}
        </button>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, fontFamily: 'var(--font-serif)' }}>{t('sermon_notes_title', lang)}</h1>
      </div>
      {children}
      {ads ? <AdsBelowNotes /> : null}
    </div>
  );
}

export function SermonNotesScreen({ onBack, embedded, readOnly }: SermonNotesScreenProps) {
  const lang = getLang();
  const [sermon, setSermon] = useState<SermonNotesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetchCurrentSermon<SermonNotesData>()
      .then(data => {
        if (data) setSermon(data);
        else setError(true);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60 }}>
        <Loader2 size={24} style={{ color: SERMON_BLUE, animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  if (error || !sermon) {
    if (embedded) {
      return (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--dw-text-primary)', fontFamily: 'var(--font-serif)', marginBottom: 8 }}>
            No sermon notes this week
          </p>
          <p style={{ fontSize: 13, color: 'var(--dw-text-muted)', fontFamily: 'var(--font-sans)' }}>
            Check back before Sunday service.
          </p>
        </div>
      );
    }
    return (
      <NotesChrome onBack={onBack} lang={lang} ads>
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <p style={{ fontSize: 16, fontWeight: 600, color: '#241E17', fontFamily: 'var(--font-serif)', marginBottom: 8 }}>
            No sermon notes this week
          </p>
          <p style={{ fontSize: 13, color: 'rgba(36,30,23,0.55)', fontFamily: 'var(--font-sans)' }}>
            Check back before Sunday service.
          </p>
        </div>
      </NotesChrome>
    );
  }

  const surface = <SermonNotesSurface sermon={sermon} readOnly={readOnly} />;

  if (embedded) return surface;

  return (
    <NotesChrome onBack={onBack} lang={lang} ads>
      {surface}
    </NotesChrome>
  );
}
