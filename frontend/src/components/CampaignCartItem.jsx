import { useState } from 'react';
import Avatar from './Avatar';
import toast from 'react-hot-toast';

const CampaignCartItem = ({
  cartItem,
  onRemove,
  onPay,
  isSelected,
  onToggleSelect,
  showCheckbox = true
}) => {
  const [removing, setRemoving] = useState(false);
  const [paying, setPaying] = useState(false);

  const handleRemove = async () => {
    if (!window.confirm('Remove this item from cart?')) return;

    try {
      setRemoving(true);
      await onRemove(cartItem.id);
      toast.success('Item removed from cart');
    } catch (error) {
      console.error('Error removing cart item:', error);
      toast.error('Failed to remove item');
    } finally {
      setRemoving(false);
    }
  };

  const handlePay = async () => {
    try {
      setPaying(true);
      await onPay(cartItem.id);
    } catch (error) {
      console.error('Error processing payment:', error);
      toast.error('Payment failed');
    } finally {
      setPaying(false);
    }
  };

  const getItemTypeBadge = (type) => {
    const badges = {
      invitation: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Invitation' },
      application: { bg: 'bg-green-100', text: 'text-green-800', label: 'Application' },
      package: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Package' }
    };
    const badge = badges[type] || badges.package;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    );
  };

  const formatFollowers = (count) => {
    if (!count) return '0';
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  const { creator, package: pkg, proposal, invitation } = cartItem;

  return (
    <div className={`bg-white rounded-lg border-2 ${
      isSelected ? 'border-primary' : 'border-gray-200'
    } p-4 transition-all hover:shadow-md`}>
      <div className="flex items-start gap-4">
        {/* Checkbox */}
        {showCheckbox && (
          <div className="flex items-center pt-1">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={(e) => onToggleSelect(cartItem.id, e.target.checked)}
              className="w-5 h-5 text-primary border-gray-300 rounded focus:ring-primary"
            />
          </div>
        )}

        {/* Creator Avatar */}
        <div className="flex-shrink-0">
          <Avatar
            src={creator?.profile_picture}
            alt={creator?.display_name || creator?.username}
            size="lg"
            type="user"
          />
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {/* Creator Info & Item Type */}
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg font-semibold text-gray-900 truncate">
                  {creator?.display_name || creator?.username}
                </h3>
                {getItemTypeBadge(cartItem.item_type)}
              </div>

              {/* Creator Stats */}
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <span className="font-medium">{formatFollowers(creator?.follower_count)}</span>
                </div>
                {creator?.engagement_rate && (
                  <div className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                    <span>{(creator.engagement_rate * 100).toFixed(1)}%</span>
                  </div>
                )}
                {creator?.rating && (
                  <div className="flex items-center gap-1">
                    <svg className="w-4 h-4 text-yellow-500 fill-current" viewBox="0 0 24 24">
                      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                    </svg>
                    <span>{creator.rating.toFixed(1)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Amount */}
            <div className="text-right ml-4">
              <div className="text-2xl font-bold text-primary">
                ${parseFloat(cartItem.amount).toFixed(2)}
              </div>
              <div className="text-xs text-gray-500">
                {cartItem.currency || 'USD'}
              </div>
            </div>
          </div>

          {/* Item Details */}
          <div className="mt-3 p-3 bg-gray-50 rounded-lg">
            {cartItem.item_type === 'package' && pkg && (
              <div>
                <h4 className="font-medium text-gray-900 mb-1">{pkg.title}</h4>
                <p className="text-sm text-gray-600 mb-2">{pkg.description}</p>
                {pkg.deliverables && pkg.deliverables.length > 0 && (
                  <div className="text-sm">
                    <span className="font-medium text-gray-700">Deliverables:</span>
                    <ul className="list-disc list-inside ml-2 mt-1 text-gray-600">
                      {pkg.deliverables.slice(0, 3).map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                      {pkg.deliverables.length > 3 && (
                        <li className="text-gray-500">+{pkg.deliverables.length - 3} more</li>
                      )}
                    </ul>
                  </div>
                )}
                {pkg.duration_days && (
                  <div className="text-sm text-gray-600 mt-2">
                    <span className="font-medium">Duration:</span> {pkg.duration_days} days
                  </div>
                )}
              </div>
            )}

            {cartItem.item_type === 'application' && proposal && (
              <div>
                <h4 className="font-medium text-gray-900 mb-1">Application Accepted</h4>
                {proposal.pitch && (
                  <p className="text-sm text-gray-600 mb-2">{proposal.pitch}</p>
                )}
                {proposal.deliverables && proposal.deliverables.length > 0 && (
                  <div className="text-sm">
                    <span className="font-medium text-gray-700">Proposed Deliverables:</span>
                    <ul className="list-disc list-inside ml-2 mt-1 text-gray-600">
                      {proposal.deliverables.slice(0, 3).map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {proposal.timeline_days && (
                  <div className="text-sm text-gray-600 mt-2">
                    <span className="font-medium">Timeline:</span> {proposal.timeline_days} days
                  </div>
                )}
              </div>
            )}

            {cartItem.item_type === 'invitation' && invitation && (
              <div>
                <h4 className="font-medium text-gray-900 mb-1">
                  {invitation.invitation_type === 'invite_with_package'
                    ? 'Invited with Package'
                    : 'Invited to Apply'}
                </h4>
                {invitation.message && (
                  <p className="text-sm text-gray-600 italic">"{invitation.message}"</p>
                )}
                {invitation.package_id && pkg && (
                  <div className="mt-2 text-sm text-gray-700">
                    <span className="font-medium">Package:</span> {pkg.title}
                  </div>
                )}
                <div className="mt-2 text-sm">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    invitation.status === 'pending'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {invitation.status}
                  </span>
                </div>
              </div>
            )}

            {cartItem.notes && (
              <div className="mt-2 text-sm text-gray-600">
                <span className="font-medium">Notes:</span> {cartItem.notes}
              </div>
            )}
          </div>

          {/* Added Date */}
          <div className="mt-2 text-xs text-gray-500">
            Added {new Date(cartItem.added_at).toLocaleDateString()} at {new Date(cartItem.added_at).toLocaleTimeString()}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 ml-4">
          {/* Pay Individual Button */}
          <button
            onClick={handlePay}
            disabled={paying || removing}
            className="px-4 py-2 bg-primary hover:bg-primary-dark text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {paying ? 'Processing...' : 'Pay Now'}
          </button>

          {/* Remove Button */}
          <button
            onClick={handleRemove}
            disabled={removing || paying}
            className="px-4 py-2 border border-red-500 text-red-500 hover:bg-red-50 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {removing ? 'Removing...' : 'Remove'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CampaignCartItem;
