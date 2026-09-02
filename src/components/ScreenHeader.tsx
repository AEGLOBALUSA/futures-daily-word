import { ChevronLeft } from 'lucide-react';
import { t, getLang } from '../utils/i18n';

interface Props {
  title: string;
  onBack?: () => void;
}

export function ScreenHeader({ title, onBack }: Props) {
  if (!onBack) return null;
  const lang = getLang();

  return (
    <>
    <div className="dw-screen-header">
      <button aria-label={t('back', lang)}
        onClick={onBack}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          color: 'var(--dw-accent)',
          fontSize: 14,
          fontWeight: 600,
          fontFamily: 'var(--font-sans)',
          padding: '6px 8px 6px 2px',
          borderRadius: 8,
          minHeight: 44,
          minWidth: 44,
        }}
      >
        <ChevronLeft size={20} />
        {t('back', lang)}
      </button>
      <span style={{
        fontSize: 16,
        fontWeight: 700,
        color: 'var(--dw-text-primary)',
        fontFamily: 'var(--font-sans)',
      }}>
        {title}
      </span>
    </div>
    <div className="dw-screen-header-spacer" />
    </>
  );
}
