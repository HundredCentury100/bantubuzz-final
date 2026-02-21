import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import api from '../services/api';
import Navbar from '../components/Navbar';
import toast from 'react-hot-toast';

const SubscriptionPayment = () => {
  const { subscriptionId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentData, setPaymentData] = useState(null);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('paynow');
  const [proofFile, setProofFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Get plan info from location state
  const planInfo = location.state?.plan;
  const billingCycle = location.state?.billingCycle || 'monthly';

  useEffect(() => {
    if (subscriptionId) {
      fetchSubscription();
    } else if (location.state?.paymentData) {
      // Payment data passed from SubscriptionManage after initiation
      setPaymentData(location.state.paymentData);
      setLoading(false);
    }
  }, [subscriptionId]);

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

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', proofFile);
      formData.append('subscription_id', subscriptionId || paymentData?.subscription_id);

      // Note: You'll need to create this endpoint in the backend
      const response = await api.post(`/api/subscriptions/upload-proof`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        toast.success('Proof of payment uploaded successfully. Awaiting admin verification.');
        navigate('/subscription/manage');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error.response?.data?.error || 'Failed to upload proof of payment');
    } finally {
      setUploading(false);
    }
  };

  const handleCheckPaymentStatus = async () => {
    const subId = subscriptionId || paymentData?.subscription_id;
    if (!subId) {
      toast.error('No subscription ID available');
      return;
    }

    try {
      setCheckingStatus(true);
      const response = await api.get(`/subscriptions/subscription/${subId}/payment-status`);

      if (response.data.success && response.data.data.payment.paid) {
        toast.success('Payment confirmed! Your subscription is now active.');
        navigate('/subscription/manage');
      } else {
        const status = response.data.data.payment.status || 'pending';
        toast.info(`Payment status: ${status}`);
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
  const amount = billingCycle === 'yearly' ? plan?.price_yearly : plan?.price_monthly;
  const reference = `SUB-${subscriptionId || paymentData?.subscription_id || 'PENDING'}`;

  return (
    <div className="min-h-screen bg-light">
      <Navbar />

      <div className="container-custom section-padding">
        <div className="max-w-2xl mx-auto">
          {/* Navigation */}
          <div className="mb-6">
            <Link
              to="/subscription/manage"
              className="text-gray-600 hover:text-gray-900 flex items-center gap-2 w-fit"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Subscription
            </Link>
          </div>

          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="text-4xl font-bold text-dark mb-2">Complete Subscription Payment</h1>
            <p className="text-gray-600">Secure payment via Paynow</p>
          </div>

          {/* Subscription Summary Card */}
          <div className="bg-white rounded-3xl shadow-sm p-6 mb-6">
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

              <div className="flex justify-between items-center py-4 bg-light rounded-lg px-4">
                <span className="text-lg font-bold text-dark">Total Amount</span>
                <span className="text-2xl font-bold text-primary">${amount?.toFixed(2) || '0.00'}</span>
              </div>
            </div>
          </div>

          {/* Payment Actions */}
          <div className="bg-white rounded-3xl shadow-sm p-6">
            <h2 className="text-xl font-bold text-dark mb-4">Select Payment Method</h2>

            <div className="space-y-4 mb-6">
              {/* Paynow Option */}
              <label className="flex items-start p-4 border-2 rounded-3xl cursor-pointer hover:border-primary transition-colors"
                     style={{ borderColor: paymentMethod === 'paynow' ? '#F15A29' : '#e5e7eb' }}>
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
                     style={{ borderColor: paymentMethod === 'bank_transfer' ? '#F15A29' : '#e5e7eb' }}>
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
              <div className="bg-blue-50 border-2 border-blue-200 rounded-3xl p-6 mb-6">
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
              onClick={paymentMethod === 'paynow' ? handleProceedToPayment : handleManualPayment}
              disabled={(paymentMethod === 'paynow' && !paymentData?.redirect_url) || (paymentMethod === 'bank_transfer' && !proofFile) || uploading}
              className="bg-primary hover:bg-primary-dark text-white font-medium px-6 py-3 rounded-full w-full disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
            >
              {uploading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Uploading...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  {paymentMethod === 'paynow'
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
          <div className="mt-6 p-4 bg-primary/10 border border-primary rounded-3xl">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-primary-dark mr-3 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div>
                <h3 className="font-medium text-primary-dark mb-1">Secure Payment</h3>
                <p className="text-sm text-primary-dark">
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
