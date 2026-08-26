import { ChevronDown } from 'lucide-react';
import { CAMPUSES } from '../data/tokens';
import { t, getLang } from '../utils/i18n';

/**
 * Grouped campus dropdown — shared by Settings and the Campus tab's no-campus
 * state, so picking a campus never requires leaving the screen the user is on.
 * Pure presentation: the parent decides how the choice is saved
 * (saveProfile / requireEmail).
 */
export function CampusSelect({ value, onChange }: { value: string; onChange: (campusId: string) => void }) {
  const lang = getLang();
  return (
    <div style={{ position: 'relative' }}>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          width: '100%',
          background: 'var(--dw-canvas)',
          color: 'var(--dw-text-primary)',
          border: '1px solid var(--dw-border)',
          borderRadius: 10,
          padding: '14px 40px 14px 16px',
          fontSize: 14,
          fontWeight: 500,
          fontFamily: 'var(--font-sans)',
          cursor: 'pointer',
          appearance: 'none',
          WebkitAppearance: 'none',
          minHeight: 48,
          outline: 'none',
        }}
      >
        <option value="">{t('select_your_campus', lang)}</option>
        {['Australia', 'North America', 'Indonesia', 'Brazil', 'Other'].map(region => {
          const regionCampuses = CAMPUSES.filter(c => c.region === region);
          if (!regionCampuses.length) return null;
          return (
            <optgroup key={region} label={region}>
              {regionCampuses.map(c => (
                <option key={c.id} value={c.id}>{c.name} — {c.city}</option>
              ))}
            </optgroup>
          );
        })}
      </select>
      <ChevronDown
        size={18}
        style={{
          position: 'absolute',
          right: 14,
          top: '50%',
          transform: 'translateY(-50%)',
          color: 'var(--dw-text-muted)',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}
