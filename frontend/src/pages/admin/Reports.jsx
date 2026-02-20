import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import adminAPI from '../../services/adminAPI';
import AdminLayout from '../../components/admin/AdminLayout';
import {
  ChartBarIcon,
  BanknotesIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';

export default function AdminReports() {
  const [activeTab, setActiveTab] = useState('growth');
  const [loading, setLoading] = useState(true);
  const [growthData, setGrowthData] = useState(null);
  const [revenueData, setRevenueData] = useState(null);
  const [healthData, setHealthData] = useState(null);
  const [riskData, setRiskData] = useState(null);
  const [period, setPeriod] = useState({ growth: 30, revenue: 6 });

  useEffect(() => {
    fetchReportData();
  }, [activeTab, period]);

  const fetchReportData = async () => {
    try {
      setLoading(true);

      if (activeTab === 'growth' && !growthData) {
        const res = await adminAPI.get(
          `/admin/reports/growth?days=${period.growth}`
        );
        setGrowthData(res.data.data);
      } else if (activeTab === 'revenue' && !revenueData) {
        const res = await adminAPI.get(
          `/admin/reports/revenue?months=${period.revenue}`
        );
        setRevenueData(res.data.data);
      } else if (activeTab === 'health' && !healthData) {
        const res = await adminAPI.get(
          `/admin/reports/marketplace-health`
        );
        setHealthData(res.data.data);
      } else if (activeTab === 'risk' && !riskData) {
        const res = await adminAPI.get(
          `/admin/reports/risk`
        );
        setRiskData(res.data.data);
      }
    } catch (error) {
      console.error('Error fetching report data:', error);
      toast.error('Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  const changePeriod = (tab, value) => {
    setPeriod((prev) => ({ ...prev, [tab]: value }));
    if (tab === 'growth') setGrowthData(null);
    if (tab === 'revenue') setRevenueData(null);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const tabs = [
    { id: 'growth', name: 'Growth', icon: ArrowTrendingUpIcon },
    { id: 'revenue', name: 'Revenue', icon: BanknotesIcon },
    { id: 'health', name: 'Marketplace Health', icon: ChartBarIcon },
    { id: 'risk', name: 'Risk', icon: ShieldCheckIcon },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-600 mt-1">Business intelligence and platform insights</p>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-primary text-primary'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {tab.name}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : (
            <>
              {/* Growth Tab */}
              {activeTab === 'growth' && growthData && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h2 className="text-xl font-semibold">User Growth</h2>
                    <select
                      value={period.growth}
                      onChange={(e) => changePeriod('growth', parseInt(e.target.value))}
                      className="px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value={30}>Last 30 days</option>
                      <option value={90}>Last 90 days</option>
                      <option value={365}>Last year</option>
                    </select>
                  </div>

                  {/* Stats Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-primary/10 rounded-lg">
                      <p className="text-sm text-gray-600">Total New Users</p>
                      <p className="text-2xl font-bold text-dark">{growthData.total_users}</p>
                      <p className="text-xs text-gray-500 mt-1">Last {period.growth} days</p>
                    </div>
                    <div className="p-4 bg-green-50 rounded-lg">
                      <p className="text-sm text-gray-600">Activation Rate</p>
                      <p className="text-2xl font-bold text-green-600">{growthData.activation_rate}%</p>
                      <p className="text-xs text-gray-500 mt-1">{growthData.activated_users} activated</p>
                    </div>
                    <div className="p-4 bg-purple-50 rounded-lg">
                      <p className="text-sm text-gray-600">Current Total</p>
                      <p className="text-2xl font-bold text-purple-600">{growthData.current_totals.total}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {growthData.current_totals.creators} creators · {growthData.current_totals.brands} brands
                      </p>
                    </div>
                  </div>

                  {/* Daily Signups Table */}
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">Daily Signups</h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Creators</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Brands</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {growthData.daily_signups.slice(-15).reverse().map((day, idx) => (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm text-gray-900">{day.date}</td>
                              <td className="px-4 py-3 text-sm font-semibold text-gray-900">{day.total}</td>
                              <td className="px-4 py-3 text-sm text-gray-600">{day.creators}</td>
                              <td className="px-4 py-3 text-sm text-gray-600">{day.brands}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Revenue Tab */}
              {activeTab === 'revenue' && revenueData && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h2 className="text-xl font-semibold">Revenue Analytics</h2>
                    <select
                      value={period.revenue}
                      onChange={(e) => changePeriod('revenue', parseInt(e.target.value))}
                      className="px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value={3}>Last 3 months</option>
                      <option value={6}>Last 6 months</option>
                      <option value={12}>Last year</option>
                    </select>
                  </div>

                  {/* Monthly Revenue Table */}
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">Monthly Breakdown</h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Month</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Transactions</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Volume</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Platform Fees</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {revenueData.monthly_data.map((month, idx) => (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm text-gray-900">{month.month}</td>
                              <td className="px-4 py-3 text-sm text-gray-600">{month.transactions}</td>
                              <td className="px-4 py-3 text-sm font-semibold text-gray-900">{formatCurrency(month.volume)}</td>
                              <td className="px-4 py-3 text-sm font-semibold text-green-600">{formatCurrency(month.fees)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Refund Rate */}
                  <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                    <p className="text-sm text-gray-600">Refund Rate</p>
                    <p className="text-2xl font-bold text-yellow-700">{revenueData.refund_rate}%</p>
                  </div>

                  {/* Top Creators & Brands */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-3">Top 10 Creators by Revenue</h3>
                      <div className="space-y-2">
                        {revenueData.top_creators.map((creator, idx) => (
                          <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                            <div>
                              <p className="font-medium text-gray-900">{creator.name}</p>
                              <p className="text-xs text-gray-500">{creator.collaborations} collaborations</p>
                            </div>
                            <p className="font-semibold text-green-600">{formatCurrency(creator.total_earned)}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h3 className="font-semibold text-gray-900 mb-3">Top 10 Brands by Spend</h3>
                      <div className="space-y-2">
                        {revenueData.top_brands.map((brand, idx) => (
                          <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                            <div>
                              <p className="font-medium text-gray-900">{brand.name}</p>
                              <p className="text-xs text-gray-500">{brand.bookings} bookings</p>
                            </div>
                            <p className="font-semibold text-purple-600">{formatCurrency(brand.total_spent)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Marketplace Health Tab */}
              {activeTab === 'health' && healthData && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold">Marketplace Health Metrics</h2>

                  {/* Key Metrics */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <p className="text-sm text-gray-600">Active Collaborations</p>
                      <p className="text-2xl font-bold text-blue-600">{healthData.collaboration_ratio.active}</p>
                      <p className="text-xs text-gray-500 mt-1">In progress</p>
                    </div>
                    <div className="p-4 bg-green-50 rounded-lg">
                      <p className="text-sm text-gray-600">On-Time Delivery</p>
                      <p className="text-2xl font-bold text-green-600">{healthData.on_time_delivery_rate}%</p>
                      <p className="text-xs text-gray-500 mt-1">Completed on time</p>
                    </div>
                    <div className="p-4 bg-yellow-50 rounded-lg">
                      <p className="text-sm text-gray-600">Dispute Rate</p>
                      <p className="text-2xl font-bold text-yellow-600">{healthData.dispute_rate}%</p>
                      <p className="text-xs text-gray-500 mt-1">Of total collaborations</p>
                    </div>
                  </div>

                  {/* Average Rating */}
                  <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
                    <p className="text-sm text-gray-600">Platform Average Rating</p>
                    <p className="text-2xl font-bold text-dark">{healthData.average_rating} / 5.0</p>
                    <p className="text-xs text-gray-500 mt-1">{healthData.total_reviews} total reviews</p>
                  </div>

                  {/* Cancellation Rate by Month */}
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">Cancellation Rate (Last 6 Months)</h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Month</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cancelled</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rate</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {healthData.cancellation_by_month.map((month, idx) => (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm text-gray-900">{month.month}</td>
                              <td className="px-4 py-3 text-sm text-gray-600">{month.total}</td>
                              <td className="px-4 py-3 text-sm text-red-600">{month.cancelled}</td>
                              <td className="px-4 py-3 text-sm font-semibold text-gray-900">{month.rate}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Risk Tab */}
              {activeTab === 'risk' && riskData && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold">Risk Monitoring</h2>

                  {/* Users with Multiple Disputes */}
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
                      Users with Multiple Disputes
                    </h3>
                    {riskData.users_with_multiple_disputes.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Disputes</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {riskData.users_with_multiple_disputes.map((user, idx) => (
                              <tr key={idx} className="hover:bg-gray-50">
                                <td className="px-4 py-3 text-sm text-gray-900">{user.email}</td>
                                <td className="px-4 py-3 text-sm text-gray-600 capitalize">{user.user_type}</td>
                                <td className="px-4 py-3 text-sm font-semibold text-red-600">{user.dispute_count}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 text-center py-4">No users with multiple disputes</p>
                    )}
                  </div>

                  {/* Users with Recent Cancellations */}
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />
                      Users with Recent Cancellations (Last 30 Days)
                    </h3>
                    {riskData.users_with_recent_cancellations.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cancellations</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {riskData.users_with_recent_cancellations.map((user, idx) => (
                              <tr key={idx} className="hover:bg-gray-50">
                                <td className="px-4 py-3 text-sm text-gray-900">{user.email}</td>
                                <td className="px-4 py-3 text-sm text-gray-600 capitalize">{user.user_type}</td>
                                <td className="px-4 py-3 text-sm font-semibold text-yellow-600">{user.cancellation_count}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 text-center py-4">No users with recent cancellations</p>
                    )}
                  </div>

                  {/* High-Value Transactions */}
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">Top 20 High-Value Transactions</h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Brand</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Creator</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {riskData.high_value_transactions.map((txn, idx) => (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm text-gray-600">{new Date(txn.date).toLocaleDateString()}</td>
                              <td className="px-4 py-3 text-sm text-gray-900">{txn.brand}</td>
                              <td className="px-4 py-3 text-sm text-gray-900">{txn.creator}</td>
                              <td className="px-4 py-3 text-sm font-bold text-gray-900">{formatCurrency(txn.amount)}</td>
                              <td className="px-4 py-3 text-sm">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  txn.status === 'completed' ? 'bg-green-100 text-green-700' :
                                  txn.status === 'paid' ? 'bg-blue-100 text-blue-700' :
                                  'bg-gray-100 text-gray-700'
                                }`}>
                                  {txn.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
