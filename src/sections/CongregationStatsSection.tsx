/**
 * CongregationStatsSection — pastor_leader persona only.
 * Shows active readers, prayer wall activity, and quick links.
 */
import { Card } from '../components/Card';
import { CAMPUSES } from '../data/tokens';
import { useHome } from './HomeContext';

export function CongregationStatsSection() {
  const { personaConfig, userProfile, campusStats } = useHome();

  if (personaConfig.persona !== 'pastor_leader') return null;
  if (!campusStats) return null;

  const campusName = userProfile?.campus
    ? CAMPUSES.find(c => c.id === userProfile.campus)?.name || 'your campus'
    : 'all campuses';

  const dailyCount = campusStats.readingToday;
  const weeklyActive = campusStats.activeThisWeek;
  const prayerCount = campusStats.prayerCount;

  return (
    <Card style={{
      marginBottom: 16,
      marginTop: 8,
      background: 'var(--dw-surface, #fff)',
      border: '1px solid var(--dw-border, #E8E6E0)',
      opacity: 0.85,
    }}>
      <h2 className="text-section-header" style={{ color: 'var(--dw-text-muted, #777)', marginBottom: 12, fontSize: 10 }}>
        QUICK GLANCE
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
        <div style={{
          background: 'var(--dw-surface)', borderRadius: 12, padding: '14px 12px', textAlign: 'center',
        }}>
          <p style={{ fontFamily: 'var(--font-serif)', fontSize: 26, fontWeight: 700, color: 'var(--dw-info)', margin: 0 }}>
            {dailyCount}
          </p>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: 10, color: 'var(--dw-text-muted)', margin: '4px 0 0', letterSpacing: '0.04em' }}>
            reading today
          </p>
        </div>
        <div style={{
          background: 'var(--dw-surface)', borderRadius: 12, padding: '14px 12px', textAlign: 'center',
        }}>
          <p style={{ fontFamily: 'var(--font-serif)', fontSize: 26, fontWeight: 700, color: 'var(--dw-info)', margin: 0 }}>
            {weeklyActive}
          </p>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: 10, color: 'var(--dw-text-muted)', margin: '4px 0 0', letterSpacing: '0.04em' }}>
            active this week
          </p>
        </div>
        <div style={{
          background: 'var(--dw-surface)', borderRadius: 12, padding: '14px 12px', textAlign: 'center',
        }}>
          <p style={{ fontFamily: 'var(--font-serif)', fontSize: 26, fontWeight: 700, color: 'var(--dw-purple)', margin: 0 }}>
            {prayerCount}
          </p>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: 10, color: 'var(--dw-text-muted)', margin: '4px 0 0', letterSpacing: '0.04em' }}>
            prayer requests
          </p>
        </div>
        <div style={{
          background: 'var(--dw-surface)', borderRadius: 12, padding: '14px 12px', textAlign: 'center',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        }}>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: 'var(--dw-info)', fontWeight: 600, margin: 0 }}>
            {campusName}
          </p>
        </div>
      </div>
    </Card>
  );
}
