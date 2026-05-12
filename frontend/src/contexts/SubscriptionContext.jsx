import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';

const SubscriptionContext = createContext();

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};

export const SubscriptionProvider = ({ children }) => {
  const { user } = useAuth();
  const [upgradePrompt, setUpgradePrompt] = useState(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [subscriptionData, setSubscriptionData] = useState(null);
  const [usageData, setUsageData] = useState(null);

  // Fetch subscription data on mount
  useEffect(() => {
    if (user) {
      fetchSubscriptionData();
    }
  }, [user]);

  const fetchSubscriptionData = async () => {
    try {
      const response = await api.get('/subscriptions/my-subscription');
      setSubscriptionData(response.data.data);
    } catch (error) {
      console.error('Error fetching subscription data:', error);
    }
  };

  // Fetch usage data (optional - can be called on demand)
  const fetchUsageData = async () => {
    try {
      const response = await api.get('/subscriptions/usage');
      setUsageData(response.data.data);
      return response.data.data;
    } catch (error) {
      console.error('Error fetching usage data:', error);
      return null;
    }
  };

  // Show upgrade modal with specific prompt
  const showUpgradePrompt = (prompt) => {
    setUpgradePrompt(prompt);
    setShowUpgradeModal(true);
  };

  // Hide upgrade modal
  const hideUpgradeModal = () => {
    setShowUpgradeModal(false);
    setUpgradePrompt(null);
  };

  // Handle 403 subscription errors globally
  const handle403Error = (error) => {
    if (error.response?.status === 403 && error.response?.data?.upgrade_required) {
      const { upgrade_prompt } = error.response.data;
      if (upgrade_prompt) {
        showUpgradePrompt(upgrade_prompt);
        return true; // Indicates error was handled
      }
    }
    return false; // Error not handled
  };

  const value = {
    subscriptionData,
    usageData,
    upgradePrompt,
    showUpgradeModal,
    showUpgradePrompt,
    hideUpgradeModal,
    handle403Error,
    fetchSubscriptionData,
    fetchUsageData,
    refreshSubscription: fetchSubscriptionData,
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
};
