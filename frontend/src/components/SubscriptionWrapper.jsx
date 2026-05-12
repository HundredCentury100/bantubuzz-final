import { useSubscription } from '../contexts/SubscriptionContext';
import UpgradeModal from './UpgradeModal';
import { useAuth } from '../hooks/useAuth';

const SubscriptionWrapper = ({ children }) => {
  const { user } = useAuth();
  const { upgradePrompt, showUpgradeModal, hideUpgradeModal } = useSubscription();

  return (
    <>
      {children}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={hideUpgradeModal}
        upgradePrompt={upgradePrompt}
        userType={user?.user_type || 'creator'}
      />
    </>
  );
};

export default SubscriptionWrapper;
