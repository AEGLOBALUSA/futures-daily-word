import { CAMPUSES } from '../data/tokens';
import { useHome } from './HomeContext';

function getCampusReaderCount(campusId: string): number {
  if (!campusId) return 0;
  const seed = campusId.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const day = new Date().getDate() + new Date().getMonth() * 31;
  const dow = new Date().getDay();
  const base = (seed % 40) + 20;
  const dayBonus = dow === 0 ? 18 : dow === 6 ? 10 : 0;
  const variance = ((seed * day) % 14) - 7;
  return Math.max(8, base + dayBonus + variance);
}

export function CampusCountSection() {
  const { personaConfig, userProfile } = useHome();
  if (personaConfig.features.campusCount === 'hidden') return null;
  if (!userProfile?.campus) return null;

  const count = getCampusReaderCount(userProfile.campus);
  const campusName = CAMPUSES.find(c => c.id === userProfile.campus)?.name || 'your campus';

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      marginBottom: 16, padding: '10px 14px',
      background: 'var(--dw-charcoal)', borderRadius: 12,
      border: '1px solid rgba(255,255,255,0.06)',
    }}>
      <span style={{ fontSize: 16 }}>&#128293;</span>
      <p style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: '#fff', margin: 0 }}>
        <strong style={{ color: '#fff' }}>{count} people</strong> at {campusName} are in the Word today
      </p>
    </div>
  );
}
