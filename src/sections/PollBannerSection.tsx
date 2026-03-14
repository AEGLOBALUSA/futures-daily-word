import { FeedbackPoll } from '../components/FeedbackPoll';
import { useHome } from './HomeContext';

export function PollBannerSection() {
  const { personaConfig, userProfile } = useHome();
  if (!personaConfig.features.pollBanner) return null;
  return <FeedbackPoll userCampus={userProfile?.campus} />;
}
