import { Card } from '../components/Card';
import { ThemeToggle } from '../components/ThemeToggle';

import {
  User, Globe, Bell, Type, Book, Info, Shield, Mail,
  ChevronRight, Download, Languages, Church
} from 'lucide-react';

interface SettingsRow {
  icon: typeof User;
  label: string;
  value?: string;
  action?: () => void;
}

export function MoreScreen() {
  

  const profileRows: SettingsRow[] = [
    { icon: User, label: 'Profile', value: 'Set up your profile' },
    { icon: Church, label: 'Campus', value: 'Futures Alpharetta' },
    { icon: Mail, label: 'Email', value: 'Not set' },
  ];

  const preferenceRows: SettingsRow[] = [
    { icon: Globe, label: 'Translation', value: 'ESV' },
    { icon: Type, label: 'Font Size', value: 'Medium' },
    { icon: Languages, label: 'Language', value: 'English' },
    { icon: Bell, label: 'Notifications', value: 'Enabled' },
  ];

  const contentRows: SettingsRow[] = [
    { icon: Book, label: 'Library', value: '3 books available' },
    { icon: Download, label: 'Offline Bible', value: 'KJV — Not downloaded' },
  ];

  const aboutRows: SettingsRow[] = [
    { icon: Info, label: 'About Daily Word' },
    { icon: Shield, label: 'Privacy Policy' },
  ];

  function SettingsSection({ title, rows }: { title: string; rows: SettingsRow[] }) {
    return (
      <div style={{ marginBottom: 24 }}>
        <p className="text-section-header" style={{ marginBottom: 10, paddingLeft: 4 }}>{title}</p>
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          {rows.map((row, i) => (
            <button
              key={row.label}
              onClick={row.action}
              style={{
                display: 'flex',
                alignItems: 'center',
                width: '100%',
                padding: '14px 16px',
                background: 'none',
                border: 'none',
                borderBottom: i < rows.length - 1 ? '1px solid var(--dw-border-subtle)' : 'none',
                cursor: 'pointer',
                color: 'var(--dw-text-primary)',
                fontFamily: 'var(--font-sans)',
                fontSize: 14,
                textAlign: 'left',
                minHeight: 48,
                transition: 'background var(--transition-fast)',
              }}
            >
              <row.icon size={18} style={{ color: 'var(--dw-text-muted)', marginRight: 12, flexShrink: 0 }} />
              <span style={{ flex: 1 }}>{row.label}</span>
              {row.value && (
                <span style={{ color: 'var(--dw-text-muted)', fontSize: 13, marginRight: 8 }}>
                  {row.value}
                </span>
              )}
              <ChevronRight size={16} style={{ color: 'var(--dw-text-faint)' }} />
            </button>
          ))}
        </Card>
      </div>
    );
  }

  return (
    <div className="screen-container">
      <div style={{ padding: '24px 24px 0' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h1 style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 26,
            fontWeight: 400,
            color: 'var(--dw-text-primary)',
            letterSpacing: '-0.02em',
          }}>
            Settings
          </h1>
          <ThemeToggle />
        </div>

        {/* Profile avatar placeholder */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 28 }}>
          <div style={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            background: 'var(--dw-accent-bg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 10,
            border: '2px solid var(--dw-accent)',
          }}>
            <User size={32} style={{ color: 'var(--dw-accent)' }} />
          </div>
          <p style={{ color: 'var(--dw-text-primary)', fontSize: 16, fontWeight: 500, fontFamily: 'var(--font-sans)' }}>
            Guest
          </p>
          <p style={{ color: 'var(--dw-text-muted)', fontSize: 13, fontFamily: 'var(--font-sans)' }}>
            Tap to set up your profile
          </p>
        </div>

        <SettingsSection title="PROFILE" rows={profileRows} />
        <SettingsSection title="PREFERENCES" rows={preferenceRows} />
        <SettingsSection title="CONTENT" rows={contentRows} />
        <SettingsSection title="ABOUT" rows={aboutRows} />

        {/* Version */}
        <p style={{
          textAlign: 'center',
          color: 'var(--dw-text-faint)',
          fontSize: 11,
          fontFamily: 'var(--font-sans)',
          paddingBottom: 24,
        }}>
          Futures Daily Word v2.0 · Futures Church
        </p>
      </div>
    </div>
  );
}
