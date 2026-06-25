import type { CSSProperties } from 'react';

interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  radius?: number;
  style?: CSSProperties;
}

/**
 * A single shimmering placeholder bar. Themed via CSS tokens and the
 * `.dw-skeleton` rule in index.css (which also honors prefers-reduced-motion).
 */
export function Skeleton({ width = '100%', height = 14, radius = 6, style }: SkeletonProps) {
  return (
    <div
      className="dw-skeleton"
      aria-hidden="true"
      style={{ width, height, borderRadius: radius, ...style }}
    />
  );
}

const SCRIPTURE_LINE_WIDTHS = ['100%', '96%', '92%', '70%', '88%', '62%'];

/**
 * A few staggered lines that stand in for a loading scripture passage.
 * Line height + gap scale with the reader's font size so the placeholder stays
 * proportional (and the swap to real text is less jarring at large sizes).
 * `label` (e.g. the translation) is surfaced to screen readers.
 */
export function ScriptureSkeleton({
  lines = 4,
  fontSize = 15,
  label,
}: {
  lines?: number;
  fontSize?: number;
  label?: string;
}) {
  const lineHeight = Math.max(12, Math.round(fontSize * 0.95));
  return (
    <div
      role="status"
      aria-label={label ? `Loading ${label}` : 'Loading scripture'}
      style={{ display: 'flex', flexDirection: 'column', gap: Math.round(fontSize * 0.7), padding: '10px 0' }}
    >
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} height={lineHeight} width={SCRIPTURE_LINE_WIDTHS[i % SCRIPTURE_LINE_WIDTHS.length]} />
      ))}
    </div>
  );
}

/**
 * Screen-shaped skeleton used as the lazy-screen Suspense fallback.
 * The `dw-screen-skeleton` class delays its reveal (~160ms) so fast/cached
 * chunk loads never flash a skeleton.
 */
export function ScreenSkeleton() {
  return (
    <div className="dw-screen-skeleton" style={{ padding: '24px 16px', maxWidth: 640, margin: '0 auto', width: '100%' }}>
      <Skeleton width={148} height={22} radius={8} style={{ marginBottom: 18 }} />
      <div
        style={{
          background: 'var(--dw-surface)',
          border: '1px solid var(--dw-border-subtle)',
          borderRadius: 16,
          padding: 16,
          marginBottom: 14,
        }}
      >
        <Skeleton width={92} height={11} style={{ marginBottom: 12 }} />
        <ScriptureSkeleton lines={4} />
      </div>
      <div
        style={{
          background: 'var(--dw-surface)',
          border: '1px solid var(--dw-border-subtle)',
          borderRadius: 16,
          padding: 16,
        }}
      >
        <ScriptureSkeleton lines={3} />
      </div>
    </div>
  );
}
