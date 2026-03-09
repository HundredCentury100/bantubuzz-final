import { useState } from 'react';
import toast from 'react-hot-toast';

const BlockUserModal = ({ isOpen, onClose, user, onBlockSuccess }) => {
  const [loading, setLoading] = useState(false);

  if (!isOpen || !user) return null;

  const handleBlock = async () => {
    try {
      setLoading(true);

      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/messaging/block/${user.id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('User blocked successfully');
        onBlockSuccess?.();
        onClose();
      } else {
        toast.error(data.error || 'Failed to block user');
      }
    } catch (error) {
      console.error('Error blocking user:', error);
      toast.error('Failed to block user. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-lg max-w-md w-full p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-dark">Block User</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            {user.profile_picture ? (
              <img
                src={user.profile_picture}
                alt={user.name}
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-primary font-bold text-lg">
                  {user.name?.[0]?.toUpperCase() || 'U'}
                </span>
              </div>
            )}
            <div>
              <p className="font-semibold text-dark">{user.name || 'Unknown User'}</p>
              <p className="text-sm text-gray-600">{user.email}</p>
            </div>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-red-800 mb-2">
              <strong>When you block this user:</strong>
            </p>
            <ul className="text-sm text-red-700 space-y-1 ml-4 list-disc">
              <li>They won't be able to send you messages</li>
              <li>You won't be able to send them messages</li>
              <li>They won't be notified that you blocked them</li>
              <li>You can unblock them anytime from settings</li>
            </ul>
          </div>

          <p className="text-sm text-gray-600">
            Are you sure you want to block <strong>{user.name || 'this user'}</strong>?
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-6 py-3 bg-gray-100 text-dark rounded-full font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleBlock}
            disabled={loading}
            className="flex-1 px-6 py-3 bg-red-600 text-white rounded-full font-medium hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Blocking...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
                Block User
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BlockUserModal;
