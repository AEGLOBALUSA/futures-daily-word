import { strings } from './strings';
import type { AlphaFeature } from '../alpharetta-gate/types';

export default function AlpharettaPanel({ features, creator, ready, onOpen }: {
  features: AlphaFeature[];
  creator: boolean;
  ready: boolean;
  onOpen: (feature: AlphaFeature) => void;
}) {
  if (!ready) return <p style={{ color: 'var(--dw-text-muted)', fontSize: 15, fontFamily: 'var(--font-sans)' }}>{strings.loading}</p>;

  if (creator && features.length === 0) {
    return <div style={{ padding: '24px 0' }}>
      <h2 style={{ margin: '0 0 8px', fontSize: 18, fontFamily: 'var(--font-serif)', fontWeight: 600, color: 'var(--dw-text-primary)' }}>{strings.creatorEmptyTitle}</h2>
      <p style={{ margin: '0 0 20px', fontSize: 15, fontFamily: 'var(--font-sans)', color: 'var(--dw-text-muted)', lineHeight: 1.5 }}>{strings.creatorEmptyBody}</p>
      <a href="https://claude.ai/code" target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', minHeight: 56, boxSizing: 'border-box', borderRadius: 12, background: 'var(--dw-accent)', color: '#fff', fontSize: 16, fontWeight: 600, fontFamily: 'var(--font-sans)', textDecoration: 'none' }}>{strings.creatorEmptyButton}</a>
    </div>;
  }

  return <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
    {features.map(feature => <button key={feature.id} type="button" onClick={() => onOpen(feature)} aria-label={feature.title} style={{ background: 'var(--dw-card)', border: '1px solid var(--dw-border)', borderRadius: 14, padding: 16, minHeight: 64, textAlign: 'left', cursor: 'pointer' }}>
      <div style={{ fontSize: 17, fontFamily: 'var(--font-serif)', fontWeight: 600, color: 'var(--dw-text-primary)' }}>{feature.title}</div>
      {feature.summary && <div style={{ marginTop: 4, fontSize: 15, fontFamily: 'var(--font-sans)', color: 'var(--dw-text-muted)' }}>{feature.summary}</div>}
      {feature.visibility === 'creator' && <div style={{ marginTop: 4, fontSize: 15, fontFamily: 'var(--font-sans)', color: 'var(--dw-text-muted)' }}>{strings.creatorTag}</div>}
    </button>)}
  </div>;
}
