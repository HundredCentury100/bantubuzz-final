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
  SparklesIcon,
  RocketLaunchIcon,
  BuildingOfficeIcon,
} from '@heroicons/react/24/outline';

export default function Pricing() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [billingCycle, setBillingCycle] = useState('monthly'); // monthly or yearly
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const res = await api.get('/api/subscriptions/plans');
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

    // Navigate to subscription management page with plan pre-selected
    navigate('/subscription/manage', { state: { selectedPlanId: planId, billingCycle } });
  };

  const getPlanIcon = (slug) => {
    switch (slug) {
      case 'starter':
        return SparklesIcon;
      case 'pro':
        return RocketLaunchIcon;
      case 'agency':
        return BuildingOfficeIcon;
      default:
        return CheckIcon;
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
      <>
        <Navbar />
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Choose Your Plan
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Unlock more features and grow your business with our flexible subscription plans
            </p>

            {/* Billing Toggle */}
            <div className="mt-8 flex items-center justify-center space-x-4">
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

          {/* Pricing Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {plans.map((plan) => {
              const Icon = getPlanIcon(plan.slug);
              const price = billingCycle === 'yearly' ? plan.price_yearly / 12 : plan.price_monthly;
              const totalPrice = billingCycle === 'yearly' ? plan.price_yearly : plan.price_monthly;
              const isPopular = plan.slug === 'pro';
              const isFree = plan.slug === 'free';

              return (
                <div
                  key={plan.id}
                  className={`relative bg-white rounded-2xl shadow-lg overflow-hidden ${
                    isPopular ? 'ring-2 ring-primary lg:transform lg:scale-105' : ''
                  }`}
                >
                  {/* Popular Badge */}
                  {isPopular && (
                    <div className={`absolute top-0 right-0 left-0 h-1 bg-gradient-to-r ${getPlanColor(plan.slug)}`} />
                  )}

                  <div className="p-8">
                    {/* Icon */}
                    <div className={`inline-flex p-3 rounded-lg bg-gradient-to-r ${getPlanColor(plan.slug)} mb-4`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>

                    {/* Plan Name */}
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">
                      {plan.name}
                    </h3>

                    {/* Description */}
                    <p className="text-gray-600 text-sm mb-6">
                      {plan.description}
                    </p>

                    {/* Price */}
                    <div className="mb-6">
                      {isFree ? (
                        <div className="flex items-baseline">
                          <span className="text-4xl font-bold text-gray-900">Free</span>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-baseline">
                            <span className="text-4xl font-bold text-gray-900">
                              ${price.toFixed(2)}
                            </span>
                            <span className="text-gray-600 ml-2">/month</span>
                          </div>
                          {billingCycle === 'yearly' && (
                            <p className="text-sm text-gray-500 mt-1">
                              Billed ${totalPrice.toFixed(2)} annually
                            </p>
                          )}
                        </>
                      )}
                    </div>

                    {/* CTA Button */}
                    <button
                      onClick={() => handleSubscribe(plan.id)}
                      className={`w-full py-3 px-6 rounded-lg font-semibold transition-colors ${
                        isPopular
                          ? 'bg-primary text-dark hover:bg-primary/90'
                          : isFree
                          ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          : 'bg-gray-900 text-white hover:bg-gray-800'
                      }`}
                    >
                      {isFree ? 'Get Started' : 'Subscribe'}
                    </button>

                    {/* Features */}
                    <div className="mt-8 space-y-4">
                      <h4 className="text-sm font-semibold text-gray-900 uppercase">Features:</h4>
                      <ul className="space-y-3">
                        <li className="flex items-start">
                          <CheckIcon className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                          <span className="text-sm text-gray-700">
                            {plan.max_packages === -1 ? 'Unlimited' : plan.max_packages} packages
                          </span>
                        </li>
                        <li className="flex items-start">
                          <CheckIcon className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                          <span className="text-sm text-gray-700">
                            {plan.max_bookings_per_month === -1 ? 'Unlimited' : plan.max_bookings_per_month} bookings/month
                          </span>
                        </li>
                        <li className="flex items-start">
                          {plan.can_access_briefs ? (
                            <CheckIcon className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                          ) : (
                            <XMarkIcon className="h-5 w-5 text-gray-300 mr-3 flex-shrink-0" />
                          )}
                          <span className={`text-sm ${plan.can_access_briefs ? 'text-gray-700' : 'text-gray-400'}`}>
                            Access to Briefs
                          </span>
                        </li>
                        <li className="flex items-start">
                          {plan.can_access_campaigns ? (
                            <CheckIcon className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                          ) : (
                            <XMarkIcon className="h-5 w-5 text-gray-300 mr-3 flex-shrink-0" />
                          )}
                          <span className={`text-sm ${plan.can_access_campaigns ? 'text-gray-700' : 'text-gray-400'}`}>
                            Access to Campaigns
                          </span>
                        </li>
                        <li className="flex items-start">
                          {plan.can_create_custom_packages ? (
                            <CheckIcon className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                          ) : (
                            <XMarkIcon className="h-5 w-5 text-gray-300 mr-3 flex-shrink-0" />
                          )}
                          <span className={`text-sm ${plan.can_create_custom_packages ? 'text-gray-700' : 'text-gray-400'}`}>
                            Custom Packages
                          </span>
                        </li>
                        {plan.priority_support && (
                          <li className="flex items-start">
                            <CheckIcon className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                            <span className="text-sm text-gray-700">Priority Support</span>
                          </li>
                        )}
                        {plan.analytics_access && (
                          <li className="flex items-start">
                            <CheckIcon className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                            <span className="text-sm text-gray-700">Advanced Analytics</span>
                          </li>
                        )}
                        {plan.api_access && (
                          <li className="flex items-start">
                            <CheckIcon className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                            <span className="text-sm text-gray-700">API Access</span>
                          </li>
                        )}
                        {plan.badge_label && (
                          <li className="flex items-start">
                            <CheckIcon className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                            <span className="text-sm text-gray-700">
                              "{plan.badge_label}" Badge
                            </span>
                          </li>
                        )}
                        {plan.featured_priority > 0 && (
                          <li className="flex items-start">
                            <CheckIcon className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                            <span className="text-sm text-gray-700">
                              {plan.search_boost}x Search Visibility
                            </span>
                          </li>
                        )}
                      </ul>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* FAQ Section */}
          <div className="mt-20 max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-center text-gray-900 mb-8">
              Frequently Asked Questions
            </h2>
            <div className="space-y-6">
              <div className="card">
                <h3 className="font-semibold text-gray-900 mb-2">
                  Can I change my plan later?
                </h3>
                <p className="text-gray-600">
                  Yes! You can upgrade or downgrade your plan at any time from your account settings.
                </p>
              </div>
              <div className="card">
                <h3 className="font-semibold text-gray-900 mb-2">
                  What happens if I exceed my limits?
                </h3>
                <p className="text-gray-600">
                  You'll be prompted to upgrade your plan to continue using the platform features.
                </p>
              </div>
              <div className="card">
                <h3 className="font-semibold text-gray-900 mb-2">
                  Is there a refund policy?
                </h3>
                <p className="text-gray-600">
                  We offer a 14-day money-back guarantee for all paid plans if you're not satisfied.
                </p>
              </div>
              <div className="card">
                <h3 className="font-semibold text-gray-900 mb-2">
                  Can I cancel anytime?
                </h3>
                <p className="text-gray-600">
                  Yes, you can cancel your subscription at any time. Your access will continue until the end of your billing period.
                </p>
              </div>
            </div>
          </div>

          {/* CTA Section */}
          <div className="mt-16 text-center">
            <p className="text-gray-600 mb-4">
              Still have questions? <Link to="/contact" className="text-primary hover:underline">Contact us</Link>
            </p>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
