import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../hooks/useAuth';
import { bookingsAPI } from '../services/api';
import api from '../services/api';
import Navbar from '../components/Navbar';
import SmilePayPaymentModal from '../components/SmilePayPaymentModal';

const CartCheckout = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { cartItems, clearCart, getCartTotal } = useCart();

  const [paymentMethod, setPaymentMethod] = useState('smilepay');
  const [proofFile, setProofFile] = useState(null);

  // Wallet state
  const [walletBalance, setWalletBalance] = useState(0);
  const [loadingWallet, setLoadingWallet] = useState(true);

  // Cart checkout state
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutData, setCheckoutData] = useState(null); // { booking_ids, payment_reference, total }
  const [checkoutError, setCheckoutError] = useState(null);

  // Bank transfer upload
  const [uploading, setUploading] = useState(false);

  // Payment success
  const [paymentComplete, setPaymentComplete] = useState(false);

  // SmilePay modal
  const [showSmilePayModal, setShowSmilePayModal] = useState(false);

  // Collaboration details state
  const [requiresContentReview, setRequiresContentReview] = useState(true);
  const [collaborationBrief, setCollaborationBrief] = useState('');
  const [collaborationGuidelines, setCollaborationGuidelines] = useState('');
  const [collaborationRules, setCollaborationRules] = useState('');
  const [collaborationNotes, setCollaborationNotes] = useState('');

  // Fetch wallet balance on mount
  useEffect(() => {
    if (user?.user_type === 'brand') {
      fetchWalletBalance();
    } else {
      setLoadingWallet(false);
    }
  }, [user]);

  const fetchWalletBalance = async () => {
    try {
      setLoadingWallet(true);
      const response = await api.get('/brand/wallet/balance');
      if (response.data.success) {
        setWalletBalance(response.data.wallet.available_balance || 0);
      }
    } catch (error) {
      console.error('Error fetching wallet balance:', error);
      setWalletBalance(0);
    } finally {
      setLoadingWallet(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);
  };

  const validateCollaborationDetails = () => {
    if (user?.user_type !== 'brand') {
      toast.error('Only brands can book creator packages');
      navigate('/creator/dashboard');
      return false;
    }
    if (!collaborationBrief.trim()) {
      toast.error('Please describe what you want the creator to do');
      return false;
    }
    if (!collaborationGuidelines.trim()) {
      toast.error('Please provide brief and guidelines');
      return false;
    }
    return true;
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

  // Bank transfer: create bookings + upload POP
  const handleBankTransfer = async () => {
    if (!validateCollaborationDetails()) {
      return;
    }

    if (!proofFile) {
      toast.error('Please upload your proof of payment first');
      return;
    }

    // If bookings not yet created, create them via bank transfer endpoint
    if (!checkoutData) {
      setUploading(true);
      try {
        const packageIds = cartItems.map((item) => item.package_id);

        // Call bank transfer endpoint to create bookings with bank_transfer payment_method
        const checkoutResponse = await bookingsAPI.cartBankTransfer({
          package_ids: packageIds,
          requires_content_review: requiresContentReview,
          collaboration_details: {
            brief: collaborationBrief,
            guidelines: collaborationGuidelines,
            rules: collaborationRules,
            additional_notes: collaborationNotes
          }
        });
        const data = checkoutResponse.data;

        // Now upload POP
        const popFormData = new FormData();
        popFormData.append('file', proofFile);
        await bookingsAPI.cartUploadPop(data.booking_ids, popFormData);

        // Clear cart only after successful upload
        clearCart();
        toast.success('Proof of payment uploaded successfully! Awaiting admin verification (1–2 business days).');

        // Wait 2 seconds to show success message before redirecting
        setTimeout(() => {
          navigate('/brand/bookings');
        }, 2000);
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

      // Clear cart after successful upload
      clearCart();
      toast.success('Proof of payment uploaded successfully! Awaiting admin verification (1–2 business days).');

      // Wait 2 seconds to show success message before redirecting
      setTimeout(() => {
        navigate('/brand/bookings');
      }, 2000);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to upload proof of payment.');
    } finally {
      setUploading(false);
    }
  };

  // Handle wallet payment for cart
  const handleWalletPayment = async () => {
    if (!validateCollaborationDetails()) {
      return;
    }

    if (walletBalance < totalAmount) {
      toast.error('Insufficient wallet balance');
      return;
    }

    setCheckoutLoading(true);
    try {
      const packageIds = cartItems.map((item) => item.package_id);
      // Call backend endpoint to pay for cart with wallet
      const response = await bookingsAPI.cartPayWithWallet({
        package_ids: packageIds,
        requires_content_review: requiresContentReview,
        collaboration_details: {
          brief: collaborationBrief,
          guidelines: collaborationGuidelines,
          rules: collaborationRules,
          additional_notes: collaborationNotes
        }
      });

      if (response.data.success) {
        // Clear cart only after successful payment
        clearCart();
        toast.success('Payment completed successfully! Your bookings have been confirmed.');
        setPaymentComplete(true);
      }
    } catch (error) {
      console.error('Wallet payment error:', error);
      toast.error(error.response?.data?.error || 'Failed to process wallet payment');
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleOpenSmilePay = async () => {
    if (!validateCollaborationDetails()) {
      return;
    }
    setShowSmilePayModal(true);
  };

  const handleSmilePaySuccess = (transaction) => {
    clearCart();
    toast.success('Payment completed successfully! Your bookings have been confirmed.');
    setPaymentComplete(true);
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

            {/* Collaboration Details Section */}
            <div className="lg:col-span-3 mb-6">
              <div className="bg-white rounded-3xl shadow-sm p-6">
                <h2 className="text-xl font-bold text-dark mb-2">Collaboration Details</h2>
                <p className="text-sm text-gray-600 mb-5">
                  Provide instructions for the creators. They will see this immediately when the collaboration starts.
                </p>

                {/* Content Review Selection */}
                <div className="mb-6 pb-6 border-b border-gray-200">
                  <h3 className="font-semibold text-dark mb-3">Content Review</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Would you like to review content before it's posted?
                  </p>

                  <div className="space-y-3">
                    {/* Yes - Review Before Posting */}
                    <label
                      className="flex items-start gap-3 p-4 border-2 rounded-2xl cursor-pointer hover:border-primary/50 transition-colors"
                      style={{ borderColor: requiresContentReview ? '#c8ff09' : '#e5e7eb' }}
                    >
                      <input
                        type="radio"
                        name="contentReview"
                        checked={requiresContentReview === true}
                        onChange={() => setRequiresContentReview(true)}
                        className="mt-1"
                      />
                      <div>
                        <p className="font-semibold text-dark">Yes</p>
                        <p className="text-sm text-gray-600 mt-1">
                          I want to review content before it goes live.
                        </p>
                        <ul className="text-xs text-gray-500 mt-2 space-y-1 ml-4 list-disc">
                          <li>Creator submits content for review</li>
                          <li>You review — Looks Good or Request Revision</li>
                          <li>Creator posts live, submits URL, syncs metrics</li>
                          <li>You mark collaboration complete</li>
                        </ul>
                      </div>
                    </label>

                    {/* No - Trust Creator */}
                    <label
                      className="flex items-start gap-3 p-4 border-2 rounded-2xl cursor-pointer hover:border-primary/50 transition-colors"
                      style={{ borderColor: !requiresContentReview ? '#c8ff09' : '#e5e7eb' }}
                    >
                      <input
                        type="radio"
                        name="contentReview"
                        checked={requiresContentReview === false}
                        onChange={() => setRequiresContentReview(false)}
                        className="mt-1"
                      />
                      <div>
                        <p className="font-semibold text-dark">No</p>
                        <p className="text-sm text-gray-600 mt-1">
                          I trust this creator to follow the brief and guidelines.
                        </p>
                        <ul className="text-xs text-gray-500 mt-2 space-y-1 ml-4 list-disc">
                          <li>Creator posts live directly</li>
                          <li>Submits URL and syncs metrics</li>
                          <li>You mark collaboration complete</li>
                        </ul>
                      </div>
                    </label>
                  </div>

                  <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-2xl">
                    <p className="text-xs text-yellow-900">
                      <strong>Note:</strong> Selection is locked when the collaboration activates.
                    </p>
                  </div>
                </div>

                {/* Brief & Guidelines Form */}
                <div className="space-y-4">
                  {/* What do you want the creator to do? - Required */}
                  <div>
                    <label className="block text-sm font-medium text-dark mb-2">
                      What do you want the creator to do? <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={collaborationBrief}
                      onChange={(e) => setCollaborationBrief(e.target.value)}
                      placeholder="Describe what you want the creator to do in this collaboration..."
                      className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent min-h-[100px] resize-y"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Be specific about the deliverables, format, and expectations
                    </p>
                  </div>

                  {/* Brief & Guidelines - Required */}
                  <div>
                    <label className="block text-sm font-medium text-dark mb-2">
                      Brief &amp; Guidelines <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={collaborationGuidelines}
                      onChange={(e) => setCollaborationGuidelines(e.target.value)}
                      placeholder="Key messages, tone, dos and don'ts, hashtags, tags, links..."
                      className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent min-h-[120px] resize-y"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Include brand guidelines, tone of voice, required hashtags/mentions
                    </p>
                  </div>

                  {/* Rules & Expectations - Optional */}
                  <div>
                    <label className="block text-sm font-medium text-dark mb-2">
                      Rules &amp; Expectations <span className="text-gray-400">(Optional)</span>
                    </label>
                    <textarea
                      value={collaborationRules}
                      onChange={(e) => setCollaborationRules(e.target.value)}
                      placeholder="Deadlines, format, dimensions, compliance requirements..."
                      className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent min-h-[80px] resize-y"
                    />
                  </div>

                  {/* Additional Notes - Optional */}
                  <div>
                    <label className="block text-sm font-medium text-dark mb-2">
                      Additional Notes <span className="text-gray-400">(Optional)</span>
                    </label>
                    <textarea
                      value={collaborationNotes}
                      onChange={(e) => setCollaborationNotes(e.target.value)}
                      placeholder="Anything else the creator should know..."
                      className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent min-h-[80px] resize-y"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Section */}
            <div className="lg:col-span-3">
              <div className="bg-white rounded-3xl shadow-sm p-6">
                <h2 className="text-xl font-bold text-dark mb-5">Select Payment Method</h2>

                <div className="space-y-3 mb-6">
                  {/* Wallet Option - Only for brands */}
                  {user?.user_type === 'brand' && (
                    <label
                      className="flex items-start p-4 border-2 rounded-2xl cursor-pointer transition-colors"
                      style={{ borderColor: paymentMethod === 'wallet' ? '#c8ff09' : '#e5e7eb' }}
                    >
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="wallet"
                        checked={paymentMethod === 'wallet'}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="mt-1"
                        disabled={loadingWallet}
                      />
                      <div className="ml-3 flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-semibold text-dark">Wallet Balance</p>
                          {!loadingWallet && (
                            <span className={`text-sm font-semibold ${walletBalance >= totalAmount ? 'text-green-600' : 'text-red-600'}`}>
                              Available: {formatCurrency(walletBalance)}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">
                          Pay instantly using your wallet balance. {walletBalance < totalAmount && (
                            <span className="text-red-600 font-medium">Insufficient balance.</span>
                          )}
                        </p>
                        {walletBalance < totalAmount && (
                          <Link to="/brand/wallet" className="text-sm text-primary hover:text-primary/80 font-medium mt-1 inline-block">
                            Top up wallet →
                          </Link>
                        )}
                      </div>
                    </label>
                  )}

                  {/* SmilePay */}
                  <label
                    className="flex items-start p-4 border-2 rounded-2xl cursor-pointer transition-colors"
                    style={{ borderColor: paymentMethod === 'smilepay' ? '#c8ff09' : '#e5e7eb' }}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="smilepay"
                      checked={paymentMethod === 'smilepay'}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="mt-1"
                    />
                    <div className="ml-3">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-dark">Smile&Pay</p>
                        <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">Recommended</span>
                      </div>
                      <p className="text-sm text-gray-500 mt-0.5">
                        Pay with <strong>Ecocash</strong>, <strong>Innbucks</strong>, <strong>SmileCash</strong>, <strong>Omari</strong>, <strong>Visa</strong>, or <strong>Mastercard</strong>
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

                {/* --- SmilePay flow --- */}
                {paymentMethod === 'smilepay' && (
                  <button
                    onClick={handleOpenSmilePay}
                    className="w-full bg-primary text-dark font-bold py-4 rounded-2xl hover:bg-primary/90 transition flex items-center justify-center gap-2 text-lg"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    Pay {formatCurrency(totalAmount)} with Smile&Pay
                  </button>
                )}

                {/* --- Wallet flow --- */}
                {paymentMethod === 'wallet' && (
                  <button
                    onClick={handleWalletPayment}
                    disabled={isSubmitting || walletBalance < totalAmount}
                    className="w-full bg-primary text-dark font-bold py-4 rounded-2xl hover:bg-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-lg"
                  >
                    {checkoutLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-dark"></div>
                        Processing payment...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        Pay {formatCurrency(totalAmount)} with Wallet
                      </>
                    )}
                  </button>
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

      {/* SmilePay Payment Modal */}
      <SmilePayPaymentModal
        isOpen={showSmilePayModal}
        onClose={() => setShowSmilePayModal(false)}
        amount={totalAmount}
        currency="USD"
        paymentType="cart_checkout"
        paymentId={checkoutData?.booking_ids?.join(',') || 'cart'}
        itemName="Cart Checkout"
        itemDescription={`${packageCount} package${packageCount !== 1 ? 's' : ''}`}
        onSuccess={handleSmilePaySuccess}
        returnUrl={`${window.location.origin}/brand/bookings`}
        resultUrl={`${window.location.origin}/api/payments/smilepay/webhook/callback`}
      />
    </div>
  );
};

export default CartCheckout;
