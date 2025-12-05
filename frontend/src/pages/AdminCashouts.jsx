import { useState, useEffect } from 'react';
import api from '../services/api';

export default function AdminCashouts() {
  const [loading, setLoading] = useState(true);
  const [cashouts, setCashouts] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [filter, setFilter] = useState('all');
  const [selectedCashout, setSelectedCashout] = useState(null);
  const [showProcessModal, setShowProcessModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [processData, setProcessData] = useState({
    transaction_reference: '',
    proof_url: '',
    notes: ''
  });

  const [cancelData, setCancelData] = useState({
    reason: ''
  });

  useEffect(() => {
    fetchData();
  }, [filter]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const status = filter === 'all' ? null : filter;
      const [cashoutsRes, statsRes] = await Promise.all([
        api.get(`/admin/cashouts${status ? `?status=${status}` : ''}`),
        api.get('/admin/cashouts/statistics')
      ]);

      setCashouts(cashoutsRes.data.cashouts);
      setStatistics(statsRes.data.statistics);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load cashout data');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignToMe = async (cashoutId) => {
    try {
      await api.put(`/admin/cashouts/${cashoutId}/assign`);
      setSuccess('Cashout assigned to you successfully!');
      fetchData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to assign cashout');
    }
  };

  const handleProcessClick = (cashout) => {
    setSelectedCashout(cashout);
    setProcessData({
      transaction_reference: '',
      proof_url: '',
      notes: ''
    });
    setShowProcessModal(true);
    setError('');
  };

  const handleProcessSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/admin/cashouts/${selectedCashout.id}/complete`, processData);
      setSuccess('Cashout processed successfully! Creator will be notified.');
      setShowProcessModal(false);
      fetchData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to process cashout');
    }
  };

  const handleCancelClick = (cashout) => {
    setSelectedCashout(cashout);
    setCancelData({ reason: '' });
    setShowCancelModal(true);
    setError('');
  };

  const handleCancelSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/admin/cashouts/${selectedCashout.id}/cancel`, cancelData);
      setSuccess('Cashout cancelled successfully!');
      setShowCancelModal(false);
      fetchData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to cancel cashout');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      processing: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getPaymentMethodIcon = (method) => {
    const icons = {
      ecocash: '📱',
      onemoney: '💰',
      bank_transfer: '🏦',
      cash: '💵'
    };
    return icons[method] || '💳';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Cashout Management</h1>
          <p className="mt-2 text-gray-600">Process creator cashout requests</p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-800">{success}</p>
          </div>
        )}

        {/* Statistics Cards */}
        {statistics && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-md p-6">
              <p className="text-sm text-gray-600">Pending</p>
              <p className="text-3xl font-bold text-yellow-600 mt-2">{statistics.pending_count}</p>
              <p className="text-sm text-gray-500 mt-1">{formatCurrency(statistics.pending_amount)}</p>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6">
              <p className="text-sm text-gray-600">Processing</p>
              <p className="text-3xl font-bold text-blue-600 mt-2">{statistics.processing_count}</p>
              <p className="text-sm text-gray-500 mt-1">{formatCurrency(statistics.processing_amount)}</p>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6">
              <p className="text-sm text-gray-600">Completed Today</p>
              <p className="text-3xl font-bold text-green-600 mt-2">{statistics.completed_today_count}</p>
              <p className="text-sm text-gray-500 mt-1">{formatCurrency(statistics.completed_today_amount)}</p>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6">
              <p className="text-sm text-gray-600">This Month</p>
              <p className="text-3xl font-bold text-purple-600 mt-2">{statistics.month_count}</p>
              <p className="text-sm text-gray-500 mt-1">{formatCurrency(statistics.month_amount)}</p>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6">
              <p className="text-sm text-gray-600">Total Processed</p>
              <p className="text-3xl font-bold text-indigo-600 mt-2">{statistics.total_completed_count}</p>
              <p className="text-sm text-gray-500 mt-1">{formatCurrency(statistics.total_completed_amount)}</p>
            </div>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              {[
                { value: 'all', label: 'All Requests' },
                { value: 'pending', label: 'Pending' },
                { value: 'processing', label: 'Processing' },
                { value: 'completed', label: 'Completed' },
                { value: 'cancelled', label: 'Cancelled' }
              ].map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => setFilter(tab.value)}
                  className={`px-6 py-3 text-sm font-medium ${
                    filter === tab.value
                      ? 'border-b-2 border-purple-600 text-purple-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Cashouts List */}
        <div className="space-y-4">
          {cashouts.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-8 text-center text-gray-500">
              <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p>No cashout requests found</p>
            </div>
          ) : (
            cashouts.map((cashout) => (
              <div key={cashout.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">{getPaymentMethodIcon(cashout.payment_method)}</span>
                        <div>
                          <p className="font-semibold text-gray-900">Reference: {cashout.request_reference}</p>
                          <p className="text-sm text-gray-600">Creator: {cashout.creator_name || `Creator ${cashout.creator_id}`}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span>Requested: {formatDate(cashout.requested_at)}</span>
                        {cashout.assigned_to && (
                          <span>Assigned to: Admin {cashout.assigned_to}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-bold text-purple-600">{formatCurrency(cashout.amount)}</p>
                      {cashout.cashout_fee > 0 && (
                        <p className="text-sm text-gray-500">Fee: {formatCurrency(cashout.cashout_fee)}</p>
                      )}
                      <p className="text-sm font-medium text-gray-900">Net: {formatCurrency(cashout.net_amount)}</p>
                      <span className={`inline-block mt-2 text-xs px-3 py-1 rounded-full ${getStatusColor(cashout.status)}`}>
                        {cashout.status}
                      </span>
                    </div>
                  </div>

                  {/* Payment Details */}
                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">Payment Details:</p>
                    <div className="space-y-1 text-sm text-gray-600">
                      <p className="capitalize">Method: {cashout.payment_method.replace('_', ' ')}</p>
                      {cashout.payment_details && (
                        <>
                          {cashout.payment_details.phone_number && (
                            <p>Phone: {cashout.payment_details.phone_number}</p>
                          )}
                          {cashout.payment_details.account_name && (
                            <p>Name: {cashout.payment_details.account_name}</p>
                          )}
                          {cashout.payment_details.bank_name && (
                            <p>Bank: {cashout.payment_details.bank_name}</p>
                          )}
                          {cashout.payment_details.account_number && (
                            <p>Account: {cashout.payment_details.account_number}</p>
                          )}
                          {cashout.payment_details.branch && (
                            <p>Branch: {cashout.payment_details.branch}</p>
                          )}
                          {cashout.payment_details.pickup_location && (
                            <p>Pickup: {cashout.payment_details.pickup_location}</p>
                          )}
                        </>
                      )}
                    </div>
                    {cashout.notes && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Creator Notes:</span> {cashout.notes}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    {cashout.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleAssignToMe(cashout.id)}
                          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
                        >
                          Assign to Me
                        </button>
                        <button
                          onClick={() => handleProcessClick(cashout)}
                          className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm"
                        >
                          Process Cashout
                        </button>
                        <button
                          onClick={() => handleCancelClick(cashout)}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm"
                        >
                          Cancel
                        </button>
                      </>
                    )}
                    {cashout.status === 'processing' && (
                      <>
                        <button
                          onClick={() => handleProcessClick(cashout)}
                          className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm"
                        >
                          Complete Processing
                        </button>
                        <button
                          onClick={() => handleCancelClick(cashout)}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm"
                        >
                          Cancel
                        </button>
                      </>
                    )}
                    {cashout.status === 'completed' && (
                      <div className="text-sm text-gray-600">
                        <p>Processed by: Admin {cashout.processed_by}</p>
                        <p>Completed: {formatDate(cashout.completed_at)}</p>
                        {cashout.transaction_reference && (
                          <p>Transaction: {cashout.transaction_reference}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Process Cashout Modal */}
      {showProcessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-900">Complete Cashout</h3>
              <button onClick={() => setShowProcessModal(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleProcessSubmit} className="p-6 space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <p className="text-sm text-gray-600">Reference: <span className="font-medium">{selectedCashout.request_reference}</span></p>
                <p className="text-sm text-gray-600">Creator: <span className="font-medium">{selectedCashout.creator_name || `Creator ${selectedCashout.creator_id}`}</span></p>
                <p className="text-sm text-gray-600">Amount: <span className="font-medium text-purple-600 text-lg">{formatCurrency(selectedCashout.net_amount)}</span></p>
                <p className="text-sm text-gray-600">Method: <span className="font-medium capitalize">{selectedCashout.payment_method.replace('_', ' ')}</span></p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Transaction Reference *</label>
                <input
                  type="text"
                  value={processData.transaction_reference}
                  onChange={(e) => setProcessData({ ...processData, transaction_reference: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                  placeholder="e.g., TXN123456 or Confirmation Code"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Enter the transaction reference from your payment system</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Proof URL (Optional)</label>
                <input
                  type="url"
                  value={processData.proof_url}
                  onChange={(e) => setProcessData({ ...processData, proof_url: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                  placeholder="https://..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Admin Notes</label>
                <textarea
                  value={processData.notes}
                  onChange={(e) => setProcessData({ ...processData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                  placeholder="Any notes about the transaction..."
                />
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  <strong>Important:</strong> By clicking "Complete Cashout", you confirm that the payment has been successfully sent to the creator.
                </p>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowProcessModal(false)}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                >
                  Complete Cashout
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancel Cashout Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-900">Cancel Cashout</h3>
              <button onClick={() => setShowCancelModal(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleCancelSubmit} className="p-6 space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <p className="text-sm text-gray-600">Reference: <span className="font-medium">{selectedCashout.request_reference}</span></p>
                <p className="text-sm text-gray-600">Amount: <span className="font-medium">{formatCurrency(selectedCashout.amount)}</span></p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Cancellation Reason *</label>
                <textarea
                  value={cancelData.reason}
                  onChange={(e) => setCancelData({ ...cancelData, reason: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                  placeholder="Please provide a reason for cancelling this cashout request..."
                  required
                />
              </div>

              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800">
                  The creator will be notified of this cancellation and the reason provided.
                </p>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCancelModal(false)}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  Go Back
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                >
                  Cancel Cashout
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
