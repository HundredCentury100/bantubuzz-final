import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../hooks/useAuth';
import { bookingsAPI } from '../services/api';
import Navbar from '../components/Navbar';

const CartCheckout = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { cartItems, clearCart, getCartTotal } = useCart();

  const [paymentMethod, setPaymentMethod] = useState('paynow');
  const [proofFile, setProofFile] = useState(null);

  // Cart checkout state
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutData, setCheckoutData] = useState(null); // { booking_ids, redirect_url, poll_url, payment_reference, total }
  const [checkoutError, setCheckoutError] = useState(null);

  // Status checking
  const [checkingStatus, setCheckingStatus] = useState(false);

  // Bank transfer upload
  const [uploading, setUploading] = useState(false);

  // Payment success
  const [paymentComplete, setPaymentComplete] = useState(false);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);
  };

  // Redirect if cart is empty and no checkout data
  if (cartItems.length === 0 && !checkoutData && !paymentComplete) {
    return (
      <div className="min-h-screen bg-light">
        <Navbar />
        <div className="container-custom section-padding text-center">
          <h1 className="text-2xl font-bold mb-4">Your cart is empty</h1>
          <Link to="/browse/creators" className="btn btn-primary">Browse Creators</Link>
        </div>
      </div>
    );
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      toast.error('File size must be less than 20MB');
      return;
    }
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('File must be JPG, PNG, GIF, or PDF');
      return;
    }
    setProofFile(file);
  };

  // Initialize cart checkout — creates all bookings + one Paynow payment
  const initializeCartCheckout = async () => {
    setCheckoutLoading(true);
    setCheckoutError(null);
    try {
      const packageIds = cartItems.map((item) => item.package_id);
      const response = await bookingsAPI.cartCheckout(packageIds);
      const data = response.data;
      setCheckoutData(data);
      // Clear cart immediately — bookings are now created
      clearCart();
      toast.success('Cart processed! Complete payment below.');
    } catch (error) {
      const msg = error.response?.data?.error || 'Failed to initialize checkout. Please try again.';
      setCheckoutError(msg);
      toast.error(msg);
    } finally {
      setCheckoutLoading(false);
    }
  };

  // Proceed to Paynow redirect
  const handleProceedToPaynow = () => {
    if (!checkoutData?.redirect_url) {
      toast.error('Payment URL not available. Please try again.');
      return;
    }
    window.location.href = checkoutData.redirect_url;
  };

  // Check Paynow payment status
  const handleCheckPaymentStatus = async () => {
    if (!checkoutData?.booking_ids || !checkoutData?.poll_url) {
      toast.error('No payment session found. Please start checkout again.');
      return;
    }
    setCheckingStatus(true);
    try {
      const response = await bookingsAPI.cartPaymentStatus(checkoutData.booking_ids, checkoutData.poll_url);
      if (response.data.paid) {
        toast.success('Payment confirmed! Your bookings are active.');
        setPaymentComplete(true);
      } else {
        toast.info(`Payment status: ${response.data.status || 'pending'}. Please complete payment on Paynow.`);
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to check payment status.');
    } finally {
      setCheckingStatus(false);
    }
  };

  // Bank transfer: create bookings + upload POP
  const handleBankTransfer = async () => {
    if (!proofFile) {
      toast.error('Please upload your proof of payment first');
      return;
    }

    // If bookings not yet created, create them first via bank transfer endpoint
    if (!checkoutData) {
      setUploading(true);
      try {
        const packageIds = cartItems.map((item) => item.package_id);
        const formData = new FormData();
        formData.append('file', proofFile);
        packageIds.forEach((id) => formData.append('package_ids[]', id));
        // Use cartUploadPop which accepts package_ids + file together
        // We need to first create bookings — call cartCheckout first for bank transfer
        const checkoutResponse = await bookingsAPI.cartCheckout(packageIds);
        const data = checkoutResponse.data;
        clearCart();

        // Now upload POP
        const popFormData = new FormData();
        popFormData.append('file', proofFile);
        await bookingsAPI.cartUploadPop(data.booking_ids, popFormData);

        toast.success('Proof of payment uploaded. Awaiting admin verification (1–2 business days).');
        navigate('/brand/bookings');
      } catch (error) {
        toast.error(error.response?.data?.error || 'Failed to process payment. Please try again.');
      } finally {
        setUploading(false);
      }
      return;
    }

    // Bookings already created (e.g. user switched from Paynow) — just upload POP
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', proofFile);
      await bookingsAPI.cartUploadPop(checkoutData.booking_ids, formData);
      toast.success('Proof of payment uploaded. Awaiting admin verification (1–2 business days).');
      navigate('/brand/bookings');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to upload proof of payment.');
    } finally {
      setUploading(false);
    }
  };

  const isSubmitting = checkoutLoading || uploading;
  const packageCount = checkoutData ? checkoutData.booking_ids?.length : cartItems.length;
  const totalAmount = checkoutData?.total ?? getCartTotal();

  // Payment success screen
  if (paymentComplete) {
    return (
      <div className="min-h-screen bg-light">
        <Navbar />
        <div className="container-custom section-padding">
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-3xl shadow-sm p-8 text-center">
              <div className="w-16 h-16 bg-primary rounded-full mx-auto mb-4 flex items-center justify-center">
                <svg className="w-10 h-10 text-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-dark mb-2">Payment Successful!</h2>
              <p className="text-gray-600 mb-6">
                Your bookings have been confirmed and the creators have been notified.
              </p>
              <div className="flex gap-3 justify-center">
                <Link
                  to="/brand/bookings"
                  className="bg-primary text-dark font-bold px-6 py-3 rounded-full hover:bg-primary/90 transition inline-block"
                >
                  View Bookings
                </Link>
                <Link
                  to="/brand/dashboard"
                  className="bg-white text-gray-700 font-medium px-6 py-3 rounded-full border border-gray-300 hover:bg-gray-50 transition inline-block"
                >
                  Go to Dashboard
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-light">
      <Navbar />

      <div className="container-custom section-padding">
        <div className="max-w-3xl mx-auto">
          {/* Back link */}
          <Link
            to="/browse/creators"
            className="text-gray-600 hover:text-gray-900 flex items-center gap-2 mb-6 w-fit"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Browse
          </Link>

          <div className="mb-8 text-center">
            <h1 className="text-4xl font-bold text-dark mb-2">Checkout</h1>
            <p className="text-gray-600">
              {checkoutData
                ? 'Complete your payment to confirm your bookings'
                : 'Review your order and select a payment method'}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Order Summary */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-3xl shadow-sm p-6 sticky top-4">
                <h2 className="text-xl font-bold text-dark mb-4">Order Summary</h2>

                {/* Show cart items if available, otherwise show summary */}
                {cartItems.length > 0 ? (
                  <div className="space-y-3 mb-4">
                    {cartItems.map((item) => (
                      <div key={item.package_id} className="flex justify-between items-start pb-3 border-b border-gray-100 last:border-0">
                        <div className="flex-1 pr-2">
                          <p className="font-medium text-sm text-dark">{item.title}</p>
                          <p className="text-xs text-gray-500">by {item.creator_name}</p>
                        </div>
                        <span className="font-bold text-primary text-sm flex-shrink-0">{formatCurrency(item.price)}</span>
                      </div>
                    ))}
                  </div>
                ) : checkoutData ? (
                  <div className="mb-4">
                    <p className="text-sm text-gray-600">
                      {packageCount} package{packageCount !== 1 ? 's' : ''} — bookings created
                    </p>
                    {checkoutData.payment_reference && (
                      <p className="text-xs text-gray-500 mt-1">
                        Ref: {checkoutData.payment_reference}
                      </p>
                    )}
                  </div>
                ) : null}

                <div className="flex justify-between items-center pt-3 border-t-2 border-gray-200">
                  <span className="font-bold text-dark text-lg">Total</span>
                  <span className="font-bold text-primary text-2xl">{formatCurrency(totalAmount)}</span>
                </div>
                <p className="text-xs text-gray-500 mt-3 text-center">
                  {packageCount} package{packageCount !== 1 ? 's' : ''} · Payments held in escrow until work is complete
                </p>
              </div>
            </div>

            {/* Payment Section */}
            <div className="lg:col-span-3">
              <div className="bg-white rounded-3xl shadow-sm p-6">
                <h2 className="text-xl font-bold text-dark mb-5">Select Payment Method</h2>

                <div className="space-y-3 mb-6">
                  {/* Paynow */}
                  <label
                    className="flex items-start p-4 border-2 rounded-2xl cursor-pointer transition-colors"
                    style={{ borderColor: paymentMethod === 'paynow' ? '#c8ff09' : '#e5e7eb' }}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="paynow"
                      checked={paymentMethod === 'paynow'}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="mt-1"
                    />
                    <div className="ml-3">
                      <p className="font-semibold text-dark">Paynow</p>
                      <p className="text-sm text-gray-500 mt-0.5">
                        Pay instantly using <strong>EcoCash</strong>, <strong>Innbucks</strong>, <strong>OneMoney</strong>, <strong>Omari</strong>, <strong>Visa</strong>, or <strong>Mastercard</strong> via Paynow
                      </p>
                    </div>
                  </label>

                  {/* Bank Transfer */}
                  <label
                    className="flex items-start p-4 border-2 rounded-2xl cursor-pointer transition-colors"
                    style={{ borderColor: paymentMethod === 'bank_transfer' ? '#c8ff09' : '#e5e7eb' }}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="bank_transfer"
                      checked={paymentMethod === 'bank_transfer'}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="mt-1"
                    />
                    <div className="ml-3">
                      <p className="font-semibold text-dark">Bank Transfer</p>
                      <p className="text-sm text-gray-500 mt-0.5">
                        Transfer directly to our bank account. Requires admin verification (1–2 business days).
                      </p>
                    </div>
                  </label>
                </div>

                {/* Bank Transfer Details + POP Upload */}
                {paymentMethod === 'bank_transfer' && (
                  <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-5 mb-5">
                    <h3 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Bank Transfer Instructions
                    </h3>
                    <div className="space-y-1.5 text-sm text-blue-900 mb-4">
                      <p><strong>Bank Name:</strong> Example Bank</p>
                      <p><strong>Account Name:</strong> BantuBuzz Platform</p>
                      <p><strong>Account Number:</strong> 1234567890</p>
                      <p>
                        <strong>Reference:</strong>{' '}
                        <span className="font-mono bg-blue-100 px-2 py-0.5 rounded text-blue-800">
                          {checkoutData?.payment_reference || `CART-${user?.id || 'BRAND'}`}
                        </span>
                      </p>
                      <p><strong>Amount:</strong> {formatCurrency(totalAmount)}</p>
                    </div>
                    <p className="text-xs text-blue-700 italic mb-3">
                      Use the reference above when making your transfer so we can match your payment.
                    </p>
                    <div className="border-t border-blue-200 pt-4">
                      <label className="block text-sm font-medium text-blue-900 mb-2">
                        Upload Proof of Payment *
                      </label>
                      <input
                        type="file"
                        onChange={handleFileChange}
                        accept="image/*,.pdf"
                        className="block w-full text-sm text-gray-900 border border-blue-300 rounded-xl cursor-pointer bg-white focus:outline-none px-3 py-2"
                      />
                      <p className="text-xs text-blue-600 mt-1">Accepted: JPG, PNG, GIF, PDF (max 20MB)</p>
                      {proofFile && (
                        <p className="text-sm text-green-700 mt-2 flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          {proofFile.name}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Error message */}
                {checkoutError && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 text-sm text-red-700">
                    {checkoutError}
                  </div>
                )}

                {/* --- Paynow flow: two-step --- */}
                {paymentMethod === 'paynow' && (
                  <>
                    {/* Step 1: Not yet initialized */}
                    {!checkoutData && (
                      <button
                        onClick={initializeCartCheckout}
                        disabled={isSubmitting}
                        className="w-full bg-primary text-dark font-bold py-4 rounded-2xl hover:bg-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-lg"
                      >
                        {checkoutLoading ? (
                          <>
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-dark"></div>
                            Preparing payment...
                          </>
                        ) : (
                          <>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            Pay {formatCurrency(totalAmount)} with Paynow
                          </>
                        )}
                      </button>
                    )}

                    {/* Step 2: Initialized — show redirect button + check status */}
                    {checkoutData && (
                      <div className="space-y-3">
                        <button
                          onClick={handleProceedToPaynow}
                          className="w-full bg-primary text-dark font-bold py-4 rounded-2xl hover:bg-primary/90 transition flex items-center justify-center gap-2 text-lg"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                          Proceed to Paynow Payment
                        </button>

                        <p className="text-xs text-gray-500 text-center">
                          You'll be redirected to Paynow to complete payment securely
                        </p>

                        <div className="text-center pt-2">
                          <p className="text-sm text-gray-600 mb-2">Already completed payment on Paynow?</p>
                          <button
                            onClick={handleCheckPaymentStatus}
                            disabled={checkingStatus}
                            className="text-primary hover:text-primary/80 font-medium flex items-center gap-2 mx-auto"
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

                    <p className="text-xs text-gray-500 mt-3 text-center">
                      You'll be redirected to Paynow to complete payment securely
                    </p>
                  </>
                )}

                {/* --- Bank Transfer flow --- */}
                {paymentMethod === 'bank_transfer' && (
                  <button
                    onClick={handleBankTransfer}
                    disabled={isSubmitting || !proofFile}
                    className="w-full bg-primary text-dark font-bold py-4 rounded-2xl hover:bg-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-lg"
                  >
                    {uploading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-dark"></div>
                        Uploading proof...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        Submit Bookings & Proof of Payment
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Security Notice */}
              <div className="mt-4 p-4 bg-primary/10 border border-primary/30 rounded-2xl">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-dark mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="font-medium text-dark text-sm">Your payment is protected</p>
                    <p className="text-xs text-gray-600 mt-0.5">
                      Funds are held in escrow and only released to the creator once you approve the delivered work.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartCheckout;
