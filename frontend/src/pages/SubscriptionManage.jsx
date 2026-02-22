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
        new_plan_id: planId,
        billing_cycle: billingCycle
      });

      if (res.data.success && res.data.data) {
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
      <div className="min-h-screen flex flex-col bg-light">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  const currentPlan = currentSubscription?.plan || (currentSubscription ? plans.find(p => p.slug === 'free') : null);
  const isActive = currentSubscription?.status === 'active';
  const isCancelled = currentSubscription?.cancel_at_period_end;

  return (
    <div className="min-h-screen flex flex-col bg-light">
      <Navbar />

      <div className="flex-1 py-12 px-6 lg:px-12 xl:px-20">
        <div className="w-full max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-12 text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-dark mb-4">
              Manage Your Subscription
            </h1>
            <p className="text-lg text-gray-600">
              View and manage your BantuBuzz subscription plan
            </p>
          </div>

          {/* Current Subscription Card */}
          {currentSubscription && currentPlan && (
            <div className="bg-white rounded-3xl shadow-lg p-8 md:p-12 mb-12">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-8">
                <div className="mb-4 md:mb-0">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`inline-flex p-2 rounded-xl bg-gradient-to-r ${getPlanColor(currentPlan.slug)}`}>
                      {(() => {
                        const Icon = getPlanIcon(currentPlan.slug);
                        return <Icon className="h-6 w-6 text-white" />;
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
                  {currentSubscription?.status?.toUpperCase() || 'ACTIVE'}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-gray-50 rounded-2xl p-6">
                  <p className="text-sm text-gray-600 mb-2">Billing Cycle</p>
                  <p className="text-2xl font-bold text-dark capitalize">
                    {currentSubscription?.billing_cycle || 'Monthly'}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-2xl p-6">
                  <p className="text-sm text-gray-600 mb-2">Current Period Ends</p>
                  <p className="text-2xl font-bold text-dark">
                    {formatDate(currentSubscription?.current_period_end)}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-2xl p-6">
                  <p className="text-sm text-gray-600 mb-2">Next Payment</p>
                  <p className="text-2xl font-bold text-dark">
                    {currentSubscription?.next_payment_date
                      ? formatDate(currentSubscription.next_payment_date)
                      : 'N/A'}
                  </p>
                </div>
              </div>

              {isCancelled && (
                <div className="bg-yellow-50 border-2 border-yellow-200 rounded-2xl p-6 mb-8">
                  <div className="flex items-start gap-4">
                    <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600 flex-shrink-0 mt-1" />
                    <div>
                      <h3 className="text-lg font-bold text-yellow-900 mb-2">
                        Subscription Cancelled
                      </h3>
                      <p className="text-yellow-800">
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
                    className="bg-primary hover:bg-primary/90 text-dark px-8 py-4 rounded-full font-semibold transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {actionLoading && <ArrowPathIcon className="h-5 w-5 animate-spin" />}
                    Reactivate Subscription
                  </button>
                ) : currentPlan?.slug !== 'free' && (
                  <button
                    onClick={handleCancel}
                    disabled={actionLoading}
                    className="bg-gray-200 hover:bg-gray-300 text-dark px-8 py-4 rounded-full font-semibold transition-colors"
                  >
                    Cancel Subscription
                  </button>
                )}
                <Link
                  to="/pricing"
                  className="bg-dark hover:bg-gray-800 text-white px-8 py-4 rounded-full font-semibold transition-colors"
                >
                  View All Plans
                </Link>
              </div>
            </div>
          )}

          {/* No Subscription State */}
          {!currentSubscription && (
            <div className="bg-white rounded-3xl shadow-lg p-12 mb-12 text-center">
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
          {(!currentSubscription || (currentSubscription && currentPlan?.slug !== 'agency')) && (
            <div>
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-dark mb-4">
                  {currentSubscription ? 'Upgrade Your Plan' : 'Choose Your Plan'}
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

              {/* Plan Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {plans
                  .filter((plan) => !currentSubscription || plan.id !== currentPlan?.id)
                  .map((plan) => {
                    const Icon = getPlanIcon(plan.slug);
                    const price = billingCycle === 'yearly' ? plan.price_yearly / 12 : plan.price_monthly;
                    const totalPrice = billingCycle === 'yearly' ? plan.price_yearly : plan.price_monthly;
                    const isCurrentPlan = currentPlan?.id === plan.id;
                    const isFree = plan.slug === 'free';
                    const isPopular = plan.slug === 'pro';

                    return (
                      <div
                        key={plan.id}
                        className={`bg-white rounded-3xl shadow-lg overflow-hidden transition-transform hover:scale-105 ${
                          isPopular ? 'ring-2 ring-primary' : ''
                        }`}
                      >
                        {isPopular && (
                          <div className="bg-gradient-to-r from-primary to-yellow-400 text-dark text-center py-2 font-bold text-sm">
                            MOST POPULAR
                          </div>
                        )}

                        <div className="p-8">
                          {/* Icon */}
                          <div className={`inline-flex p-3 rounded-2xl bg-gradient-to-r ${getPlanColor(plan.slug)} mb-6`}>
                            <Icon className="h-8 w-8 text-white" />
                          </div>

                          {/* Plan Name */}
                          <h3 className="text-2xl font-bold text-dark mb-2">{plan.name}</h3>
                          <p className="text-gray-600 mb-6 min-h-[3rem]">{plan.description}</p>

                          {/* Price */}
                          <div className="mb-6">
                            {isFree ? (
                              <div>
                                <span className="text-4xl font-bold text-dark">Free</span>
                              </div>
                            ) : (
                              <div>
                                <div className="flex items-baseline gap-1">
                                  <span className="text-4xl font-bold text-dark">
                                    ${price.toFixed(2)}
                                  </span>
                                  <span className="text-gray-600">/mo</span>
                                </div>
                                {billingCycle === 'yearly' && (
                                  <p className="text-sm text-gray-500 mt-1">
                                    Billed ${totalPrice.toFixed(2)} yearly
                                  </p>
                                )}
                              </div>
                            )}
                          </div>

                          {/* CTA Button */}
                          {isCurrentPlan ? (
                            <div className="w-full py-4 px-6 bg-gray-100 text-gray-700 rounded-full text-center font-bold">
                              Current Plan
                            </div>
                          ) : (
                            <button
                              onClick={() => currentSubscription ? handleUpgrade(plan.id) : handleSubscribe(plan.id)}
                              disabled={actionLoading || isCancelled}
                              className={`w-full py-4 px-6 rounded-full font-bold transition-colors ${
                                isPopular
                                  ? 'bg-primary hover:bg-primary/90 text-dark'
                                  : 'bg-dark hover:bg-gray-800 text-white'
                              } disabled:opacity-50`}
                            >
                              {actionLoading ? 'Processing...' : currentSubscription ? 'Upgrade' : isFree ? 'Get Started' : 'Subscribe'}
                            </button>
                          )}

                          {/* Features */}
                          <ul className="mt-8 space-y-4">
                            <li className="flex items-start gap-3">
                              <CheckIcon className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                              <span className="text-gray-700">
                                <span className="font-bold text-dark">
                                  {plan.features?.max_packages === -1 ? 'Unlimited' : plan.features?.max_packages || 3}
                                </span> packages
                              </span>
                            </li>
                            <li className="flex items-start gap-3">
                              <CheckIcon className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                              <span className="text-gray-700">
                                <span className="font-bold text-dark">
                                  {plan.features?.max_bookings_per_month === -1 ? 'Unlimited' : plan.features?.max_bookings_per_month || 5}
                                </span> bookings/month
                              </span>
                            </li>
                            {plan.features?.analytics_access && (
                              <li className="flex items-start gap-3">
                                <CheckIcon className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                                <span className="text-gray-700">Analytics access</span>
                              </li>
                            )}
                            {plan.features?.priority_support && (
                              <li className="flex items-start gap-3">
                                <CheckIcon className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                                <span className="text-gray-700">Priority support</span>
                              </li>
                            )}
                          </ul>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}
