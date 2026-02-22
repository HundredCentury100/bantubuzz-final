import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { getDashboardStats } from '../../services/adminAPI';
import AdminLayout from '../../components/admin/AdminLayout';
import StatCard from '../../components/admin/StatCard';
import StatusBadge from '../../components/admin/StatusBadge';
import {
  UsersIcon,
  BanknotesIcon,
  BriefcaseIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  UserMinusIcon,
  XCircleIcon,
  ArrowTrendingUpIcon,
  ShieldExclamationIcon,
} from '@heroicons/react/24/outline';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await getDashboardStats();
      setStats(response.data.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
      toast.error('Failed to load dashboard statistics');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 leading-tight">Dashboard Overview</h1>
          <p className="text-gray-600 leading-relaxed mt-1">Welcome to the BantuBuzz Admin Panel</p>
        </div>

        {/* User Statistics */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">User Management</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total Users"
              value={stats?.users.total || 0}
              subtitle={`${stats?.users.new_this_week || 0} new this week`}
              icon={UsersIcon}
              color="primary"
              loading={loading}
            />
            <StatCard
              title="Creators"
              value={stats?.users.creators || 0}
              subtitle={`${stats?.users.unverified_creators || 0} unverified`}
              icon={UsersIcon}
              color="green"
              loading={loading}
            />
            <StatCard
              title="Brands"
              value={stats?.users.brands || 0}
              subtitle={`${stats?.users.unverified_brands || 0} unverified`}
              icon={UsersIcon}
              color="purple"
              loading={loading}
            />
            <StatCard
              title="Pending Verifications"
              value={(stats?.users.unverified_creators || 0) + (stats?.users.unverified_brands || 0)}
              subtitle="Requires review"
              icon={ExclamationTriangleIcon}
              color="yellow"
              onClick={() => navigate('/admin/verification')}
              loading={loading}
            />
          </div>
        </div>

        {/* Platform Health */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Platform Health</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="New Signups Today"
              value={stats?.users.new_today || 0}
              subtitle={`${stats?.users.new_this_week || 0} this week`}
              icon={ArrowTrendingUpIcon}
              color="green"
              loading={loading}
            />
            <StatCard
              title="Suspended Accounts"
              value={stats?.users.suspended || 0}
              subtitle="Inactive users"
              icon={UserMinusIcon}
              color="red"
              onClick={() => navigate('/admin/users?filter=suspended')}
              loading={loading}
            />
            <StatCard
              title="Failed Payments"
              value={stats?.users.failed_payments || 0}
              subtitle="Requires follow-up"
              icon={XCircleIcon}
              color="red"
              onClick={() => navigate('/admin/bookings?payment_status=failed')}
              loading={loading}
            />
            <StatCard
              title="Open Disputes"
              value={0}
              subtitle="Coming in Phase 3"
              icon={ShieldExclamationIcon}
              color="yellow"
              loading={loading}
            />
          </div>
        </div>

        {/* Financial Statistics */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Platform Revenue</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total Revenue"
              value={formatCurrency(stats?.revenue.total || 0)}
              subtitle="All-time platform earnings"
              icon={ChartBarIcon}
              color="green"
              loading={loading}
            />
            <StatCard
              title="This Month"
              value={formatCurrency(stats?.revenue.this_month || 0)}
              subtitle="Current month revenue"
              icon={BanknotesIcon}
              color="primary"
              loading={loading}
            />
            <StatCard
              title="This Week"
              value={formatCurrency(stats?.revenue.this_week || 0)}
              subtitle="Last 7 days"
              icon={BanknotesIcon}
              color="purple"
              loading={loading}
            />
            <StatCard
              title="In Escrow"
              value={formatCurrency(stats?.revenue.in_escrow || 0)}
              subtitle="Pending collaborations"
              icon={BanknotesIcon}
              color="yellow"
              loading={loading}
            />
          </div>
        </div>

        {/* Collaboration & Cashout Statistics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Collaborations */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Collaborations</h2>
            <div className="grid grid-cols-2 gap-4">
              <StatCard
                title="Active"
                value={stats?.collaborations.active || 0}
                icon={BriefcaseIcon}
                color="primary"
                loading={loading}
              />
              <StatCard
                title="Completed"
                value={stats?.collaborations.completed || 0}
                icon={CheckCircleIcon}
                color="green"
                loading={loading}
              />
              <StatCard
                title="Cancelled"
                value={stats?.collaborations.cancelled || 0}
                icon={ExclamationTriangleIcon}
                color="red"
                loading={loading}
              />
              <StatCard
                title="Cancel Requests"
                value={stats?.collaborations.pending_cancellations || 0}
                subtitle="Needs review"
                icon={ExclamationTriangleIcon}
                color="yellow"
                onClick={() => navigate('/admin/collaborations/cancellations')}
                loading={loading}
              />
            </div>
          </div>

          {/* Cashouts */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Cashout Requests</h2>
            <div className="grid grid-cols-2 gap-4">
              <StatCard
                title="Pending Cashouts"
                value={stats?.cashouts.pending_count || 0}
                subtitle={formatCurrency(stats?.cashouts.pending_amount || 0)}
                icon={BanknotesIcon}
                color="yellow"
                onClick={() => navigate('/admin/cashouts?status=pending')}
                loading={loading}
              />
              <StatCard
                title="Approved"
                value={stats?.cashouts.approved_pending_processing || 0}
                subtitle="Awaiting processing"
                icon={BanknotesIcon}
                color="primary"
                loading={loading}
              />
              <StatCard
                title="Active Campaigns"
                value={stats?.platform.active_campaigns || 0}
                icon={BriefcaseIcon}
                color="green"
                loading={loading}
              />
              <StatCard
                title="Featured Creators"
                value={stats?.featured_creators || 0}
                icon={UsersIcon}
                color="primary"
                onClick={() => navigate('/admin/featured')}
                loading={loading}
              />
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Cashout Requests */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Recent Cashouts</h2>
              <button
                onClick={() => navigate('/admin/cashouts')}
                className="text-sm text-primary hover:text-primary-dark font-medium"
              >
                View all
              </button>
            </div>
            <div className="space-y-3">
              {loading ? (
                <>
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex justify-between items-center border-b pb-3 animate-pulse">
                      <div className="flex-1">
                        <div className="h-4 w-32 bg-gray-200 rounded mb-2" />
                        <div className="h-3 w-20 bg-gray-200 rounded" />
                      </div>
                      <div className="h-6 w-16 bg-gray-200 rounded" />
                    </div>
                  ))}
                </>
              ) : stats?.recent_activity?.cashouts?.length > 0 ? (
                stats.recent_activity.cashouts.slice(0, 5).map((cashout) => (
                  <div key={cashout.id} className="flex justify-between items-center border-b pb-3 last:border-0">
                    <div>
                      <p className="font-medium text-gray-900">{cashout.creator_name}</p>
                      <p className="text-sm text-gray-600">{formatCurrency(cashout.amount)}</p>
                    </div>
                    <StatusBadge status={cashout.status} />
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-sm text-center py-4">No recent cashouts</p>
              )}
            </div>
          </div>

          {/* Recent User Registrations */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Recent Registrations</h2>
              <button
                onClick={() => navigate('/admin/users')}
                className="text-sm text-primary hover:text-primary-dark font-medium"
              >
                View all
              </button>
            </div>
            <div className="space-y-3">
              {loading ? (
                <>
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex justify-between items-center border-b pb-3 animate-pulse">
                      <div className="flex-1">
                        <div className="h-4 w-40 bg-gray-200 rounded mb-2" />
                        <div className="h-3 w-24 bg-gray-200 rounded" />
                      </div>
                      <div className="h-6 w-20 bg-gray-200 rounded" />
                    </div>
                  ))}
                </>
              ) : stats?.recent_activity?.users?.length > 0 ? (
                stats.recent_activity.users.slice(0, 5).map((user) => (
                  <div key={user.id} className="flex justify-between items-center border-b pb-3 last:border-0">
                    <div>
                      <p className="font-medium text-gray-900">{user.email}</p>
                      <p className="text-sm text-gray-600 capitalize">{user.user_type}</p>
                    </div>
                    <div className="flex flex-col items-end space-y-1">
                      <StatusBadge status={user.is_verified ? 'verified' : 'unverified'} />
                      <span className="text-xs text-gray-500">{formatDate(user.created_at)}</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-sm text-center py-4">No recent users</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
