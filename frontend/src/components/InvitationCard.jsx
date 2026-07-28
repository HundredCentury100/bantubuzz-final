import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaCheckCircle, FaTimes, FaClock, FaBuilding } from 'react-icons/fa';
import { campaignInvitationsAPI } from '../services/campaignInvitationsAPI';
import toast from 'react-hot-toast';

const InvitationCard = ({ invitation, onUpdate }) => {
  const navigate = useNavigate();
  const [accepting, setAccepting] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [responseMessage, setResponseMessage] = useState('');
  const [responseAction, setResponseAction] = useState(null); // 'accept' or 'decline'

  const handleAccept = async () => {
    try {
      setAccepting(true);
      const payload = responseMessage.trim() ? { response_message: responseMessage } : {};
      const response = await campaignInvitationsAPI.acceptInvitation(invitation.id, payload);

      toast.success('Invitation accepted!');

      // Redirect based on invitation type
      if (response.data.next_step === 'apply') {
        navigate(response.data.redirect_url);
      } else if (response.data.next_step === 'collaboration_created') {
        toast.success('Collaboration created! Redirecting to booking...');
        navigate(response.data.redirect_url || `/bookings/${response.data.collaboration_id}`);
      } else if (response.data.next_step === 'submit_proposal') {
        navigate(response.data.redirect_url);
      }

      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Failed to accept invitation:', error);
      toast.error(error.response?.data?.error || 'Failed to accept invitation');
    } finally {
      setAccepting(false);
      setShowResponseModal(false);
      setResponseMessage('');
    }
  };

  const handleDecline = async () => {
    try {
      setDeclining(true);
      const payload = responseMessage.trim() ? { response_message: responseMessage } : {};
      await campaignInvitationsAPI.declineInvitation(invitation.id, payload);
      toast.success('Invitation declined');
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Failed to decline invitation:', error);
      toast.error(error.response?.data?.error || 'Failed to decline invitation');
    } finally {
      setDeclining(false);
      setShowResponseModal(false);
      setResponseMessage('');
    }
  };

  const openResponseModal = (action) => {
    setResponseAction(action);
    setShowResponseModal(true);
  };

  const handleResponseSubmit = () => {
    if (responseAction === 'accept') {
      handleAccept();
    } else if (responseAction === 'decline') {
      handleDecline();
    }
  };

  const getInvitationTypeLabel = () => {
    // Support both old and new invitation type values
    const isJoinType = invitation.invitation_type === 'join' || invitation.invitation_type === 'invite_to_join';

    if (isJoinType) {
      return {
        label: 'Direct Invitation',
        description: 'You can join this campaign directly',
        color: 'bg-green-100 text-green-700'
      };
    }
    return {
      label: 'Invitation to Apply',
      description: 'Submit a proposal to join this campaign',
      color: 'bg-blue-100 text-blue-700'
    };
  };

  const typeInfo = getInvitationTypeLabel();

  // Calculate time remaining
  const getTimeRemaining = () => {
    if (!invitation.expires_at) return null;

    const now = new Date();
    const expiresAt = new Date(invitation.expires_at);
    const diffMs = expiresAt - now;

    if (diffMs <= 0) return 'Expired';

    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} left`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} left`;
    } else {
      return 'Expiring soon';
    }
  };

  const timeRemaining = getTimeRemaining();
  const isExpiringSoon = timeRemaining && (timeRemaining.includes('hour') || timeRemaining === 'Expiring soon');

  return (
    <div className="bg-white border-2 border-primary rounded-2xl p-6 hover:shadow-lg transition-all">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${typeInfo.color}`}>
              {typeInfo.label}
            </span>
            {timeRemaining && (
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                isExpiringSoon ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
              }`}>
                <FaClock className="inline mr-1" size={10} />
                {timeRemaining}
              </span>
            )}
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-1">
            {invitation.campaign_title}
          </h3>
          <p className="text-sm text-gray-600">{typeInfo.description}</p>
        </div>
      </div>

      {/* Brand Info */}
      <div className="flex items-center gap-3 mb-4 p-3 bg-gray-50 rounded-xl">
        {invitation.invited_by?.logo ? (
          <img
            src={invitation.invited_by.logo}
            alt={invitation.invited_by.company_name}
            className="w-12 h-12 rounded-full object-cover"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center">
            <FaBuilding className="text-gray-600" size={20} />
          </div>
        )}
        <div>
          <p className="text-sm text-gray-500">Invited by</p>
          <p className="font-semibold text-gray-900">
            {invitation.invited_by?.company_name || 'Brand'}
          </p>
        </div>
      </div>

      {/* Package Details for 'join' invitations */}
      {(invitation.invitation_type === 'join' || invitation.invitation_type === 'invite_to_join') && (
        invitation.package_details || invitation.proposed_amount
      ) && (
        <div className="mb-4 p-4 bg-green-50 rounded-xl border-l-4 border-green-500">
          <p className="text-sm font-medium text-gray-700 mb-2">Offer Details:</p>
          {invitation.package_details && (
            <div className="mb-2">
              <p className="text-sm text-gray-900 font-semibold">
                Package: {invitation.package_details.title}
              </p>
              <p className="text-xs text-gray-600">{invitation.package_details.description}</p>
            </div>
          )}
          {invitation.proposed_amount && (
            <div className="flex items-center gap-2">
              <p className="text-lg font-bold text-green-700">
                ${parseFloat(invitation.proposed_amount).toFixed(2)}
              </p>
              <p className="text-xs text-gray-600">proposed amount</p>
            </div>
          )}
        </div>
      )}

      {/* Personal Message */}
      {invitation.message && (
        <div className="mb-4 p-4 bg-primary/5 rounded-xl border-l-4 border-primary">
          <p className="text-sm font-medium text-gray-700 mb-1">Personal Message:</p>
          <p className="text-sm text-gray-900 italic">"{invitation.message}"</p>
        </div>
      )}

      {/* Invitation Date */}
      <div className="mb-4 text-xs text-gray-500">
        Invited on {new Date(invitation.invited_at).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={() => openResponseModal('decline')}
          disabled={declining || accepting}
          className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <FaTimes size={14} />
          Decline
        </button>
        <button
          onClick={() => openResponseModal('accept')}
          disabled={accepting || declining}
          className="flex-1 px-4 py-3 bg-primary text-white rounded-xl hover:bg-primary-dark transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <FaCheckCircle size={14} />
          Accept & {(invitation.invitation_type === 'join' || invitation.invitation_type === 'invite_to_join') ? 'Join' : 'Apply'}
        </button>
      </div>

      {/* View Campaign Link */}
      <button
        onClick={() => navigate(`/campaigns/${invitation.campaign_id}`)}
        className="w-full mt-3 text-sm text-primary hover:text-primary-dark font-medium"
      >
        View Campaign Details →
      </button>

      {/* Response Modal */}
      {showResponseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              {responseAction === 'accept' ? 'Accept Invitation' : 'Decline Invitation'}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              {responseAction === 'accept'
                ? 'Add an optional message to the brand (optional):'
                : 'Let the brand know why you\'re declining (optional):'}
            </p>
            <textarea
              value={responseMessage}
              onChange={(e) => setResponseMessage(e.target.value)}
              placeholder={responseAction === 'accept' ? 'Thank you for this opportunity!' : 'Reason for declining...'}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
              rows="4"
              maxLength="500"
            />
            <p className="text-xs text-gray-500 mt-1 mb-4">
              {responseMessage.length}/500 characters
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowResponseModal(false);
                  setResponseMessage('');
                }}
                disabled={accepting || declining}
                className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors font-medium disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleResponseSubmit}
                disabled={accepting || declining}
                className={`flex-1 px-4 py-3 rounded-xl transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2 ${
                  responseAction === 'accept'
                    ? 'bg-primary text-white hover:bg-primary-dark'
                    : 'bg-red-500 text-white hover:bg-red-600'
                }`}
              >
                {(accepting || declining) ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    {responseAction === 'accept' ? 'Accepting...' : 'Declining...'}
                  </>
                ) : (
                  <>
                    {responseAction === 'accept' ? <FaCheckCircle size={14} /> : <FaTimes size={14} />}
                    {responseAction === 'accept' ? 'Accept' : 'Decline'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvitationCard;
