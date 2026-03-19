import { ChevronLeft } from 'lucide-react';

interface Props {
  title: string;
  onBack?: () => void;
}

export function ScreenHeader({ title, onBack }: Props) {
  if (!onBack) return null;

  return (
    <>
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: 'calc(10px + var(--safe-top, 0px)) 16px 10px',
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 50,
      background: 'var(--dw-canvas)',
      borderBottom: '1px solid var(--dw-border)',
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
        Back
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
    {/* Spacer so content below isn't hidden behind the fixed header */}
    <div style={{ height: 'calc(44px + var(--safe-top, 0px))' }} />
    </>
  );
}
