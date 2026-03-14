import { getGreeting } from '../utils/persona-config';
import { useHome } from './HomeContext';

export function GreetingSection() {
  const { personaConfig, userProfile, streakCount } = useHome();
  const greetingText = getGreeting(personaConfig.persona, userProfile?.firstName || '', streakCount);

  return (
    <p style={{
      fontFamily: 'var(--font-serif)',
      fontSize: 17,
      color: 'var(--dw-text-secondary)',
      textAlign: 'center',
      marginBottom: 16,
      lineHeight: 1.5,
      letterSpacing: '0.01em',
    }}>
      {greetingText}
    </p>
  );
}
