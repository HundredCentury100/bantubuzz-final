import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import api, { creatorWalletAPI } from '../services/api';
import Navbar from '../components/Navbar';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';

const SubscriptionPayment = () => {
  const { subscriptionId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentData, setPaymentData] = useState(null);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('paynow');
  const [proofFile, setProofFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [walletBalance, setWalletBalance] = useState(null);
  const [loadingWallet, setLoadingWallet] = useState(false);

  // Get plan info from location state
  const planInfo = location.state?.plan;
  const billingCycle = location.state?.billingCycle || 'monthly';
  const stateSubscription = location.state?.subscription;

  useEffect(() => {
    if (subscriptionId) {
      fetchSubscription();
    } else if (stateSubscription) {
      // Subscription passed from CreatorSubscriptions
      setSubscription(stateSubscription);
      setPaymentData(location.state?.paymentData);
      setLoading(false);
    } else if (location.state?.paymentData) {
      // Payment data passed from SubscriptionManage after initiation
      setPaymentData(location.state.paymentData);
      setLoading(false);
    }

    // Fetch wallet balance for creators
    if (user?.user_type === 'creator') {
      fetchWalletBalance();
    }
  }, [subscriptionId, user, stateSubscription]);

  const fetchSubscription = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/subscriptions/my-subscription`);

      if (response.data.success && response.data.data.has_subscription) {
        setSubscription(response.data.data.subscription);
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
      toast.error('Failed to load subscription details');
    } finally {
      setLoading(false);
    }
  };

  const fetchWalletBalance = async () => {
    try {
      setLoadingWallet(true);
      const response = await creatorWalletAPI.getBalance();
      if (response.data.success) {
        setWalletBalance(response.data.wallet);
      }
    } catch (error) {
      console.error('Error fetching wallet balance:', error);
    } finally {
      setLoadingWallet(false);
    }
  };

  const handleWalletPayment = async () => {
    const plan = subscription?.plan || planInfo;
    // Creator subscriptions use 'price', brand subscriptions use 'price_monthly'/'price_yearly'
    const amount = plan?.price || (billingCycle === 'yearly' ? plan?.price_yearly : plan?.price_monthly);

    if (!walletBalance || walletBalance.available_balance < amount) {
      toast.error('Insufficient wallet balance');
      return;
    }

    // Get subscription ID from various sources
    const subId = subscription?.id || subscriptionId || paymentData?.subscription_id;

    if (!subId) {
      toast.error('Subscription ID not found. Please try again.');
      console.error('Missing subscription ID:', { subscription, subscriptionId, paymentData });
      return;
    }

    try {
      setPaymentLoading(true);
      const response = await api.post('/creator/subscriptions/pay-with-wallet', {
        subscription_id: subId,
        billing_cycle: billingCycle
      });

      if (response.data.success) {
        toast.success('Payment successful! Your subscription is now active.');

        // Check if this is a verification subscription
        const plan = subscription?.plan || planInfo;
        if (plan?.subscription_type === 'verification' || plan?.slug?.includes('verification')) {
          navigate('/creator/verification/apply');
        } else {
          // For brand subscriptions
          navigate('/subscription/manage');
        }
      }
    } catch (error) {
      console.error('Wallet payment error:', error);
      toast.error(error.response?.data?.error || 'Failed to process wallet payment');
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB');
        return;
      }

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        toast.error('File must be JPG, PNG, GIF, or PDF');
        return;
      }

      setProofFile(file);
    }
  };

  const handleProceedToPayment = () => {
    if (paymentData?.redirect_url) {
      // Redirect to Paynow payment page
      window.location.href = paymentData.redirect_url;
    } else {
      toast.error('Payment URL not available. Please contact support.');
    }
  };

  const handleManualPayment = async () => {
    if (!proofFile) {
      toast.error('Please upload proof of payment');
      return;
    }

    // Get subscription ID from various sources
    const subId = subscription?.id || subscriptionId || paymentData?.subscription_id;

    if (!subId) {
      toast.error('Subscription ID not found. Please try again.');
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', proofFile);
      formData.append('subscription_id', subId);

      // Use different endpoint based on user type
      const endpoint = user?.user_type === 'creator'
        ? '/creator/subscriptions/upload-proof'
        : '/subscriptions/upload-proof';

      const response = await api.post(endpoint, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        toast.success('Proof of payment uploaded successfully. Awaiting admin verification.');

        // Check if this is a verification subscription
        const plan = subscription?.plan || planInfo;
        if (plan?.subscription_type === 'verification' || plan?.slug?.includes('verification')) {
          navigate('/creator/verification/pending', {
            state: { subscription: subscription || stateSubscription }
          });
        } else {
          // For brand subscriptions
          navigate('/subscription/manage');
        }
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error.response?.data?.error || 'Failed to upload proof of payment');
    } finally {
      setUploading(false);
    }
  };

  const handleCheckPaymentStatus = async () => {
    const subId = subscription?.id || subscriptionId || paymentData?.subscription_id;
    if (!subId) {
      toast.error('No subscription ID available');
      return;
    }

    try {
      setCheckingStatus(true);
      const response = await api.get(`/subscriptions/subscription/${subId}/payment-status`);

      if (response.data.success && response.data.data.payment.paid) {
        toast.success('Payment confirmed! Your subscription is now active.');

        // Check if this is a verification subscription
        const plan = subscription?.plan || planInfo;
        if (plan?.subscription_type === 'verification' || plan?.slug?.includes('verification')) {
          navigate('/creator/verification/apply');
        } else {
          // For brand subscriptions
          navigate('/subscription/manage');
        }
      } else {
        const status = response.data.data.payment.status || 'pending';
        toast.info(`Payment status: ${status}`);

        // If still pending and it's a verification subscription, offer to go to pending page
        const plan = subscription?.plan || planInfo;
        if (plan?.subscription_type === 'verification' || plan?.slug?.includes('verification')) {
          setTimeout(() => {
            navigate('/creator/verification/pending', {
              state: { subscription: subscription || stateSubscription }
            });
          }, 2000);
        }
      }
    } catch (error) {
      console.error('Error checking payment status:', error);
      toast.error('Failed to check payment status');
    } finally {
      setCheckingStatus(false);
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

  const plan = subscription?.plan || planInfo;
  // Creator subscriptions use 'price', brand subscriptions use 'price_monthly'/'price_yearly'
  const amount = plan?.price || (billingCycle === 'yearly' ? plan?.price_yearly : plan?.price_monthly);
  // Use appropriate reference format based on subscription type
  const refId = subscription?.id || subscriptionId || paymentData?.subscription_id || 'PENDING';
  const reference = user?.user_type === 'creator' ? `CREATOR_SUB_${refId}` : `SUB-${refId}`;

  return (
    <div className="min-h-screen bg-light">
      <Navbar />

      <div className="container-custom section-padding">
        <div className="max-w-2xl mx-auto">
          {/* Navigation */}
          <div className="mb-6">
            <Link
              to={user?.user_type === 'creator' ? '/creator/subscriptions' : '/subscription/manage'}
              className="text-gray-600 hover:text-gray-900 flex items-center gap-2 w-fit"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Subscriptions
            </Link>
          </div>

          {/* Header */}
          <div className="mb-12 text-center">
            <h1 className="text-5xl md:text-6xl font-bold text-dark mb-4 leading-tight">Complete Payment</h1>
            <p className="text-lg md:text-xl text-gray-600 leading-relaxed">Choose your payment method</p>
          </div>

          {/* Wallet Balance Card - Only show for creators */}
          {user?.user_type === 'creator' && walletBalance && (
            <div className="bg-gradient-to-r from-primary to-primary-dark rounded-3xl shadow-lg p-6 mb-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90 mb-1">Available Wallet Balance</p>
                  <p className="text-3xl font-bold">${(walletBalance.available_balance || 0).toFixed(2)}</p>
                </div>
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
              </div>
              {walletBalance.available_balance < amount && amount > 0 && (
                <div className="mt-4 pt-4 border-t border-white/20">
                  <p className="text-sm">
                    <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    Insufficient balance. You need ${(amount - walletBalance.available_balance).toFixed(2)} more.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Subscription Summary Card */}
          <div className="bg-white rounded-3xl shadow-sm p-8 mb-6">
            <h2 className="text-xl font-bold text-dark mb-4">Subscription Summary</h2>

            <div className="space-y-4">
              <div className="flex justify-between items-center pb-4 border-b border-gray-200">
                <span className="text-gray-600">Plan</span>
                <span className="font-medium text-dark">{plan?.name || 'N/A'}</span>
              </div>

              <div className="flex justify-between items-center pb-4 border-b border-gray-200">
                <span className="text-gray-600">Billing Cycle</span>
                <span className="font-medium text-dark capitalize">{billingCycle}</span>
              </div>

              <div className="flex justify-between items-center pb-4 border-b border-gray-200">
                <span className="text-gray-600">Features</span>
                <div className="text-right">
                  <div className="text-sm text-gray-600">
                    {plan?.max_packages === -1 ? 'Unlimited' : plan?.max_packages} packages
                  </div>
                  <div className="text-sm text-gray-600">
                    {plan?.max_bookings_per_month === -1 ? 'Unlimited' : plan?.max_bookings_per_month} bookings/month
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center py-4 bg-light rounded-3xl px-6">
                <span className="text-lg font-bold text-dark">Total Amount</span>
                <span className="text-2xl font-bold text-primary">${amount?.toFixed(2) || '0.00'}</span>
              </div>
            </div>
          </div>

          {/* Payment Actions */}
          <div className="bg-white rounded-3xl shadow-sm p-8">
            <h2 className="text-2xl font-bold text-dark mb-6">Select Payment Method</h2>

            <div className="space-y-4 mb-6">
              {/* Wallet Option - Only for creators with sufficient balance */}
              {user?.user_type === 'creator' && walletBalance && (
                <label
                  className={`flex items-start p-4 border-2 rounded-3xl cursor-pointer transition-colors ${
                    walletBalance.available_balance < amount ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary'
                  }`}
                  style={{ borderColor: paymentMethod === 'wallet' ? '#ccdb53' : '#e5e7eb' }}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="wallet"
                    checked={paymentMethod === 'wallet'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    disabled={walletBalance.available_balance < amount}
                    className="mt-1"
                  />
                  <div className="ml-3 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-dark">Pay with Wallet</span>
                      {walletBalance.available_balance >= amount && (
                        <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">Recommended</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      Use your wallet balance (${(walletBalance.available_balance || 0).toFixed(2)} available)
                    </p>
                    {walletBalance.available_balance < amount && (
                      <p className="text-sm text-red-600 mt-1">
                        Insufficient balance. You need ${((amount || 0) - (walletBalance.available_balance || 0)).toFixed(2)} more.
                      </p>
                    )}
                  </div>
                </label>
              )}

              {/* Paynow Option */}
              <label className="flex items-start p-4 border-2 rounded-3xl cursor-pointer hover:border-primary transition-colors"
                     style={{ borderColor: paymentMethod === 'paynow' ? '#ccdb53' : '#e5e7eb' }}>
                <input
                  type="radio"
                  name="paymentMethod"
                  value="paynow"
                  checked={paymentMethod === 'paynow'}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="mt-1"
                />
                <div className="ml-3 flex-1">
                  <span className="font-semibold text-dark">Paynow</span>
                  <p className="text-sm text-gray-600 mt-1">
                    Pay instantly using <strong>EcoCash</strong>, <strong>Innbucks</strong>, <strong>OneMoney</strong>, <strong>Omari</strong>, <strong>Visa</strong>, or <strong>Mastercard</strong> via Paynow
                  </p>
                </div>
              </label>

              {/* Bank Transfer Option */}
              <label className="flex items-start p-4 border-2 rounded-3xl cursor-pointer hover:border-primary transition-colors"
                     style={{ borderColor: paymentMethod === 'bank_transfer' ? '#ccdb53' : '#e5e7eb' }}>
                <input
                  type="radio"
                  name="paymentMethod"
                  value="bank_transfer"
                  checked={paymentMethod === 'bank_transfer'}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="mt-1"
                />
                <div className="ml-3 flex-1">
                  <span className="font-semibold text-dark">Bank Transfer</span>
                  <p className="text-sm text-gray-600 mt-1">
                    Transfer funds directly to our bank account. Requires admin verification.
                  </p>
                </div>
              </label>
            </div>

            {/* Bank Transfer Instructions */}
            {paymentMethod === 'bank_transfer' && (
              <div className="bg-blue-50 border border-blue-200 rounded-3xl p-6 mb-6">
                <h3 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Bank Transfer Instructions
                </h3>
                <div className="space-y-2 text-sm text-blue-900">
                  <p><strong>Bank Name:</strong> Example Bank</p>
                  <p><strong>Account Name:</strong> BantuBuzz Platform</p>
                  <p><strong>Account Number:</strong> 1234567890</p>
                  <p>
                    <strong>Reference:</strong>{' '}
                    <span className="font-mono bg-blue-100 px-2 py-0.5 rounded text-blue-800">
                      {reference}
                    </span>
                  </p>
                  <p><strong>Amount:</strong> ${amount?.toFixed(2) || '0.00'}</p>
                </div>
                <p className="text-xs text-blue-700 italic mt-3">
                  Use the reference above when making your transfer so we can match your payment.
                </p>

                <div className="mt-4 pt-4 border-t border-blue-200">
                  <label className="block text-sm font-medium text-blue-900 mb-2">
                    Upload Proof of Payment *
                  </label>
                  <input
                    type="file"
                    onChange={handleFileChange}
                    accept="image/*,.pdf"
                    className="block w-full text-sm text-gray-900 border border-blue-300 rounded-full cursor-pointer bg-white focus:outline-none px-4 py-2"
                  />
                  <p className="text-xs text-blue-700 mt-2">
                    Accepted formats: JPG, PNG, GIF, PDF (Max 5MB)
                  </p>
                  {proofFile && (
                    <p className="text-sm text-blue-900 mt-2 flex items-center gap-2">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {proofFile.name}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Payment Button */}
            <button
              onClick={
                paymentMethod === 'wallet'
                  ? handleWalletPayment
                  : paymentMethod === 'paynow'
                    ? handleProceedToPayment
                    : handleManualPayment
              }
              disabled={
                paymentLoading ||
                uploading ||
                (paymentMethod === 'paynow' && !paymentData?.redirect_url) ||
                (paymentMethod === 'bank_transfer' && !proofFile) ||
                (paymentMethod === 'wallet' && (!walletBalance || walletBalance.available_balance < amount))
              }
              className="bg-dark hover:bg-gray-800 text-white font-medium px-6 py-3 rounded-full w-full disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
            >
              {(paymentLoading || uploading) ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Processing...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  {paymentMethod === 'wallet'
                    ? 'Pay with Wallet'
                    : paymentMethod === 'paynow'
                      ? (!paymentData?.redirect_url ? 'Initializing Payment...' : 'Proceed to Payment')
                      : 'Submit Payment'}
                </>
              )}
            </button>

            {paymentMethod === 'paynow' && !paymentData?.redirect_url && (
              <p className="text-sm text-gray-500 mt-2 text-center">
                Payment link is being generated...
              </p>
            )}

            <div className="text-center mt-6">
              <p className="text-sm text-gray-600 mb-3">
                Already completed payment?
              </p>
              <button
                onClick={handleCheckPaymentStatus}
                disabled={checkingStatus}
                className="text-primary hover:text-primary-dark font-medium flex items-center gap-2 mx-auto"
              >
                {checkingStatus ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
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
            </div>
          </div>

          {/* Security Notice */}
          <div className="mt-6 p-6 bg-light border border-gray-200 rounded-3xl">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-primary mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div>
                <h3 className="font-semibold text-dark mb-1">Secure Payment</h3>
                <p className="text-sm text-gray-600">
                  All payments are processed securely through Paynow. Your financial information is encrypted and protected.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionPayment;
