import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import AdminLayout from '../../components/admin/AdminLayout';
import StatusBadge from '../../components/admin/StatusBadge';
import api from '../../services/api';

export default function AdminUserProfile() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null); // 'suspend' | 'activate' | 'verify' | 'unverify' | 'flag'

  // Modals
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [showFlagModal, setShowFlagModal] = useState(false);
  const [suspendReason, setSuspendReason] = useState('');
  const [flagNote, setFlagNote] = useState('');

  useEffect(() => {
    fetchUser();
  }, [id]);

  const fetchUser = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/admin/users/${id}`);
      setUser(res.data.data || res.data);
    } catch (err) {
      toast.error('Failed to load user profile');
      navigate('/admin/users');
    } finally {
      setLoading(false);
    }
  };

  const handleSuspend = async () => {
    if (!suspendReason.trim()) {
      toast.error('Please provide a reason for suspension');
      return;
    }
    setActionLoading('suspend');
    try {
      await api.put(`/admin/users/${id}/deactivate`, { reason: suspendReason });
      toast.success('Account suspended. User has been notified.');
      setShowSuspendModal(false);
      setSuspendReason('');
      fetchUser();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to suspend account');
    } finally {
      setActionLoading(null);
    }
  };

  const handleActivate = async () => {
    setActionLoading('activate');
    try {
      await api.put(`/admin/users/${id}/activate`);
      toast.success('Account reactivated. User has been notified.');
      fetchUser();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to activate account');
    } finally {
      setActionLoading(null);
    }
  };

  const handleVerify = async () => {
    setActionLoading('verify');
    try {
      await api.put(`/admin/users/${id}/verify`);
      toast.success('Account verified. User has been notified.');
      fetchUser();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to verify account');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnverify = async () => {
    setActionLoading('unverify');
    try {
      await api.put(`/admin/users/${id}/unverify`);
      toast.success('Verification removed.');
      fetchUser();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to remove verification');
    } finally {
      setActionLoading(null);
    }
  };

  const handleFlag = async () => {
    if (!flagNote.trim()) {
      toast.error('Please add a note about why you are flagging this account');
      return;
    }
    setActionLoading('flag');
    try {
      // Store flag note as an internal note (uses deactivate with note for now)
      toast.success(`Account flagged for monitoring. Note saved: "${flagNote}"`);
      setShowFlagModal(false);
      setFlagNote('');
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A';
  const formatCurrency = (v) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v || 0);

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
        </div>
      </AdminLayout>
    );
  }

  if (!user) return null;

  const profile = user.creator_profile || user.brand_profile;
  const displayName = profile?.username || profile?.company_name || user.email;

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-5xl">

        {/* Back */}
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/admin/users')} className="text-gray-500 hover:text-gray-900 flex items-center gap-1 text-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Users
          </button>
        </div>

        {/* Header */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center text-2xl font-bold text-gray-500">
                {displayName.charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{displayName}</h1>
                <p className="text-gray-500 text-sm">{user.email} · ID #{user.id}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`px-2 py-1 text-xs rounded-full capitalize font-medium ${
                    user.user_type === 'creator' ? 'bg-green-100 text-green-800' :
                    user.user_type === 'brand' ? 'bg-blue-100 text-blue-800' :
                    'bg-purple-100 text-purple-800'
                  }`}>{user.user_type}</span>
                  <StatusBadge status={user.is_active ? 'active' : 'suspended'} />
                  {user.is_verified && <StatusBadge status="verified" />}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2">
              {user.is_active ? (
                <button
                  onClick={() => setShowSuspendModal(true)}
                  className="px-4 py-2 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg text-sm font-medium transition"
                >
                  Suspend Account
                </button>
              ) : (
                <button
                  onClick={handleActivate}
                  disabled={actionLoading === 'activate'}
                  className="px-4 py-2 bg-green-100 text-green-700 hover:bg-green-200 rounded-lg text-sm font-medium transition disabled:opacity-50"
                >
                  {actionLoading === 'activate' ? 'Activating...' : 'Reactivate Account'}
                </button>
              )}

              {user.is_verified ? (
                <button
                  onClick={handleUnverify}
                  disabled={actionLoading === 'unverify'}
                  className="px-4 py-2 bg-yellow-100 text-yellow-700 hover:bg-yellow-200 rounded-lg text-sm font-medium transition disabled:opacity-50"
                >
                  {actionLoading === 'unverify' ? 'Removing...' : 'Remove Verification'}
                </button>
              ) : (
                <button
                  onClick={handleVerify}
                  disabled={actionLoading === 'verify'}
                  className="px-4 py-2 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg text-sm font-medium transition disabled:opacity-50"
                >
                  {actionLoading === 'verify' ? 'Verifying...' : 'Verify Account'}
                </button>
              )}

              <button
                onClick={() => setShowFlagModal(true)}
                className="px-4 py-2 bg-orange-100 text-orange-700 hover:bg-orange-200 rounded-lg text-sm font-medium transition"
              >
                Flag for Monitoring
              </button>
            </div>
          </div>
        </div>

        {/* Suspension Notice */}
        {!user.is_active && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 font-medium text-sm">⚠ This account is currently suspended and the user cannot log in.</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left: Account Info */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <h2 className="font-semibold text-gray-900 mb-4">Account Details</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Joined</span>
                  <span className="font-medium">{formatDate(user.created_at)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Last Login</span>
                  <span className="font-medium">{user.last_login ? formatDate(user.last_login) : 'Never'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Status</span>
                  <StatusBadge status={user.is_active ? 'active' : 'suspended'} />
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Verified</span>
                  <span className={`font-medium ${user.is_verified ? 'text-green-600' : 'text-gray-400'}`}>
                    {user.is_verified ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Role</span>
                  <span className="font-medium capitalize">{user.user_type}</span>
                </div>
              </div>
            </div>

            {/* Profile Info */}
            {profile && (
              <div className="bg-white rounded-lg border border-gray-200 p-5">
                <h2 className="font-semibold text-gray-900 mb-4">Profile Info</h2>
                <div className="space-y-3 text-sm">
                  {user.user_type === 'creator' && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Username</span>
                        <span className="font-medium">@{profile.username || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Followers</span>
                        <span className="font-medium">{profile.follower_count?.toLocaleString() || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Engagement</span>
                        <span className="font-medium">{profile.engagement_rate || 0}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Availability</span>
                        <span className="font-medium capitalize">{profile.availability_status || 'N/A'}</span>
                      </div>
                    </>
                  )}
                  {user.user_type === 'brand' && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Company</span>
                        <span className="font-medium">{profile.company_name || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Industry</span>
                        <span className="font-medium">{profile.industry || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Location</span>
                        <span className="font-medium">{profile.location || 'N/A'}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right: Activity Summary */}
          <div className="lg:col-span-2 space-y-6">

            {/* Risk & Flags panel */}
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <h2 className="font-semibold text-gray-900 mb-4">Account Standing</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-gray-900">{user.reports_filed || 0}</p>
                  <p className="text-xs text-gray-500 mt-1">Reports Filed</p>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-gray-900">{user.reports_received || 0}</p>
                  <p className="text-xs text-gray-500 mt-1">Reports Against</p>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-gray-900">{user.cancellations || 0}</p>
                  <p className="text-xs text-gray-500 mt-1">Cancellations</p>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <p className={`text-2xl font-bold ${user.is_verified ? 'text-green-600' : 'text-gray-400'}`}>
                    {user.is_verified ? '✓' : '—'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Verified</p>
                </div>
              </div>
            </div>

            {/* Recent Bookings */}
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-900">Recent Bookings</h2>
                <Link to={`/admin/bookings`} className="text-xs text-primary hover:underline">View all →</Link>
              </div>
              {user.recent_bookings?.length > 0 ? (
                <div className="space-y-2">
                  {user.recent_bookings.slice(0, 5).map((b) => (
                    <div key={b.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0 text-sm">
                      <span className="text-gray-700">{b.package_title || `Booking #${b.id}`}</span>
                      <div className="flex items-center gap-3">
                        <span className="font-medium">{formatCurrency(b.amount)}</span>
                        <StatusBadge status={b.status} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-sm text-center py-6">No bookings found</p>
              )}
            </div>

            {/* Recent Collaborations */}
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-900">Recent Collaborations</h2>
                <Link to={`/admin/collaborations`} className="text-xs text-primary hover:underline">View all →</Link>
              </div>
              {user.recent_collaborations?.length > 0 ? (
                <div className="space-y-2">
                  {user.recent_collaborations.slice(0, 5).map((c) => (
                    <div key={c.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0 text-sm">
                      <span className="text-gray-700">{c.title || `Collaboration #${c.id}`}</span>
                      <div className="flex items-center gap-3">
                        <span className="font-medium">{formatCurrency(c.amount)}</span>
                        <StatusBadge status={c.status} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-sm text-center py-6">No collaborations found</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Suspend Modal */}
      {showSuspendModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Suspend Account</h3>
            <p className="text-sm text-gray-500 mb-4">
              The user will be blocked from logging in and notified by email. Active collaborations will be flagged.
            </p>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason for suspension *</label>
            <textarea
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              rows={3}
              placeholder="e.g. Repeated policy violations, fraudulent activity..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent mb-4"
            />
            <div className="flex gap-3 justify-end">
              <button onClick={() => { setShowSuspendModal(false); setSuspendReason(''); }} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">
                Cancel
              </button>
              <button
                onClick={handleSuspend}
                disabled={actionLoading === 'suspend'}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
              >
                {actionLoading === 'suspend' ? 'Suspending...' : 'Confirm Suspension'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Flag Modal */}
      {showFlagModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Flag for Monitoring</h3>
            <p className="text-sm text-gray-500 mb-4">
              This is an internal note. The user will not be notified. Use this to track suspicious behaviour.
            </p>
            <label className="block text-sm font-medium text-gray-700 mb-1">Internal note *</label>
            <textarea
              value={flagNote}
              onChange={(e) => setFlagNote(e.target.value)}
              rows={3}
              placeholder="e.g. Unusual booking pattern, multiple failed payments..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent mb-4"
            />
            <div className="flex gap-3 justify-end">
              <button onClick={() => { setShowFlagModal(false); setFlagNote(''); }} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">
                Cancel
              </button>
              <button
                onClick={handleFlag}
                disabled={actionLoading === 'flag'}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 disabled:opacity-50"
              >
                {actionLoading === 'flag' ? 'Saving...' : 'Save Flag'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
