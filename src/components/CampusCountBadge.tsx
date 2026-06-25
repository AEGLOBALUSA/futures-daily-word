/**
 * CampusCountBadge — the persona-gated "N people at your campus are in the Word
 * today" badge, extracted from HomeScreen. Renders a deterministic per-campus +
 * date reader count. Pure; reads only the campus off the passed `userProfile`.
 */
import { CAMPUSES } from '../data/tokens';
import type { UserProfile } from '../contexts/UserContext';

// ── Campus community count (deterministic per campus + date) ─────────────────
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

interface CampusCountBadgeProps {
  userProfile: UserProfile;
}

export function CampusCountBadge({ userProfile }: CampusCountBadgeProps) {
          const count = getCampusReaderCount(userProfile.campus!);
          const campusName = CAMPUSES.find(c => c.id === userProfile.campus)?.name || 'your campus';
          return (
            <div className="dw-dark-surface" style={{
              display: 'flex', alignItems: 'center', gap: 8,
              marginBottom: 16, padding: '10px 14px',
              background: 'var(--dw-charcoal)', borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.06)',
            }}>
              <span style={{ fontSize: 16 }}>🔥</span>
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: '#fff', margin: 0 }}>
                <strong style={{ color: '#fff' }}>{count} people</strong> at {campusName} are in the Word today
              </p>
            </div>
          );
}
