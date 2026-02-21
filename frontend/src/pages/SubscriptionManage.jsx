import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import api from '../services/api';
import Navbar from '../components/Navbar';
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
      const [subsRes, plansRes] = await Promise.all([
        api.get('/subscriptions/my-subscription'),
        api.get('/subscriptions/plans'),
      ]);

      setCurrentSubscription(subsRes.data.data);
      setPlans(plansRes.data.data);
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
      if (plan.slug === 'free' || (plan.price_monthly === 0 && plan.price_yearly === 0)) {
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
        // Store subscription ID in localStorage
        localStorage.setItem('lastSubscriptionId', res.data.data.subscription_id);

        // Navigate to payment page with payment data
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

      // Call upgrade endpoint
      const res = await api.put('/subscriptions/upgrade', {
        new_plan_id: planId,
        billing_cycle: billingCycle
      });

      if (res.data.success && res.data.data) {
        // If there's payment data (for paid plans), redirect to payment
        if (res.data.data.redirect_url) {
          localStorage.setItem('lastSubscriptionId', currentSubscription.id);

          navigate('/subscription/payment', {
            state: {
              paymentData: {
                subscription_id: currentSubscription.id,
                redirect_url: res.data.data.redirect_url,
                poll_url: res.data.data.poll_url,
                payment_reference: res.data.data.payment_reference
              },
              plan: plan,
              billingCycle: billingCycle
            }
          });
        } else {
          // Free upgrade without payment
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
        return StarIcon; // Rising star for starter creators
      case 'pro':
        return BoltIcon; // Lightning bolt for power/professional users
      case 'agency':
        return TrophyIcon; // Trophy for premium/agency level
      default:
        return UsersIcon; // Community icon for free plan
    }
  };

  const getPlanColor = (slug) => {
    switch (slug) {
      case 'starter':
        return 'from-blue-600 to-blue-400';
      case 'pro':
        return 'from-primary to-yellow-400';
      case 'agency':
        return 'from-purple-600 to-pink-500';
      default:
        return 'from-gray-600 to-gray-400';
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
      <>
        <Navbar />
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </>
    );
  }

  const currentPlan = currentSubscription?.plan;
  const isActive = currentSubscription?.status === 'active';
  const isCancelled = currentSubscription?.cancel_at_period_end;

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Manage Subscription</h1>
            <p className="text-gray-600 mt-2">View and manage your BantuBuzz subscription</p>
          </div>

          {/* Current Subscription Card */}
          {currentSubscription && (
            <div className="card mb-8">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">
                    Current Plan: {currentPlan?.name}
                  </h2>
                  <p className="text-gray-600">{currentPlan?.description}</p>
                </div>
                <div className={`inline-flex items-center px-4 py-2 rounded-full ${
                  isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {currentSubscription?.status?.toUpperCase() || 'UNKNOWN'}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div>
                  <p className="text-sm text-gray-600">Billing Cycle</p>
                  <p className="text-lg font-semibold text-gray-900 capitalize">
                    {currentSubscription?.billing_cycle || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Current Period Ends</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {formatDate(currentSubscription?.current_period_end)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Next Payment</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {currentSubscription?.next_payment_date
                      ? formatDate(currentSubscription.next_payment_date)
                      : 'N/A'}
                  </p>
                </div>
              </div>

              {isCancelled && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                  <div className="flex items-start">
                    <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mr-3 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="text-sm font-semibold text-yellow-900">
                        Subscription Cancelled
                      </h3>
                      <p className="text-sm text-yellow-800 mt-1">
                        Your subscription will remain active until {formatDate(currentSubscription?.current_period_end)}.
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
                    className="btn-primary"
                  >
                    {actionLoading ? (
                      <ArrowPathIcon className="h-5 w-5 animate-spin mr-2" />
                    ) : (
                      <ArrowPathIcon className="h-5 w-5 mr-2" />
                    )}
                    Reactivate Subscription
                  </button>
                ) : currentPlan?.slug !== 'free' && (
                  <button
                    onClick={handleCancel}
                    disabled={actionLoading}
                    className="btn-secondary"
                  >
                    Cancel Subscription
                  </button>
                )}
                <Link to="/pricing" className="btn-secondary">
                  View All Plans
                </Link>
              </div>
            </div>
          )}

          {/* Available Plans */}
          {!currentSubscription && (
            <>
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Choose a Plan</h2>

                {/* Billing Toggle */}
                <div className="flex items-center justify-center space-x-4 mb-8">
                  <span className={`text-sm font-medium ${billingCycle === 'monthly' ? 'text-gray-900' : 'text-gray-500'}`}>
                    Monthly
                  </span>
                  <button
                    onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      billingCycle === 'yearly' ? 'bg-primary' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        billingCycle === 'yearly' ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                  <span className={`text-sm font-medium ${billingCycle === 'yearly' ? 'text-gray-900' : 'text-gray-500'}`}>
                    Yearly <span className="text-green-600">(Save 17%)</span>
                  </span>
                </div>
              </div>

              {/* Plan Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {plans.map((plan) => {
                  const Icon = getPlanIcon(plan.slug);
                  const price = billingCycle === 'yearly' ? plan.price_yearly / 12 : plan.price_monthly;
                  const isCurrentPlan = currentPlan?.id === plan.id;
                  const isFree = plan.slug === 'free';
                  const isPreselected = selectedPlanId === plan.id;

                  return (
                    <div
                      key={plan.id}
                      className={`bg-white rounded-xl shadow-md p-6 ${
                        isPreselected ? 'ring-2 ring-primary' : ''
                      }`}
                    >
                      <div className={`inline-flex p-3 rounded-lg bg-gradient-to-r ${getPlanColor(plan.slug)} mb-4`}>
                        <Icon className="h-6 w-6 text-white" />
                      </div>

                      <h3 className="text-xl font-bold text-gray-900 mb-2">{plan.name}</h3>

                      <div className="mb-4">
                        {isFree ? (
                          <span className="text-3xl font-bold text-gray-900">Free</span>
                        ) : (
                          <>
                            <span className="text-3xl font-bold text-gray-900">
                              ${price.toFixed(2)}
                            </span>
                            <span className="text-gray-600">/mo</span>
                          </>
                        )}
                      </div>

                      {isCurrentPlan ? (
                        <div className="w-full py-2 px-4 bg-gray-100 text-gray-700 rounded-lg text-center font-semibold">
                          Current Plan
                        </div>
                      ) : (
                        <button
                          onClick={() => handleSubscribe(plan.id)}
                          disabled={actionLoading}
                          className="w-full btn-primary"
                        >
                          {actionLoading ? 'Processing...' : isFree ? 'Select Free' : 'Subscribe'}
                        </button>
                      )}

                      <ul className="mt-6 space-y-3">
                        <li className="flex items-start text-sm">
                          <CheckIcon className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                          <span>{plan.max_packages === -1 ? 'Unlimited' : plan.max_packages} packages</span>
                        </li>
                        <li className="flex items-start text-sm">
                          <CheckIcon className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                          <span>{plan.max_bookings_per_month === -1 ? 'Unlimited' : plan.max_bookings_per_month} bookings/month</span>
                        </li>
                      </ul>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* Upgrade/Change Plan Section */}
          {currentSubscription && currentPlan?.slug !== 'agency' && (
            <div className="mt-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Upgrade Your Plan</h2>

              {/* Billing Toggle */}
              <div className="flex items-center justify-center space-x-4 mb-8">
                <span className={`text-sm font-medium ${billingCycle === 'monthly' ? 'text-gray-900' : 'text-gray-500'}`}>
                  Monthly
                </span>
                <button
                  onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    billingCycle === 'yearly' ? 'bg-primary' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      billingCycle === 'yearly' ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
                <span className={`text-sm font-medium ${billingCycle === 'yearly' ? 'text-gray-900' : 'text-gray-500'}`}>
                  Yearly <span className="text-green-600">(Save 17%)</span>
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {plans
                  .filter((plan) => plan.id !== currentPlan?.id && plan.slug !== 'free')
                  .map((plan) => {
                    const Icon = getPlanIcon(plan.slug);
                    const price = billingCycle === 'yearly' ? plan.price_yearly / 12 : plan.price_monthly;

                    return (
                      <div key={plan.id} className="bg-white rounded-xl shadow-md p-6">
                        <div className={`inline-flex p-3 rounded-lg bg-gradient-to-r ${getPlanColor(plan.slug)} mb-4`}>
                          <Icon className="h-6 w-6 text-white" />
                        </div>

                        <h3 className="text-xl font-bold text-gray-900 mb-2">{plan.name}</h3>

                        <div className="mb-4">
                          <span className="text-3xl font-bold text-gray-900">
                            ${price.toFixed(2)}
                          </span>
                          <span className="text-gray-600">/mo</span>
                        </div>

                        <button
                          onClick={() => handleUpgrade(plan.id)}
                          disabled={actionLoading || isCancelled}
                          className="w-full btn-primary"
                        >
                          {actionLoading ? 'Processing...' : 'Upgrade Now'}
                        </button>

                        <ul className="mt-6 space-y-3">
                          <li className="flex items-start text-sm">
                            <CheckIcon className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                            <span>{plan.max_packages === -1 ? 'Unlimited' : plan.max_packages} packages</span>
                          </li>
                          <li className="flex items-start text-sm">
                            <CheckIcon className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                            <span>{plan.max_bookings_per_month === -1 ? 'Unlimited' : plan.max_bookings_per_month} bookings/month</span>
                          </li>
                        </ul>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
