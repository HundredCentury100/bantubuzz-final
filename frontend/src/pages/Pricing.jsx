import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import api from '../services/api';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useAuth } from '../hooks/useAuth';
import {
  CheckIcon,
  XMarkIcon,
  StarIcon,
  BoltIcon,
  TrophyIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';

export default function Pricing() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [billingCycle, setBillingCycle] = useState('monthly');
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  // Redirect creators to their subscription page
  useEffect(() => {
    if (user && user.account_type === 'creator') {
      navigate('/creator/subscriptions');
    }
  }, [user, navigate]);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const res = await api.get('/subscriptions/plans');
      setPlans(res.data.data);
    } catch (error) {
      console.error('Error fetching plans:', error);
      toast.error('Failed to load subscription plans');
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = (planId) => {
    if (!isAuthenticated) {
      toast.error('Please log in to subscribe');
      navigate('/login');
      return;
    }

    navigate('/subscription/manage', { state: { selectedPlanId: planId, billingCycle } });
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

  return (
    <div className="min-h-screen flex flex-col bg-light">
      <Navbar />

      <div className="flex-1 py-12 px-6 lg:px-12 xl:px-20">
        <div className="w-full max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-dark mb-6 leading-tight">
              Brand Subscription Plans
            </h1>
            <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Intelligence-forward influencer marketing with powerful insights for African brands
            </p>

            {/* Billing Toggle */}
            <div className="mt-8 flex items-center justify-center gap-4">
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
                Yearly <span className="text-green-600 font-bold">(2 Months Free!)</span>
              </span>
            </div>
          </div>

          {/* Pricing Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {plans.map((plan) => {
              const Icon = getPlanIcon(plan.slug);
              const price = billingCycle === 'yearly' ? plan.price_yearly / 12 : plan.price_monthly;
              const totalPrice = billingCycle === 'yearly' ? plan.price_yearly : plan.price_monthly;
              const isPopular = plan.slug === 'pro';
              const isFree = plan.slug === 'free';

              return (
                <div
                  key={plan.id}
                  className={`${isPopular ? 'bg-primary' : 'bg-white'} rounded-3xl shadow-sm hover:shadow-md transition-shadow p-4`}
                >
                  {/* Popular Badge - Only for popular plans */}
                  {isPopular && (
                    <div className="bg-dark text-white text-center py-2 px-4 rounded-full font-bold text-xs mb-4">
                      MOST POPULAR
                    </div>
                  )}

                  {/* White Inner Container */}
                  <div className="bg-white rounded-2xl p-6">
                    {/* Icon */}
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-6">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>

                    {/* Plan Name */}
                    <h3 className="text-2xl font-bold text-dark mb-2">{plan.name}</h3>
                    <p className="text-gray-600 text-sm mb-6 min-h-[3rem]">{plan.description}</p>

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

                    {/* Service Fee Badge */}
                    {plan.platform_fee_percentage && (
                      <div className="mb-4 px-3 py-2 bg-primary/10 rounded-lg">
                        <p className="text-xs text-gray-600 text-center">
                          <span className="font-bold text-dark">{plan.platform_fee_percentage}%</span> service fee
                        </p>
                      </div>
                    )}

                    {/* Features */}
                    <ul className="space-y-3 mb-6">
                      {/* Browse & Search Creators */}
                      <li className="flex items-start gap-2">
                        <CheckIcon className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-gray-700">Browse & hire creators</span>
                      </li>

                      {/* Briefs & Campaigns */}
                      <li className="flex items-start gap-2">
                        <CheckIcon className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-gray-700">Create campaigns & briefs</span>
                      </li>

                      {/* Basic Campaign Workflow */}
                      <li className="flex items-start gap-2">
                        <CheckIcon className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-gray-700">Basic campaign workflow</span>
                      </li>

                      {/* Analytics Dashboard */}
                      {plan.features?.analytics_access ? (
                        <>
                          <li className="flex items-start gap-2">
                            <CheckIcon className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                            <span className="text-sm text-gray-700">Live analytics dashboards</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckIcon className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                            <span className="text-sm text-gray-700">Engagement trends (7d & 30d)</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckIcon className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                            <span className="text-sm text-gray-700">Exportable reports (PDF/CSV)</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckIcon className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                            <span className="text-sm text-gray-700">
                              {plan.slug === 'premium' ? 'Full sentiment analysis' : 'Basic sentiment analysis'}
                            </span>
                          </li>
                        </>
                      ) : (
                        <>
                          <li className="flex items-start gap-2">
                            <XMarkIcon className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" />
                            <span className="text-sm text-gray-400">Live analytics dashboards</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <XMarkIcon className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" />
                            <span className="text-sm text-gray-400">Sentiment analysis</span>
                          </li>
                        </>
                      )}

                      {/* Premium Features */}
                      {plan.slug === 'premium' && (
                        <>
                          <li className="flex items-start gap-2">
                            <CheckIcon className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                            <span className="text-sm text-gray-700">Brand mentions tracking</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckIcon className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                            <span className="text-sm text-gray-700">Top comments insights</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckIcon className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                            <span className="text-sm text-gray-700">Reduced service fee (5%)</span>
                          </li>
                        </>
                      )}

                      {/* Priority Support */}
                      {plan.features?.priority_support ? (
                        <li className="flex items-start gap-2">
                          <CheckIcon className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                          <span className="text-sm text-gray-700">Priority support & onboarding</span>
                        </li>
                      ) : (
                        <li className="flex items-start gap-2">
                          <XMarkIcon className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" />
                          <span className="text-sm text-gray-400">Priority support</span>
                        </li>
                      )}
                    </ul>
                  </div>

                  {/* CTA Button - Outside white container, on colored background */}
                  <button
                    onClick={() => handleSubscribe(plan.id)}
                    className={`w-full mt-4 py-3 px-6 rounded-full font-medium transition-colors ${
                      isPopular
                        ? 'bg-white text-dark hover:bg-gray-100'
                        : 'bg-dark text-white hover:bg-gray-800'
                    }`}
                  >
                    {isFree ? 'Get Started' : 'Subscribe Now'}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Plan Taglines */}
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <div className="text-center">
              <h3 className="font-bold text-dark mb-2">Free</h3>
              <p className="text-sm text-gray-600">Try BantuBuzz. Pay only when you collaborate.</p>
            </div>
            <div className="text-center">
              <h3 className="font-bold text-dark mb-2">Pro</h3>
              <p className="text-sm text-gray-600">Powerful insights for growing brands.</p>
            </div>
            <div className="text-center">
              <h3 className="font-bold text-dark mb-2">Premium</h3>
              <p className="text-sm text-gray-600">Enterprise-grade intelligence & brand monitoring.</p>
            </div>
          </div>

          {/* FAQ or Additional Info */}
          <div className="mt-16 text-center">
            <p className="text-gray-600 mb-6">
              Already have an account?{' '}
              <Link to="/subscription/manage" className="text-primary font-semibold hover:underline">
                Manage your subscription
              </Link>
            </p>
            <p className="text-sm text-gray-500">
              All plans include secure payments, brand protection, and access to Africa's top creators.
            </p>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
