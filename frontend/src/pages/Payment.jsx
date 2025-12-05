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
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [paymentData, setPaymentData] = useState(null);
  const [initiatingPayment, setInitiatingPayment] = useState(false);

  useEffect(() => {
    fetchBooking();
  }, [id]);

  const fetchBooking = async () => {
    try {
      setLoading(true);
      const response = await bookingsAPI.getBooking(id);
      setBooking(response.data);

      // Check if payment data exists from booking creation
      const storedPayment = localStorage.getItem(`payment_${id}`);
      if (storedPayment) {
        const paymentInfo = JSON.parse(storedPayment);
        setPaymentData(paymentInfo);
      }
    } catch (error) {
      console.error('Error fetching booking:', error);
      toast.error('Failed to load booking details');
    } finally {
      setLoading(false);
    }
  };

  const handleProceedToPayment = () => {
    if (paymentData?.redirect_url) {
      // Redirect to Paynow
      window.location.href = paymentData.redirect_url;
    } else {
      toast.error('Payment URL not available');
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
                  {booking.creator?.user?.email?.split('@')[0] || 'N/A'}
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
              <h2 className="text-xl font-bold text-dark mb-4">Complete Payment</h2>

              <div className="space-y-4">
                {/* Paynow Payment Option */}
                {paymentData?.redirect_url ? (
                  <div className="p-4 border border-gray-200 rounded-lg bg-white">
                    <div className="flex items-start mb-3">
                      <svg className="w-6 h-6 text-primary mr-3 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                      <div className="flex-1">
                        <h3 className="font-medium text-dark mb-1">Pay with Paynow</h3>
                        <p className="text-sm text-gray-600 mb-3">
                          Secure payment via EcoCash, OneMoney, Visa, or Mastercard
                        </p>
                        <button
                          onClick={handleProceedToPayment}
                          className="btn btn-primary w-full"
                        >
                          Proceed to Paynow Payment
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 border border-red-200 rounded-lg bg-red-50">
                    <div className="flex items-start mb-3">
                      <svg className="w-6 h-6 text-red-600 mr-3 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <div className="flex-1">
                        <h3 className="font-medium text-red-800 mb-2">Payment Link Not Available</h3>
                        <p className="text-sm text-red-700 mb-3">
                          The payment link was not generated when you created this booking. This may be due to a connection issue with Paynow.
                        </p>
                        <div className="bg-white p-3 rounded border border-red-200 mb-3">
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600 font-medium">Amount:</span>
                              <span className="font-mono font-bold text-primary">${booking.amount?.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600 font-medium">Booking ID:</span>
                              <span className="font-mono font-medium">#{booking.id}</span>
                            </div>
                          </div>
                        </div>
                        <p className="text-sm text-red-700 mb-2">
                          <strong>What to do:</strong>
                        </p>
                        <ul className="text-sm text-red-700 list-disc list-inside space-y-1">
                          <li>Go back to dashboard and try creating a new booking</li>
                          <li>Or contact admin support if you've already paid</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                <div className="text-center">
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
