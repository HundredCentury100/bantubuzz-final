import { useState } from 'react';
import { customPackagesAPI } from '../services/api';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const CustomPackageOfferCard = ({ offer, onUpdate }) => {
  const navigate = useNavigate();
  const [accepting, setAccepting] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [declineReason, setDeclineReason] = useState('');

  const isExpired = new Date(offer.expires_at) < new Date();
  const canTakeAction = offer.status === 'pending' && !isExpired;

  const handleAccept = async () => {
    try {
      setAccepting(true);
      const response = await customPackagesAPI.acceptOffer(offer.id);

      if (response.data.success) {
        toast.success('Offer accepted! Proceeding to payment...');
        onUpdate && onUpdate();

        // Navigate to payment page with custom offer
        // TODO: Create booking from custom offer and redirect to payment
        // For now, just show success
        setTimeout(() => {
          navigate('/brand/dashboard');
        }, 1500);
      }
    } catch (error) {
      console.error('Error accepting offer:', error);
      toast.error(error.response?.data?.error || 'Failed to accept offer');
    } finally {
      setAccepting(false);
    }
  };

  const handleDecline = async () => {
    try {
      setDeclining(true);
      const response = await customPackagesAPI.declineOffer(offer.id, {
        reason: declineReason
      });

      if (response.data.success) {
        toast.success('Offer declined');
        setShowDeclineModal(false);
        onUpdate && onUpdate();
      }
    } catch (error) {
      console.error('Error declining offer:', error);
      toast.error(error.response?.data?.error || 'Failed to decline offer');
    } finally {
      setDeclining(false);
    }
  };

  return (
    <>
      <div className="bg-white rounded-lg shadow-md border-l-4 border-primary">
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1">
              <h3 className="text-xl font-bold text-dark mb-1">{offer.title}</h3>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span>From: {offer.creator?.display_name || offer.creator?.username}</span>
                <span>•</span>
                <span>{new Date(offer.created_at).toLocaleDateString()}</span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                offer.status === 'accepted' ? 'bg-success/20 text-success' :
                offer.status === 'declined' ? 'bg-error/20 text-error' :
                offer.status === 'pending' ? 'bg-warning/20 text-warning' :
                'bg-gray-200 text-gray-600'
              }`}>
                {offer.status.charAt(0).toUpperCase() + offer.status.slice(1)}
              </span>
              {isExpired && offer.status === 'pending' && (
                <span className="text-xs text-error font-medium">Expired</span>
              )}
            </div>
          </div>

          <p className="text-gray-700 mb-4">{offer.description}</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
            <div>
              <h4 className="font-semibold text-dark mb-2 flex items-center gap-2">
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                Deliverables
              </h4>
              <ul className="space-y-1">
                {offer.deliverables?.map((d, i) => (
                  <li key={i} className="flex items-start gap-2 text-gray-600">
                    <svg className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>{d}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-light rounded-lg">
                <span className="font-medium text-gray-700">Price:</span>
                <span className="text-2xl font-bold text-primary">${offer.price}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-light rounded-lg">
                <span className="font-medium text-gray-700">Delivery:</span>
                <span className="text-gray-600">{offer.delivery_time_days} days</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-light rounded-lg">
                <span className="font-medium text-gray-700">Revisions:</span>
                <span className="text-gray-600">{offer.revisions_allowed}</span>
              </div>
            </div>
          </div>

          {offer.expires_at && (
            <div className="mb-4 p-3 bg-warning/10 border border-warning/30 rounded-lg">
              <p className="text-sm text-warning-dark flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {isExpired ? 'Expired on' : 'Expires on'}: {new Date(offer.expires_at).toLocaleDateString()}
              </p>
            </div>
          )}

          {offer.status === 'declined' && offer.declined_reason && (
            <div className="mb-4 p-3 bg-error/10 border border-error/30 rounded-lg">
              <p className="text-sm font-medium text-error mb-1">Decline Reason:</p>
              <p className="text-sm text-gray-700">{offer.declined_reason}</p>
            </div>
          )}

          {canTakeAction && (
            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200">
              <button
                onClick={() => setShowDeclineModal(true)}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                disabled={accepting || declining}
              >
                Decline Offer
              </button>
              <button
                onClick={handleAccept}
                className="flex-1 btn btn-primary"
                disabled={accepting || declining}
              >
                {accepting ? 'Processing...' : 'Accept & Pay'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Decline Modal */}
      {showDeclineModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-dark mb-4">Decline Offer</h3>
            <p className="text-gray-600 mb-4">
              Would you like to provide a reason for declining this offer? This will help the creator understand your decision.
            </p>
            <textarea
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              placeholder="Optional: Let the creator know why you're declining..."
              rows="4"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent mb-4"
            />
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setShowDeclineModal(false)}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                disabled={declining}
              >
                Cancel
              </button>
              <button
                onClick={handleDecline}
                className="flex-1 px-6 py-3 bg-error text-white rounded-lg hover:bg-error-dark transition-colors"
                disabled={declining}
              >
                {declining ? 'Declining...' : 'Decline Offer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CustomPackageOfferCard;
