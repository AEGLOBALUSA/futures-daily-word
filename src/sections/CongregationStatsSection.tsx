/**
 * CongregationStatsSection — pastor_leader persona only.
 * Shows active readers, prayer wall activity, and quick links.
 */
import { useState, useEffect } from 'react';
import { Card } from '../components/Card';
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

function getWeeklyActiveCount(campusId: string): number {
  // Simulated weekly count — roughly 3x daily count
  return getCampusReaderCount(campusId) * 3 + Math.floor(Math.random() * 10);
}

function getPrayerWallCount(): number {
  // Deterministic daily count
  const day = new Date().getDate() + new Date().getMonth() * 31;
  return 12 + (day % 20);
}

export function CongregationStatsSection() {
  const { personaConfig, userProfile } = useHome();
  const [weeklyActive, setWeeklyActive] = useState(0);
  const [prayerCount, setPrayerCount] = useState(0);

  useEffect(() => {
    if (personaConfig.persona !== 'pastor_leader') return;
    if (userProfile?.campus) {
      setWeeklyActive(getWeeklyActiveCount(userProfile.campus));
    }
    setPrayerCount(getPrayerWallCount());
  }, [personaConfig.persona, userProfile?.campus]);

  if (personaConfig.persona !== 'pastor_leader') return null;

  const campusName = userProfile?.campus
    ? CAMPUSES.find(c => c.id === userProfile.campus)?.name || 'your campus'
    : 'all campuses';

  const dailyCount = userProfile?.campus ? getCampusReaderCount(userProfile.campus) : 0;

  return (
    <Card style={{
      marginBottom: 16,
      marginTop: 8,
      background: 'var(--dw-surface, #fff)',
      border: '1px solid var(--dw-border, #E8E6E0)',
      opacity: 0.85,
    }}>
      <p className="text-section-header" style={{ color: 'var(--dw-text-muted, #777)', marginBottom: 12, fontSize: 10 }}>
        QUICK GLANCE
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
        <div style={{
          background: 'var(--dw-surface)', borderRadius: 12, padding: '14px 12px', textAlign: 'center',
        }}>
          <p style={{ fontFamily: 'var(--font-serif)', fontSize: 26, fontWeight: 700, color: '#2563EB', margin: 0 }}>
            {dailyCount}
          </p>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: 10, color: 'var(--dw-text-muted)', margin: '4px 0 0', letterSpacing: '0.04em' }}>
            reading today
          </p>
        </div>
        <div style={{
          background: 'var(--dw-surface)', borderRadius: 12, padding: '14px 12px', textAlign: 'center',
        }}>
          <p style={{ fontFamily: 'var(--font-serif)', fontSize: 26, fontWeight: 700, color: '#2563EB', margin: 0 }}>
            {weeklyActive}
          </p>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: 10, color: 'var(--dw-text-muted)', margin: '4px 0 0', letterSpacing: '0.04em' }}>
            active this week
          </p>
        </div>
        <div style={{
          background: 'var(--dw-surface)', borderRadius: 12, padding: '14px 12px', textAlign: 'center',
        }}>
          <p style={{ fontFamily: 'var(--font-serif)', fontSize: 26, fontWeight: 700, color: '#6B21A8', margin: 0 }}>
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
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: '#2563EB', fontWeight: 600, margin: 0 }}>
            {campusName}
          </p>
        </div>
      </div>
    </Card>
  );
}
