import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import {
  getCashouts,
  approveCashout,
  rejectCashout,
  completeCashout,
} from '../../services/adminAPI';
import AdminLayout from '../../components/admin/AdminLayout';
import StatusBadge from '../../components/admin/StatusBadge';
import { CheckIcon, XMarkIcon, BanknotesIcon } from '@heroicons/react/24/outline';

export default function AdminCashouts() {
  const [cashouts, setCashouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [actionLoading, setActionLoading] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, per_page: 20, total: 0 });

  useEffect(() => {
    fetchCashouts();
  }, [statusFilter, pagination.page]);

  const fetchCashouts = async () => {
    try {
      setLoading(true);
      const response = await getCashouts({
        status: statusFilter,
        page: pagination.page,
        per_page: pagination.per_page,
      });
      setCashouts(response.data.data.cashouts);
      setPagination(response.data.data.pagination);
    } catch (error) {
      console.error('Error fetching cashouts:', error);
      toast.error('Failed to load cashouts');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (cashoutId) => {
    if (!confirm('Approve this cashout request?')) return;
    try {
      setActionLoading(cashoutId);
      await approveCashout(cashoutId);
      toast.success('Cashout approved');
      fetchCashouts();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to approve cashout');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (cashoutId) => {
    const reason = prompt('Enter rejection reason:');
    if (!reason) return;
    try {
      setActionLoading(cashoutId);
      await rejectCashout(cashoutId, reason);
      toast.success('Cashout rejected');
      fetchCashouts();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reject cashout');
    } finally {
      setActionLoading(null);
    }
  };

  const handleComplete = async (cashoutId) => {
    const txRef = prompt('Enter transaction reference:');
    if (!txRef) return;
    try {
      setActionLoading(cashoutId);
      await completeCashout(cashoutId, txRef);
      toast.success('Cashout marked as completed');
      fetchCashouts();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to complete cashout');
    } finally {
      setActionLoading(null);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 leading-tight">Cashout Management</h1>
          <p className="text-gray-600 leading-relaxed mt-1">Review and process creator cashout requests</p>
        </div>

        {/* Status Filter */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex space-x-2">
            {['pending', 'approved', 'rejected', 'completed', ''].map((status) => (
              <button
                key={status || 'all'}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  statusFilter === status
                    ? 'bg-primary text-dark'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {status ? status.charAt(0).toUpperCase() + status.slice(1) : 'All'}
              </button>
            ))}
          </div>
        </div>

        {/* Cashouts Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Creator</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Wallet Balance</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment Method</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Requested</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
                    </td>
                  </tr>
                ) : cashouts.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-gray-500">No cashouts found</td>
                  </tr>
                ) : (
                  cashouts.map((cashout) => (
                    <tr key={cashout.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="font-medium text-gray-900">{cashout.creator.name}</div>
                          <div className="text-sm text-gray-500">{cashout.creator.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <BanknotesIcon className="h-5 w-5 text-green-600 mr-2" />
                          <span className="font-semibold text-gray-900">{formatCurrency(cashout.amount)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(cashout.wallet_balance)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">
                        {cashout.payment_method}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge status={cashout.status} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(cashout.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          {cashout.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleApprove(cashout.id)}
                                disabled={actionLoading === cashout.id}
                                className="text-green-600 hover:text-green-900 disabled:opacity-50 flex items-center"
                                title="Approve"
                              >
                                <CheckIcon className="h-5 w-5" />
                              </button>
                              <button
                                onClick={() => handleReject(cashout.id)}
                                disabled={actionLoading === cashout.id}
                                className="text-red-600 hover:text-red-900 disabled:opacity-50 flex items-center"
                                title="Reject"
                              >
                                <XMarkIcon className="h-5 w-5" />
                              </button>
                            </>
                          )}
                          {cashout.status === 'approved' && (
                            <button
                              onClick={() => handleComplete(cashout.id)}
                              disabled={actionLoading === cashout.id}
                              className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                            >
                              Mark Complete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.total > 0 && (
            <div className="bg-gray-50 px-6 py-3 flex items-center justify-between border-t border-gray-200">
              <div className="text-sm text-gray-700">
                Showing <span className="font-medium">{cashouts.length}</span> of{' '}
                <span className="font-medium">{pagination.total}</span> results
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                  disabled={pagination.page === 1}
                  className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50 hover:bg-white"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                  disabled={pagination.page === pagination.pages}
                  className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50 hover:bg-white"
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
