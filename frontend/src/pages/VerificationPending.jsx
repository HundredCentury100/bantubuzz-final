import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../services/api';
import toast from 'react-hot-toast';
import { ClockIcon, CheckCircleIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';

const VerificationPending = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkingStatus, setCheckingStatus] = useState(false);

  useEffect(() => {
    const subData = location.state?.subscription;
    if (subData) {
      setSubscription(subData);
      setLoading(false);
    } else {
      // Fetch latest subscription
      fetchVerificationSubscription();
    }
  }, []);

  const fetchVerificationSubscription = async () => {
    try {
      setLoading(true);
      const response = await api.get('/creator/subscriptions/my-subscription');

      if (response.data.success && response.data.data.has_subscription) {
        setSubscription(response.data.data.subscription);
      } else {
        toast.error('No verification subscription found');
        navigate('/creator/subscriptions');
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
      toast.error('Failed to load subscription details');
      navigate('/creator/subscriptions');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckStatus = async () => {
    try {
      setCheckingStatus(true);
      const response = await api.get('/creator/subscriptions/my-subscription');

      if (response.data.success && response.data.data.has_subscription) {
        const sub = response.data.data.subscription;

        if (sub.payment_verified && sub.status === 'active') {
          toast.success('Payment verified! Redirecting to application form...');
          setTimeout(() => {
            navigate('/creator/verification/apply');
          }, 1500);
        } else {
          toast.info('Payment is still pending verification');
          setSubscription(sub);
        }
      }
    } catch (error) {
      console.error('Error checking status:', error);
      toast.error('Failed to check payment status');
    } finally {
      setCheckingStatus(false);
    }
  };

  const handleRetryPayment = () => {
    if (subscription) {
      navigate('/subscription/payment', {
        state: {
          subscription: subscription,
          plan: subscription.plan
        }
      });
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

  const isPending = !subscription?.payment_verified || subscription?.status !== 'active';

  return (
    <div className="min-h-screen bg-light">
      <Navbar />

      <div className="container-custom section-padding">
        <div className="max-w-3xl mx-auto">
          {/* Status Card */}
          <div className="card text-center">
            <div className="mb-6">
              {isPending ? (
                <div className="w-24 h-24 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ClockIcon className="h-12 w-12 text-yellow-600" />
                </div>
              ) : (
                <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircleIcon className="h-12 w-12 text-green-600" />
                </div>
              )}

              <h1 className="text-3xl font-bold text-dark mb-3">
                {isPending ? 'Payment Pending' : 'Payment Verified'}
              </h1>

              <p className="text-lg text-gray-600 max-w-xl mx-auto">
                {isPending
                  ? 'Your verification subscription payment is awaiting confirmation. This usually takes a few minutes for Paynow payments or up to 24 hours for bank transfers.'
                  : 'Your payment has been confirmed! You can now proceed to fill out your verification application.'}
              </p>
            </div>

            {/* Subscription Details */}
            {subscription && (
              <div className="bg-light rounded-2xl p-6 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Subscription Plan</p>
                    <p className="font-semibold text-dark">{subscription.plan?.name || 'Verification'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Amount</p>
                    <p className="font-semibold text-dark">${subscription.plan?.price || '5.00'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Payment Status</p>
                    <p className="font-semibold">
                      {subscription.payment_verified ? (
                        <span className="text-green-600">Verified</span>
                      ) : (
                        <span className="text-yellow-600">Pending</span>
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Subscription Status</p>
                    <p className="font-semibold capitalize">
                      {subscription.status === 'active' ? (
                        <span className="text-green-600">{subscription.status}</span>
                      ) : (
                        <span className="text-yellow-600">{subscription.status}</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              {isPending ? (
                <>
                  <button
                    onClick={handleCheckStatus}
                    disabled={checkingStatus}
                    className="w-full btn-primary py-3 flex items-center justify-center gap-2"
                  >
                    {checkingStatus ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        Checking...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Check Payment Status
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleRetryPayment}
                    className="w-full btn-secondary py-3"
                  >
                    Complete Payment
                  </button>

                  <button
                    onClick={() => navigate('/creator/dashboard')}
                    className="w-full text-gray-600 hover:text-gray-900 py-3"
                  >
                    Back to Dashboard
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => navigate('/creator/verification/apply')}
                    className="w-full btn-primary py-3"
                  >
                    Proceed to Application Form
                  </button>

                  <button
                    onClick={() => navigate('/creator/dashboard')}
                    className="w-full text-gray-600 hover:text-gray-900 py-3"
                  >
                    Back to Dashboard
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Information Box */}
          {isPending && (
            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-2xl p-6">
              <div className="flex items-start gap-3">
                <ExclamationCircleIcon className="h-6 w-6 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-blue-900 mb-2">What happens next?</h3>
                  <ul className="text-sm text-blue-800 space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600 font-bold">1.</span>
                      <span>Your payment will be verified automatically (Paynow) or manually by our admin team (Bank Transfer)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600 font-bold">2.</span>
                      <span>Once verified, you'll see a banner on your dashboard to complete your verification application</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600 font-bold">3.</span>
                      <span>Fill out the application form and upload your identity documents</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600 font-bold">4.</span>
                      <span>Our admin team will review your application within 1-3 business days</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600 font-bold">5.</span>
                      <span>Once approved, you'll receive the verified creator badge on your profile!</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerificationPending;
