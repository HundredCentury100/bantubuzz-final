import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { customPackagesAPI } from '../services/api';
import CustomOfferModal from './CustomOfferModal';
import toast from 'react-hot-toast';

const CustomPackageMessage = ({ message, isOwnMessage, currentUserId }) => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const isRequest = message.message_type === 'custom_request';
  const isOffer = message.message_type === 'custom_offer';

  useEffect(() => {
    loadData();
  }, [message.custom_request_id, message.custom_offer_id]);

  const loadData = async () => {
    try {
      if (isRequest && message.custom_request_id) {
        const response = await customPackagesAPI.getRequest(message.custom_request_id);
        setData(response.data.request);
      } else if (isOffer && message.custom_offer_id) {
        const response = await customPackagesAPI.getOffer(message.custom_offer_id);
        setData(response.data.offer);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptOffer = async () => {
    try {
      setActionLoading(true);
      const response = await customPackagesAPI.acceptOffer(data.id);

      if (response.data.success) {
        toast.success('Offer accepted! Redirecting to payment...');
        const bookingId = response.data.booking?.id;
        if (bookingId) {
          setTimeout(() => navigate(`/bookings/${bookingId}/payment`), 1000);
        }
      }
    } catch (error) {
      console.error('Error accepting offer:', error);
      toast.error(error.response?.data?.error || 'Failed to accept offer');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeclineOffer = async () => {
    try {
      setActionLoading(true);
      const response = await customPackagesAPI.declineOffer(data.id, { reason: declineReason });

      if (response.data.success) {
        toast.success('Offer declined');
        setShowDeclineModal(false);
        loadData();
      }
    } catch (error) {
      console.error('Error declining offer:', error);
      toast.error(error.response?.data?.error || 'Failed to decline offer');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-[#1F2937] text-white rounded-lg p-4 shadow-lg max-w-[85%] mx-auto my-3">
        <div className="animate-pulse">
          <div className="h-4 bg-white/20 rounded w-3/4 mb-2"></div>
          <div className="h-3 bg-white/20 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <>
      <div className="bg-[#1F2937] text-white rounded-lg shadow-md max-w-[70%] mx-auto my-2 overflow-hidden">
        {/* Greeting */}
        <div className="px-3 py-2 text-center border-b border-white/10">
          <p className="text-xs leading-relaxed">{message.content}</p>
        </div>

        {/* REQUEST CARD */}
        {isRequest && (
          <div className="p-3 space-y-2">
            <div className="flex items-center gap-1.5 mb-2">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="text-sm font-bold">Custom Package Request</h3>
            </div>

            {/* Budget */}
            <div className="bg-white/10 rounded-md p-2 flex justify-between items-center">
              <span className="text-xs opacity-90">Budget</span>
              <span className="text-lg font-bold text-white">${parseFloat(data.budget).toFixed(2)}</span>
            </div>

            {/* Deliverables */}
            <div>
              <h4 className="text-xs font-semibold opacity-90 mb-1">Expected Deliverables:</h4>
              <ul className="space-y-1">
                {data.expected_deliverables.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-1.5 text-xs">
                    <span className="text-white mt-0.5">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Notes */}
            {data.additional_notes && (
              <div className="bg-white/5 rounded-md p-2">
                <h4 className="text-xs font-semibold opacity-75 mb-0.5">Additional Notes:</h4>
                <p className="text-xs opacity-90">{data.additional_notes}</p>
              </div>
            )}

            {/* CREATE OFFER BUTTON - For creator */}
            {!isOwnMessage && data.status === 'pending' && (
              <button
                onClick={() => setShowOfferModal(true)}
                className="w-full bg-primary hover:bg-primary/90 text-dark font-bold py-3 px-4 rounded-lg transition-all transform hover:scale-105 mt-2 text-sm shadow-lg"
              >
                💼 Create Your Custom Offer
              </button>
            )}
          </div>
        )}

        {/* OFFER CARD */}
        {isOffer && (
          <div className="p-3 space-y-2">
            <div className="flex items-center gap-1.5 mb-2">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <h3 className="text-sm font-bold">Custom Package Offer</h3>
            </div>

            <h4 className="text-base font-bold">{data.title}</h4>
            <p className="text-xs opacity-90 leading-relaxed">{data.description}</p>

            {/* Price & Delivery Grid */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white/10 rounded-md p-2 text-center">
                <p className="text-xs opacity-75 mb-0.5">Price</p>
                <p className="text-lg font-bold text-white">${parseFloat(data.price).toFixed(2)}</p>
              </div>
              <div className="bg-white/10 rounded-md p-2 text-center">
                <p className="text-xs opacity-75 mb-0.5">Delivery</p>
                <p className="text-sm font-bold">{data.delivery_time_days} days</p>
              </div>
            </div>

            {/* Deliverables */}
            <div>
              <h5 className="text-xs font-semibold opacity-90 mb-1">Deliverables:</h5>
              <ul className="space-y-1">
                {data.deliverables.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-1.5 text-xs">
                    <span className="text-white mt-0.5">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex items-center gap-1.5 text-xs opacity-75 bg-white/5 p-1.5 rounded">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>{data.revisions_allowed} revision{data.revisions_allowed !== 1 ? 's' : ''} included</span>
            </div>

            {/* ACCEPT/DECLINE BUTTONS - For brand */}
            {!isOwnMessage && data.status === 'pending' && (
              <div className="flex flex-col items-center gap-3 pt-3 border-t border-white/10">
                {/* Prominent Accept Button - Encourages action */}
                <button
                  onClick={handleAcceptOffer}
                  disabled={actionLoading}
                  className="w-full bg-primary hover:bg-primary/90 text-dark font-bold py-3 px-4 rounded-lg transition-all transform hover:scale-105 disabled:opacity-50 text-sm shadow-lg"
                >
                  {actionLoading ? 'Processing...' : '✓ Accept & Proceed to Payment'}
                </button>

                {/* Subtle Decline Link - Discourages action */}
                <button
                  onClick={() => setShowDeclineModal(true)}
                  disabled={actionLoading}
                  className="text-xs text-gray-400 hover:text-gray-300 underline transition-colors disabled:opacity-50"
                >
                  Don't like this package?
                </button>
              </div>
            )}

            {/* Declined reason */}
            {data.status === 'declined' && data.declined_reason && (
              <div className="bg-error/20 border border-error/50 rounded-lg p-3">
                <p className="text-xs font-semibold mb-1">Decline Reason:</p>
                <p className="text-sm">{data.declined_reason}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Offer Modal */}
      {showOfferModal && (
        <CustomOfferModal
          requestId={data.id}
          requestData={data}
          onClose={() => setShowOfferModal(false)}
          onSuccess={() => {
            setShowOfferModal(false);
            loadData();
          }}
        />
      )}

      {/* Decline Modal */}
      {showDeclineModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-dark mb-4">Decline Offer</h3>
            <p className="text-gray-600 mb-4">
              Please provide a reason for declining this offer.
            </p>
            <textarea
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              placeholder="e.g., Price is too high, need more revisions..."
              rows="4"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeclineModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleDeclineOffer}
                disabled={actionLoading || !declineReason.trim()}
                className="flex-1 bg-error hover:bg-error/90 text-white font-bold py-2 rounded-lg disabled:opacity-50"
              >
                {actionLoading ? 'Declining...' : 'Decline'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CustomPackageMessage;
