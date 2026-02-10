import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { paymentsAPI, campaignsAPI } from '../services/api';
import Navbar from '../components/Navbar';
import toast from 'react-hot-toast';

const CampaignPayment = () => {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const [paymentData, setPaymentData] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('paynow');
  const [proofFile, setProofFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);

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
  }, [bookingId, navigate]);

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

  const handlePayment = async () => {
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
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900">Paynow</span>
                  <span className="text-xs bg-primary text-white px-2 py-1 rounded-full">Recommended</span>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  Pay instantly with Ecocash or Onemoney. You'll be redirected to complete the payment.
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
            <div className="space-y-2 text-sm text-blue-900">
              <p><strong>Bank Name:</strong> Example Bank</p>
              <p><strong>Account Name:</strong> BantuBuzz Platform</p>
              <p><strong>Account Number:</strong> 1234567890</p>
              <p><strong>Reference:</strong> CAMPAIGN-{paymentData.campaign_id}-{paymentData.application_id || 'APP'}</p>
            </div>

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
            disabled={processing || uploading || (paymentMethod === 'bank_transfer' && !proofFile)}
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
                {paymentMethod === 'paynow' ? 'Proceed to Paynow' : 'Submit Payment'}
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
