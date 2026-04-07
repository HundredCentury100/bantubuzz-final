import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import AdminLayout from '../../components/admin/AdminLayout';
import StatusBadge from '../../components/admin/StatusBadge';
import api from '../../services/api';

export default function AdminDeposits() {
  const [deposits, setDeposits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending'); // pending, confirmed, failed, all
  const [selectedDeposit, setSelectedDeposit] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [verifyNotes, setVerifyNotes] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchDeposits();
  }, [filter]);

  const fetchDeposits = async () => {
    try {
      setLoading(true);
      const params = filter !== 'all' ? { status: filter } : {};
      const response = await api.get('/admin/deposits', { params });
      setDeposits(response.data.deposits || []);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to load deposits');
    } finally {
      setLoading(false);
    }
  };

  const openVerifyModal = (deposit) => {
    setSelectedDeposit(deposit);
    setShowModal(true);
    setVerifyNotes('');
    setRejectReason('');
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedDeposit(null);
    setVerifyNotes('');
    setRejectReason('');
  };

  const handleVerify = async () => {
    if (!selectedDeposit) return;

    try {
      setProcessing(true);
      await api.post(`/admin/deposits/${selectedDeposit.id}/verify`, {
        notes: verifyNotes
      });
      toast.success('Deposit verified and wallet credited successfully');
      closeModal();
      fetchDeposits();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to verify deposit');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedDeposit || !rejectReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    try {
      setProcessing(true);
      await api.post(`/admin/deposits/${selectedDeposit.id}/reject`, {
        reason: rejectReason
      });
      toast.success('Deposit rejected successfully');
      closeModal();
      fetchDeposits();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to reject deposit');
    } finally {
      setProcessing(false);
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

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'confirmed': return 'success';
      case 'failed': return 'error';
      case 'cancelled': return 'neutral';
      default: return 'neutral';
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Deposit Verification</h1>
          <p className="mt-2 text-gray-600">
            Verify and manage brand wallet deposit requests
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600">Pending Deposits</p>
            <p className="text-2xl font-bold text-orange-600 mt-2">
              {deposits.filter(d => d.status === 'pending').length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600">Confirmed Today</p>
            <p className="text-2xl font-bold text-green-600 mt-2">
              {deposits.filter(d => d.status === 'confirmed' &&
                new Date(d.verified_at).toDateString() === new Date().toDateString()).length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600">Total Amount Pending</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">
              {formatCurrency(deposits.filter(d => d.status === 'pending')
                .reduce((sum, d) => sum + parseFloat(d.amount), 0))}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600">Total Deposits</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">
              {deposits.length}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex gap-2">
            {['all', 'pending', 'confirmed', 'failed'].map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filter === status
                    ? 'bg-primary text-dark'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Deposits Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading deposits...</p>
            </div>
          ) : deposits.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-600">No deposits found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Reference
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Brand
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Payment Method
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {deposits.map((deposit) => (
                    <tr key={deposit.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {deposit.deposit_reference}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {deposit.user?.email || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        {formatCurrency(deposit.amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {deposit.payment_method === 'bank_transfer' ? 'Bank Transfer' : 'Paynow'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge status={getStatusColor(deposit.status)} text={deposit.status} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {formatDate(deposit.requested_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                        {deposit.status === 'pending' && (
                          <button
                            onClick={() => openVerifyModal(deposit)}
                            className="text-primary hover:text-primary-dark font-medium"
                          >
                            Review
                          </button>
                        )}
                        {deposit.proof_of_payment && (
                          <a
                            href={`https://bantubuzz.com/${deposit.proof_of_payment}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 font-medium"
                          >
                            View Proof
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Verification Modal */}
      {showModal && selectedDeposit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Review Deposit Request</h2>
            </div>

            <div className="p-6 space-y-4">
              {/* Deposit Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Reference</p>
                  <p className="font-medium text-gray-900">{selectedDeposit.deposit_reference}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Amount</p>
                  <p className="font-medium text-gray-900">{formatCurrency(selectedDeposit.amount)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Brand Email</p>
                  <p className="font-medium text-gray-900">{selectedDeposit.user?.email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Payment Method</p>
                  <p className="font-medium text-gray-900">
                    {selectedDeposit.payment_method === 'bank_transfer' ? 'Bank Transfer' : 'Paynow'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Requested At</p>
                  <p className="font-medium text-gray-900">{formatDate(selectedDeposit.requested_at)}</p>
                </div>
              </div>

              {/* Proof of Payment */}
              {selectedDeposit.proof_of_payment && (
                <div>
                  <p className="text-sm text-gray-600 mb-2">Proof of Payment</p>
                  <a
                    href={`https://bantubuzz.com/${selectedDeposit.proof_of_payment}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 font-medium"
                  >
                    View Uploaded File →
                  </a>
                </div>
              )}

              {/* Verify Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Verification Notes (optional)
                </label>
                <textarea
                  value={verifyNotes}
                  onChange={(e) => setVerifyNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Add any notes about this deposit verification..."
                />
              </div>

              {/* Rejection Reason */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rejection Reason (if rejecting)
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="Provide a reason if you're rejecting this deposit..."
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={closeModal}
                disabled={processing}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={processing}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {processing ? 'Rejecting...' : 'Reject'}
              </button>
              <button
                onClick={handleVerify}
                disabled={processing}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {processing ? 'Verifying...' : 'Verify & Credit Wallet'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
