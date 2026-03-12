import { Card } from '../components/Card';
import { ThemeToggle } from '../components/ThemeToggle';
import { useUser } from '../contexts/UserContext';

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
  const { userProfile, profilePic, requireEmail, setup } = useUser();
  

  const displayName = userProfile?.firstName
    ? `${userProfile.firstName}${userProfile.lastName ? ' ' + userProfile.lastName : ''}`
    : 'Guest';

  const translation = localStorage.getItem('dw_translation') || 'ESV';
  const fontScale = parseFloat(localStorage.getItem('dw_fontscale') || '1');
  const fontLabel = fontScale <= 0.9 ? 'Small' : fontScale >= 1.3 ? 'Large' : 'Medium';
  const lang = localStorage.getItem('dw_lang') || 'en';
  const langLabel = lang === 'es' ? 'Español' : lang === 'pt' ? 'Português' : 'English';
  const kjvDownloaded = localStorage.getItem('dw_kjv_downloaded') === 'true';

  const campusName = userProfile?.campus
    ? (userProfile.campus.replace(/^futures-/, '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()))
    : 'Not set';

  const profileRows: SettingsRow[] = [
    { icon: User, label: 'Profile', value: displayName, action: () => requireEmail() },
    { icon: Church, label: 'Campus', value: campusName },
    { icon: Mail, label: 'Email', value: userProfile?.email || 'Not set', action: () => requireEmail() },
  ];

  const preferenceRows: SettingsRow[] = [
    { icon: Globe, label: 'Translation', value: translation },
    { icon: Type, label: 'Font Size', value: fontLabel },
    { icon: Languages, label: 'Language', value: langLabel },
    { icon: Bell, label: 'Notifications', value: 'Tap to configure' },
  ];

  const contentRows: SettingsRow[] = [
    { icon: Book, label: 'Library', value: 'Books & essays' },
    { icon: Download, label: 'Offline Bible', value: kjvDownloaded ? 'KJV — Downloaded' : 'KJV — Not downloaded' },
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
                cursor: row.action ? 'pointer' : 'default',
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

        {/* Profile avatar */}
        <div
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 28, cursor: 'pointer' }}
          onClick={() => requireEmail()}
        >
          {profilePic ? (
            <img
              src={profilePic}
              alt="Profile"
              style={{
                width: 72, height: 72, borderRadius: '50%',
                objectFit: 'cover', marginBottom: 10,
                border: '2px solid var(--dw-accent)',
              }}
            />
          ) : (
            <div style={{
              width: 72, height: 72, borderRadius: '50%',
              background: 'var(--dw-accent-bg)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 10, border: '2px solid var(--dw-accent)',
            }}>
              <User size={32} style={{ color: 'var(--dw-accent)' }} />
            </div>
          )}
          <p style={{ color: 'var(--dw-text-primary)', fontSize: 16, fontWeight: 500, fontFamily: 'var(--font-sans)' }}>
            {displayName}
          </p>
          {setup?.persona && (
            <p style={{ color: 'var(--dw-accent)', fontSize: 12, fontFamily: 'var(--font-sans)', marginTop: 2, textTransform: 'capitalize' }}>
              {setup.persona.replace(/_/g, ' ')}
            </p>
          )}
          <p style={{ color: 'var(--dw-text-muted)', fontSize: 13, fontFamily: 'var(--font-sans)', marginTop: 2 }}>
            {userProfile?.email || 'Tap to set up your profile'}
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
