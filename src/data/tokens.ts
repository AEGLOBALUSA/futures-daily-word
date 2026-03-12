// Design tokens for inline styles where CSS custom properties aren't convenient
// Values mirror the CSS custom properties in index.css

export const tokens = {
  color: {
    accent: '#C41E2A',
    accentHover: '#9B1620',
    accentActive: '#7D1019',
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

// Campus configuration — 21 Futures campuses (8 AU + 7 US + 5 ID + 1 BR) + Non-Futures
export interface Campus {
  id: string;
  name: string;
  city: string;
  region: string;
  videoUrl?: string;
}

export const CAMPUSES: Campus[] = [
  // Australia (8)
  { id: 'au-paradise', name: 'Futures Paradise', city: 'Paradise, SA', region: 'Australia' },
  { id: 'au-adelaide-city', name: 'Futures Adelaide City', city: 'Adelaide, SA', region: 'Australia' },
  { id: 'au-salisbury', name: 'Futures Salisbury', city: 'Salisbury, SA', region: 'Australia' },
  { id: 'au-south', name: 'Futures South', city: 'South Australia', region: 'Australia' },
  { id: 'au-clare-valley', name: 'Futures Clare Valley', city: 'Clare Valley, SA', region: 'Australia' },
  { id: 'au-mount-barker', name: 'Futures Mount Barker', city: 'Mount Barker, SA', region: 'Australia' },
  { id: 'au-victor-harbor', name: 'Futures Victor Harbor', city: 'Victor Harbor, SA', region: 'Australia' },
  { id: 'au-copper-coast', name: 'Futures Copper Coast', city: 'Copper Coast, SA', region: 'Australia' },
  // North America (7)
  { id: 'us-gwinnett', name: 'Futures Gwinnett', city: 'Gwinnett, GA', region: 'North America', videoUrl: 'https://www.youtube.com/embed/live_stream?channel=UCbrXwvwaPr_ZootS3z8YKLQ' },
  { id: 'us-kennesaw', name: 'Futures Kennesaw', city: 'Kennesaw, GA', region: 'North America' },
  { id: 'us-alpharetta', name: 'Futures Alpharetta', city: 'Alpharetta, GA', region: 'North America' },
  { id: 'us-futuros-duluth', name: 'Futuros Duluth', city: 'Duluth, GA', region: 'North America' },
  { id: 'us-futuros-kennesaw', name: 'Futuros Kennesaw', city: 'Kennesaw, GA', region: 'North America' },
  { id: 'us-futuros-grayson', name: 'Futuros Grayson', city: 'Grayson, GA', region: 'North America' },
  { id: 'us-franklin', name: 'Futures Franklin', city: 'Franklin, TN', region: 'North America' },
  // Indonesia (5)
  { id: 'id-solo', name: 'Futures Solo', city: 'Surakarta, Central Java', region: 'Indonesia' },
  { id: 'id-cemani', name: 'Futures Cemani', city: 'Cemani, Central Java', region: 'Indonesia' },
  { id: 'id-bali', name: 'Futures Bali', city: 'Denpasar, Bali', region: 'Indonesia' },
  { id: 'id-samarinda', name: 'Futures Samarinda', city: 'Samarinda, East Kalimantan', region: 'Indonesia' },
  { id: 'id-langowan', name: 'Futures Langowan', city: 'Langowan, North Sulawesi', region: 'Indonesia' },
  // Brazil (1)
  { id: 'br-rio', name: 'Futures Rio', city: 'Rio de Janeiro, Brazil', region: 'Brazil' },
  // Other
  { id: 'other', name: 'Non-Futures Church', city: 'Any', region: 'Other' },
];
