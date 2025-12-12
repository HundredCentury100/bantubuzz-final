import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import Navbar from '../components/Navbar';

export default function CashoutRequest() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [wallet, setWallet] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    amount: '',
    payment_method: 'ecocash',
    payment_details: {
      phone_number: '',
      account_name: '',
      bank_name: '',
      account_number: '',
      branch: '',
      pickup_location: ''
    },
    notes: ''
  });

  useEffect(() => {
    fetchWalletBalance();
  }, []);

  const fetchWalletBalance = async () => {
    try {
      setLoading(true);
      const response = await api.get('/wallet/balance');
      setWallet(response.data.wallet);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load wallet balance');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: wallet?.currency || 'USD'
    }).format(amount || 0);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name in formData.payment_details) {
      setFormData({
        ...formData,
        payment_details: {
          ...formData.payment_details,
          [name]: value
        }
      });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handlePaymentMethodChange = (method) => {
    setFormData({
      ...formData,
      payment_method: method,
      payment_details: {
        phone_number: '',
        account_name: '',
        bank_name: '',
        account_number: '',
        branch: '',
        pickup_location: ''
      }
    });
  };

  const validateForm = () => {
    const amount = parseFloat(formData.amount);

    if (!amount || amount <= 0) {
      setError('Please enter a valid amount');
      return false;
    }

    if (amount > wallet.available_balance) {
      setError(`Amount cannot exceed your available balance of ${formatCurrency(wallet.available_balance)}`);
      return false;
    }

    if (amount < 10) {
      setError('Minimum cashout amount is $10');
      return false;
    }

    // Validate payment details based on method
    const { payment_details } = formData;

    switch (formData.payment_method) {
      case 'ecocash':
      case 'onemoney':
        if (!payment_details.phone_number) {
          setError('Please enter your phone number');
          return false;
        }
        if (!/^(\+263|0)[0-9]{9}$/.test(payment_details.phone_number.replace(/\s/g, ''))) {
          setError('Please enter a valid Zimbabwe phone number');
          return false;
        }
        if (!payment_details.account_name) {
          setError('Please enter the account holder name');
          return false;
        }
        break;

      case 'bank_transfer':
        if (!payment_details.bank_name) {
          setError('Please enter your bank name');
          return false;
        }
        if (!payment_details.account_number) {
          setError('Please enter your account number');
          return false;
        }
        if (!payment_details.account_name) {
          setError('Please enter the account holder name');
          return false;
        }
        break;

      case 'cash':
        if (!payment_details.pickup_location) {
          setError('Please specify your preferred pickup location');
          return false;
        }
        if (!payment_details.phone_number) {
          setError('Please enter your contact phone number');
          return false;
        }
        break;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) {
      return;
    }

    try {
      setSubmitting(true);

      // Clean up payment details - only send relevant fields
      const cleanedDetails = {};
      const { payment_details } = formData;

      switch (formData.payment_method) {
        case 'ecocash':
        case 'onemoney':
          cleanedDetails.phone_number = payment_details.phone_number;
          cleanedDetails.account_name = payment_details.account_name;
          break;

        case 'bank_transfer':
          cleanedDetails.bank_name = payment_details.bank_name;
          cleanedDetails.account_number = payment_details.account_number;
          cleanedDetails.account_name = payment_details.account_name;
          if (payment_details.branch) {
            cleanedDetails.branch = payment_details.branch;
          }
          break;

        case 'cash':
          cleanedDetails.pickup_location = payment_details.pickup_location;
          cleanedDetails.phone_number = payment_details.phone_number;
          cleanedDetails.account_name = payment_details.account_name;
          break;
      }

      const payload = {
        amount: parseFloat(formData.amount),
        payment_method: formData.payment_method,
        payment_details: cleanedDetails,
        notes: formData.notes
      };

      await api.post('/wallet/cashout', payload);

      setSuccess(true);
      setTimeout(() => {
        navigate('/wallet');
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit cashout request');
    } finally {
      setSubmitting(false);
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

  if (success) {
    return (
      <div className="min-h-screen bg-light">
        <Navbar />
        <div className="flex items-center justify-center min-h-[80vh]">
          <div className="max-w-md w-full card text-center">
            <div className="mb-4">
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-dark mb-2">Cashout Request Submitted!</h2>
            <p className="text-gray-600 mb-6">
              Your cashout request has been submitted successfully. Our admin team will process it shortly and you'll receive an email notification.
            </p>
            <button
              onClick={() => navigate('/wallet')}
              className="btn btn-primary"
            >
              Back to Wallet
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-light">
      <Navbar />

      <div className="container-custom section-padding">
        {/* Header with Back Button */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => navigate('/wallet')}
              className="flex items-center text-primary hover:text-primary-dark transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Wallet
            </button>
          </div>
          <h1 className="text-4xl font-bold text-dark mb-2">Request Cashout</h1>
          <p className="text-gray-600">Withdraw funds from your wallet</p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Available Balance Card */}
        <div className="bg-gradient-to-r from-primary to-primary-dark rounded-lg shadow-lg p-6 mb-8 text-white">
          <p className="text-sm opacity-90 mb-2">Available Balance</p>
          <p className="text-4xl font-bold">{formatCurrency(wallet?.available_balance)}</p>
          <p className="text-sm opacity-75 mt-2">Minimum withdrawal: $10.00</p>
        </div>

        {/* Cashout Form */}
        <div className="max-w-3xl">
        <form onSubmit={handleSubmit} className="card">
          {/* Amount */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cashout Amount *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-3 text-gray-500">$</span>
              <input
                type="number"
                name="amount"
                value={formData.amount}
                onChange={handleInputChange}
                step="0.01"
                min="10"
                max={wallet?.available_balance}
                className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                placeholder="0.00"
                required
              />
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Maximum: {formatCurrency(wallet?.available_balance)}
            </p>
          </div>

          {/* Payment Method */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Payment Method *
            </label>
            <div className="grid grid-cols-2 gap-4">
              {[
                { value: 'ecocash', label: 'EcoCash', icon: '📱' },
                { value: 'onemoney', label: 'OneMoney', icon: '💰' },
                { value: 'bank_transfer', label: 'Bank Transfer', icon: '🏦' },
                { value: 'cash', label: 'Cash Pickup', icon: '💵' }
              ].map((method) => (
                <button
                  key={method.value}
                  type="button"
                  onClick={() => handlePaymentMethodChange(method.value)}
                  className={`p-4 border-2 rounded-lg transition ${
                    formData.payment_method === method.value
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200 hover:border-primary/30'
                  }`}
                >
                  <div className="text-2xl mb-2">{method.icon}</div>
                  <div className="text-sm font-medium">{method.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Payment Details - EcoCash/OneMoney */}
          {(formData.payment_method === 'ecocash' || formData.payment_method === 'onemoney') && (
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  name="phone_number"
                  value={formData.payment_details.phone_number}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                  placeholder="+263 77 123 4567"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Account Holder Name *
                </label>
                <input
                  type="text"
                  name="account_name"
                  value={formData.payment_details.account_name}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                  placeholder="John Doe"
                  required
                />
              </div>
            </div>
          )}

          {/* Payment Details - Bank Transfer */}
          {formData.payment_method === 'bank_transfer' && (
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bank Name *
                </label>
                <input
                  type="text"
                  name="bank_name"
                  value={formData.payment_details.bank_name}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                  placeholder="e.g., CBZ Bank"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Account Number *
                </label>
                <input
                  type="text"
                  name="account_number"
                  value={formData.payment_details.account_number}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                  placeholder="1234567890"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Account Holder Name *
                </label>
                <input
                  type="text"
                  name="account_name"
                  value={formData.payment_details.account_name}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                  placeholder="John Doe"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Branch (Optional)
                </label>
                <input
                  type="text"
                  name="branch"
                  value={formData.payment_details.branch}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                  placeholder="e.g., Harare"
                />
              </div>
            </div>
          )}

          {/* Payment Details - Cash Pickup */}
          {formData.payment_method === 'cash' && (
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Preferred Pickup Location *
                </label>
                <input
                  type="text"
                  name="pickup_location"
                  value={formData.payment_details.pickup_location}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                  placeholder="e.g., Harare CBD Office"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contact Phone Number *
                </label>
                <input
                  type="tel"
                  name="phone_number"
                  value={formData.payment_details.phone_number}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                  placeholder="+263 77 123 4567"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Full Name *
                </label>
                <input
                  type="text"
                  name="account_name"
                  value={formData.payment_details.account_name}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                  placeholder="John Doe"
                  required
                />
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Additional Notes (Optional)
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
              placeholder="Any additional information for the admin team..."
            />
          </div>

          {/* Submit Button */}
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => navigate('/wallet')}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
        </div>
      </div>
    </div>
  );
}
