// Design tokens for inline styles where CSS custom properties aren't convenient
// Values mirror the CSS custom properties in index.css

export const tokens = {
  color: {
    accent: '#A8323B',
    accentHover: '#8C2830',
    accentActive: '#711F27',
    accentBg: 'var(--dw-accent-bg)',
    christ: 'var(--dw-text-christ)',
    canvas: 'var(--dw-canvas)',
    surface: 'var(--dw-surface)',
    surfaceHover: 'var(--dw-surface-hover)',
    surfaceActive: 'var(--dw-surface-active)',
    textPrimary: 'var(--dw-text-primary)',
    textSecondary: 'var(--dw-text-secondary)',
    textMuted: 'var(--dw-text-muted)',
    textFaint: 'var(--dw-text-faint)',
    border: 'var(--dw-border)',
    borderSubtle: 'var(--dw-border-subtle)',
  },
  font: {
    serif: "var(--font-serif)",
    sans: "var(--font-sans)",
  },
  radius: {
    card: 16,
    button: 10,
    pill: 999,
  },
  spacing: {
    edge: 24,
    cardPad: 20,
    sectionGap: 24,
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
} as const;

// Campuses: the one list is the dw_campuses table, kept by the owner in /staff
// (B09-02). Read it with useCampuses() / getCampuses() from './campuses'. These
// re-exports are the bundled copy of the seed, kept so nothing outside src/
// breaks; nothing in src/ imports them any more.
export type { CampusRow as Campus } from './campuses';
export { FALLBACK_CAMPUSES as CAMPUSES } from './campuses.fallback';
