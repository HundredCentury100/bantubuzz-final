import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Avatar from '../components/Avatar';
import { BASE_URL } from '../services/api';
import toast from 'react-hot-toast';

const BlockedUsers = () => {
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unblocking, setUnblocking] = useState(null); // User ID being unblocked

  useEffect(() => {
    loadBlockedUsers();
  }, []);

  const loadBlockedUsers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/messaging/blocked`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (response.ok) {
        setBlockedUsers(data.blocked_users || []);
      } else {
        toast.error(data.error || 'Failed to load blocked users');
      }
    } catch (error) {
      console.error('Error loading blocked users:', error);
      toast.error('Failed to load blocked users');
    } finally {
      setLoading(false);
    }
  };

  const handleUnblock = async (userId, username) => {
    if (!window.confirm(`Are you sure you want to unblock ${username || 'this user'}?`)) {
      return;
    }

    try {
      setUnblocking(userId);
      const token = localStorage.getItem('token');

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/messaging/block/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(`${username || 'User'} unblocked successfully`);
        // Remove from list
        setBlockedUsers(blockedUsers.filter(user => user.id !== userId));
      } else {
        toast.error(data.error || 'Failed to unblock user');
      }
    } catch (error) {
      console.error('Error unblocking user:', error);
      toast.error('Failed to unblock user');
    } finally {
      setUnblocking(null);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-light">
      <Navbar />

      <div className="container-custom section-padding">
        {/* Header */}
        <div className="mb-8">
          <Link
            to="/messages"
            className="inline-flex items-center text-primary hover:text-primary-dark mb-4 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Messages
          </Link>

          <h1 className="text-4xl font-bold text-dark mb-2">Blocked Users</h1>
          <p className="text-gray-600">
            Manage users you've blocked from messaging you
          </p>
        </div>

        {/* Info Card */}
        <div className="bg-blue-50 border border-blue-200 rounded-3xl p-6 mb-8">
          <div className="flex items-start gap-3">
            <svg className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div>
              <h3 className="font-semibold text-blue-900 mb-1">About Blocking</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Blocked users cannot send you messages</li>
                <li>• They won't be notified that you blocked them</li>
                <li>• You can unblock them anytime</li>
                <li>• Existing conversations remain visible to you</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Blocked Users List */}
        {loading ? (
          <div className="bg-white rounded-3xl shadow-md p-12 text-center">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading blocked users...</p>
          </div>
        ) : blockedUsers.length === 0 ? (
          /* Empty State */
          <div className="bg-white rounded-3xl shadow-md p-12 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-dark mb-2">No Blocked Users</h3>
            <p className="text-gray-600 mb-6">
              You haven't blocked anyone yet
            </p>
            <Link
              to="/messages"
              className="inline-block btn-primary px-6 py-3"
            >
              Go to Messages
            </Link>
          </div>
        ) : (
          /* Blocked Users Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {blockedUsers.map((user) => (
              <div
                key={user.id}
                className="bg-white rounded-3xl shadow-md p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <div className="flex-shrink-0">
                    {user.profile_picture ? (
                      <img
                        src={`${BASE_URL}${user.profile_picture}`}
                        alt={user.username || user.company_name || user.email}
                        className="w-16 h-16 rounded-full object-cover"
                      />
                    ) : (
                      <Avatar
                        name={user.username || user.company_name || user.email}
                        size="lg"
                      />
                    )}
                  </div>

                  {/* User Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-dark text-lg mb-1 truncate">
                      {user.username || user.company_name || user.email}
                    </h3>
                    <p className="text-sm text-gray-500 mb-1 capitalize">
                      {user.user_type}
                    </p>
                    <p className="text-xs text-gray-400">
                      Blocked {formatDate(user.blocked_at)}
                    </p>
                  </div>
                </div>

                {/* Unblock Button */}
                <button
                  onClick={() => handleUnblock(user.id, user.username || user.company_name)}
                  disabled={unblocking === user.id}
                  className="w-full mt-4 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-dark rounded-full font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {unblocking === user.id ? (
                    <>
                      <div className="w-4 h-4 border-2 border-dark/30 border-t-dark rounded-full animate-spin"></div>
                      Unblocking...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                      </svg>
                      Unblock User
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Stats */}
        {!loading && blockedUsers.length > 0 && (
          <div className="mt-8 text-center text-sm text-gray-500">
            You have blocked {blockedUsers.length} {blockedUsers.length === 1 ? 'user' : 'users'}
          </div>
        )}
      </div>
    </div>
  );
};

export default BlockedUsers;
