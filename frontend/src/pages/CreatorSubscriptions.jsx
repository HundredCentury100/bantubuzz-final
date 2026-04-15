import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
  SparklesIcon,
  TrophyIcon,
  ChartBarIcon,
  BoltIcon,
} from '@heroicons/react/24/outline';

export default function CreatorSubscriptions() {
  const [currentSubscription, setCurrentSubscription] = useState(null);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [billingCycle, setBillingCycle] = useState('monthly');
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [subsRes, plansRes] = await Promise.all([
        api.get('/subscriptions/my-subscription'),
        api.get('/subscriptions/plans?user_type=creator'),
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
      if (plan.slug === 'creator-free' || (plan.price_monthly === 0 && plan.price_yearly === 0)) {
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
          const actualSubscription = currentSubscription?.subscription || currentSubscription;
          localStorage.setItem('lastSubscriptionId', actualSubscription?.id);

          navigate('/subscription/payment', {
            state: {
              paymentData: {
                subscription_id: actualSubscription?.id,
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
      toast.error(error.response?.data?.error || 'Failed to upgrade');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-light">
        <Navbar />
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  const hasActiveSubscription = currentSubscription?.has_subscription && currentSubscription?.subscription?.status === 'active';
  const currentPlan = hasActiveSubscription ? currentSubscription.subscription.plan : null;
  const actualSubscription = currentSubscription?.subscription || currentSubscription;

  // Calculate savings
  const calculateSavings = (plan) => {
    if (plan.price_yearly === 0 || plan.price_monthly === 0) return 0;
    const monthlyTotal = plan.price_monthly * 12;
    const savings = monthlyTotal - plan.price_yearly;
    return savings;
  };

  return (
    <div className="min-h-screen bg-light">
      <Navbar />

      <div className="container-custom section-padding">
        {/* Header */}
        <div className="max-w-4xl mx-auto text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full mb-4">
            <SparklesIcon className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium text-primary">Creator Subscriptions</span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold text-dark mb-4 leading-tight">
            Choose Your Creator Plan
          </h1>
          <p className="text-lg text-gray-600 leading-relaxed max-w-2xl mx-auto">
            Unlock powerful features and grow your creator business with reduced fees
          </p>
        </div>

        {/* Current Plan Display */}
        {hasActiveSubscription && (
          <div className="max-w-4xl mx-auto mb-12">
            <div className="bg-white rounded-3xl shadow-sm p-8">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-2xl font-bold text-dark">Current Plan</h2>
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                      Active
                    </span>
                  </div>
                  <p className="text-gray-600">{currentPlan?.description || 'Your current subscription plan'}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 bg-light rounded-2xl">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Plan</p>
                  <p className="text-xl font-bold text-dark">{currentPlan?.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Billing</p>
                  <p className="text-xl font-bold text-dark capitalize">{actualSubscription?.billing_cycle || 'Monthly'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Platform Fee</p>
                  <p className="text-xl font-bold text-primary">{currentPlan?.platform_fee_percentage || 15}%</p>
                </div>
              </div>

              {actualSubscription?.current_period_end && (
                <div className="mt-6 flex items-center gap-2 text-sm text-gray-600">
                  <CreditCardIcon className="h-5 w-5" />
                  <span>
                    Next billing date: {new Date(actualSubscription.current_period_end).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Billing Cycle Toggle */}
        <div className="max-w-4xl mx-auto mb-8">
          <div className="flex justify-center items-center gap-4">
            <span className={`text-sm font-medium ${billingCycle === 'monthly' ? 'text-dark' : 'text-gray-500'}`}>
              Monthly
            </span>
            <button
              onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
              className="relative inline-flex h-8 w-14 items-center rounded-full bg-gray-200 transition-colors focus:outline-none"
              style={{ backgroundColor: billingCycle === 'yearly' ? '#ccdb53' : '#e5e7eb' }}
            >
              <span
                className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                  billingCycle === 'yearly' ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
            <span className={`text-sm font-medium ${billingCycle === 'yearly' ? 'text-dark' : 'text-gray-500'}`}>
              Yearly
            </span>
            {billingCycle === 'yearly' && (
              <span className="px-3 py-1 bg-primary/20 text-primary text-xs font-bold rounded-full">
                SAVE UP TO $38
              </span>
            )}
          </div>
        </div>

        {/* Plan Cards Grid */}
        <div className="overflow-x-auto pb-4 pt-4">
          <div className="flex gap-6 min-w-max px-4 mx-auto justify-center flex-wrap">
            {plans.filter((plan) => !hasActiveSubscription || plan.id !== currentPlan?.id)
              .map((plan) => {
                const price = billingCycle === 'yearly' ? plan.price_yearly : plan.price_monthly;
                const displayPrice = billingCycle === 'yearly' ? (price / 12).toFixed(2) : price.toFixed(2);
                const savings = calculateSavings(plan);
                const isFree = plan.price_monthly === 0 && plan.price_yearly === 0;

                // Get plan icon
                const getPlanIcon = (slug) => {
                  if (slug === 'creator-free') return <StarIcon className="h-8 w-8" />;
                  if (slug === 'rising') return <ChartBarIcon className="h-8 w-8" />;
                  if (slug === 'pro-creator') return <TrophyIcon className="h-8 w-8" />;
                  return <SparklesIcon className="h-8 w-8" />;
                };

                // Categorize features
                const categories = {
                  profile: { title: 'Profile & Visibility', items: [] },
                  campaigns: { title: 'Campaigns & Bookings', items: [] },
                  analytics: { title: 'Analytics & Insights', items: [] },
                  support: { title: 'Support & Extras', items: [] }
                };

                // Add platform fee
                categories.profile.items.push({
                  name: 'Platform Fee',
                  value: `${plan.platform_fee_percentage}%`,
                  highlight: true
                });

                // Add restrictions
                if (plan.restrictions?.has_verified_badge) {
                  categories.profile.items.push({ name: 'Verified Badge', value: true });
                }
                if (plan.restrictions?.max_portfolio_items) {
                  categories.profile.items.push({
                    name: 'Portfolio Items',
                    value: plan.restrictions.max_portfolio_items === 999999 ? 'Unlimited' : plan.restrictions.max_portfolio_items
                  });
                }
                if (plan.restrictions?.search_placement_priority > 0) {
                  categories.profile.items.push({ name: 'Priority Search Placement', value: true });
                }

                // Add campaign features
                if (plan.features?.max_packages !== undefined) {
                  categories.campaigns.items.push({
                    name: 'Packages',
                    value: plan.features.max_packages === 999999 ? 'Unlimited' : plan.features.max_packages
                  });
                }
                if (plan.features?.max_bookings_per_month !== undefined) {
                  categories.campaigns.items.push({
                    name: 'Bookings/Month',
                    value: plan.features.max_bookings_per_month === 999999 ? 'Unlimited' : plan.features.max_bookings_per_month
                  });
                }
                if (plan.features?.can_access_briefs) {
                  categories.campaigns.items.push({ name: 'Campaign Briefs Access', value: true });
                }
                if (plan.restrictions?.can_message_brands_first) {
                  categories.campaigns.items.push({ name: 'Message Brands First', value: true });
                }

                // Add analytics features
                if (plan.features?.analytics_access) {
                  categories.analytics.items.push({ name: 'Analytics Dashboard', value: true });
                }
                if (plan.features?.has_advanced_analytics) {
                  categories.analytics.items.push({ name: 'Advanced Analytics', value: true });
                }

                // Add support features
                if (plan.features?.priority_support) {
                  categories.support.items.push({ name: 'Priority Support', value: true });
                }
                if (plan.features?.api_access) {
                  categories.support.items.push({ name: 'API Access', value: true });
                }

                return (
                  <div
                    key={plan.id}
                    className="bg-white rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-primary"
                    style={{ width: '280px', minWidth: '280px' }}
                  >
                    {/* Plan Header */}
                    <div className="text-center mb-6">
                      <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4 text-primary">
                        {getPlanIcon(plan.slug)}
                      </div>
                      <h3 className="text-2xl font-bold text-dark mb-2">{plan.name}</h3>
                      {plan.badge_label && (
                        <span className="inline-block px-3 py-1 bg-primary/20 text-primary text-xs font-bold rounded-full mb-2">
                          {plan.badge_label}
                        </span>
                      )}
                      <p className="text-sm text-gray-600 leading-relaxed">{plan.description}</p>
                    </div>

                    {/* Pricing */}
                    <div className="text-center mb-6 p-4 bg-light rounded-2xl">
                      {isFree ? (
                        <div className="text-4xl font-bold text-dark">Free</div>
                      ) : (
                        <>
                          <div className="flex items-baseline justify-center gap-1 mb-1">
                            <span className="text-3xl font-bold text-dark">${displayPrice}</span>
                            <span className="text-gray-500 text-sm">/month</span>
                          </div>
                          {billingCycle === 'yearly' && savings > 0 && (
                            <div className="text-xs text-primary font-semibold">
                              Save ${savings.toFixed(0)}/year
                            </div>
                          )}
                          {billingCycle === 'yearly' && (
                            <div className="text-xs text-gray-500 mt-1">
                              Billed ${price}/year
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {/* Features by Category */}
                    <div className="space-y-4 mb-6 text-sm">
                      {Object.entries(categories).map(([key, category]) => {
                        if (category.items.length === 0) return null;
                        return (
                          <div key={key}>
                            <h4 className="font-bold text-dark text-xs uppercase tracking-wide mb-2 text-gray-500">
                              {category.title}
                            </h4>
                            <ul className="space-y-2">
                              {category.items.map((item, idx) => (
                                <li key={idx} className="flex items-start justify-between gap-2">
                                  <span className="text-gray-700 flex-1">{item.name}</span>
                                  {item.value === true ? (
                                    <CheckIcon className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                                  ) : item.value === false ? (
                                    <XMarkIcon className="h-4 w-4 text-gray-300 flex-shrink-0 mt-0.5" />
                                  ) : (
                                    <span className={`font-semibold flex-shrink-0 ${item.highlight ? 'text-primary' : 'text-dark'}`}>
                                      {item.value}
                                    </span>
                                  )}
                                </li>
                              ))}
                            </ul>
                          </div>
                        );
                      })}
                    </div>

                    {/* Action Button */}
                    <button
                      onClick={() => hasActiveSubscription ? handleUpgrade(plan.id) : handleSubscribe(plan.id)}
                      disabled={actionLoading}
                      className="w-full py-3 bg-primary hover:bg-primary-dark text-white font-bold rounded-2xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {actionLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                          Processing...
                        </>
                      ) : (
                        <>
                          {hasActiveSubscription ? (
                            <>
                              <ArrowPathIcon className="h-5 w-5" />
                              Upgrade
                            </>
                          ) : (
                            <>
                              <BoltIcon className="h-5 w-5" />
                              Get Started
                            </>
                          )}
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Spotlight Boost Section */}
        <div className="max-w-4xl mx-auto mt-16 mb-12 border-t border-gray-200 pt-16">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full mb-4">
              <BoltIcon className="h-5 w-5 text-primary" />
              <span className="text-xs font-medium text-primary uppercase tracking-wide">Add-On · Available on all tiers</span>
            </div>
            <h2 className="text-3xl font-bold mb-3 text-dark">⚡ Spotlight Boost</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Need more visibility right now? Boost your profile across the homepage and all platform sections — no subscription required.
            </p>
          </div>

          <div className="flex gap-6 justify-center flex-wrap">
            {[
              { days: "3 Days", price: 3, icon: "🌱", note: "Quick push", best: false },
              { days: "7 Days", price: 6, icon: "⚡", note: "Standard boost", best: true },
              { days: "30 Days", price: 18, icon: "🔥", note: "Sustained presence", best: false },
            ].map((boost, idx) => (
              <div
                key={idx}
                className={`flex-1 min-w-[200px] max-w-[240px] text-center rounded-3xl p-8 relative transition-all hover:shadow-md ${
                  boost.best ? 'bg-primary/10 border-2 border-primary' : 'bg-white border border-gray-200'
                }`}
              >
                {boost.best && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-dark text-white px-3 py-1 rounded-full text-xs font-semibold">
                    Best Deal
                  </div>
                )}
                <div className="text-4xl mb-3">{boost.icon}</div>
                <div className="text-3xl font-black text-dark mb-2">${boost.price}</div>
                <div className="text-lg font-bold text-dark mb-1">{boost.days}</div>
                <div className="text-sm text-gray-600 mb-6">{boost.note}</div>
                <button
                  onClick={() => {
                    toast.info('Spotlight Boost coming soon! This feature is under development.');
                  }}
                  className={`w-full py-2.5 rounded-full text-sm font-semibold transition-all ${
                    boost.best
                      ? 'bg-primary hover:bg-primary-dark text-dark'
                      : 'border-2 border-gray-300 hover:border-dark text-dark hover:bg-gray-50'
                  }`}
                >
                  Get Boost
                </button>
              </div>
            ))}
          </div>

          <p className="text-center text-xs text-gray-500 mt-8">
            Includes: Homepage placement · Priority badge · All platform sections · Visible to all brands
          </p>
        </div>

        {/* Back Link */}
        <div className="max-w-4xl mx-auto mt-12 text-center">
          <Link
            to="/creator/dashboard"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-primary transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
