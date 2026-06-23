import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { paymentsAPI, campaignsAPI } from '../services/api';
import api from '../services/api';
import Navbar from '../components/Navbar';
import toast from 'react-hot-toast';
import BankTransferDetails from '../components/BankTransferDetails';

const CampaignPayment = () => {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const [paymentData, setPaymentData] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('wallet');
  const [proofFile, setProofFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Wallet state
  const [walletBalance, setWalletBalance] = useState(0);
  const [loadingWallet, setLoadingWallet] = useState(true);

  useEffect(() => {
    // Get payment context from localStorage
    const contextStr = localStorage.getItem('payment_context');
    if (!contextStr) {
      toast.error('No pending payment found');
      navigate('/brand/campaigns');
      return;
    }

    const context = JSON.parse(contextStr);

    // If we have a bookingId in URL, validate it matches context
    if (bookingId && context.booking_id && context.booking_id != bookingId) {
      toast.error('Invalid payment context');
      navigate('/brand/campaigns');
      return;
    }

    setPaymentData(context);

    // Fetch wallet balance for brand users
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.user_type === 'brand') {
      fetchWalletBalance();
    } else {
      setLoadingWallet(false);
    }
  }, [bookingId, navigate]);

  const fetchWalletBalance = async () => {
    try {
      setLoadingWallet(true);
      const response = await api.get('/brand/wallet/balance');
      if (response.data.success) {
        setWalletBalance(Number(response.data.wallet.available_balance) || 0);
      } else {
        setWalletBalance(0);
      }
    } catch (error) {
      console.error('Error fetching wallet balance:', error);
      setWalletBalance(0);
    } finally {
      setLoadingWallet(false);
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

  const handleWalletPayment = async () => {
    if (walletBalance < Number(paymentData.amount)) {
      toast.error('Insufficient wallet balance');
      return;
    }

    setProcessing(true);

    try {
      // Call campaign wallet payment endpoint
      const response = await paymentsAPI.createCampaignPayment({
        payment_method: 'wallet',
        ...paymentData
      });

      if (response.data.success) {
        toast.success('Payment completed successfully using wallet!');
        localStorage.removeItem('payment_context');

        // Redirect based on context type
        if (paymentData.type === 'campaign_application') {
          navigate(`/brand/campaigns/${paymentData.campaign_id}`);
        } else if (paymentData.type === 'campaign_package') {
          navigate(`/brand/campaigns/${paymentData.campaign_id}`);
        } else {
          navigate('/brand/campaigns');
        }
      }
    } catch (error) {
      console.error('Wallet payment error:', error);
      toast.error(error.response?.data?.error || 'Failed to process wallet payment');
    } finally {
      setProcessing(false);
    }
  };

  const handlePayment = async () => {
    if (paymentMethod === 'wallet') {
      await handleWalletPayment();
      return;
    }

    if (paymentMethod === 'bank_transfer' && !proofFile) {
      toast.error('Please upload proof of payment');
      return;
    }

    setProcessing(true);

    try {
      if (paymentMethod === 'paynow') {
        // Initiate Paynow payment
        const response = await paymentsAPI.createCampaignPayment({
          payment_method: 'paynow',
          ...paymentData
        });

        if (response.data.payment_url) {
          toast.success('Redirecting to Paynow...');
          window.location.href = response.data.payment_url;
        } else {
          toast.error('Failed to initiate payment');
        }
      } else {
        // Upload proof of payment for bank transfer
        setUploading(true);
        const formData = new FormData();
        formData.append('file', proofFile);
        formData.append('payment_method', 'bank_transfer');

        // Add all payment context data
        Object.keys(paymentData).forEach(key => {
          if (key !== 'file') {
            formData.append(key, paymentData[key]);
          }
        });

        const response = await paymentsAPI.uploadCampaignProofOfPayment(
          paymentData.application_id || paymentData.booking_id,
          formData
        );

        if (response.data.success || response.data.message) {
          toast.success('Proof of payment uploaded successfully. Awaiting admin verification.');
          localStorage.removeItem('payment_context');

          // Redirect based on context type
          if (paymentData.type === 'campaign_application') {
            navigate(`/brand/campaigns/${paymentData.campaign_id}`);
          } else if (paymentData.type === 'campaign_package') {
            navigate(`/brand/campaigns/${paymentData.campaign_id}`);
          } else {
            navigate('/brand/campaigns');
          }
        }
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast.error(error.response?.data?.error || 'Payment failed');
    } finally {
      setProcessing(false);
      setUploading(false);
    }
  };

  if (!paymentData) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Complete Payment</h1>
          <p className="text-gray-600">
            {paymentData.type === 'campaign_application'
              ? 'Complete payment to accept the campaign application'
              : 'Complete payment to add package to campaign'
            }
          </p>
        </div>

        {/* Payment Info Card */}
        <div className="bg-white rounded-3xl shadow-sm p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Payment Details</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Payment Type:</span>
              <span className="font-semibold text-gray-900">
                {paymentData.type === 'campaign_application' ? 'Campaign Application' : 'Campaign Package'}
              </span>
            </div>
            {paymentData.amount && (
              <div className="flex justify-between">
                <span className="text-gray-600">Amount:</span>
                <span className="font-semibold text-primary text-xl">${paymentData.amount}</span>
              </div>
            )}
            {paymentData.payment_category && (
              <div className="flex justify-between">
                <span className="text-gray-600">Category:</span>
                <span className="font-semibold text-gray-900 capitalize">{paymentData.payment_category}</span>
              </div>
            )}
          </div>
        </div>

        {/* Payment Method Selection */}
        <div className="bg-white rounded-3xl shadow-sm p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Select Payment Method</h2>

          <div className="space-y-4">
            {/* Wallet Option */}
            <label className="flex items-start p-4 border-2 rounded-3xl cursor-pointer hover:border-primary transition-colors"
                   style={{ borderColor: paymentMethod === 'wallet' ? '#F15A29' : '#e5e7eb' }}>
              <input
                type="radio"
                name="paymentMethod"
                value="wallet"
                checked={paymentMethod === 'wallet'}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="mt-1"
              />
              <div className="ml-3 flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-900">Wallet Balance</span>
                  {!loadingWallet && paymentData?.amount && (
                    <span className={`text-sm font-semibold ${walletBalance >= Number(paymentData.amount) ? 'text-green-600' : 'text-red-600'}`}>
                      Available: ${(Number(walletBalance) || 0).toFixed(2)}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  Pay instantly using your wallet balance. {paymentData?.amount && walletBalance < Number(paymentData.amount) && (
                    <span className="text-red-600 font-medium">Insufficient balance.</span>
                  )}
                </p>
                {paymentData?.amount && walletBalance < Number(paymentData.amount) && (
                  <a href="/brand/wallet" className="text-sm text-primary hover:text-primary-dark font-medium mt-1 inline-block">
                    Top up wallet →
                  </a>
                )}
              </div>
            </label>

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
                <span className="font-semibold text-gray-900">Paynow</span>
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
                <span className="font-semibold text-gray-900">Bank Transfer</span>
                <p className="text-sm text-gray-600 mt-1">
                  Transfer funds directly to our bank account. Requires admin verification.
                </p>
              </div>
            </label>
          </div>
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
            <div className="text-blue-900">
              <BankTransferDetails reference={`CAMPAIGN-${paymentData.campaign_id}-${paymentData.application_id || 'APP'}`} />
              {paymentData.amount && (
                <p className="mt-3 text-sm"><strong>Amount:</strong> ${paymentData.amount}</p>
              )}
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

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            onClick={() => {
              localStorage.removeItem('payment_context');
              navigate(`/brand/campaigns/${paymentData.campaign_id}`);
            }}
            className="flex-1 px-6 py-3 border-2 border-gray-300 hover:border-gray-400 text-gray-700 font-medium rounded-full transition-colors"
            disabled={processing || uploading}
          >
            Cancel
          </button>
          <button
            onClick={handlePayment}
            disabled={processing || uploading || (paymentMethod === 'bank_transfer' && !proofFile) || (paymentMethod === 'wallet' && walletBalance < Number(paymentData?.amount))}
            className="flex-1 px-6 py-3 bg-primary hover:bg-primary-dark text-white font-medium rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {processing || uploading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Processing...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                {paymentMethod === 'wallet' ? 'Pay with Wallet' :
                 paymentMethod === 'paynow' ? 'Proceed to Paynow' :
                 'Submit Payment'}
              </>
            )}
          </button>
        </div>

        {/* Important Notes */}
        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-3xl p-4">
          <h4 className="font-semibold text-yellow-900 mb-2 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Important Notes
          </h4>
          <ul className="text-sm text-yellow-900 space-y-1 list-disc list-inside">
            <li>Your payment will be held in escrow until collaboration completion</li>
            <li>Bank transfers require admin verification (1-2 business days)</li>
            <li>Paynow payments are processed instantly</li>
            {paymentData.type === 'campaign_application' && (
              <li>The application will be automatically accepted after payment verification</li>
            )}
            {paymentData.type === 'campaign_package' && (
              <li>The package will be added to your campaign after payment verification</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default CampaignPayment;
