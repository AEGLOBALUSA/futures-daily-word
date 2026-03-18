import { ChevronLeft } from 'lucide-react';

interface Props {
  title: string;
  onBack?: () => void;
}

export function ScreenHeader({ title, onBack }: Props) {
  if (!onBack) return null;

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '14px 16px 10px',
      position: 'sticky',
      top: 0,
      zIndex: 10,
      background: 'var(--dw-canvas)',
    }}>
      <button
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
        }}
      >
        <ChevronLeft size={20} />
        Home
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
  );
}
