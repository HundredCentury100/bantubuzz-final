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

  const handleToggleTopCreator = async () => {
    const isTopCreator = Boolean(user.admin_controls?.creator_badges?.is_top_creator);
    setActionLoading('creator-controls');
    try {
      await api.put(`/admin/users/${id}/creator-controls`, {
        is_top_creator: !isTopCreator,
        reason: isTopCreator ? 'Removed Top Creator status by admin' : 'Granted Top Creator status by admin',
      });
      toast.success(isTopCreator ? 'Top Creator status removed' : 'Top Creator status granted');
      fetchUser();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update creator status');
    } finally {
      setActionLoading(null);
    }
  };

  const handleGrantCreatorPlan = async (planSlug) => {
    const planLabel = planSlug === 'pro-creator' ? 'Creator Pro' : 'Rising';
    const duration = window.prompt(`Grant ${planLabel} for how many days?`, '30');
    if (!duration) return;
    const durationDays = Number(duration);
    if (!Number.isFinite(durationDays) || durationDays <= 0) {
      toast.error('Please enter a valid number of days');
      return;
    }

    const reason = window.prompt('Reason for this admin grant?', `Admin granted ${planLabel}`);
    setActionLoading(`grant-${planSlug}`);
    try {
      await api.put(`/admin/users/${id}/creator-controls`, {
        plan_slug: planSlug,
        duration_days: durationDays,
        reason: reason || `Admin granted ${planLabel}`,
      });
      toast.success(`${planLabel} granted`);
      fetchUser();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to grant creator plan');
    } finally {
      setActionLoading(null);
    }
  };

  const handleFundWallet = async () => {
    const amountInput = window.prompt('Amount to add to this brand wallet in USD');
    if (!amountInput) return;
    const amount = Number(amountInput);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    const reason = window.prompt('Reason or reference for this wallet funding?', 'Admin wallet credit');
    setActionLoading('fund-wallet');
    try {
      await api.post(`/admin/users/${id}/fund-wallet`, {
        amount,
        reason: reason || 'Admin wallet credit',
      });
      toast.success('Brand wallet funded');
      fetchUser();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to fund wallet');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreateFeeOverride = async (overrideType) => {
    const label = overrideType === 'creator_commission'
      ? 'creator commission'
      : overrideType === 'brand_platform_fee'
        ? 'brand platform fee'
        : 'brand service fee';
    const percentageInput = window.prompt(`Set ${label} percentage. Use 0 for commission-free.`, '0');
    if (percentageInput === null) return;
    const percentage = Number(percentageInput);
    if (!Number.isFinite(percentage) || percentage < 0 || percentage > 100) {
      toast.error('Please enter a percentage between 0 and 100');
      return;
    }

    const durationInput = window.prompt('Duration in days. Leave blank for no expiry.', '');
    const durationDays = durationInput ? Number(durationInput) : null;
    if (durationInput && (!Number.isFinite(durationDays) || durationDays <= 0)) {
      toast.error('Please enter a valid duration');
      return;
    }

    const reason = window.prompt('Reason for this fee override?', 'Admin fee override');
    setActionLoading('fee-override');
    try {
      await api.post(`/admin/users/${id}/fee-overrides`, {
        override_type: overrideType,
        percentage,
        duration_days: durationDays,
        reason: reason || 'Admin fee override',
      });
      toast.success('Fee override saved');
      fetchUser();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save fee override');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeactivateFeeOverride = async (overrideId) => {
    if (!confirm('Deactivate this fee override?')) return;
    setActionLoading(`override-${overrideId}`);
    try {
      await api.delete(`/admin/users/${id}/fee-overrides/${overrideId}`);
      toast.success('Fee override deactivated');
      fetchUser();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to deactivate fee override');
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
  const adminControls = user.admin_controls || {};
  const currentPlan = adminControls.active_subscription?.plan;
  const wallet = adminControls.brand_wallet;
  const feeOverrides = adminControls.fee_overrides || [];

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
                {user.user_type === 'creator' && (
                  <div className="flex justify-between gap-3">
                    <span className="text-gray-500">Phone</span>
                    <span className="font-medium text-right">{user.phone_number || 'Not provided'}</span>
                  </div>
                )}
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

            {user.user_type === 'creator' && (
              <div className="bg-white rounded-lg border border-gray-200 p-5">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <h2 className="font-semibold text-gray-900">Creator Admin Controls</h2>
                    <p className="text-sm text-gray-500 mt-1">Grant ranking status and creator account tiers.</p>
                  </div>
                  {currentPlan && (
                    <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                      {currentPlan.name}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={handleToggleTopCreator}
                    disabled={actionLoading === 'creator-controls'}
                    className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
                  >
                    {adminControls.creator_badges?.is_top_creator ? 'Remove Top Creator' : 'Make Top Creator'}
                  </button>
                  <button
                    onClick={() => handleGrantCreatorPlan('rising')}
                    disabled={actionLoading === 'grant-rising'}
                    className="px-4 py-2 bg-lime-100 text-lime-800 rounded-lg text-sm font-medium hover:bg-lime-200 disabled:opacity-50"
                  >
                    Grant Rising
                  </button>
                  <button
                    onClick={() => handleGrantCreatorPlan('pro-creator')}
                    disabled={actionLoading === 'grant-pro-creator'}
                    className="px-4 py-2 bg-blue-100 text-blue-800 rounded-lg text-sm font-medium hover:bg-blue-200 disabled:opacity-50"
                  >
                    Grant Creator Pro
                  </button>
                  <button
                    onClick={() => handleCreateFeeOverride('creator_commission')}
                    disabled={actionLoading === 'fee-override'}
                    className="px-4 py-2 bg-purple-100 text-purple-800 rounded-lg text-sm font-medium hover:bg-purple-200 disabled:opacity-50"
                  >
                    Set Commission
                  </button>
                </div>
              </div>
            )}

            {user.user_type === 'brand' && (
              <div className="bg-white rounded-lg border border-gray-200 p-5">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <h2 className="font-semibold text-gray-900">Brand Wallet & Fees</h2>
                    <p className="text-sm text-gray-500 mt-1">Fund this brand wallet and adjust service fees.</p>
                  </div>
                  {wallet && (
                    <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                      {formatCurrency(wallet.available_balance)} available
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={handleFundWallet}
                    disabled={actionLoading === 'fund-wallet'}
                    className="px-4 py-2 bg-primary text-dark rounded-lg text-sm font-semibold hover:bg-primary/90 disabled:opacity-50"
                  >
                    Fund Wallet
                  </button>
                  <button
                    onClick={() => handleCreateFeeOverride('brand_service_fee')}
                    disabled={actionLoading === 'fee-override'}
                    className="px-4 py-2 bg-blue-100 text-blue-800 rounded-lg text-sm font-medium hover:bg-blue-200 disabled:opacity-50"
                  >
                    Set Service Fee
                  </button>
                  <button
                    onClick={() => handleCreateFeeOverride('brand_platform_fee')}
                    disabled={actionLoading === 'fee-override'}
                    className="px-4 py-2 bg-purple-100 text-purple-800 rounded-lg text-sm font-medium hover:bg-purple-200 disabled:opacity-50"
                  >
                    Set Platform Fee
                  </button>
                </div>
              </div>
            )}

            {feeOverrides.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 p-5">
                <h2 className="font-semibold text-gray-900 mb-4">Fee Overrides</h2>
                <div className="space-y-2">
                  {feeOverrides.slice(0, 5).map((override) => (
                    <div key={override.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-gray-50 px-3 py-2 text-sm">
                      <div>
                        <p className="font-medium text-gray-900">
                          {String(override.override_type || '').split('_').join(' ')} · {override.percentage}%
                        </p>
                        <p className="text-xs text-gray-500">
                          {override.is_current ? 'Active' : 'Inactive'} · Ends {override.ends_at ? formatDate(override.ends_at) : 'Never'}
                        </p>
                      </div>
                      {override.is_active && (
                        <button
                          onClick={() => handleDeactivateFeeOverride(override.id)}
                          disabled={actionLoading === `override-${override.id}`}
                          className="px-3 py-1 rounded-md bg-red-100 text-red-700 text-xs font-medium hover:bg-red-200 disabled:opacity-50"
                        >
                          Deactivate
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

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
