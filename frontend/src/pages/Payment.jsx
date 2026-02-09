import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { bookingsAPI } from '../services/api';
import Navbar from '../components/Navbar';
import toast from 'react-hot-toast';

const Payment = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentData, setPaymentData] = useState(null);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('paynow');
  const [proofFile, setProofFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchBooking();
  }, [id]);

  const fetchBooking = async () => {
    try {
      setLoading(true);
      const response = await bookingsAPI.getBooking(id);
      console.log('Booking data:', response.data); // Debug log
      setBooking(response.data);

      // If payment data exists in the booking, set it
      if (response.data.payment) {
        console.log('Payment data from booking:', response.data.payment); // Debug log
        setPaymentData(response.data.payment);
      } else {
        // Try to get from localStorage (set during booking creation)
        const storedPayment = localStorage.getItem(`payment_${id}`);
        if (storedPayment) {
          console.log('Payment data from localStorage:', storedPayment); // Debug log
          setPaymentData(JSON.parse(storedPayment));
        }
      }
    } catch (error) {
      console.error('Error fetching booking:', error);
      toast.error('Failed to load booking details');
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
    console.log('handleProceedToPayment called');
    console.log('paymentData:', paymentData);
    console.log('redirect_url:', paymentData?.redirect_url);

    if (paymentData?.redirect_url) {
      // Redirect to Paynow payment page
      console.log('Redirecting to:', paymentData.redirect_url);
      window.location.href = paymentData.redirect_url;
    } else {
      console.error('No payment redirect URL available');
      toast.error('Payment URL not available. Please contact support.');
    }
  };

  const handleBankTransferPayment = async () => {
    if (!proofFile) {
      toast.error('Please upload proof of payment');
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', proofFile);
      formData.append('booking_id', id);

      const response = await bookingsAPI.uploadProofOfPayment(id, formData);

      if (response.data.success) {
        toast.success('Proof of payment uploaded successfully. Awaiting admin verification.');
        navigate('/brand/dashboard');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error.response?.data?.error || 'Failed to upload proof of payment');
    } finally {
      setUploading(false);
    }
  };

  const handleCheckPaymentStatus = async () => {
    try {
      setCheckingStatus(true);
      const response = await bookingsAPI.getPaymentStatus(id);

      if (response.data.paid) {
        toast.success('Payment confirmed!');
        navigate('/brand/dashboard');
      } else {
        toast.info(`Payment status: ${response.data.status || 'pending'}`);
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

  if (!booking) {
    return (
      <div className="min-h-screen bg-light">
        <Navbar />
        <div className="container-custom section-padding text-center">
          <h1 className="text-2xl font-bold mb-4">Booking not found</h1>
          <Link to="/brand/dashboard" className="btn btn-primary">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-light">
      <Navbar />

      <div className="container-custom section-padding">
        <div className="max-w-2xl mx-auto">
          {/* Navigation */}
          <div className="mb-6">
            <Link
              to="/brand/dashboard"
              className="text-gray-600 hover:text-gray-900 flex items-center gap-2 w-fit"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Dashboard
            </Link>
          </div>

          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="text-4xl font-bold text-dark mb-2">Complete Payment</h1>
            <p className="text-gray-600">Secure payment via Paynow</p>
          </div>

          {/* Booking Summary Card */}
          <div className="card mb-6">
            <h2 className="text-xl font-bold text-dark mb-4">Booking Summary</h2>

            <div className="space-y-4">
              <div className="flex justify-between items-center pb-4 border-b border-gray-200">
                <span className="text-gray-600">Package</span>
                <span className="font-medium text-dark">{booking.package?.title || 'N/A'}</span>
              </div>

              <div className="flex justify-between items-center pb-4 border-b border-gray-200">
                <span className="text-gray-600">Creator</span>
                <span className="font-medium text-dark">
                  {booking.creator?.display_name || booking.creator?.username || 'N/A'}
                </span>
              </div>

              <div className="flex justify-between items-center pb-4 border-b border-gray-200">
                <span className="text-gray-600">Duration</span>
                <span className="font-medium text-dark">{booking.package?.duration_days || 0} days</span>
              </div>

              <div className="flex justify-between items-center pb-4 border-b border-gray-200">
                <span className="text-gray-600">Booking Status</span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  booking.status === 'pending' ? 'bg-primary text-primary-dark' :
                  booking.status === 'accepted' ? 'bg-primary text-primary-dark' :
                  booking.status === 'completed' ? 'bg-primary text-primary-dark' :
                  'bg-red-100 text-red-800'
                }`}>
                  {booking.status}
                </span>
              </div>

              <div className="flex justify-between items-center py-4 bg-light rounded-lg px-4">
                <span className="text-lg font-bold text-dark">Total Amount</span>
                <span className="text-2xl font-bold text-primary">${booking.amount?.toFixed(2) || '0.00'}</span>
              </div>
            </div>
          </div>

          {/* Payment Status Card */}
          {booking.payment_status && (
            <div className="card mb-6">
              <h2 className="text-xl font-bold text-dark mb-4">Payment Status</h2>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Current Status</span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  booking.payment_status === 'paid' ? 'bg-primary text-primary-dark' :
                  booking.payment_status === 'pending' ? 'bg-primary text-primary-dark' :
                  'bg-red-100 text-red-800'
                }`}>
                  {booking.payment_status}
                </span>
              </div>
              {booking.payment_reference && (
                <div className="mt-3 text-sm text-gray-600">
                  Reference: {booking.payment_reference}
                </div>
              )}
            </div>
          )}

          {/* Payment Actions */}
          {booking.payment_status !== 'paid' && (
            <div className="card">
              <h2 className="text-xl font-bold text-dark mb-4">Select Payment Method</h2>

              <div className="space-y-4 mb-6">
                {/* Paynow Option */}
                <label className="flex items-start p-4 border-2 rounded-lg cursor-pointer hover:border-primary transition-colors"
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
                      <span className="font-semibold text-dark">Paynow</span>
                      <span className="text-xs bg-primary text-white px-2 py-1 rounded">Recommended</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      Pay instantly with EcoCash, OneMoney, Visa, or Mastercard
                    </p>
                  </div>
                </label>

                {/* Bank Transfer Option */}
                <label className="flex items-start p-4 border-2 rounded-lg cursor-pointer hover:border-primary transition-colors"
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
                <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 mb-6">
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
                    <p><strong>Reference:</strong> BOOKING-{id}</p>
                  </div>

                  <div className="mt-4 pt-4 border-t border-blue-200">
                    <label className="block text-sm font-medium text-blue-900 mb-2">
                      Upload Proof of Payment *
                    </label>
                    <input
                      type="file"
                      onChange={handleFileChange}
                      accept="image/*,.pdf"
                      className="block w-full text-sm text-gray-900 border border-blue-300 rounded-lg cursor-pointer bg-white focus:outline-none"
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
                onClick={paymentMethod === 'paynow' ? handleProceedToPayment : handleBankTransferPayment}
                disabled={(paymentMethod === 'paynow' && !paymentData?.redirect_url) || (paymentMethod === 'bank_transfer' && !proofFile) || uploading}
                className="btn btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
          )}

          {/* Payment Complete */}
          {booking.payment_status === 'paid' && (
            <div className="card text-center">
              <div className="w-16 h-16 bg-primary rounded-full mx-auto mb-4 flex items-center justify-center">
                <svg className="w-10 h-10 text-primary-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-dark mb-2">Payment Successful!</h2>
              <p className="text-gray-600 mb-6">
                Your booking has been confirmed and the creator has been notified.
              </p>
              <Link to="/brand/dashboard" className="btn btn-primary">
                Go to Dashboard
              </Link>
            </div>
          )}

          {/* Security Notice */}
          <div className="mt-6 p-4 bg-primary/10 border border-primary rounded-lg">
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

export default Payment;
