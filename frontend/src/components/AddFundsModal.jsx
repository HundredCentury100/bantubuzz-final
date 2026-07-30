import { useState } from 'react';
import { brandWalletAPI } from '../services/api';
import toast from 'react-hot-toast';
import BankTransferDetails from './BankTransferDetails';

const AddFundsModal = ({ isOpen, onClose, currentBalance, onDepositSuccess }) => {
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('paynow');
  const [proofFile, setProofFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [depositId, setDepositId] = useState(null);
  const [depositReference, setDepositReference] = useState(null);
  const [showProofUpload, setShowProofUpload] = useState(false);

  if (!isOpen) return null;

  const handleAmountChange = (e) => {
    const value = e.target.value;
    // Only allow positive numbers with up to 2 decimal places
    if (value === '' || /^\d+\.?\d{0,2}$/.test(value)) {
      setAmount(value);
    }
  };

  const handleQuickAmount = (value) => {
    setAmount(value.toString());
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB');
        return;
      }
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        toast.error('Only JPG, PNG, or PDF files are allowed');
        return;
      }
      setProofFile(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const depositAmount = parseFloat(amount);
    if (!depositAmount || depositAmount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (depositAmount < 1) {
      toast.error('Minimum deposit amount is $1');
      return;
    }

    if (paymentMethod === 'bank_transfer' && !showProofUpload && !proofFile) {
      // First step: create deposit request
      setIsSubmitting(true);
      try {
        const response = await brandWalletAPI.createDeposit({
          amount: depositAmount,
          payment_method: 'bank_transfer'
        });

        if (response.data.success) {
          setDepositId(response.data.deposit.id);
          setDepositReference(response.data.deposit.deposit_reference);
          setShowProofUpload(true);
          toast.success('Deposit request created. Please upload your proof of payment.');
        }
      } catch (error) {
        console.error('Error creating deposit:', error);
        toast.error(error.response?.data?.error || 'Failed to create deposit request');
      } finally {
        setIsSubmitting(false);
      }
    } else if (paymentMethod === 'bank_transfer' && showProofUpload && proofFile) {
      // Second step: upload proof of payment
      setIsSubmitting(true);
      try {
        const formData = new FormData();
        formData.append('file', proofFile);

        await brandWalletAPI.uploadDepositProof(depositId, formData);

        toast.success('Proof of payment uploaded successfully! Your deposit will be verified within 1-2 business days.');
        onDepositSuccess && onDepositSuccess();
        handleClose();
      } catch (error) {
        console.error('Error uploading proof:', error);
        toast.error(error.response?.data?.error || 'Failed to upload proof of payment');
      } finally {
        setIsSubmitting(false);
      }
    } else if (paymentMethod === 'paynow') {
      // Paynow payment
      setIsSubmitting(true);
      try {
        const response = await brandWalletAPI.createDeposit({
          amount: depositAmount,
          payment_method: 'paynow'
        });

        if (response.data.success && response.data.redirect_url) {
          toast.success('Redirecting to secure payment...');
          // Redirect to Paynow gateway
          window.location.href = response.data.redirect_url;
        } else {
          toast.error('Failed to initiate secure payment');
        }
      } catch (error) {
          console.error('Error initiating secure payment:', error);
        toast.error(error.response?.data?.error || 'Failed to initiate payment');
        setIsSubmitting(false);
      }
    }
  };

  const handleClose = () => {
    setAmount('');
    setPaymentMethod('paynow');
    setProofFile(null);
    setDepositId(null);
    setDepositReference(null);
    setShowProofUpload(false);
    setIsSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-dark">Add Funds to Wallet</h2>
            <button
              onClick={handleClose}
              className="text-gray-500 hover:text-gray-700 transition-colors"
              disabled={isSubmitting}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Current Balance */}
          <div className="bg-gradient-to-r from-primary/10 to-primary-dark/10 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-600 mb-1">Current Balance</p>
            <p className="text-3xl font-bold text-primary">
              ${parseFloat(currentBalance || 0).toFixed(2)}
            </p>
          </div>

          {!showProofUpload ? (
            <form onSubmit={handleSubmit}>
              {/* Amount Input */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount (USD) *
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 text-lg">
                    $
                  </span>
                  <input
                    type="text"
                    value={amount}
                    onChange={handleAmountChange}
                    placeholder="0.00"
                    className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-lg"
                    disabled={isSubmitting}
                    required
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Minimum deposit: $1.00</p>
              </div>

              {/* Quick Amount Buttons */}
              <div className="mb-6">
                <p className="text-sm text-gray-600 mb-2">Quick amounts:</p>
                <div className="grid grid-cols-4 gap-2">
                  {[10, 25, 50, 100].map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => handleQuickAmount(value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg hover:border-primary hover:bg-primary/5 transition-colors text-sm font-medium"
                      disabled={isSubmitting}
                    >
                      ${value}
                    </button>
                  ))}
                </div>
              </div>

              {/* Payment Method */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Payment Method *
                </label>
                <div className="space-y-3">
                  {/* Secure Payment Option */}
                  <label className="flex items-start p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-primary transition-colors">
                    <input
                      type="radio"
                      name="payment_method"
                      value="paynow"
                      checked={paymentMethod === 'paynow'}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="mt-1 text-primary focus:ring-primary"
                      disabled={isSubmitting}
                    />
                    <div className="ml-3 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-dark">Secure Payment</span>
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                          Instant
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        Secure Payment - all Payment Methods Accepted
                      </p>
                    </div>
                  </label>

                  {/* Bank Transfer Option */}
                  <label className="flex items-start p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-primary transition-colors">
                    <input
                      type="radio"
                      name="payment_method"
                      value="bank_transfer"
                      checked={paymentMethod === 'bank_transfer'}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="mt-1 text-primary focus:ring-primary"
                      disabled={isSubmitting}
                    />
                    <div className="ml-3 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-dark">Bank Transfer</span>
                        <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded">
                          1-2 days
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        Manual verification required
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Bank Transfer Instructions */}
              {paymentMethod === 'bank_transfer' && (
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Bank Transfer Details
                  </h4>
                  <div className="text-blue-800">
                    <BankTransferDetails reference={depositReference || 'Your email address'} compact />
                  </div>
                  <p className="text-xs text-blue-700 mt-3">
                    After making the transfer, you'll upload proof of payment on the next screen.
                  </p>
                </div>
              )}

              {/* Summary */}
              {amount && parseFloat(amount) > 0 && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-600">Deposit Amount:</span>
                    <span className="font-semibold text-dark">${parseFloat(amount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm text-gray-600 mb-2">
                    <span>Current Balance:</span>
                    <span>${parseFloat(currentBalance || 0).toFixed(2)}</span>
                  </div>
                  <div className="border-t border-gray-300 pt-2 mt-2">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-dark">New Balance:</span>
                      <span className="font-bold text-primary text-lg">
                        ${(parseFloat(currentBalance || 0) + parseFloat(amount)).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full btn btn-primary"
                disabled={isSubmitting || !amount || parseFloat(amount) <= 0}
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Processing...
                  </span>
                ) : (
                  paymentMethod === 'paynow' ? 'Continue to Secure Payment' : 'Create Deposit Request'
                )}
              </button>
            </form>
          ) : (
            // Proof Upload Screen
            <div>
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="font-semibold text-green-800 mb-1">Deposit Request Created!</p>
                    <p className="text-sm text-green-700">
                      Amount: <span className="font-semibold">${parseFloat(amount).toFixed(2)}</span>
                    </p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload Proof of Payment *
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <input
                      type="file"
                      onChange={handleFileChange}
                      accept="image/jpeg,image/jpg,image/png,application/pdf"
                      className="hidden"
                      id="proof-upload"
                      disabled={isSubmitting}
                    />
                    <label
                      htmlFor="proof-upload"
                      className="cursor-pointer inline-flex flex-col items-center"
                    >
                      <svg className="w-12 h-12 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <span className="text-sm text-gray-600">
                        {proofFile ? proofFile.name : 'Click to upload or drag and drop'}
                      </span>
                      <span className="text-xs text-gray-500 mt-1">
                        JPG, PNG or PDF (Max 5MB)
                      </span>
                    </label>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full btn btn-primary mb-3"
                  disabled={isSubmitting || !proofFile}
                >
                  {isSubmitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Uploading...
                    </span>
                  ) : (
                    'Upload & Submit'
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleClose}
                  className="w-full px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddFundsModal;
