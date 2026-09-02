import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { t, getLang } from '../utils/i18n';

export function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      aria-label={isDark ? t('switch_light_mode', getLang()) : t('switch_dark_mode', getLang())}
      style={{
        background: 'none',
        border: 'none',
        // padding 13 + margin -9 = 44px hit area, same 26px layout footprint
        padding: 13,
        margin: -9,
        color: 'var(--dw-text-muted)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 6,
        transition: 'opacity 0.15s',
      }}
      onPointerDown={e => (e.currentTarget.style.opacity = '0.5')}
      onPointerUp={e => (e.currentTarget.style.opacity = '1')}
    >
      {isDark ? <Sun size={18} strokeWidth={1.75} /> : <Moon size={18} strokeWidth={1.75} />}
    </button>
  );
}
