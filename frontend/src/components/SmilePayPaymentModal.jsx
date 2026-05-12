/**
 * SmilePay Payment Modal
 * Handles Ecocash, Innbucks, SmileCash, Omari, and Card payments
 * Follows BantuBuzz design philosophy: rounded-3xl, primary color, clean spacing
 */

import { useState, useEffect, useRef } from 'react';
import { smilepayAPI } from '../services/smilepayAPI';
import toast from 'react-hot-toast';

const SmilePayPaymentModal = ({
  isOpen,
  onClose,
  amount,
  currency = 'USD',
  paymentType,  // 'subscription', 'booking', 'campaign', 'cart', 'collaboration'
  paymentId,
  itemName,
  itemDescription = '',
  onSuccess,
  onFailure,
  returnUrl = '',
  resultUrl = '',
}) => {
  const [selectedMethod, setSelectedMethod] = useState('ecocash');
  const [ecocashPhone, setEcocashPhone] = useState('');
  const [smilecashPhone, setSmilecashPhone] = useState('');
  const [smilecashOtp, setSmilecashOtp] = useState('');
  const [omariPhone, setOmariPhone] = useState('');
  const [omariOtp, setOmariOtp] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiryMonth, setExpiryMonth] = useState('');
  const [expiryYear, setExpiryYear] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardholderName, setCardholderName] = useState('');
  const [processing, setProcessing] = useState(false);
  const [orderReference, setOrderReference] = useState(null);
  const [paymentCode, setPaymentCode] = useState(null); // For Innbucks
  const [polling, setPolling] = useState(false);
  const [countdown, setCountdown] = useState(120); // 2 minutes countdown
  const pollingIntervalRef = useRef(null);
  const countdownIntervalRef = useRef(null);

  // Clear intervals on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, []);

  // Start countdown when polling starts
  useEffect(() => {
    if (polling) {
      setCountdown(120);
      countdownIntervalRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            stopPolling();
            toast.error('Payment timed out. Please try again.');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    }

    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, [polling]);

  const stopPolling = () => {
    setPolling(false);
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  };

  const startPolling = (reference) => {
    setPolling(true);
    let attempts = 0;
    const maxAttempts = 40; // 2 minutes with 3-second intervals

    pollingIntervalRef.current = setInterval(async () => {
      attempts++;

      try {
        const response = await smilepayAPI.checkPaymentStatus(reference);

        if (response.data.success) {
          const status = response.data.status;

          if (status === 'PAID') {
            stopPolling();
            toast.success('Payment successful!');
            if (onSuccess) {
              onSuccess(response.data.transaction);
            }
            handleClose();
          } else if (status === 'FAILED') {
            stopPolling();
            toast.error('Payment failed. Please try again.');
            if (onFailure) {
              onFailure(response.data);
            }
          } else if (status === 'CANCELED') {
            stopPolling();
            toast.error('Payment was canceled.');
            handleClose();
          }
        }
      } catch (error) {
        console.error('Polling error:', error);
      }

      // Stop after max attempts
      if (attempts >= maxAttempts) {
        stopPolling();
        toast.error('Payment verification timed out. Please check your payment status.');
      }
    }, 3000); // Poll every 3 seconds
  };

  const handleEcocashPayment = async () => {
    // Validate phone number
    if (!ecocashPhone || ecocashPhone.length < 10) {
      toast.error('Please enter a valid Ecocash phone number');
      return;
    }

    try {
      setProcessing(true);

      const paymentData = {
        payment_type: paymentType,
        payment_id: paymentId,
        amount,
        currency,
        ecocash_mobile: ecocashPhone,
        item_name: itemName,
        item_description: itemDescription,
        return_url: returnUrl || window.location.href,
        result_url: resultUrl || `${window.location.origin}/api/payments/smilepay/webhook/callback`,
      };

      const response = await smilepayAPI.initiateEcocash(paymentData);

      if (response.data.success) {
        const reference = response.data.order_reference;
        setOrderReference(reference);
        toast.success('Check your phone for Ecocash prompt');

        // Start polling for payment status
        startPolling(reference);
      } else {
        toast.error(response.data.error || 'Failed to initiate payment');
      }
    } catch (error) {
      console.error('Ecocash payment error:', error);
      toast.error(error.response?.data?.error || 'Payment failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handleInnbucksPayment = async () => {
    try {
      setProcessing(true);

      const paymentData = {
        payment_type: paymentType,
        payment_id: paymentId,
        amount,
        currency,
        item_name: itemName,
        item_description: itemDescription,
        return_url: returnUrl || window.location.href,
        result_url: resultUrl || `${window.location.origin}/api/payments/smilepay/webhook/callback`,
      };

      const response = await smilepayAPI.initiateInnbucks(paymentData);

      if (response.data.success) {
        const reference = response.data.order_reference;
        const code = response.data.payment_code;

        setOrderReference(reference);
        setPaymentCode(code);
        toast.success('Payment code generated!');

        // Start polling for payment status
        startPolling(reference);
      } else {
        toast.error(response.data.error || 'Failed to initiate payment');
      }
    } catch (error) {
      console.error('Innbucks payment error:', error);
      toast.error(error.response?.data?.error || 'Payment failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handleSmileCashPayment = async () => {
    // Validate phone and OTP
    if (!smilecashPhone || smilecashPhone.length < 10) {
      toast.error('Please enter a valid SmileCash phone number');
      return;
    }
    if (!smilecashOtp || smilecashOtp.length < 4) {
      toast.error('Please enter your SmileCash OTP');
      return;
    }

    try {
      setProcessing(true);

      const paymentData = {
        payment_type: paymentType,
        payment_id: paymentId,
        amount,
        currency,
        smilecash_mobile: smilecashPhone,
        otp: smilecashOtp,
        item_name: itemName,
        item_description: itemDescription,
        return_url: returnUrl || window.location.href,
        result_url: resultUrl || `${window.location.origin}/api/payments/smilepay/webhook/callback`,
      };

      const response = await smilepayAPI.initiateSmileCash(paymentData);

      if (response.data.success) {
        const reference = response.data.order_reference;
        setOrderReference(reference);
        toast.success('SmileCash payment initiated');

        // Start polling for payment status
        startPolling(reference);
      } else {
        toast.error(response.data.error || 'Failed to initiate payment');
      }
    } catch (error) {
      console.error('SmileCash payment error:', error);
      toast.error(error.response?.data?.error || 'Payment failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handleOmariPayment = async () => {
    // Validate phone and OTP
    if (!omariPhone || omariPhone.length < 10) {
      toast.error('Please enter a valid Omari phone number');
      return;
    }
    if (!omariOtp || omariOtp.length < 4) {
      toast.error('Please enter your Omari OTP');
      return;
    }

    try {
      setProcessing(true);

      const paymentData = {
        payment_type: paymentType,
        payment_id: paymentId,
        amount,
        currency,
        omari_mobile: omariPhone,
        otp: omariOtp,
        item_name: itemName,
        item_description: itemDescription,
        return_url: returnUrl || window.location.href,
        result_url: resultUrl || `${window.location.origin}/api/payments/smilepay/webhook/callback`,
      };

      const response = await smilepayAPI.initiateOmari(paymentData);

      if (response.data.success) {
        const reference = response.data.order_reference;
        setOrderReference(reference);
        toast.success('Omari payment initiated');

        // Start polling for payment status
        startPolling(reference);
      } else {
        toast.error(response.data.error || 'Failed to initiate payment');
      }
    } catch (error) {
      console.error('Omari payment error:', error);
      toast.error(error.response?.data?.error || 'Payment failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handleCardPayment = async () => {
    // Validate card details
    if (!cardNumber || cardNumber.replace(/\s/g, '').length < 15) {
      toast.error('Please enter a valid card number');
      return;
    }
    if (!expiryMonth || !expiryYear) {
      toast.error('Please enter card expiry date');
      return;
    }
    if (!cvv || cvv.length < 3) {
      toast.error('Please enter CVV');
      return;
    }
    if (!cardholderName) {
      toast.error('Please enter cardholder name');
      return;
    }

    try {
      setProcessing(true);

      const paymentData = {
        payment_type: paymentType,
        payment_id: paymentId,
        amount,
        currency,
        card_number: cardNumber.replace(/\s/g, ''),
        expiry_month: expiryMonth,
        expiry_year: expiryYear,
        cvv: cvv,
        cardholder_name: cardholderName,
        item_name: itemName,
        item_description: itemDescription,
        return_url: returnUrl || window.location.href,
        result_url: resultUrl || `${window.location.origin}/api/payments/smilepay/webhook/callback`,
      };

      const response = await smilepayAPI.initiateCard(paymentData);

      if (response.data.success) {
        const reference = response.data.order_reference;
        setOrderReference(reference);

        // Check if 3D Secure is required
        if (response.data.requires_3ds && response.data.redirect_url) {
          toast.info('Redirecting to 3D Secure verification...');
          // Open 3DS in new window or iframe
          window.location.href = response.data.redirect_url;
        } else {
          toast.success('Card payment initiated');
          // Start polling for payment status
          startPolling(reference);
        }
      } else {
        toast.error(response.data.error || 'Failed to initiate payment');
      }
    } catch (error) {
      console.error('Card payment error:', error);
      toast.error(error.response?.data?.error || 'Payment failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handleSubmitPayment = () => {
    if (selectedMethod === 'ecocash') {
      handleEcocashPayment();
    } else if (selectedMethod === 'innbucks') {
      handleInnbucksPayment();
    } else if (selectedMethod === 'smilecash') {
      handleSmileCashPayment();
    } else if (selectedMethod === 'omari') {
      handleOmariPayment();
    } else if (selectedMethod === 'card') {
      handleCardPayment();
    }
  };

  const handleClose = () => {
    stopPolling();
    setEcocashPhone('');
    setSmilecashPhone('');
    setSmilecashOtp('');
    setOmariPhone('');
    setOmariOtp('');
    setCardNumber('');
    setExpiryMonth('');
    setExpiryYear('');
    setCvv('');
    setCardholderName('');
    setOrderReference(null);
    setPaymentCode(null);
    setCountdown(120);
    onClose();
  };

  const handleCancelPayment = async () => {
    if (!orderReference) return;

    try {
      await smilepayAPI.cancelPayment(orderReference);
      stopPolling();
      toast.success('Payment canceled');
      handleClose();
    } catch (error) {
      console.error('Cancel error:', error);
      toast.error('Failed to cancel payment');
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={handleClose}>
      <div
        className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between rounded-t-3xl z-10">
          <div>
            <h2 className="text-2xl font-bold text-dark">Pay with Smile&Pay</h2>
            <p className="text-sm text-gray-600 mt-1">Fast, secure mobile payments</p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            disabled={processing || polling}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          {/* Payment Summary */}
          <div className="bg-gradient-to-r from-primary to-primary-dark rounded-3xl shadow-lg p-6 mb-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90 mb-1">Amount to Pay</p>
                <p className="text-3xl font-bold">${amount.toFixed(2)}</p>
                <p className="text-sm opacity-90 mt-1">{itemName}</p>
              </div>
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
          </div>

          {!polling && !paymentCode && (
            <>
              {/* Payment Method Selection */}
              <div className="mb-6">
                <h3 className="text-lg font-bold text-dark mb-4">Select Payment Method</h3>

                <div className="space-y-3">
                  {/* Ecocash */}
                  <label
                    className={`flex items-center p-4 border-2 rounded-3xl cursor-pointer transition-colors hover:border-primary`}
                    style={{ borderColor: selectedMethod === 'ecocash' ? '#ccdb53' : '#e5e7eb' }}
                  >
                    <input
                      type="radio"
                      name="smilePayMethod"
                      value="ecocash"
                      checked={selectedMethod === 'ecocash'}
                      onChange={(e) => setSelectedMethod(e.target.value)}
                      className="mt-0.5"
                      disabled={processing}
                    />
                    <div className="ml-3 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-dark">Ecocash</span>
                        <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">Most Popular</span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        Pay instantly with your Ecocash wallet
                      </p>
                    </div>
                  </label>

                  {/* Innbucks */}
                  <label
                    className={`flex items-center p-4 border-2 rounded-3xl cursor-pointer transition-colors hover:border-primary`}
                    style={{ borderColor: selectedMethod === 'innbucks' ? '#ccdb53' : '#e5e7eb' }}
                  >
                    <input
                      type="radio"
                      name="smilePayMethod"
                      value="innbucks"
                      checked={selectedMethod === 'innbucks'}
                      onChange={(e) => setSelectedMethod(e.target.value)}
                      className="mt-0.5"
                      disabled={processing}
                    />
                    <div className="ml-3 flex-1">
                      <span className="font-semibold text-dark">Innbucks</span>
                      <p className="text-sm text-gray-600 mt-1">
                        Pay using your Innbucks digital wallet
                      </p>
                    </div>
                  </label>

                  {/* SmileCash */}
                  <label
                    className={`flex items-center p-4 border-2 rounded-3xl cursor-pointer transition-colors hover:border-primary`}
                    style={{ borderColor: selectedMethod === 'smilecash' ? '#ccdb53' : '#e5e7eb' }}
                  >
                    <input
                      type="radio"
                      name="smilePayMethod"
                      value="smilecash"
                      checked={selectedMethod === 'smilecash'}
                      onChange={(e) => setSelectedMethod(e.target.value)}
                      className="mt-0.5"
                      disabled={processing}
                    />
                    <div className="ml-3 flex-1">
                      <span className="font-semibold text-dark">SmileCash</span>
                      <p className="text-sm text-gray-600 mt-1">
                        Pay with SmileCash using OTP verification
                      </p>
                    </div>
                  </label>

                  {/* Omari */}
                  <label
                    className={`flex items-center p-4 border-2 rounded-3xl cursor-pointer transition-colors hover:border-primary`}
                    style={{ borderColor: selectedMethod === 'omari' ? '#ccdb53' : '#e5e7eb' }}
                  >
                    <input
                      type="radio"
                      name="smilePayMethod"
                      value="omari"
                      checked={selectedMethod === 'omari'}
                      onChange={(e) => setSelectedMethod(e.target.value)}
                      className="mt-0.5"
                      disabled={processing}
                    />
                    <div className="ml-3 flex-1">
                      <span className="font-semibold text-dark">Omari</span>
                      <p className="text-sm text-gray-600 mt-1">
                        Pay with Omari using OTP verification
                      </p>
                    </div>
                  </label>

                  {/* Card Payment */}
                  <label
                    className={`flex items-center p-4 border-2 rounded-3xl cursor-pointer transition-colors hover:border-primary`}
                    style={{ borderColor: selectedMethod === 'card' ? '#ccdb53' : '#e5e7eb' }}
                  >
                    <input
                      type="radio"
                      name="smilePayMethod"
                      value="card"
                      checked={selectedMethod === 'card'}
                      onChange={(e) => setSelectedMethod(e.target.value)}
                      className="mt-0.5"
                      disabled={processing}
                    />
                    <div className="ml-3 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-dark">Card Payment</span>
                        <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">Visa/Mastercard</span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        Pay securely with your Visa or Mastercard
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Payment Details Form */}
              {selectedMethod === 'ecocash' && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-dark mb-2">
                    Ecocash Phone Number *
                  </label>
                  <input
                    type="tel"
                    value={ecocashPhone}
                    onChange={(e) => setEcocashPhone(e.target.value)}
                    placeholder="e.g., 0771234567"
                    className="w-full px-4 py-3 border border-gray-300 rounded-3xl focus:ring-2 focus:ring-primary focus:border-transparent"
                    disabled={processing}
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    You'll receive a prompt on your phone to approve the payment
                  </p>
                </div>
              )}

              {selectedMethod === 'innbucks' && (
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-3xl">
                  <div className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <div className="text-sm text-blue-900">
                      <p className="font-medium mb-1">How Innbucks Payment Works:</p>
                      <ol className="list-decimal list-inside space-y-1">
                        <li>Click "Proceed to Payment" below</li>
                        <li>You'll receive a payment code</li>
                        <li>Open your Innbucks app</li>
                        <li>Enter the code to complete payment</li>
                      </ol>
                    </div>
                  </div>
                </div>
              )}

              {selectedMethod === 'smilecash' && (
                <div className="mb-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-dark mb-2">
                      SmileCash Phone Number *
                    </label>
                    <input
                      type="tel"
                      value={smilecashPhone}
                      onChange={(e) => setSmilecashPhone(e.target.value)}
                      placeholder="e.g., 0771234567"
                      className="w-full px-4 py-3 border border-gray-300 rounded-3xl focus:ring-2 focus:ring-primary focus:border-transparent"
                      disabled={processing}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-dark mb-2">
                      OTP (One-Time Password) *
                    </label>
                    <input
                      type="text"
                      value={smilecashOtp}
                      onChange={(e) => setSmilecashOtp(e.target.value)}
                      placeholder="Enter OTP"
                      className="w-full px-4 py-3 border border-gray-300 rounded-3xl focus:ring-2 focus:ring-primary focus:border-transparent"
                      disabled={processing}
                      maxLength="10"
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      Request OTP from your SmileCash app before proceeding
                    </p>
                  </div>
                </div>
              )}

              {selectedMethod === 'omari' && (
                <div className="mb-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-dark mb-2">
                      Omari Phone Number *
                    </label>
                    <input
                      type="tel"
                      value={omariPhone}
                      onChange={(e) => setOmariPhone(e.target.value)}
                      placeholder="e.g., 0771234567"
                      className="w-full px-4 py-3 border border-gray-300 rounded-3xl focus:ring-2 focus:ring-primary focus:border-transparent"
                      disabled={processing}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-dark mb-2">
                      OTP (One-Time Password) *
                    </label>
                    <input
                      type="text"
                      value={omariOtp}
                      onChange={(e) => setOmariOtp(e.target.value)}
                      placeholder="Enter OTP"
                      className="w-full px-4 py-3 border border-gray-300 rounded-3xl focus:ring-2 focus:ring-primary focus:border-transparent"
                      disabled={processing}
                      maxLength="10"
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      Request OTP from your Omari app before proceeding
                    </p>
                  </div>
                </div>
              )}

              {selectedMethod === 'card' && (
                <div className="mb-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-dark mb-2">
                      Card Number *
                    </label>
                    <input
                      type="text"
                      value={cardNumber}
                      onChange={(e) => {
                        // Format card number with spaces every 4 digits
                        const value = e.target.value.replace(/\s/g, '').replace(/(\d{4})/g, '$1 ').trim();
                        setCardNumber(value);
                      }}
                      placeholder="1234 5678 9012 3456"
                      className="w-full px-4 py-3 border border-gray-300 rounded-3xl focus:ring-2 focus:ring-primary focus:border-transparent"
                      disabled={processing}
                      maxLength="19"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-dark mb-2">
                        Month *
                      </label>
                      <input
                        type="text"
                        value={expiryMonth}
                        onChange={(e) => setExpiryMonth(e.target.value.replace(/\D/g, '').slice(0, 2))}
                        placeholder="MM"
                        className="w-full px-4 py-3 border border-gray-300 rounded-3xl focus:ring-2 focus:ring-primary focus:border-transparent"
                        disabled={processing}
                        maxLength="2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-dark mb-2">
                        Year *
                      </label>
                      <input
                        type="text"
                        value={expiryYear}
                        onChange={(e) => setExpiryYear(e.target.value.replace(/\D/g, '').slice(0, 2))}
                        placeholder="YY"
                        className="w-full px-4 py-3 border border-gray-300 rounded-3xl focus:ring-2 focus:ring-primary focus:border-transparent"
                        disabled={processing}
                        maxLength="2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-dark mb-2">
                        CVV *
                      </label>
                      <input
                        type="text"
                        value={cvv}
                        onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        placeholder="123"
                        className="w-full px-4 py-3 border border-gray-300 rounded-3xl focus:ring-2 focus:ring-primary focus:border-transparent"
                        disabled={processing}
                        maxLength="4"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-dark mb-2">
                      Cardholder Name *
                    </label>
                    <input
                      type="text"
                      value={cardholderName}
                      onChange={(e) => setCardholderName(e.target.value)}
                      placeholder="JOHN DOE"
                      className="w-full px-4 py-3 border border-gray-300 rounded-3xl focus:ring-2 focus:ring-primary focus:border-transparent uppercase"
                      disabled={processing}
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      Enter name exactly as it appears on your card
                    </p>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                onClick={handleSubmitPayment}
                disabled={
                  processing ||
                  (selectedMethod === 'ecocash' && !ecocashPhone) ||
                  (selectedMethod === 'smilecash' && (!smilecashPhone || !smilecashOtp)) ||
                  (selectedMethod === 'omari' && (!omariPhone || !omariOtp)) ||
                  (selectedMethod === 'card' && (!cardNumber || !expiryMonth || !expiryYear || !cvv || !cardholderName))
                }
                className="bg-dark hover:bg-gray-800 text-white font-medium px-6 py-3 rounded-full w-full disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
              >
                {processing ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                    Proceed to Payment
                  </>
                )}
              </button>
            </>
          )}

          {/* Innbucks Payment Code Display */}
          {paymentCode && !polling && (
            <div className="text-center">
              <div className="bg-primary/10 border-2 border-primary rounded-3xl p-8 mb-6">
                <p className="text-sm text-gray-600 mb-2">Your Innbucks Payment Code</p>
                <p className="text-5xl font-bold text-dark tracking-wider">{paymentCode}</p>
                <p className="text-sm text-gray-600 mt-4">
                  Open your Innbucks app and enter this code to complete payment
                </p>
              </div>

              <button
                onClick={() => setPolling(true)}
                className="bg-dark hover:bg-gray-800 text-white font-medium px-6 py-3 rounded-full w-full flex items-center justify-center gap-2 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                I've Entered the Code
              </button>
            </div>
          )}

          {/* Polling / Waiting State */}
          {polling && (
            <div className="text-center py-6">
              <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-gray-300 border-t-primary mb-6"></div>

              <h3 className="text-xl font-bold text-dark mb-2">Waiting for Payment...</h3>
              <p className="text-gray-600 mb-4">
                {selectedMethod === 'ecocash'
                  ? 'Please check your phone and approve the Ecocash prompt'
                  : 'Waiting for payment confirmation from Innbucks'}
              </p>

              {/* Countdown Timer */}
              <div className="bg-gray-100 rounded-3xl p-4 mb-6 inline-block">
                <p className="text-sm text-gray-600 mb-1">Time remaining</p>
                <p className="text-3xl font-bold text-dark">{formatTime(countdown)}</p>
              </div>

              {/* Order Reference */}
              {orderReference && (
                <div className="bg-light rounded-3xl p-4 mb-6">
                  <p className="text-xs text-gray-500 mb-1">Order Reference</p>
                  <p className="text-sm font-mono text-dark">{orderReference}</p>
                </div>
              )}

              <button
                onClick={handleCancelPayment}
                className="text-red-600 hover:text-red-700 font-medium flex items-center gap-2 mx-auto"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Cancel Payment
              </button>
            </div>
          )}

          {/* Security Notice */}
          <div className="mt-6 p-4 bg-light border border-gray-200 rounded-3xl">
            <div className="flex items-start gap-2">
              <svg className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <div className="text-xs text-gray-600">
                <p className="font-medium text-dark mb-1">Secure Payment</p>
                <p>All payments are processed securely through Smile&Pay. Your information is encrypted and protected.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SmilePayPaymentModal;
