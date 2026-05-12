import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  SparklesIcon,
  CheckIcon,
  XMarkIcon,
  ArrowRightIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

const UpgradeModal = ({ isOpen, onClose, upgradePrompt, userType = 'creator' }) => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen || !upgradePrompt) return null;

  const { current_plan, next_plan, feature } = upgradePrompt;

  // Feature descriptions for better UX
  const featureDescriptions = {
    active_collaborations: 'active collaborations',
    proposals_per_month: 'proposals per month',
    packages: 'packages',
    campaigns_per_month: 'campaigns per month',
    team_members: 'team members',
    creator_lists: 'saved creator lists',
  };

  const featureDescription = featureDescriptions[feature] || feature;

  // Get comparison features based on user type
  const getComparisonFeatures = () => {
    if (userType === 'creator') {
      return [
        {
          label: 'Platform Commission',
          current: `${current_plan?.platform_fee_percentage || 15}%`,
          next: `${next_plan?.platform_fee_percentage || 10}%`,
          highlight: true,
        },
        {
          label: 'Active Collaborations',
          current: current_plan?.max_active_collaborations === -1 ? 'Unlimited' : current_plan?.max_active_collaborations || 3,
          next: next_plan?.max_active_collaborations === -1 ? 'Unlimited' : next_plan?.max_active_collaborations || 10,
        },
        {
          label: 'Proposals per Month',
          current: current_plan?.max_bookings_per_month === -1 ? 'Unlimited' : current_plan?.max_bookings_per_month || 5,
          next: next_plan?.max_bookings_per_month === -1 ? 'Unlimited' : next_plan?.max_bookings_per_month || 20,
        },
        {
          label: 'Packages',
          current: current_plan?.max_packages === -1 ? 'Unlimited' : current_plan?.max_packages || 3,
          next: next_plan?.max_packages === -1 ? 'Unlimited' : next_plan?.max_packages || 10,
        },
        {
          label: 'Portfolio Items',
          current: current_plan?.max_portfolio_items === -1 ? 'Unlimited' : current_plan?.max_portfolio_items || 10,
          next: next_plan?.max_portfolio_items === -1 ? 'Unlimited' : next_plan?.max_portfolio_items || 20,
        },
        {
          label: 'Analytics',
          current: current_plan?.analytics_access,
          next: next_plan?.analytics_access,
          type: 'boolean',
        },
        {
          label: 'Priority Support',
          current: current_plan?.priority_support,
          next: next_plan?.priority_support,
          type: 'boolean',
        },
        {
          label: 'Verified Badge',
          current: current_plan?.verified_badge,
          next: next_plan?.verified_badge,
          type: 'boolean',
        },
      ];
    } else {
      // Brand features
      return [
        {
          label: 'Service Fee',
          current: `${current_plan?.platform_fee_percentage || 12}%`,
          next: `${next_plan?.platform_fee_percentage || 8}%`,
          highlight: true,
        },
        {
          label: 'Campaigns per Month',
          current: current_plan?.max_active_campaigns === -1 ? 'Unlimited' : current_plan?.max_active_campaigns || 2,
          next: next_plan?.max_active_campaigns === -1 ? 'Unlimited' : next_plan?.max_active_campaigns || 10,
        },
        {
          label: 'Active Collaborations',
          current: current_plan?.max_active_collaborations === -1 ? 'Unlimited' : current_plan?.max_active_collaborations || 5,
          next: next_plan?.max_active_collaborations === -1 ? 'Unlimited' : next_plan?.max_active_collaborations || 20,
        },
        {
          label: 'Team Members',
          current: current_plan?.max_team_members === -1 ? 'Unlimited' : current_plan?.max_team_members || 1,
          next: next_plan?.max_team_members === -1 ? 'Unlimited' : next_plan?.max_team_members || 5,
        },
        {
          label: 'Creator Lists',
          current: current_plan?.max_creator_lists === -1 ? 'Unlimited' : current_plan?.max_creator_lists || 3,
          next: next_plan?.max_creator_lists === -1 ? 'Unlimited' : next_plan?.max_creator_lists || 10,
        },
        {
          label: 'Analytics',
          current: current_plan?.analytics_access,
          next: next_plan?.analytics_access,
          type: 'boolean',
        },
        {
          label: 'Priority Support',
          current: current_plan?.priority_support,
          next: next_plan?.priority_support,
          type: 'boolean',
        },
      ];
    }
  };

  const comparisonFeatures = getComparisonFeatures();

  const handleUpgrade = () => {
    setIsLoading(true);
    // Navigate to subscription management page
    if (userType === 'creator') {
      navigate('/creator/subscriptions');
    } else {
      navigate('/brand/subscriptions');
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 md:p-8">
          {/* Header */}
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                <SparklesIcon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-dark">Plan Limit Reached</h2>
                <p className="text-sm text-gray-600">Upgrade to continue growing</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-500 hover:text-gray-700 transition-colors"
              disabled={isLoading}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Limit Message */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div className="flex-1">
                <p className="font-semibold text-yellow-900 mb-1">
                  You've reached your {current_plan?.name} plan limit
                </p>
                <p className="text-sm text-yellow-800">
                  Upgrade to {next_plan?.name} to unlock more {featureDescription} and continue growing your business.
                </p>
              </div>
            </div>
          </div>

          {/* Plan Comparison */}
          <div className="mb-6">
            <h3 className="text-lg font-bold text-dark mb-4">Compare Plans</h3>

            <div className="grid grid-cols-3 gap-4">
              {/* Header Row */}
              <div className="text-sm font-medium text-gray-600">Feature</div>
              <div className="text-center">
                <div className="text-sm font-semibold text-gray-700">{current_plan?.name}</div>
                <div className="text-xs text-gray-500">Current</div>
              </div>
              <div className="text-center">
                <div className="text-sm font-semibold text-primary">{next_plan?.name}</div>
                <div className="text-xs text-primary">Recommended</div>
              </div>

              {/* Pricing Row */}
              <div className="col-span-3 border-t border-gray-200 pt-4 mt-2"></div>
              <div className="text-sm font-medium text-gray-900">Monthly Price</div>
              <div className="text-center">
                <span className="font-bold text-gray-700">
                  ${current_plan?.price_monthly?.toFixed(2) || '0.00'}
                </span>
              </div>
              <div className="text-center">
                <span className="font-bold text-primary">
                  ${next_plan?.price_monthly?.toFixed(2) || '0.00'}
                </span>
              </div>

              {/* Features Rows */}
              {comparisonFeatures.map((feat, idx) => (
                <div key={idx} className="col-span-3 contents">
                  <div className="col-span-3 border-t border-gray-100 pt-3 mt-3"></div>
                  <div className={`text-sm ${feat.highlight ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                    {feat.label}
                  </div>
                  <div className="text-center">
                    {feat.type === 'boolean' ? (
                      feat.current ? (
                        <CheckIcon className="h-5 w-5 text-gray-600 mx-auto" />
                      ) : (
                        <XMarkIcon className="h-5 w-5 text-gray-300 mx-auto" />
                      )
                    ) : (
                      <span className={`font-semibold ${feat.highlight ? 'text-gray-900' : 'text-gray-700'}`}>
                        {feat.current}
                      </span>
                    )}
                  </div>
                  <div className="text-center">
                    {feat.type === 'boolean' ? (
                      feat.next ? (
                        <CheckIcon className="h-5 w-5 text-primary mx-auto" />
                      ) : (
                        <XMarkIcon className="h-5 w-5 text-gray-300 mx-auto" />
                      )
                    ) : (
                      <span className={`font-semibold ${feat.highlight ? 'text-primary' : 'text-primary'}`}>
                        {feat.next}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Savings Highlight */}
          {userType === 'creator' && current_plan?.platform_fee_percentage > next_plan?.platform_fee_percentage && (
            <div className="bg-gradient-to-r from-primary/10 to-primary-dark/10 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-3">
                <svg className="w-6 h-6 text-primary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                <div className="flex-1">
                  <p className="font-semibold text-dark">
                    Save {current_plan.platform_fee_percentage - next_plan.platform_fee_percentage}% on every collaboration
                  </p>
                  <p className="text-sm text-gray-600">
                    Lower commission means more money in your pocket
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleClose}
              className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
              disabled={isLoading}
            >
              Maybe Later
            </button>
            <button
              onClick={handleUpgrade}
              className="flex-1 px-6 py-3 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Loading...
                </>
              ) : (
                <>
                  <ArrowPathIcon className="h-5 w-5" />
                  Upgrade to {next_plan?.name}
                </>
              )}
            </button>
          </div>

          {/* Additional Info */}
          <p className="text-xs text-gray-500 text-center mt-4">
            No long-term commitment. Cancel anytime.
          </p>
        </div>
      </div>
    </div>
  );
};

export default UpgradeModal;
