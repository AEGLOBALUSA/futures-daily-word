// Design tokens for inline styles where CSS custom properties aren't convenient
// Values mirror the CSS custom properties in index.css

export const tokens = {
  color: {
    accent: '#C8956A',
    accentBg: 'var(--dw-accent-bg)',
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

// Campus configuration — 22 slots
export interface Campus {
  id: string;
  name: string;
  city: string;
  videoUrl?: string;
}

export const CAMPUSES: Campus[] = [
  { id: 'futures-alpharetta', name: 'Futures Alpharetta', city: 'Alpharetta, GA', videoUrl: 'https://www.youtube.com/embed/live_stream?channel=UCbrXwvwaPr_ZootS3z8YKLQ' },
  { id: 'futures-bali', name: 'Futures Bali', city: 'Bali, Indonesia' },
  { id: 'futures-lagos', name: 'Futures Lagos', city: 'Lagos, Nigeria' },
  { id: 'futures-london', name: 'Futures London', city: 'London, UK' },
  { id: 'futures-online', name: 'Futures Online', city: 'Online', videoUrl: 'https://www.youtube.com/embed/live_stream?channel=UCbrXwvwaPr_ZootS3z8YKLQ' },
  { id: 'other', name: 'Non-Futures Church', city: 'Any' },
];
