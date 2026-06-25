import type { ComponentType, CSSProperties } from 'react';
import type { LucideProps } from 'lucide-react';
import { Card } from './Card';

interface EmptyStateProps {
  icon: ComponentType<LucideProps>;
  title: string;
  /** Optional secondary line. Pass an already-translated string (t(...)). */
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  /** Tighter padding + smaller type, for denser surfaces (e.g. the Plans list). */
  compact?: boolean;
  style?: CSSProperties;
}

/**
 * Consistent centered empty-state: icon + title + optional description + optional
 * action button. Replaces the ad-hoc inline Card empty states across screens.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  compact = false,
  style,
}: EmptyStateProps) {
  const hasAction = !!(actionLabel && onAction);
  return (
    <Card style={{ textAlign: 'center', padding: compact ? '20px 16px' : '40px 16px', ...style }}>
      <Icon
        size={compact ? 24 : 28}
        style={{ color: 'var(--dw-text-faint)', marginBottom: 10 }}
        aria-hidden="true"
      />
      <p
        style={{
          color: 'var(--dw-text-muted)',
          fontSize: compact ? 13 : 14,
          fontFamily: 'var(--font-sans)',
          margin: 0,
          marginBottom: description ? 6 : hasAction ? 12 : 0,
        }}
      >
        {title}
      </p>
      {description && (
        <p
          style={{
            color: 'var(--dw-text-faint)',
            fontSize: 12,
            fontFamily: 'var(--font-sans)',
            margin: 0,
            marginBottom: hasAction ? 12 : 0,
          }}
        >
          {description}
        </p>
      )}
      {hasAction && (
        <button
          className="dw-btn-primary"
          style={{ fontSize: compact ? 12 : 13, padding: compact ? '8px 16px' : undefined }}
          onClick={onAction}
        >
          {actionLabel}
        </button>
      )}
    </Card>
  );
}
