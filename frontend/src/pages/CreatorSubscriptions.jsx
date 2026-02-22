import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../services/api';
import toast from 'react-hot-toast';
import { SparklesIcon, StarIcon, CheckBadgeIcon, ArrowRightIcon } from '@heroicons/react/24/outline';

const CreatorSubscriptions = () => {
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [mySubscriptions, setMySubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(null);

  useEffect(() => {
    fetchSubscriptionData();
  }, []);

  const fetchSubscriptionData = async () => {
    try {
      const [plansRes, subsRes] = await Promise.all([
        api.get('/creator/subscriptions/plans'),
        api.get('/creator/subscriptions')
      ]);

      setPlans(plansRes.data.plans || []);
      setMySubscriptions(subsRes.data.subscriptions || []);
    } catch (error) {
      console.error('Error fetching subscription data:', error);
      toast.error('Failed to load subscription plans');
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (planId) => {
    setSubscribing(planId);
    try {
      const response = await api.post('/creator/subscriptions/subscribe', {
        plan_id: planId,
        payment_method: 'paynow'
      });

      if (response.data.payment?.redirect_url) {
        // Redirect to Paynow
        window.location.href = response.data.payment.redirect_url;
      } else {
        toast.success(response.data.message);
        fetchSubscriptionData();
      }
    } catch (error) {
      console.error('Error subscribing:', error);
      toast.error(error.response?.data?.error || 'Failed to subscribe');
    } finally {
      setSubscribing(null);
    }
  };

  const isSubscribed = (planSlug, category) => {
    return mySubscriptions.some(sub =>
      sub.plan?.slug === planSlug &&
      (sub.plan?.featured_category === category || !category) &&
      sub.is_active
    );
  };

  const featuredPlans = plans.filter(p => p.subscription_type === 'featured');
  const verificationPlan = plans.find(p => p.subscription_type === 'verification');

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
            Boost Your Visibility
          </h1>
          <p className="text-lg text-gray-600 leading-relaxed max-w-2xl mx-auto">
            Get featured on the homepage, earn your verification badge, and stand out to top brands
          </p>
        </div>

        {/* Verification Plan */}
        {verificationPlan && (
          <div className="max-w-4xl mx-auto mb-12">
            <div className="card bg-gradient-to-br from-primary to-primary-dark text-white overflow-hidden relative">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32"></div>
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full -ml-24 -mb-24"></div>

              <div className="relative p-8 md:p-10">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                        <CheckBadgeIcon className="h-7 w-7 text-white" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold">Get Verified</h2>
                        <p className="text-white/90 text-sm">Earn the trusted creator badge</p>
                      </div>
                    </div>

                    <ul className="space-y-3 mb-6">
                      <li className="flex items-start gap-2">
                        <svg className="w-5 h-5 text-white flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="text-white/95">Verified badge on your profile</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <svg className="w-5 h-5 text-white flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="text-white/95">Increased trust from brands</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <svg className="w-5 h-5 text-white flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="text-white/95">Stand out in search results</span>
                      </li>
                    </ul>

                    <div className="flex items-baseline gap-2 mb-6">
                      <span className="text-4xl font-bold">${verificationPlan.price}</span>
                      <span className="text-white/80">/ {verificationPlan.duration_display}</span>
                    </div>
                  </div>

                  <div className="flex-shrink-0 w-full md:w-auto">
                    {isSubscribed(verificationPlan.slug) ? (
                      <div className="px-8 py-4 bg-white/20 rounded-2xl text-center">
                        <CheckBadgeIcon className="h-8 w-8 text-white mx-auto mb-2" />
                        <p className="font-semibold">Active</p>
                      </div>
                    ) : (
                      <button
                        onClick={() => navigate('/creator/verification/apply')}
                        className="w-full md:w-auto px-8 py-4 bg-white text-primary rounded-2xl font-bold hover:shadow-2xl transform hover:scale-105 transition-all duration-200 flex items-center justify-center gap-2"
                      >
                        Apply for Verification
                        <ArrowRightIcon className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Featured Plans */}
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-dark mb-2">Featured Creator Plans</h2>
            <p className="text-gray-600">Get priority placement in search results and homepage sections</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredPlans.map((plan) => {
              const subscribed = isSubscribed(plan.slug, plan.featured_category);
              const icons = {
                general: '🌟',
                facebook: '📘',
                instagram: '📸',
                tiktok: '🎵'
              };

              return (
                <div key={plan.id} className={`card group hover:shadow-2xl transition-all duration-300 ${subscribed ? 'ring-2 ring-primary' : ''}`}>
                  <div className="text-center mb-6">
                    <div className="text-5xl mb-3">{icons[plan.featured_category] || '✨'}</div>
                    <h3 className="text-xl font-bold text-dark mb-2">{plan.name}</h3>
                    <p className="text-sm text-gray-600 leading-relaxed">{plan.description}</p>
                  </div>

                  <div className="text-center mb-6">
                    <div className="flex items-baseline justify-center gap-2">
                      <span className="text-3xl font-bold text-dark">${plan.price}</span>
                      <span className="text-gray-500 text-sm">/ week</span>
                    </div>
                  </div>

                  <ul className="space-y-3 mb-6">
                    <li className="flex items-start gap-2 text-sm">
                      <svg className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-gray-700">Priority in search results</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm">
                      <svg className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-gray-700">Featured badge</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm">
                      <svg className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-gray-700">7 days visibility</span>
                    </li>
                  </ul>

                  {subscribed ? (
                    <button
                      disabled
                      className="w-full py-3 bg-primary/10 text-primary rounded-xl font-semibold cursor-not-allowed"
                    >
                      <div className="flex items-center justify-center gap-2">
                        <StarIcon className="h-5 w-5" />
                        Active
                      </div>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleSubscribe(plan.id)}
                      disabled={subscribing === plan.id}
                      className="w-full py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {subscribing === plan.id ? (
                        <div className="flex items-center justify-center gap-2">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                          Processing...
                        </div>
                      ) : (
                        'Subscribe Now'
                      )}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* My Active Subscriptions */}
        {mySubscriptions.filter(s => s.is_active).length > 0 && (
          <div className="max-w-4xl mx-auto mt-12">
            <h2 className="text-2xl font-bold text-dark mb-6">My Active Subscriptions</h2>
            <div className="space-y-4">
              {mySubscriptions.filter(s => s.is_active).map((sub) => (
                <div key={sub.id} className="card">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-bold text-dark text-lg">{sub.plan?.name}</h3>
                        <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
                          Active
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{sub.plan?.description}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>Expires: {new Date(sub.end_date).toLocaleDateString()}</span>
                        <span>•</span>
                        <span>{sub.days_remaining} days remaining</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-primary mb-1">${sub.plan?.price}</p>
                      <p className="text-sm text-gray-500">{sub.plan?.duration_display}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreatorSubscriptions;
