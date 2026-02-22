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
            <h1 className="text-4xl md:text-5xl font-bold text-dark mb-4">
              Choose Your Plan
            </h1>
            <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto">
              Unlock more features and grow your business with our flexible subscription plans
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
                Yearly <span className="text-green-600 font-bold">(Save 17%)</span>
              </span>
            </div>
          </div>

          {/* Pricing Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
            {plans.map((plan) => {
              const Icon = getPlanIcon(plan.slug);
              const price = billingCycle === 'yearly' ? plan.price_yearly / 12 : plan.price_monthly;
              const totalPrice = billingCycle === 'yearly' ? plan.price_yearly : plan.price_monthly;
              const isPopular = plan.slug === 'pro';
              const isFree = plan.slug === 'free';

              return (
                <div
                  key={plan.id}
                  className={`bg-white rounded-3xl shadow-lg overflow-hidden transition-all hover:shadow-xl hover:scale-105 ${
                    isPopular ? 'ring-2 ring-primary lg:scale-105' : ''
                  }`}
                >
                  {/* Popular Badge */}
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
                    <button
                      onClick={() => handleSubscribe(plan.id)}
                      className={`w-full py-4 px-6 rounded-full font-bold transition-colors ${
                        isPopular
                          ? 'bg-primary hover:bg-primary/90 text-dark'
                          : 'bg-dark hover:bg-gray-800 text-white'
                      }`}
                    >
                      {isFree ? 'Get Started' : 'Subscribe Now'}
                    </button>

                    {/* Features */}
                    <ul className="mt-8 space-y-4">
                      {/* Packages */}
                      <li className="flex items-start gap-3">
                        <CheckIcon className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700">
                          <span className="font-bold text-dark">
                            {plan.features?.max_packages === -1 ? 'Unlimited' : plan.features?.max_packages || 3}
                          </span> packages
                        </span>
                      </li>

                      {/* Bookings */}
                      <li className="flex items-start gap-3">
                        <CheckIcon className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700">
                          <span className="font-bold text-dark">
                            {plan.features?.max_bookings_per_month === -1 ? 'Unlimited' : plan.features?.max_bookings_per_month || 5}
                          </span> bookings/month
                        </span>
                      </li>

                      {/* Custom Packages */}
                      {plan.features?.can_create_custom_packages ? (
                        <li className="flex items-start gap-3">
                          <CheckIcon className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                          <span className="text-gray-700">Custom packages</span>
                        </li>
                      ) : (
                        <li className="flex items-start gap-3">
                          <XMarkIcon className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
                          <span className="text-gray-400">Custom packages</span>
                        </li>
                      )}

                      {/* Briefs & Campaigns */}
                      {plan.features?.can_access_briefs || plan.features?.can_access_campaigns ? (
                        <li className="flex items-start gap-3">
                          <CheckIcon className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                          <span className="text-gray-700">Briefs & campaigns</span>
                        </li>
                      ) : (
                        <li className="flex items-start gap-3">
                          <XMarkIcon className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
                          <span className="text-gray-400">Briefs & campaigns</span>
                        </li>
                      )}

                      {/* Analytics */}
                      {plan.features?.analytics_access ? (
                        <li className="flex items-start gap-3">
                          <CheckIcon className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                          <span className="text-gray-700">Advanced analytics</span>
                        </li>
                      ) : (
                        <li className="flex items-start gap-3">
                          <XMarkIcon className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
                          <span className="text-gray-400">Advanced analytics</span>
                        </li>
                      )}

                      {/* Priority Support */}
                      {plan.features?.priority_support ? (
                        <li className="flex items-start gap-3">
                          <CheckIcon className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                          <span className="text-gray-700">Priority support</span>
                        </li>
                      ) : (
                        <li className="flex items-start gap-3">
                          <XMarkIcon className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
                          <span className="text-gray-400">Priority support</span>
                        </li>
                      )}

                      {/* API Access */}
                      {plan.features?.api_access && (
                        <li className="flex items-start gap-3">
                          <CheckIcon className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                          <span className="text-gray-700">API access</span>
                        </li>
                      )}
                    </ul>
                  </div>
                </div>
              );
            })}
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
              All plans include secure payments, 24/7 support, and access to the BantuBuzz community.
            </p>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
