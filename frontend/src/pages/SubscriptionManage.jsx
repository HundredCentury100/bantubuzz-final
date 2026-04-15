import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import api from '../services/api';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useAuth } from '../hooks/useAuth';
import {
  CheckIcon,
  XMarkIcon,
  ArrowPathIcon,
  CreditCardIcon,
  StarIcon,
  BoltIcon,
  TrophyIcon,
  UsersIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

export default function SubscriptionManage() {
  const [currentSubscription, setCurrentSubscription] = useState(null);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [billingCycle, setBillingCycle] = useState('monthly');
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Get pre-selected plan from navigation state (from Pricing page)
  const selectedPlanId = location.state?.selectedPlanId;
  const preselectedBillingCycle = location.state?.billingCycle || 'monthly';

  useEffect(() => {
    if (preselectedBillingCycle) {
      setBillingCycle(preselectedBillingCycle);
    }
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // For creators, fetch creator subscriptions
      if (user?.user_type === 'creator' || user?.is_creator) {
        const [subsRes, plansRes] = await Promise.all([
          api.get('/subscriptions/my-subscription'),
          api.get('/subscriptions/plans?user_type=creator'), // Filter for creator plans
        ]);

        setCurrentSubscription(subsRes.data.data);
        setPlans(plansRes.data.data);
      } else {
        // For brands, fetch brand subscriptions
        const [subsRes, plansRes] = await Promise.all([
          api.get('/subscriptions/my-subscription'),
          api.get('/subscriptions/plans?user_type=brand'), // Filter for brand plans
        ]);

        setCurrentSubscription(subsRes.data.data);
        setPlans(plansRes.data.data);
      }
    } catch (error) {
      console.error('Error fetching subscription data:', error);
      toast.error('Failed to load subscription information');
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (planId) => {
    try {
      setActionLoading(true);
      const plan = plans.find(p => p.id === planId);

      // For free plan, subscribe immediately
      if (plan.slug === 'free' || plan.slug === 'creator-free' || (plan.price_monthly === 0 && plan.price_yearly === 0)) {
        const res = await api.post('/subscriptions/subscribe', {
          plan_id: planId,
          billing_cycle: billingCycle
        });

        if (res.data.success) {
          toast.success('Successfully subscribed to Free plan!');
          await fetchData();
        }
        return;
      }

      // For paid plans, initiate payment
      const res = await api.post('/subscriptions/subscribe', {
        plan_id: planId,
        billing_cycle: billingCycle
      });

      if (res.data.success && res.data.data) {
        localStorage.setItem('lastSubscriptionId', res.data.data.subscription_id);

        navigate('/subscription/payment', {
          state: {
            paymentData: {
              subscription_id: res.data.data.subscription_id,
              redirect_url: res.data.data.redirect_url,
              poll_url: res.data.data.poll_url,
              payment_reference: res.data.data.payment_reference
            },
            plan: plan,
            billingCycle: billingCycle
          }
        });
      }
    } catch (error) {
      console.error('Error subscribing:', error);
      toast.error(error.response?.data?.error || 'Failed to subscribe');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpgrade = async (planId) => {
    try {
      setActionLoading(true);
      const plan = plans.find(p => p.id === planId);

      const res = await api.put('/subscriptions/upgrade', {
        plan_id: planId,
        billing_cycle: billingCycle
      });

      if (res.data.success && res.data.data) {
        if (res.data.data.redirect_url) {
          localStorage.setItem('lastSubscriptionId', actualSubscription?.id || currentSubscription?.subscription?.id);

          navigate('/subscription/payment', {
            state: {
              paymentData: {
                subscription_id: actualSubscription?.id || currentSubscription?.subscription?.id,
                redirect_url: res.data.data.redirect_url,
                poll_url: res.data.data.poll_url,
                payment_reference: res.data.data.payment_reference
              },
              plan: plan,
              billingCycle: billingCycle
            }
          });
        } else {
          toast.success('Successfully upgraded subscription!');
          await fetchData();
        }
      }
    } catch (error) {
      console.error('Error upgrading:', error);
      toast.error(error.response?.data?.error || 'Failed to upgrade subscription');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    const confirmCancel = window.confirm(
      'Are you sure you want to cancel your subscription? Your access will continue until the end of your billing period.'
    );

    if (!confirmCancel) return;

    try {
      setActionLoading(true);
      const res = await api.put('/subscriptions/cancel');

      if (res.data.success) {
        toast.success('Subscription cancelled. Access continues until end of billing period.');
        await fetchData();
      }
    } catch (error) {
      console.error('Error cancelling:', error);
      toast.error(error.response?.data?.error || 'Failed to cancel subscription');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReactivate = async () => {
    try {
      setActionLoading(true);
      const res = await api.put('/subscriptions/reactivate');

      if (res.data.success) {
        toast.success('Subscription reactivated!');
        await fetchData();
      }
    } catch (error) {
      console.error('Error reactivating:', error);
      toast.error(error.response?.data?.error || 'Failed to reactivate subscription');
    } finally {
      setActionLoading(false);
    }
  };

  const getPlanIcon = (slug) => {
    switch (slug) {
      case 'starter':
        return StarIcon;
      case 'pro':
        return BoltIcon;
      case 'agency':
        return TrophyIcon;
      default:
        return UsersIcon;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-light">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  // Check if user has an actual active subscription (not just free plan)
  const hasActiveSubscription = currentSubscription?.has_subscription === true;
  const actualSubscription = hasActiveSubscription ? currentSubscription?.subscription : null;
  const currentPlan = actualSubscription?.plan || currentSubscription?.plan || plans.find(p => p.slug === 'free');
  const isActive = actualSubscription?.status === 'active';
  const isCancelled = actualSubscription?.cancel_at_period_end;

  return (
    <div className="min-h-screen flex flex-col bg-light">
      <Navbar />

      <div className="flex-1 py-12 px-6 lg:px-12 xl:px-20">
        <div className="w-full max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-12 text-center">
            <h1 className="text-5xl md:text-6xl font-bold text-dark mb-4 leading-tight">
              {user?.user_type === 'creator' ? 'My Creator Subscriptions' : 'Manage Your Subscription'}
            </h1>
            <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
              {user?.user_type === 'creator'
                ? 'View and manage your verification and featured subscriptions'
                : 'View and manage your BantuBuzz subscription plan'}
            </p>
          </div>

          {/* Current Subscription Card */}
          {hasActiveSubscription && currentPlan && actualSubscription && (
            <div className="bg-white rounded-3xl shadow-sm p-8 md:p-12 mb-12">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-8">
                <div className="mb-4 md:mb-0">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                      {(() => {
                        const Icon = getPlanIcon(currentPlan.slug);
                        return <Icon className="h-6 w-6 text-primary" />;
                      })()}
                    </div>
                    <h2 className="text-3xl font-bold text-dark">
                      {currentPlan.name || 'Free Plan'}
                    </h2>
                  </div>
                  <p className="text-gray-600 text-lg">
                    {currentPlan.description || 'Perfect for getting started on BantuBuzz'}
                  </p>
                </div>
                <div className={`inline-flex items-center px-6 py-3 rounded-full font-semibold ${
                  isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {actualSubscription?.status?.toUpperCase() || 'ACTIVE'}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-light rounded-3xl p-6">
                  <p className="text-sm text-gray-600 mb-2">Billing Cycle</p>
                  <p className="text-2xl font-bold text-dark capitalize">
                    {actualSubscription?.billing_cycle || 'Monthly'}
                  </p>
                </div>
                <div className="bg-light rounded-3xl p-6">
                  <p className="text-sm text-gray-600 mb-2">Current Period Ends</p>
                  <p className="text-2xl font-bold text-dark">
                    {formatDate(actualSubscription?.current_period_end)}
                  </p>
                </div>
                <div className="bg-light rounded-3xl p-6">
                  <p className="text-sm text-gray-600 mb-2">Next Payment</p>
                  <p className="text-2xl font-bold text-dark">
                    {actualSubscription?.next_payment_date
                      ? formatDate(actualSubscription.next_payment_date)
                      : 'N/A'}
                  </p>
                </div>
              </div>

              {isCancelled && (
                <div className="bg-yellow-50 border-2 border-yellow-200 rounded-3xl p-6 mb-8">
                  <div className="flex items-start gap-4">
                    <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600 flex-shrink-0 mt-1" />
                    <div>
                      <h3 className="text-lg font-bold text-yellow-900 mb-2">
                        Subscription Cancelled
                      </h3>
                      <p className="text-yellow-800">
                        Your subscription will remain active until {formatDate(actualSubscription?.current_period_end)}.
                        You can reactivate it anytime before then.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-4">
                {isCancelled ? (
                  <button
                    onClick={handleReactivate}
                    disabled={actionLoading}
                    className="bg-primary hover:bg-primary/90 text-dark px-8 py-3 rounded-full font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {actionLoading && <ArrowPathIcon className="h-5 w-5 animate-spin" />}
                    Reactivate Subscription
                  </button>
                ) : currentPlan?.slug !== 'free' && (
                  <button
                    onClick={handleCancel}
                    disabled={actionLoading}
                    className="bg-gray-200 hover:bg-gray-300 text-dark px-8 py-3 rounded-full font-medium transition-colors"
                  >
                    Cancel Subscription
                  </button>
                )}
                <Link
                  to={user?.user_type === 'creator' ? '/creator/subscriptions' : '/pricing'}
                  className="bg-dark hover:bg-gray-800 text-white px-8 py-3 rounded-full font-medium transition-colors"
                >
                  View All Plans
                </Link>
              </div>
            </div>
          )}

          {/* No Subscription State */}
          {!currentSubscription && (
            <div className="bg-white rounded-3xl shadow-sm p-12 mb-12 text-center">
              <div className="max-w-2xl mx-auto">
                <div className="inline-flex p-4 rounded-full bg-gray-100 mb-6">
                  <CreditCardIcon className="h-12 w-12 text-gray-400" />
                </div>
                <h2 className="text-3xl font-bold text-dark mb-4">
                  No Active Subscription
                </h2>
                <p className="text-lg text-gray-600 mb-8">
                  Choose a plan below to get started with BantuBuzz and unlock powerful features for your creator journey.
                </p>
              </div>
            </div>
          )}

          {/* Available/Upgrade Plans */}
          {(!hasActiveSubscription || (hasActiveSubscription && currentPlan?.slug !== 'agency')) && (
            <div>
              <div className="text-center mb-8">
                <h2 className="text-3xl md:text-4xl font-bold text-dark mb-4">
                  {hasActiveSubscription ? 'Upgrade Your Plan' : 'Choose Your Plan'}
                </h2>

                {/* Billing Toggle */}
                <div className="flex items-center justify-center gap-4 mt-8">
                  <span className={`text-sm font-semibold ${billingCycle === 'monthly' ? 'text-dark' : 'text-gray-500'}`}>
                    Monthly
                  </span>
                  <button
                    onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
                    className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${
                      billingCycle === 'yearly' ? 'bg-primary' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform shadow-lg ${
                        billingCycle === 'yearly' ? 'translate-x-8' : 'translate-x-1'
                      }`}
                    />
                  </button>
                  <span className={`text-sm font-semibold ${billingCycle === 'yearly' ? 'text-dark' : 'text-gray-500'}`}>
                    Yearly <span className="text-green-600 font-bold">(Save 17%)</span>
                  </span>
                </div>
              </div>

              {/* Plan Cards Grid - Same compact design as Pricing page */}
              <div className="overflow-x-auto pb-4 pt-4">
                <div className="flex gap-6 min-w-max px-4 mx-auto justify-center flex-wrap" style={{ maxWidth: '1200px' }}>
                  {plans
                    .filter((plan) => !hasActiveSubscription || plan.id !== currentPlan?.id)
                    .map((plan) => {
                      const price = billingCycle === 'yearly' ? plan.price_yearly / 12 : plan.price_monthly;
                      const totalPrice = billingCycle === 'yearly' ? plan.price_yearly : plan.price_monthly;
                      const isCurrentPlan = currentPlan?.id === plan.id;
                      const isFree = plan.price_monthly === 0 && plan.price_yearly === 0;
                      const isPopular = plan.slug === 'pro' || plan.slug === 'creatorPro';
                      const isAgency = plan.slug === 'agency';
                      const saving = plan.price_monthly > 0 ? plan.price_monthly * 2 : 0;

                      return (
                        <div
                          key={plan.id}
                          className={`relative bg-white rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 p-4 flex flex-col flex-1 min-w-[220px] max-w-[240px] ${
                            isPopular ? 'border-2 border-primary' : 'border border-gray-200'
                          }`}
                        >
                          {/* Badge */}
                          {isPopular && (
                            <div className="absolute -top-2.5 left-1/2 transform -translate-x-1/2 bg-dark text-white px-3 py-0.5 rounded-full text-[10px] font-semibold uppercase">
                              MOST POPULAR
                            </div>
                          )}
                          {isAgency && (
                            <div className="absolute -top-2.5 left-1/2 transform -translate-x-1/2 bg-dark text-white px-3 py-0.5 rounded-full text-[10px] font-semibold uppercase">
                              AGENCY PLAN
                            </div>
                          )}

                          {/* Plan name + tagline */}
                          <div className="mb-3">
                            <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-1">
                              {plan.description || 'Perfect for getting started'}
                            </p>
                            <h3 className="text-lg font-bold text-dark">{plan.name}</h3>
                          </div>

                          {/* Price */}
                          <div className="mb-3">
                            {isFree ? (
                              <div className="text-3xl font-black text-dark">Free</div>
                            ) : (
                              <>
                                <div className="flex items-baseline gap-0.5">
                                  <span className="text-lg font-bold text-gray-600">$</span>
                                  <span className="text-3xl font-black text-dark">{Math.round(price)}</span>
                                  <span className="text-[11px] text-gray-600 ml-1">
                                    {billingCycle === 'yearly' ? '/mo billed yearly' : '/mo'}
                                  </span>
                                </div>
                                {billingCycle === 'yearly' && saving > 0 && (
                                  <div className="text-[10px] text-green-600 font-semibold mt-0.5">
                                    You save ${saving}/yr
                                  </div>
                                )}
                              </>
                            )}

                            {/* Fee chip */}
                            <div className="inline-flex items-center gap-1.5 bg-gray-100 rounded-full px-2 py-1 mt-2">
                              <span className="text-xs font-bold text-dark">
                                {user?.user_type === 'creator'
                                  ? `${plan.restrictions?.commission_percentage || 15}%`
                                  : `${plan.restrictions?.service_fee_percentage || plan.platform_fee_percentage || 12}%`}
                              </span>
                              <span className="text-[10px] text-gray-600">
                                {user?.user_type === 'creator' ? 'commission' : 'service fee'}
                              </span>
                            </div>
                          </div>

                          {/* Divider */}
                          <div className="h-px bg-gray-200 mb-3" />

                          {/* Features by category */}
                          <div className="flex-1 flex flex-col gap-3 mb-4">
                            {/* Brand Plans */}
                            {user?.user_type === 'brand' && (
                              <>
                                {/* Campaigns Section */}
                                <div>
                                  <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-1.5">Campaigns</p>
                                  <div className="flex flex-col gap-1.5">
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-[10px] font-semibold text-dark bg-gray-100 px-1.5 py-0.5 rounded-full flex-shrink-0">
                                        {plan.restrictions?.max_active_campaigns === -1 ? 'Unlimited' : plan.restrictions?.max_active_campaigns || 5}
                                      </span>
                                      <span className="text-xs text-gray-700 leading-tight">Active campaigns</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-[10px] font-semibold text-dark bg-gray-100 px-1.5 py-0.5 rounded-full flex-shrink-0">
                                        {plan.restrictions?.max_active_collaborations === -1 ? 'Unlimited' : plan.restrictions?.max_active_collaborations || 10}
                                      </span>
                                      <span className="text-xs text-gray-700 leading-tight">Collaborations</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-[10px] font-semibold text-dark bg-gray-100 px-1.5 py-0.5 rounded-full flex-shrink-0">
                                        {plan.restrictions?.max_team_members || 1}
                                      </span>
                                      <span className="text-xs text-gray-700 leading-tight">Team members</span>
                                    </div>
                                  </div>
                                </div>

                                {/* Discovery Section */}
                                <div>
                                  <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-1.5">Discovery</p>
                                  <div className="flex flex-col gap-1.5">
                                    <div className="flex items-center gap-1.5">
                                      <svg className="w-4 h-4 text-primary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                      </svg>
                                      <span className="text-xs text-gray-700 leading-tight">Browse creators</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-[10px] font-semibold text-dark bg-gray-100 px-1.5 py-0.5 rounded-full flex-shrink-0">
                                        {plan.restrictions?.max_creator_lists === -1 ? 'Unlimited' : plan.restrictions?.max_creator_lists || 3}
                                      </span>
                                      <span className="text-xs text-gray-700 leading-tight">Creator lists</span>
                                    </div>
                                  </div>
                                </div>

                                {/* Analytics Section */}
                                <div>
                                  <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-1.5">Analytics</p>
                                  <div className="flex flex-col gap-1.5">
                                    <div className="flex items-center gap-1.5">
                                      {plan.features?.analytics_access ? (
                                        <svg className="w-4 h-4 text-primary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                      ) : (
                                        <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                      )}
                                      <span className={`text-xs leading-tight ${plan.features?.analytics_access ? 'text-gray-700' : 'text-gray-400'}`}>
                                        Analytics dashboard
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      {plan.features?.has_advanced_analytics ? (
                                        <svg className="w-4 h-4 text-primary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                      ) : (
                                        <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                      )}
                                      <span className={`text-xs leading-tight ${plan.features?.has_advanced_analytics ? 'text-gray-700' : 'text-gray-400'}`}>
                                        Exportable reports
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* Support Section */}
                                <div>
                                  <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-1.5">Support</p>
                                  <div className="flex flex-col gap-1.5">
                                    <div className="flex items-center gap-1.5">
                                      {plan.features?.priority_support || plan.features?.has_dedicated_support ? (
                                        <svg className="w-4 h-4 text-primary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                      ) : (
                                        <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                      )}
                                      <span className={`text-xs leading-tight ${plan.features?.priority_support || plan.features?.has_dedicated_support ? 'text-gray-700' : 'text-gray-400'}`}>
                                        {plan.features?.has_dedicated_support ? 'Dedicated support' : 'Priority support'}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </>
                            )}

                            {/* Creator Plans */}
                            {user?.user_type === 'creator' && (
                              <>
                                {/* Profile Section */}
                                <div>
                                  <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-1.5">Profile</p>
                                  <div className="flex flex-col gap-1.5">
                                    <div className="flex items-center gap-1.5">
                                      {plan.restrictions?.has_verified_badge ? (
                                        <svg className="w-4 h-4 text-primary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                      ) : (
                                        <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                      )}
                                      <span className={`text-xs leading-tight ${plan.restrictions?.has_verified_badge ? 'text-gray-700' : 'text-gray-400'}`}>
                                        Verified badge
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-[10px] font-semibold text-dark bg-gray-100 px-1.5 py-0.5 rounded-full flex-shrink-0">
                                        {plan.restrictions?.max_portfolio_items === -1 ? 'Unlimited' : plan.restrictions?.max_portfolio_items || 10}
                                      </span>
                                      <span className="text-xs text-gray-700 leading-tight">Portfolio items</span>
                                    </div>
                                  </div>
                                </div>

                                {/* Visibility Section */}
                                <div>
                                  <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-1.5">Visibility</p>
                                  <div className="flex flex-col gap-1.5">
                                    <div className="flex items-center gap-1.5">
                                      {plan.restrictions?.search_placement_priority > 0 ? (
                                        <svg className="w-4 h-4 text-primary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                      ) : (
                                        <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                      )}
                                      <span className={`text-xs leading-tight ${plan.restrictions?.search_placement_priority > 0 ? 'text-gray-700' : 'text-gray-400'}`}>
                                        {plan.restrictions?.search_placement_priority === 2 ? 'Priority placement' : plan.restrictions?.search_placement_priority === 1 ? 'Boosted placement' : 'Standard placement'}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      {plan.features?.has_priority_listing ? (
                                        <svg className="w-4 h-4 text-primary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                      ) : (
                                        <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                      )}
                                      <span className={`text-xs leading-tight ${plan.features?.has_priority_listing ? 'text-gray-700' : 'text-gray-400'}`}>
                                        Featured sections
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* Campaigns Section */}
                                <div>
                                  <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-1.5">Campaigns</p>
                                  <div className="flex flex-col gap-1.5">
                                    <div className="flex items-center gap-1.5">
                                      {plan.features?.can_access_campaigns ? (
                                        <svg className="w-4 h-4 text-primary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                      ) : (
                                        <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                      )}
                                      <span className={`text-xs leading-tight ${plan.features?.can_access_campaigns ? 'text-gray-700' : 'text-gray-400'}`}>
                                        Apply to campaigns
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      {plan.restrictions?.can_message_brands_first ? (
                                        <svg className="w-4 h-4 text-primary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                      ) : (
                                        <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                      )}
                                      <span className={`text-xs leading-tight ${plan.restrictions?.can_message_brands_first ? 'text-gray-700' : 'text-gray-400'}`}>
                                        Message brands first
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* Extras Section */}
                                <div>
                                  <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-1.5">Extras</p>
                                  <div className="flex flex-col gap-1.5">
                                    <div className="flex items-center gap-1.5">
                                      {plan.features?.analytics_access ? (
                                        <svg className="w-4 h-4 text-primary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                      ) : (
                                        <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                      )}
                                      <span className={`text-xs leading-tight ${plan.features?.analytics_access ? 'text-gray-700' : 'text-gray-400'}`}>
                                        Profile analytics
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </>
                            )}
                          </div>

                          {/* CTA Button */}
                          {isCurrentPlan ? (
                            <div className="w-full py-2.5 bg-light text-gray-700 rounded-full text-center text-sm font-medium">
                              Current Plan
                            </div>
                          ) : (
                            <button
                              onClick={() => hasActiveSubscription ? handleUpgrade(plan.id) : handleSubscribe(plan.id)}
                              disabled={actionLoading || isCancelled}
                              className={`w-full py-2.5 rounded-full text-sm font-semibold transition-all ${
                                isPopular
                                  ? 'bg-primary hover:bg-primary-dark text-dark'
                                  : isAgency
                                  ? 'bg-dark hover:bg-gray-800 text-white'
                                  : 'border-2 border-gray-300 hover:border-dark text-dark hover:bg-gray-50'
                              } disabled:opacity-50`}
                            >
                              {actionLoading ? 'Processing...' : hasActiveSubscription ? 'Upgrade' : isFree ? 'Get Started — Free' : 'Subscribe Now'}
                            </button>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}
