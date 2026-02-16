import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { customPackagesAPI } from '../services/api';
import toast from 'react-hot-toast';

const CustomOfferCard = ({ message, isOwnMessage, currentUserId }) => {
  const navigate = useNavigate();
  const [offerData, setOfferData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [declineReason, setDeclineReason] = useState('');

  useEffect(() => {
    if (message.custom_offer_id) {
      loadOfferData();
    }
  }, [message.custom_offer_id]);

  const loadOfferData = async () => {
    try {
      const response = await customPackagesAPI.getOffer(message.custom_offer_id);
      setOfferData(response.data.offer);
    } catch (error) {
      console.error('Error loading offer data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    try {
      setActionLoading(true);
      const response = await customPackagesAPI.acceptOffer(offerData.id);

      if (response.data.success) {
        toast.success('Offer accepted! Redirecting to payment...');
        const bookingId = response.data.booking?.id;

        if (bookingId) {
          setTimeout(() => {
            navigate(`/payment/${bookingId}`);
          }, 1000);
        } else {
          toast.error('Booking created but ID not found');
          setTimeout(() => {
            navigate('/brand/dashboard');
          }, 1500);
        }
      }
    } catch (error) {
      console.error('Error accepting offer:', error);
      toast.error(error.response?.data?.error || 'Failed to accept offer');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDecline = async () => {
    try {
      setActionLoading(true);
      const response = await customPackagesAPI.declineOffer(offerData.id, {
        reason: declineReason
      });

      if (response.data.success) {
        toast.success('Offer declined. You can request a revised offer.');
        setShowDeclineModal(false);
        // Reload offer data to show updated status
        loadOfferData();
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
      <div className={`max-w-[85%] ${isOwnMessage ? 'ml-auto' : 'mr-auto'}`}>
        <div className="bg-white border-2 border-success/30 rounded-lg p-4 shadow-sm">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!offerData) {
    return null;
  }

  // Check if brand can accept/decline (they're the receiver and offer is pending)
  const isBrand = offerData.brand_id && message.receiver_id === currentUserId;
  const canInteract = isBrand && offerData.status === 'pending';

  return (
    <>
      <div className={`max-w-[85%] ${isOwnMessage ? 'ml-auto' : 'mr-auto'}`}>
        <div className="bg-white border-2 border-success rounded-lg shadow-md overflow-hidden">
          {/* Header */}
          <div className="bg-success/10 px-4 py-3 border-b border-success/20">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              <h3 className="font-bold text-success text-lg">Custom Package Offer</h3>
            </div>
          </div>

          {/* Content */}
          <div className="px-4 py-4 space-y-3">
            {/* Title */}
            <h4 className="text-xl font-bold text-dark">{offerData.title}</h4>

            {/* Description */}
            <p className="text-sm text-gray-700 leading-relaxed">{offerData.description}</p>

            {/* Price & Details Grid */}
            <div className="grid grid-cols-2 gap-3 py-2">
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-600 mb-1">Price</p>
                <p className="text-2xl font-bold text-success">${parseFloat(offerData.price).toFixed(2)}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-600 mb-1">Delivery</p>
                <p className="text-lg font-bold text-dark">{offerData.delivery_time_days} days</p>
              </div>
            </div>

            {/* Deliverables */}
            <div>
              <h5 className="text-sm font-semibold text-gray-700 mb-2">Deliverables:</h5>
              <ul className="space-y-1.5">
                {offerData.deliverables.map((deliverable, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                    <svg className="w-4 h-4 text-success mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>{deliverable}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Revisions */}
            <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 p-2 rounded">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>{offerData.revisions_allowed} revision{offerData.revisions_allowed !== 1 ? 's' : ''} included</span>
            </div>

            {/* Status & Actions */}
            <div className="border-t pt-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                  offerData.status === 'pending'
                    ? 'bg-yellow-100 text-yellow-800'
                    : offerData.status === 'accepted'
                    ? 'bg-green-100 text-green-800'
                    : offerData.status === 'declined'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {offerData.status === 'pending' ? 'Awaiting Response' :
                   offerData.status === 'accepted' ? 'Accepted' :
                   offerData.status === 'declined' ? 'Declined' :
                   offerData.status}
                </span>
                <span className="text-xs text-gray-500">
                  {new Date(offerData.created_at).toLocaleDateString()}
                </span>
              </div>

              {/* Action Buttons - Only show for brand when offer is pending */}
              {canInteract && (
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={handleAccept}
                    disabled={actionLoading}
                    className="flex-1 btn btn-primary py-2.5 disabled:opacity-50"
                  >
                    {actionLoading ? 'Processing...' : 'Accept & Pay'}
                  </button>
                  <button
                    onClick={() => setShowDeclineModal(true)}
                    disabled={actionLoading}
                    className="flex-1 px-4 py-2.5 border-2 border-error text-error rounded-lg hover:bg-error/10 transition-colors font-medium disabled:opacity-50"
                  >
                    Decline
                  </button>
                </div>
              )}

              {/* Declined reason */}
              {offerData.status === 'declined' && offerData.declined_reason && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-xs font-semibold text-red-800 mb-1">Decline Reason:</p>
                  <p className="text-sm text-red-700">{offerData.declined_reason}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Decline Modal */}
      {showDeclineModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-dark mb-4">Decline Offer</h3>
            <p className="text-gray-600 mb-4">
              Please provide a reason for declining this offer. This helps the creator understand what changes you'd like.
            </p>
            <textarea
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              placeholder="e.g., Price is too high, need more revisions, different deliverables needed..."
              rows="4"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeclineModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleDecline}
                disabled={actionLoading || !declineReason.trim()}
                className="flex-1 btn btn-error disabled:opacity-50"
              >
                {actionLoading ? 'Declining...' : 'Decline Offer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CustomOfferCard;
