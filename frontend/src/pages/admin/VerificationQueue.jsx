import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import AdminLayout from '../../components/admin/AdminLayout';
import api from '../../services/api';

export default function VerificationQueue() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all' | 'creator' | 'brand'
  const [rejectModal, setRejectModal] = useState(null); // user object
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    fetchPending();
  }, [filter]);

  const fetchPending = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ is_verified: 'false', is_active: 'true', per_page: 50 });
      if (filter !== 'all') params.set('user_type', filter);
      const res = await api.get(`/admin/users?${params}`);
      setUsers(res.data.data?.users || res.data.users || []);
    } catch (err) {
      toast.error('Failed to load verification queue');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (userId, email) => {
    setActionLoading(`approve-${userId}`);
    try {
      await api.put(`/admin/users/${userId}/verify`);
      toast.success(`${email} has been verified`);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to verify user');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      toast.error('Please provide a reason');
      return;
    }
    const user = rejectModal;
    setActionLoading(`reject-${user.id}`);
    try {
      // Deactivate with reason — user is notified
      await api.put(`/admin/users/${user.id}/deactivate`, { reason: `Verification rejected: ${rejectReason}` });
      toast.success(`Verification rejected for ${user.email}`);
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
      setRejectModal(null);
      setRejectReason('');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to reject user');
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (d) => new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  const getProfileInfo = (user) => {
    if (user.user_type === 'creator' && user.profile) {
      return {
        name: user.profile.username || 'No username',
        detail: `${user.profile.categories?.join(', ') || 'No categories'}`,
      };
    }
    if (user.user_type === 'brand' && user.profile) {
      return {
        name: user.profile.company_name || 'No company name',
        detail: user.profile.industry || 'No industry',
      };
    }
    return { name: '—', detail: '—' };
  };

  const creators = users.filter((u) => u.user_type === 'creator');
  const brands = users.filter((u) => u.user_type === 'brand');

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Verification Queue</h1>
            <p className="text-gray-500 mt-1">Review and approve creator & brand verification requests</p>
          </div>
          <div className="flex gap-2">
            {['all', 'creator', 'brand'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg text-sm capitalize transition ${
                  filter === f ? 'bg-primary text-dark font-semibold' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {f === 'all' ? `All (${users.length})` : f === 'creator' ? `Creators (${creators.length})` : `Brands (${brands.length})`}
              </button>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-gray-900">{users.length}</p>
            <p className="text-sm text-gray-500 mt-1">Total Pending</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-green-600">{creators.length}</p>
            <p className="text-sm text-gray-500 mt-1">Creators</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-blue-600">{brands.length}</p>
            <p className="text-sm text-gray-500 mt-1">Brands</p>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-16">
              <svg className="w-12 h-12 text-green-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-gray-500 font-medium">All clear! No pending verifications.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Profile</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joined</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {users.map((user) => {
                    const pInfo = getProfileInfo(user);
                    return (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-medium text-gray-900">{user.email}</p>
                            <p className="text-xs text-gray-500">ID #{user.id}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 text-xs rounded-full capitalize font-medium ${
                            user.user_type === 'creator' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {user.user_type}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm font-medium text-gray-900">{pInfo.name}</p>
                          <p className="text-xs text-gray-500 truncate max-w-xs">{pInfo.detail}</p>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {formatDate(user.created_at)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => navigate(`/admin/users/${user.id}`)}
                              className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition"
                            >
                              View Profile
                            </button>
                            <button
                              onClick={() => handleApprove(user.id, user.email)}
                              disabled={actionLoading === `approve-${user.id}`}
                              className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition disabled:opacity-50"
                            >
                              {actionLoading === `approve-${user.id}` ? '...' : 'Approve'}
                            </button>
                            <button
                              onClick={() => setRejectModal(user)}
                              className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition"
                            >
                              Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Reject Modal */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Reject Verification</h3>
            <p className="text-sm text-gray-500 mb-4">
              Rejecting <strong>{rejectModal.email}</strong>. The user will be notified with your reason.
            </p>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason *</label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              placeholder="e.g. Incomplete profile, unverifiable follower count..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent mb-4"
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setRejectModal(null); setRejectReason(''); }}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={!!actionLoading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
              >
                {actionLoading ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
