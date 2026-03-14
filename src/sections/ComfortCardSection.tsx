import { ComfortCard } from '../components/ComfortCard';
import { useHome } from './HomeContext';

export function ComfortCardSection() {
  const { personaConfig } = useHome();
  if (!personaConfig.features.comfortCard) return null;
  return <ComfortCard />;
}
