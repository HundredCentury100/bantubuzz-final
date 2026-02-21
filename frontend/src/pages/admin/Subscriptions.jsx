import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import adminAPI from '../../services/adminAPI';
import AdminLayout from '../../components/admin/AdminLayout';
import {
  CreditCardIcon,
  BanknotesIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';

export default function AdminSubscriptions() {
  const [stats, setStats] = useState(null);
  const [subscriptions, setSubscriptions] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ plan: '', status: '' });
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);

  useEffect(() => {
    fetchStats();
    fetchPlans();
  }, []);

  useEffect(() => {
    fetchSubscriptions();
  }, [filters, page]);

  const fetchStats = async () => {
    try {
      const res = await adminAPI.get('/admin/subscriptions/stats');
      setStats(res.data.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
      toast.error('Failed to load subscription stats');
    }
  };

  const fetchPlans = async () => {
    try {
      const res = await adminAPI.get('/admin/subscription-plans');
      setPlans(res.data.data);
    } catch (error) {
      console.error('Error fetching plans:', error);
    }
  };

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page,
        per_page: 25,
        ...(filters.plan && { plan: filters.plan }),
        ...(filters.status && { status: filters.status }),
      });

      const res = await adminAPI.get(`/admin/subscriptions?${params}`);
      setSubscriptions(res.data.data.subscriptions);
      setPagination(res.data.data.pagination);
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
      toast.error('Failed to load subscriptions');
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, icon: Icon, color }) => (
    <div className="card">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">{title}</p>
          <p className={`text-2xl font-bold ${color}`}>{value}</p>
        </div>
        <Icon className={`h-12 w-12 ${color} opacity-20`} />
      </div>
    </div>
  );

  const getStatusBadge = (status) => {
    const styles = {
      active: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      past_due: 'bg-yellow-100 text-yellow-800',
      expired: 'bg-gray-100 text-gray-800',
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
        {status}
      </span>
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Subscriptions</h1>
          <p className="text-gray-600">Manage user subscriptions and plans</p>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            <StatCard
              title="Active Subscriptions"
              value={stats.active_subscriptions}
              icon={CreditCardIcon}
              color="text-primary"
            />
            <StatCard
              title="Monthly Revenue"
              value={`$${stats.monthly_revenue.toFixed(2)}`}
              icon={BanknotesIcon}
              color="text-green-600"
            />
            <StatCard
              title="Failed Renewals"
              value={stats.failed_renewals}
              icon={ExclamationTriangleIcon}
              color="text-yellow-600"
            />
            <StatCard
              title="Cancellations"
              value={stats.cancellations_this_month}
              icon={XCircleIcon}
              color="text-red-600"
            />
            <StatCard
              title="Total Users"
              value={stats.total_users}
              icon={UsersIcon}
              color="text-blue-600"
            />
          </div>
        )}

        {/* Tier Breakdown */}
        {stats && (
          <div className="card">
            <h3 className="font-semibold mb-4">Tier Distribution</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(stats.tier_breakdown).map(([tier, count]) => (
                <div key={tier} className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">{tier}</p>
                  <p className="text-2xl font-bold text-primary">{count}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="card">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Plan</label>
              <select
                className="input w-full"
                value={filters.plan}
                onChange={(e) => setFilters({ ...filters, plan: e.target.value })}
              >
                <option value="">All Plans</option>
                {plans.map((plan) => (
                  <option key={plan.id} value={plan.id}>{plan.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                className="input w-full"
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              >
                <option value="">All Statuses</option>
                <option value="active">Active</option>
                <option value="cancelled">Cancelled</option>
                <option value="past_due">Past Due</option>
                <option value="expired">Expired</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => setFilters({ plan: '', status: '' })}
                className="btn btn-secondary w-full"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Subscriptions Table */}
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plan</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Billing</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Next Payment</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                      Loading...
                    </td>
                  </tr>
                ) : subscriptions.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                      No subscriptions found
                    </td>
                  </tr>
                ) : (
                  subscriptions.map((sub) => (
                    <tr key={sub.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium">{sub.user?.email}</p>
                          <p className="text-sm text-gray-500">{sub.user?.user_type}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-medium">{sub.plan?.name}</span>
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(sub.status)}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm">{sub.billing_cycle}</span>
                      </td>
                      <td className="px-6 py-4">
                        {sub.next_payment_date ? (
                          <div>
                            <p className="text-sm">{new Date(sub.next_payment_date).toLocaleDateString()}</p>
                            {sub.days_until_renewal !== null && (
                              <p className="text-xs text-gray-500">{sub.days_until_renewal} days</p>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(sub.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination && pagination.pages > 1 && (
            <div className="px-6 py-4 flex items-center justify-between border-t">
              <div className="text-sm text-gray-700">
                Page {pagination.page} of {pagination.pages} ({pagination.total} total)
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                  className="btn btn-secondary btn-sm"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={page === pagination.pages}
                  className="btn btn-secondary btn-sm"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
