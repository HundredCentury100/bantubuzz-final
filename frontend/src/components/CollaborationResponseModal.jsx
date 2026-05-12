import { useState } from 'react';
import { collaborationsAPI } from '../services/api';
import toast from 'react-hot-toast';
import { useSubscription } from '../contexts/SubscriptionContext';

const CollaborationResponseModal = ({ collaboration, onClose, onSuccess }) => {
  const { handle403Error } = useSubscription();
  const [action, setAction] = useState(null); // 'accept' or 'decline'
  const [declineReason, setDeclineReason] = useState('');
  const [counterOfferPrice, setCounterOfferPrice] = useState('');
  const [counterOfferNotes, setCounterOfferNotes] = useState('');
  const [showCounterOffer, setShowCounterOffer] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleAccept = async () => {
    try {
      setSubmitting(true);
      const response = await collaborationsAPI.accept(collaboration.id);

      if (response.data.success) {
        toast.success('Collaboration accepted! The brand has been notified.');
        onSuccess && onSuccess(response.data.collaboration);
      }
    } catch (error) {
      console.error('Error accepting collaboration:', error);

      // Handle subscription limit errors
      if (handle403Error(error)) {
        // Upgrade modal shown automatically
        setSubmitting(false);
        return;
      }

      toast.error(error.response?.data?.error || 'Failed to accept collaboration');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDecline = async () => {
    if (!declineReason.trim()) {
      toast.error('Please provide a reason for declining');
      return;
    }

    try {
      setSubmitting(true);

      const declineData = {
        reason: declineReason.trim()
      };

      // Add counter offer if provided
      if (showCounterOffer && counterOfferPrice) {
        declineData.counter_offer = {
          price: parseFloat(counterOfferPrice),
          notes: counterOfferNotes.trim()
        };
      }

      const response = await collaborationsAPI.decline(collaboration.id, declineData);

      if (response.data.success) {
        toast.success('Collaboration declined. The brand has been refunded to their wallet.');
        onSuccess && onSuccess(response.data.collaboration);
      }
    } catch (error) {
      console.error('Error declining collaboration:', error);
      toast.error(error.response?.data?.error || 'Failed to decline collaboration');
    } finally {
      setSubmitting(false);
    }
  };

  // Initial view - choose action
  if (!action) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-dark">Collaboration Request</h2>
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Collaboration Details */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Brand</p>
                  <p className="font-semibold text-dark">
                    {collaboration.brand?.company_name || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Amount</p>
                  <p className="font-semibold text-dark text-xl text-primary">
                    ${parseFloat(collaboration.amount || 0).toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Package</p>
                  <p className="font-semibold text-dark">
                    {collaboration.booking?.package?.title || collaboration.title || 'Package Booking'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Delivery Time</p>
                  <p className="font-semibold text-dark">
                    {collaboration.booking?.package?.duration_days || collaboration.booking?.package?.delivery_time_days || 'N/A'} days
                  </p>
                </div>
              </div>

              {(collaboration.booking?.package?.description || collaboration.description) && (
                <div className="mt-4">
                  <p className="text-sm text-gray-600 mb-1">Description</p>
                  <p className="text-dark">{collaboration.booking?.package?.description || collaboration.description}</p>
                </div>
              )}

              {collaboration.booking?.package?.deliverables && collaboration.booking.package.deliverables.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm text-gray-600 mb-2">Deliverables</p>
                  <ul className="list-disc list-inside space-y-1">
                    {collaboration.booking.package.deliverables.map((deliverable, index) => (
                      <li key={index} className="text-dark">{deliverable}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setAction('decline')}
                className="flex-1 px-6 py-3 border-2 border-red-500 text-red-500 rounded-lg hover:bg-red-50 transition-colors font-medium"
              >
                Decline
              </button>
              <button
                onClick={() => setAction('accept')}
                className="flex-1 btn btn-primary"
              >
                Accept Collaboration
              </button>
            </div>

            <p className="text-xs text-gray-500 mt-4 text-center">
              By accepting, you commit to delivering the agreed-upon deliverables within the specified timeframe.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Accept confirmation view
  if (action === 'accept') {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg max-w-lg w-full">
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-dark">Accept Collaboration</h2>
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700 transition-colors"
                disabled={submitting}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="font-semibold text-green-800 mb-1">Ready to Start?</p>
                    <p className="text-sm text-green-700">
                      You're about to accept this collaboration for <span className="font-semibold">${parseFloat(collaboration.amount || 0).toFixed(2)}</span>.
                      The brand will be notified and you can begin working on the deliverables.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <span className="font-semibold">Important:</span> By accepting, you commit to:
                </p>
                <ul className="list-disc list-inside text-sm text-blue-700 mt-2 space-y-1 ml-2">
                  <li>Delivering all agreed-upon deliverables</li>
                  <li>Meeting the {collaboration.booking?.package?.duration_days || collaboration.booking?.package?.delivery_time_days || 'specified'} day deadline</li>
                  <li>Communicating professionally with the brand</li>
                  <li>Providing {collaboration.booking?.package?.revisions_allowed || 'agreed-upon'} revisions if needed</li>
                </ul>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setAction(null)}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                disabled={submitting}
              >
                Back
              </button>
              <button
                onClick={handleAccept}
                className="flex-1 btn btn-primary"
                disabled={submitting}
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Accepting...
                  </span>
                ) : (
                  'Confirm & Accept'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Decline view
  if (action === 'decline') {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-dark">Decline Collaboration</h2>
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700 transition-colors"
                disabled={submitting}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-6">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div>
                    <p className="font-semibold text-yellow-800 mb-1">Declining Collaboration</p>
                    <p className="text-sm text-yellow-700">
                      The brand will be automatically refunded ${parseFloat(collaboration.amount || 0).toFixed(2)} to their wallet.
                    </p>
                  </div>
                </div>
              </div>

              {/* Reason for declining */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for Declining *
                </label>
                <textarea
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  placeholder="Please explain why you're declining this collaboration..."
                  rows="4"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  disabled={submitting}
                />
                <p className="text-xs text-gray-500 mt-1">
                  A clear reason helps maintain good relationships with brands
                </p>
              </div>

              {/* Counter Offer Option */}
              <div className="mb-4">
                <button
                  type="button"
                  onClick={() => setShowCounterOffer(!showCounterOffer)}
                  className="flex items-center gap-2 text-primary hover:text-primary-dark transition-colors"
                  disabled={submitting}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={showCounterOffer ? "M19 9l-7 7-7-7" : "M9 5l7 7-7 7"} />
                  </svg>
                  <span className="font-medium">
                    {showCounterOffer ? 'Hide Counter Offer' : 'Suggest a Counter Offer (Optional)'}
                  </span>
                </button>

                {showCounterOffer && (
                  <div className="mt-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
                    <p className="text-sm text-gray-600 mb-3">
                      Suggest alternative terms to the brand
                    </p>

                    <div className="mb-3">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Proposed Price (USD)
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                        <input
                          type="number"
                          value={counterOfferPrice}
                          onChange={(e) => setCounterOfferPrice(e.target.value)}
                          placeholder={parseFloat(collaboration.amount || 0).toFixed(2)}
                          min="1"
                          step="0.01"
                          className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                          disabled={submitting}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Additional Notes
                      </label>
                      <textarea
                        value={counterOfferNotes}
                        onChange={(e) => setCounterOfferNotes(e.target.value)}
                        placeholder="Explain your counter offer (e.g., adjusted deliverables, timeline, etc.)"
                        rows="3"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        disabled={submitting}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setAction(null)}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                disabled={submitting}
              >
                Back
              </button>
              <button
                onClick={handleDecline}
                className="flex-1 px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium"
                disabled={submitting || !declineReason.trim()}
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Declining...
                  </span>
                ) : (
                  'Confirm & Decline'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default CollaborationResponseModal;
