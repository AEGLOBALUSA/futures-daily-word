import { memo } from 'react';
import { Plus, Minus } from 'lucide-react';

interface FontSizeControlsProps {
  fontSize: number;
  min: number;
  max: number;
  onIncrease: () => void;
  onDecrease: () => void;
}

export const FontSizeControls = memo(function FontSizeControls({
  fontSize,
  min,
  max,
  onIncrease,
  onDecrease,
}: FontSizeControlsProps) {
  const atMin = fontSize <= min;
  const atMax = fontSize >= max;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 14, gap: 6 }}>
      <span style={{
        fontSize: 10, fontWeight: 600, color: 'var(--dw-text-faint)',
        fontFamily: 'var(--font-sans)', letterSpacing: '0.06em', textTransform: 'uppercase',
      }}>
        Font Size
      </span>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
      <button
        onClick={onDecrease}
        disabled={atMin}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 36, height: 36, borderRadius: '50%',
          background: atMin ? 'var(--dw-surface)' : 'var(--dw-surface-raised, rgba(0,0,0,0.04))',
          border: '1px solid var(--dw-border)',
          cursor: atMin ? 'default' : 'pointer',
          color: atMin ? 'var(--dw-text-faint)' : 'var(--dw-text-secondary)',
          opacity: atMin ? 0.4 : 1,
          transition: 'all 0.15s ease',
        }}
        aria-label="Decrease font size"
      >
        <Minus size={14} />
      </button>
      <span style={{
        fontSize: 11, fontWeight: 600, color: 'var(--dw-text-muted)',
        fontFamily: 'var(--font-sans)', letterSpacing: '0.03em',
        minWidth: 24, textAlign: 'center',
      }}>
        {fontSize}
      </span>
      <button
        onClick={onIncrease}
        disabled={atMax}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 36, height: 36, borderRadius: '50%',
          background: atMax ? 'var(--dw-surface)' : 'var(--dw-surface-raised, rgba(0,0,0,0.04))',
          border: '1px solid var(--dw-border)',
          cursor: atMax ? 'default' : 'pointer',
          color: atMax ? 'var(--dw-text-faint)' : 'var(--dw-text-secondary)',
          opacity: atMax ? 0.4 : 1,
          transition: 'all 0.15s ease',
        }}
        aria-label="Increase font size"
      >
        <Plus size={16} />
      </button>
      </div>
    </div>
  );
});
