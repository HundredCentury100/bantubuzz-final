import { useState, useEffect } from 'react';
import { FaTimes, FaSearch, FaCheckCircle, FaPaperPlane, FaUser, FaShoppingCart } from 'react-icons/fa';
import { creatorsAPI, campaignsAPI, packagesAPI } from '../services/api';
import { campaignInvitationsAPI } from '../services/campaignInvitationsAPI';
import toast from 'react-hot-toast';

const InviteCreatorsModal = ({ isOpen, onClose, campaign }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [creators, setCreators] = useState([]);
  const [packages, setPackages] = useState([]);
  const [selectedCreators, setSelectedCreators] = useState([]);
  const [invitationType, setInvitationType] = useState('apply'); // Updated default
  const [selectedPackage, setSelectedPackage] = useState(null); // For 'join' invitations
  const [proposedAmount, setProposedAmount] = useState(''); // For custom amounts
  const [personalMessage, setPersonalMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadCreators();
      if (invitationType === 'join') {
        loadPackages();
      }
    }
  }, [isOpen, invitationType]);

  const loadCreators = async () => {
    try {
      setSearchLoading(true);
      const response = await creatorsAPI.getCreators({
        per_page: 1000,
        include_without_packages: true
      });
      setCreators(response.data.creators || []);
    } catch (error) {
      console.error('Failed to load creators:', error);
      toast.error('Failed to load creators');
    } finally {
      setSearchLoading(false);
    }
  };

  const loadPackages = async () => {
    if (selectedCreators.length !== 1) {
      setPackages([]);
      setSelectedPackage(null);
      return;
    }

    try {
      const response = await packagesAPI.getPackages({
        creator_id: selectedCreators[0],
        per_page: 100
      });
      setPackages(response.data.packages || []);
    } catch (error) {
      console.error('Failed to load packages:', error);
      setPackages([]);
    }
  };

  useEffect(() => {
    if (isOpen && invitationType === 'join') {
      loadPackages();
    }
  }, [isOpen, invitationType, selectedCreators]);

  const handleSearch = (query) => {
    setSearchQuery(query);
  };

  const toggleCreatorSelection = (creatorId) => {
    setSelectedCreators(prev =>
      prev.includes(creatorId)
        ? prev.filter(id => id !== creatorId)
        : [...prev, creatorId]
    );
  };

  const handleSendInvitations = async () => {
    if (selectedCreators.length === 0) {
      toast.error('Please select at least one creator');
      return;
    }

    // Validate for 'join' type
    if (invitationType === 'join') {
      if (!selectedPackage && !proposedAmount) {
        toast.error('Please select a package or enter a proposed amount for join invitations');
        return;
      }
      if (proposedAmount && (isNaN(proposedAmount) || parseFloat(proposedAmount) <= 0)) {
        toast.error('Please enter a valid proposed amount');
        return;
      }
    }

    try {
      setSending(true);

      // For 'join' invitations, add to cart instead of sending invitation
      if (invitationType === 'join') {
        let successCount = 0;
        let failCount = 0;
        const failureMessages = [];

        for (const creatorId of selectedCreators) {
          try {
            const invitationData = {
              creator_id: creatorId,
              invitation_type: 'invite_with_package',
              message: personalMessage.trim() || null,
              expires_in_days: 7
            };

            if (selectedPackage) {
              invitationData.package_id = selectedPackage;
            }
            if (proposedAmount) {
              invitationData.proposed_amount = parseFloat(proposedAmount);
            }

            await campaignsAPI.addInvitationToCart(campaign.id, invitationData);
            successCount++;
          } catch (error) {
            console.error(`Failed to add invitation for creator ${creatorId}:`, error);
            const backendMessage = error.response?.data?.error || error.response?.data?.message;
            if (backendMessage && !failureMessages.includes(backendMessage)) {
              failureMessages.push(backendMessage);
            }
            failCount++;
          }
        }

        if (successCount > 0) {
          toast.success(`Added ${successCount} invitation(s) to cart! Go to Cart tab to complete payment.`);
        }
        if (failCount > 0) {
          toast.error(
            failureMessages.length > 0
              ? failureMessages.join('; ')
              : `Failed to add ${failCount} invitation(s) to cart`
          );
        }
      } else {
        // For 'apply' invitations, use existing flow (no payment)
        const payload = {
          campaign_id: campaign.id,
          creator_ids: selectedCreators,
          invitation_type: 'invite_to_apply',
          message: personalMessage.trim() || null,
          expires_in_days: 7
        };

        const response = await campaignInvitationsAPI.sendInvitations(payload);

        const { invitations_sent, invitations_failed } = response.data;

        if (invitations_sent.length > 0) {
          toast.success(`Successfully sent ${invitations_sent.length} invitation(s)!`);
        }

        if (invitations_failed.length > 0) {
          toast.error(`Failed to send ${invitations_failed.length} invitation(s)`);
        }
      }

      // Reset and close
      setSelectedCreators([]);
      setSelectedPackage(null);
      setProposedAmount('');
      setPersonalMessage('');
      onClose();
    } catch (error) {
      console.error('Failed to send invitations:', error);
      toast.error(error.response?.data?.error || 'Failed to send invitations');
    } finally {
      setSending(false);
    }
  };

  const filteredCreators = creators.filter(creator => {
    const query = searchQuery.toLowerCase();
    return (
      creator.display_name?.toLowerCase().includes(query) ||
      creator.username?.toLowerCase().includes(query) ||
      creator.category?.toLowerCase().includes(query) ||
      creator.location?.toLowerCase().includes(query)
    );
  });

  const formatNumber = (num) => {
    if (!num) return '0';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Invite Creators</h2>
            <p className="text-sm text-gray-600 mt-1">
              Campaign: {campaign?.title}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <FaTimes className="text-gray-500" size={20} />
          </button>
        </div>

        {/* Invitation Type Selection */}
        <div className="p-6 border-b border-gray-200 bg-gray-50">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Invitation Type
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <button
              onClick={() => setInvitationType('apply')}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                invitationType === 'apply'
                  ? 'border-primary bg-primary/5'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`mt-1 ${invitationType === 'apply' ? 'text-primary' : 'text-gray-400'}`}>
                  <FaUser size={20} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Invite to Apply</h3>
                  <p className="text-sm text-gray-600">
                    Creator reviews the campaign and submits a proposal if interested
                  </p>
                </div>
              </div>
            </button>

            <button
              onClick={() => setInvitationType('join')}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                invitationType === 'join'
                  ? 'border-primary bg-primary/5'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`mt-1 ${invitationType === 'join' ? 'text-primary' : 'text-gray-400'}`}>
                  <FaCheckCircle size={20} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Invite to Join Directly</h3>
                  <p className="text-sm text-gray-600">
                    Creator can join the campaign directly with your package/offer (pre-approved)
                  </p>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Package Selection for 'join' invitations */}
        {invitationType === 'join' && (
          <div className="p-6 border-b border-gray-200 bg-gray-50">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Package or Proposed Amount
            </label>
            <div className="space-y-3">
              {packages.length > 0 && (
                <div>
                  <label className="block text-xs text-gray-600 mb-2">Select a Package (Optional)</label>
                  <select
                    value={selectedPackage || ''}
                    onChange={(e) => setSelectedPackage(e.target.value ? parseInt(e.target.value) : null)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="">Choose a package...</option>
                    {packages.map(pkg => {
                      const price = Number(pkg.price || 0);
                      return (
                      <option key={pkg.id} value={pkg.id}>
                        {pkg.title} - ${Number.isFinite(price) ? price.toFixed(2) : '0.00'}
                      </option>
                      );
                    })}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-xs text-gray-600 mb-2">
                  Or Enter Proposed Amount (USD)
                </label>
                <input
                  type="number"
                  value={proposedAmount}
                  onChange={(e) => setProposedAmount(e.target.value)}
                  placeholder="e.g., 500.00"
                  min="0"
                  step="0.01"
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <p className="text-xs text-gray-500">
                {selectedPackage && proposedAmount
                  ? 'Proposed amount will override package price'
                  : 'Provide either a package or custom amount for the collaboration'}
              </p>
            </div>
          </div>
        )}

        {/* Personal Message */}
        <div className="p-6 border-b border-gray-200">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Personal Message (Optional)
          </label>
          <textarea
            value={personalMessage}
            onChange={(e) => setPersonalMessage(e.target.value)}
            placeholder="Add a personal message to make your invitation stand out..."
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
            rows="3"
            maxLength="500"
          />
          <p className="text-xs text-gray-500 mt-1">
            {personalMessage.length}/500 characters
          </p>
        </div>

        {/* Search Bar */}
        <div className="p-6 border-b border-gray-200">
          <div className="relative">
            <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search creators by name, category, or location..."
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
        </div>

        {/* Creators List */}
        <div className="flex-1 overflow-y-auto p-6">
          {searchLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="text-gray-600 mt-4">Loading creators...</p>
            </div>
          ) : filteredCreators.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 text-6xl mb-4">👥</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No creators found</h3>
              <p className="text-gray-600">
                {searchQuery ? 'Try adjusting your search' : 'No creators available'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredCreators.map((creator) => (
                <div
                  key={creator.id}
                  onClick={() => toggleCreatorSelection(creator.id)}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    selectedCreators.includes(creator.id)
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    {/* Checkbox */}
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                      selectedCreators.includes(creator.id)
                        ? 'bg-primary border-primary'
                        : 'border-gray-300'
                    }`}>
                      {selectedCreators.includes(creator.id) && (
                        <FaCheckCircle className="text-white" size={12} />
                      )}
                    </div>

                    {/* Profile Picture */}
                    {creator.profile_picture ? (
                      <img
                        src={creator.profile_picture}
                        alt={creator.display_name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center">
                        <span className="text-gray-600 font-bold text-lg">
                          {creator.display_name?.charAt(0) || '?'}
                        </span>
                      </div>
                    )}

                    {/* Creator Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900 truncate">
                          {creator.display_name}
                        </h3>
                        {creator.verified && (
                          <FaCheckCircle className="text-primary flex-shrink-0" size={14} />
                        )}
                      </div>
                      <p className="text-sm text-gray-600 truncate">
                        {creator.category} {creator.location && `• ${creator.location}`}
                      </p>
                    </div>

                    {/* Stats */}
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-semibold text-gray-900">
                        {formatNumber(creator.follower_count)} followers
                      </p>
                      {creator.average_rating > 0 && (
                        <p className="text-xs text-gray-600">
                          ⭐ {creator.average_rating.toFixed(1)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-600">
              {selectedCreators.length} creator{selectedCreators.length !== 1 ? 's' : ''} selected
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={sending}
              className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors font-medium disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSendInvitations}
              disabled={sending || selectedCreators.length === 0}
              className="flex-1 px-6 py-3 bg-primary text-white rounded-xl hover:bg-primary-dark transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {sending ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  {invitationType === 'join' ? 'Adding to Cart...' : 'Sending...'}
                </>
              ) : (
                <>
                  {invitationType === 'join' ? (
                    <>
                      <FaShoppingCart size={16} />
                      Add to Cart ({selectedCreators.length})
                    </>
                  ) : (
                    <>
                      <FaPaperPlane size={16} />
                      Send Invitation{selectedCreators.length > 1 ? 's' : ''}
                    </>
                  )}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InviteCreatorsModal;
