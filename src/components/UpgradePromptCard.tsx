/**
 * UpgradePromptCard — dismissible home screen card that appears
 * when a user meets the conditions for a persona pathway upgrade.
 */
import { useState, useEffect } from 'react';
import { Card } from './Card';
import { checkForUpgrade, dismissUpgrade } from '../utils/pathway-upgrades';

interface UpgradePromptCardProps {
  persona: string;
  onUpgrade: (newPersona: string) => void;
}

export function UpgradePromptCard({ persona, onUpgrade }: UpgradePromptCardProps) {
  const [upgrade, setUpgrade] = useState<ReturnType<typeof checkForUpgrade>>(null);
  const [dismissed, setDismissed] = useState(false);
  const [animateOut, setAnimateOut] = useState(false);

  useEffect(() => {
    const result = checkForUpgrade(persona);
    setUpgrade(result);
  }, [persona]);

  if (!upgrade || dismissed) return null;

  const handleDismiss = () => {
    setAnimateOut(true);
    setTimeout(() => {
      dismissUpgrade(persona);
      setDismissed(true);
    }, 300);
  };

  const handleUpgrade = () => {
    onUpgrade(upgrade.to);
  };

  return (
    <Card style={{
      marginBottom: 16,
      background: 'linear-gradient(135deg, rgba(37,99,235,0.08) 0%, rgba(139,92,246,0.06) 100%)',
      border: '1px solid rgba(37,99,235,0.25)',
      position: 'relative',
      opacity: animateOut ? 0 : 1,
      transform: animateOut ? 'translateY(-8px)' : 'translateY(0)',
      transition: 'opacity 0.3s ease, transform 0.3s ease',
    }}>
      <button
        onClick={handleDismiss}
        style={{
          position: 'absolute', top: 12, right: 12,
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--dw-text-muted)', fontSize: 18, lineHeight: 1, padding: 0,
        }}
      >
        &times;
      </button>

      <p style={{
        fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
        textTransform: 'uppercase', color: '#2563EB',
        fontFamily: 'var(--font-sans)', marginBottom: 6,
      }}>
        {upgrade.label}
      </p>

      <p style={{
        fontSize: 14, color: 'var(--dw-text-secondary)',
        fontFamily: 'var(--font-serif-text)', lineHeight: 1.55,
        marginBottom: 14,
      }}>
        {upgrade.description}
      </p>

      <div style={{ display: 'flex', gap: 10 }}>
        <button
          onClick={handleUpgrade}
          style={{
            flex: 1,
            background: '#2563EB',
            border: 'none',
            borderRadius: 10,
            padding: '10px 16px',
            color: '#fff',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'var(--font-sans)',
            minHeight: 42,
          }}
        >
          Let's Go
        </button>
        <button
          onClick={handleDismiss}
          style={{
            flex: 1,
            background: 'var(--dw-surface)',
            border: '1px solid var(--dw-border)',
            borderRadius: 10,
            padding: '10px 16px',
            color: 'var(--dw-text-muted)',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'var(--font-sans)',
            minHeight: 42,
          }}
        >
          Not Yet
        </button>
      </div>
    </Card>
  );
}
