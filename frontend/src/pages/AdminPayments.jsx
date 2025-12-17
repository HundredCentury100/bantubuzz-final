import { useState, useEffect } from 'react';
import api from '../services/api';
import AdminLayout from '../components/admin/AdminLayout';

export default function AdminPayments() {
  const [loading, setLoading] = useState(true);
  const [pendingPayments, setPendingPayments] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [verifyData, setVerifyData] = useState({
    amount: '',
    payment_method: 'bank_transfer',
    transaction_reference: '',
    payment_date: '',
    proof_url: '',
    notes: ''
  });

  const [addPaymentData, setAddPaymentData] = useState({
    booking_id: '',
    amount: '',
    payment_method: 'bank_transfer',
    transaction_reference: '',
    payment_date: '',
    proof_url: '',
    notes: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [paymentsRes, statsRes] = await Promise.all([
        api.get('/admin/payments/pending'),
        api.get('/admin/payments/statistics')
      ]);

      setPendingPayments(paymentsRes.data.payments);
      setStatistics(statsRes.data.statistics);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load payment data');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyClick = (payment) => {
    setSelectedPayment(payment);
    setVerifyData({
      amount: payment.amount,
      payment_method: payment.payment_method || 'bank_transfer',
      transaction_reference: '',
      payment_date: new Date().toISOString().split('T')[0],
      proof_url: payment.payment_proof_url || '',
      notes: ''
    });
    setShowVerifyModal(true);
    setError('');
    setSuccess('');
  };

  const handleVerifySubmit = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/admin/payments/${selectedPayment.id}/verify`, verifyData);
      setSuccess('Payment verified successfully!');
      setShowVerifyModal(false);
      fetchData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to verify payment');
    }
  };

  const handleAddPaymentSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/admin/payments/manual', addPaymentData);
      setSuccess('Manual payment added successfully!');
      setShowAddModal(false);
      setAddPaymentData({
        booking_id: '',
        amount: '',
        payment_method: 'bank_transfer',
        transaction_reference: '',
        payment_date: '',
        proof_url: '',
        notes: ''
      });
      fetchData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add manual payment');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Payment Verification</h1>
            <p className="mt-2 text-gray-600">Manage and verify brand payments</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-primary text-dark px-6 py-3 rounded-lg hover:bg-primary-dark hover:text-white transition flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Manual Payment
          </button>
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-md p-6">
              <p className="text-sm text-gray-600">Pending Verification</p>
              <p className="text-3xl font-bold text-yellow-600 mt-2">{statistics.pending_count}</p>
              <p className="text-sm text-gray-500 mt-1">{formatCurrency(statistics.pending_amount)}</p>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6">
              <p className="text-sm text-gray-600">Verified Today</p>
              <p className="text-3xl font-bold text-green-600 mt-2">{statistics.verified_today_count}</p>
              <p className="text-sm text-gray-500 mt-1">{formatCurrency(statistics.verified_today_amount)}</p>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6">
              <p className="text-sm text-gray-600">This Month</p>
              <p className="text-3xl font-bold text-primary-dark mt-2">{statistics.month_count}</p>
              <p className="text-sm text-gray-500 mt-1">{formatCurrency(statistics.month_amount)}</p>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6">
              <p className="text-sm text-gray-600">Total Verified</p>
              <p className="text-3xl font-bold text-primary mt-2">{statistics.total_verified_count}</p>
              <p className="text-sm text-gray-500 mt-1">{formatCurrency(statistics.total_verified_amount)}</p>
            </div>
          </div>
        )}

        {/* Pending Payments Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Pending Verifications</h2>
          </div>

          {pendingPayments.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p>No pending payments to verify</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Booking ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Brand</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {pendingPayments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">#{payment.booking_id}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {payment.user_name || `User ${payment.user_id}`}
                        <br />
                        <span className="text-xs text-gray-500">{payment.user_email}</span>
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900">{formatCurrency(payment.amount)}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 capitalize">{payment.payment_method || 'manual'}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{formatDate(payment.created_at)}</td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => handleVerifyClick(payment)}
                          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition text-sm"
                        >
                          Verify Payment
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      {/* Verify Payment Modal */}
      {showVerifyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-900">Verify Payment</h3>
              <button onClick={() => setShowVerifyModal(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleVerifySubmit} className="p-6 space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <p className="text-sm text-gray-600">Booking ID: <span className="font-medium">#{selectedPayment.booking_id}</span></p>
                <p className="text-sm text-gray-600">Brand: <span className="font-medium">{selectedPayment.user_name || `User ${selectedPayment.user_id}`}</span></p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Amount *</label>
                <input
                  type="number"
                  value={verifyData.amount}
                  onChange={(e) => setVerifyData({ ...verifyData, amount: e.target.value })}
                  step="0.01"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method *</label>
                <select
                  value={verifyData.payment_method}
                  onChange={(e) => setVerifyData({ ...verifyData, payment_method: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  required
                >
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="ecocash">EcoCash</option>
                  <option value="onemoney">OneMoney</option>
                  <option value="cash">Cash</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Transaction Reference</label>
                <input
                  type="text"
                  value={verifyData.transaction_reference}
                  onChange={(e) => setVerifyData({ ...verifyData, transaction_reference: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="e.g., TXN123456"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Date</label>
                <input
                  type="date"
                  value={verifyData.payment_date}
                  onChange={(e) => setVerifyData({ ...verifyData, payment_date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Proof URL (Optional)</label>
                <input
                  type="url"
                  value={verifyData.proof_url}
                  onChange={(e) => setVerifyData({ ...verifyData, proof_url: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="https://..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Verification Notes</label>
                <textarea
                  value={verifyData.notes}
                  onChange={(e) => setVerifyData({ ...verifyData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Any additional notes..."
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowVerifyModal(false)}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                >
                  Verify Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Manual Payment Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-900">Add Manual Payment</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleAddPaymentSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Booking ID *</label>
                <input
                  type="number"
                  value={addPaymentData.booking_id}
                  onChange={(e) => setAddPaymentData({ ...addPaymentData, booking_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="e.g., 123"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Amount *</label>
                <input
                  type="number"
                  value={addPaymentData.amount}
                  onChange={(e) => setAddPaymentData({ ...addPaymentData, amount: e.target.value })}
                  step="0.01"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method *</label>
                <select
                  value={addPaymentData.payment_method}
                  onChange={(e) => setAddPaymentData({ ...addPaymentData, payment_method: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  required
                >
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="ecocash">EcoCash</option>
                  <option value="onemoney">OneMoney</option>
                  <option value="cash">Cash</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Transaction Reference *</label>
                <input
                  type="text"
                  value={addPaymentData.transaction_reference}
                  onChange={(e) => setAddPaymentData({ ...addPaymentData, transaction_reference: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="e.g., TXN123456"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Date *</label>
                <input
                  type="date"
                  value={addPaymentData.payment_date}
                  onChange={(e) => setAddPaymentData({ ...addPaymentData, payment_date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Proof URL (Optional)</label>
                <input
                  type="url"
                  value={addPaymentData.proof_url}
                  onChange={(e) => setAddPaymentData({ ...addPaymentData, proof_url: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="https://..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                <textarea
                  value={addPaymentData.notes}
                  onChange={(e) => setAddPaymentData({ ...addPaymentData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Payment received directly from brand..."
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-primary text-dark rounded-lg hover:bg-primary-dark hover:text-white transition"
                >
                  Add Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </AdminLayout>
  );
}
