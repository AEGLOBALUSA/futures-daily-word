import { CAMPUSES } from '../data/tokens';
import { useHome } from './HomeContext';

export function CampusCountSection() {
  const { personaConfig, userProfile, campusStats } = useHome();
  if (personaConfig.features.campusCount === 'hidden') return null;
  if (!userProfile?.campus) return null;
  if (!campusStats || campusStats.campus !== userProfile?.campus) return null;

  const campusName = CAMPUSES.find(c => c.id === userProfile.campus)?.name || 'your campus';

  return (
    <div className="dw-dark-surface" style={{
      display: 'flex', alignItems: 'center', gap: 8,
      marginBottom: 16, padding: '10px 14px',
      background: 'var(--dw-charcoal)', borderRadius: 12,
      border: '1px solid rgba(255,255,255,0.06)',
    }}>
      <p style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: '#fff', margin: 0 }}>
        <strong style={{ color: '#fff' }}>{campusStats.readingToday} people</strong> at {campusName} are in the Word today
      </p>
    </div>
  );
}
