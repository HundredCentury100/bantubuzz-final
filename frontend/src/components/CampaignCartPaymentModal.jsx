import { useState, useEffect } from 'react';
import { FaTimes, FaWallet, FaUniversity, FaCreditCard, FaCheckCircle, FaMobileAlt } from 'react-icons/fa';
import { campaignsAPI } from '../services/api';
import SmilePayPaymentModal from './SmilePayPaymentModal';
import toast from 'react-hot-toast';
import BankTransferDetails from './BankTransferDetails';

const CampaignCartPaymentModal = ({
  isOpen,
  onClose,
  campaignId,
  paymentMode, // 'all', 'selected', 'individual'
  cartItemIds = [], // For selected/individual mode
  totalAmount,
  collaborationDetails = null, // NEW: Collaboration details from form
  requiresContentReview = true, // NEW: Content review preference
  onPaymentSuccess
}) => {
  const [paymentMethod, setPaymentMethod] = useState('wallet');
  const [processing, setProcessing] = useState(false);
  const [bankDetails, setBankDetails] = useState(null);
  const [proofFile, setProofFile] = useState(null);
  const [uploadingProof, setUploadingProof] = useState(false);
  const [showSmilePayModal, setShowSmilePayModal] = useState(false);
  const [campaignPaymentId, setCampaignPaymentId] = useState(null);

  const handlePayment = async () => {
    try {
      setProcessing(true);

      let response;
      const paymentData = {
        payment_method: paymentMethod,
        requires_content_review: requiresContentReview,
        collaboration_details: collaborationDetails
      };

      // Call appropriate endpoint based on payment mode
      if (paymentMode === 'all') {
        response = await campaignsAPI.payAllCart(campaignId, paymentData);
      } else if (paymentMode === 'selected') {
        response = await campaignsAPI.paySelectedCart(campaignId, {
          ...paymentData,
          cart_item_ids: cartItemIds
        });
      } else if (paymentMode === 'individual') {
        response = await campaignsAPI.payIndividualCart(campaignId, cartItemIds[0], paymentData);
      }

      if (paymentMethod === 'wallet') {
        // Wallet payment completes immediately
        if (response.data.status === 'completed' || response.data.success) {
          toast.success('Payment completed successfully!');
          if (onPaymentSuccess) onPaymentSuccess();
          onClose();
        }
      } else if (paymentMethod === 'bank_transfer') {
        setCampaignPaymentId(response.data.payment_id);
        // Show bank details
        setBankDetails(response.data.bank_details || {
          reference: response.data.payment_reference || `CART-${campaignId}-${Date.now()}`
        });
        toast.success('Bank transfer initiated. Please complete payment and upload proof.');
      } else if (paymentMethod === 'smilepay') {
        setCampaignPaymentId(response.data.payment_id);
        // SmilePay handled by modal
        setShowSmilePayModal(true);
      }

    } catch (error) {
      console.error('Payment failed:', error);
      toast.error(error.response?.data?.error || 'Payment failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handleSmilePaySuccess = (transaction) => {
    toast.success('Payment completed successfully!');
    if (onPaymentSuccess) onPaymentSuccess();
    onClose();
  };

  const handleProofUpload = async () => {
    if (!proofFile) {
      toast.error('Please select a proof of payment file');
      return;
    }
    if (!campaignPaymentId) {
      toast.error('Payment reference not found. Please start the bank transfer again.');
      return;
    }

    try {
      setUploadingProof(true);
      const formData = new FormData();
      formData.append('proof', proofFile);

      await campaignsAPI.uploadCartPaymentProof(campaignId, campaignPaymentId, formData);
      toast.success('Proof of payment uploaded. Pending admin verification.');
      if (onPaymentSuccess) onPaymentSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to upload proof:', error);
      toast.error('Failed to upload proof of payment');
    } finally {
      setUploadingProof(false);
    }
  };

  if (!isOpen) return null;

  const paymentMethods = [
    {
      id: 'wallet',
      name: 'Wallet',
      icon: FaWallet,
      description: 'Pay instantly from your BantuBuzz wallet',
      color: 'text-purple-600 bg-purple-50 border-purple-200'
    },
    {
      id: 'smilepay',
      name: 'Smile&Pay',
      icon: FaMobileAlt,
      description: 'Ecocash, Innbucks, SmileCash, Omari, Visa, or Mastercard',
      color: 'text-yellow-600 bg-yellow-50 border-yellow-200'
    },
    {
      id: 'bank_transfer',
      name: 'Bank Transfer',
      icon: FaUniversity,
      description: 'Transfer to our bank account',
      color: 'text-green-600 bg-green-50 border-green-200'
    }
  ];

  const getTitle = () => {
    if (paymentMode === 'all') return 'Pay for All Cart Items';
    if (paymentMode === 'selected') return `Pay for ${cartItemIds.length} Selected Item${cartItemIds.length > 1 ? 's' : ''}`;
    return 'Pay for Item';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{getTitle()}</h2>
            <p className="text-sm text-gray-600 mt-1">
              Complete payment to create collaborations with creators
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <FaTimes className="text-gray-500" size={20} />
          </button>
        </div>

        {/* Payment Summary */}
        <div className="p-6 border-b border-gray-200 bg-gray-50">
          <h3 className="font-semibold text-gray-900 mb-3">Payment Summary</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-lg font-bold pt-2">
              <span>Total Amount</span>
              <span className="text-primary">${totalAmount.toFixed(2)}</span>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              * Collaborations will be created and creators will be notified after successful payment
            </p>
          </div>
        </div>

        {!bankDetails ? (
          <>
            {/* Payment Method Selection */}
            <div className="p-6 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-4">Select Payment Method</h3>
              <div className="space-y-3">
                {paymentMethods.map((method) => {
                  const Icon = method.icon;
                  const isSelected = paymentMethod === method.id;

                  return (
                    <button
                      key={method.id}
                      onClick={() => setPaymentMethod(method.id)}
                      className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                        isSelected
                          ? 'border-primary bg-primary/5'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-full ${method.color}`}>
                          <Icon size={24} />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">{method.name}</h4>
                          <p className="text-sm text-gray-600">{method.description}</p>
                        </div>
                        {isSelected && (
                          <FaCheckCircle className="text-primary flex-shrink-0" size={24} />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 bg-gray-50">
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  disabled={processing}
                  className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors font-medium disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePayment}
                  disabled={processing}
                  className="flex-1 px-6 py-3 bg-primary text-white rounded-xl hover:bg-primary-dark transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {processing ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      Pay ${totalAmount.toFixed(2)}
                    </>
                  )}
                </button>
              </div>
            </div>
          </>
        ) : (
          /* Bank Transfer Instructions */
          <div className="p-6">
            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6 mb-6">
              <h3 className="font-bold text-blue-900 mb-4 flex items-center gap-2">
                <FaUniversity className="text-blue-600" />
                Bank Transfer Details
              </h3>
              <div className="text-blue-900">
                <BankTransferDetails bankDetails={bankDetails} />
              </div>
            </div>

            {/* Upload Proof */}
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 mb-6">
              <h4 className="font-semibold text-gray-900 mb-3">Upload Proof of Payment</h4>
              <p className="text-sm text-gray-600 mb-4">
                After making the transfer, upload your proof of payment (screenshot or receipt)
              </p>
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => setProofFile(e.target.files[0])}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
              {proofFile && (
                <p className="text-sm text-green-600 mt-2">
                  ✓ {proofFile.name} selected
                </p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors font-medium"
              >
                Close
              </button>
              <button
                onClick={handleProofUpload}
                disabled={!proofFile || uploadingProof}
                className="flex-1 px-6 py-3 bg-primary text-white rounded-xl hover:bg-primary-dark transition-colors font-medium disabled:opacity-50"
              >
                {uploadingProof ? 'Uploading...' : 'Upload Proof'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* SmilePay Payment Modal */}
      <SmilePayPaymentModal
        isOpen={showSmilePayModal}
        onClose={() => setShowSmilePayModal(false)}
        amount={totalAmount}
        currency="USD"
        paymentType="campaign_cart"
        paymentId={campaignPaymentId}
        itemName="Campaign Cart Payment"
        itemDescription={getTitle()}
        onSuccess={handleSmilePaySuccess}
        returnUrl={`${window.location.origin}/brand/campaigns/${campaignId}`}
        resultUrl={`${window.location.origin}/api/payments/smilepay/webhook/callback`}
      />
    </div>
  );
};

export default CampaignCartPaymentModal;
