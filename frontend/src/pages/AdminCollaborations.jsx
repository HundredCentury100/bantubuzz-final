import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  getCollaborations,
  updateCollaborationPayment,
  releaseEscrow,
  approveCancellation,
  rejectCancellation
} from '../services/adminAPI';
import AdminLayout from '../components/admin/AdminLayout';
import {
  BanknotesIcon,
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon,
  PencilIcon
} from '@heroicons/react/24/outline';

export default function AdminCollaborations() {
  const [collaborations, setCollaborations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [error, setError] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedCollab, setSelectedCollab] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchCollaborations();
  }, [filter]);

  const fetchCollaborations = async () => {
    try {
      setLoading(true);
      const params = filter !== 'all' ? { status: filter } : {};
      const response = await getCollaborations(params);
      setCollaborations(response.data.data.collaborations || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load collaborations');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePayment = async (e) => {
    e.preventDefault();
    if (!selectedCollab || !paymentAmount) return;

    try {
      setActionLoading('payment');
      await updateCollaborationPayment(selectedCollab.id, {
        amount: parseFloat(paymentAmount)
      });
      toast.success('Payment updated successfully');
      setShowPaymentModal(false);
      setSelectedCollab(null);
      setPaymentAmount('');
      fetchCollaborations();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update payment');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReleaseEscrow = async (collabId) => {
    if (!confirm('Release escrow funds to creator? This action cannot be undone.')) return;

    try {
      setActionLoading(collabId);
      await releaseEscrow(collabId);
      toast.success('Escrow released successfully');
      fetchCollaborations();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to release escrow');
    } finally {
      setActionLoading(null);
    }
  };

  const handleApproveCancellation = async (collabId) => {
    const progress = prompt('Enter completion progress percentage (0-100):');
    if (!progress || isNaN(progress)) return;

    try {
      setActionLoading(collabId);
      await approveCancellation(collabId, { progress_percentage: parseInt(progress) });
      toast.success('Cancellation approved');
      fetchCollaborations();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to approve cancellation');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectCancellation = async (collabId) => {
    const reason = prompt('Enter reason for rejection:');
    if (!reason) return;

    try {
      setActionLoading(collabId);
      await rejectCancellation(collabId, { reason });
      toast.success('Cancellation rejected');
      fetchCollaborations();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reject cancellation');
    } finally {
      setActionLoading(null);
    }
  };

  const openPaymentModal = (collab) => {
    setSelectedCollab(collab);
    setPaymentAmount(collab.amount || '');
    setShowPaymentModal(true);
  };

  const openDetailsModal = (collab) => {
    setSelectedCollab(collab);
    setShowDetailsModal(true);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      in_progress: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const hasCancellationRequest = (collab) => {
    return collab.cancellation_request && collab.cancellation_request.status === 'pending';
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Collaboration Management</h1>
          <p className="mt-2 text-gray-600">Monitor collaborations, manage payments, and handle cancellations</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex gap-2 flex-wrap">
            {['all', 'pending', 'in_progress', 'completed', 'cancelled'].map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-4 py-2 rounded-lg capitalize transition ${
                  filter === tab
                    ? 'bg-primary text-gray-900'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {tab.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Collaborations Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Creator</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Brand</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {collaborations.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-8 text-center text-gray-500">
                      No collaborations found
                    </td>
                  </tr>
                ) : (
                  collaborations.map((collab) => (
                    <tr key={collab.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">#{collab.id}</td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{collab.title}</div>
                        {hasCancellationRequest(collab) && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                            Cancellation Requested
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {collab.creator?.username || collab.creator?.email}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {collab.brand?.company_name || collab.brand?.email}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                        ${collab.amount?.toFixed(2) || '0.00'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs rounded-full capitalize ${getStatusColor(collab.status)}`}>
                          {collab.status?.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{formatDate(collab.created_at)}</td>
                      <td className="px-6 py-4 text-right text-sm">
                        <div className="flex justify-end space-x-2">
                          {/* Edit Payment */}
                          <button
                            onClick={() => openPaymentModal(collab)}
                            disabled={actionLoading === collab.id}
                            className="text-blue-600 hover:text-blue-900 disabled:opacity-50"
                            title="Edit Payment"
                          >
                            <PencilIcon className="h-5 w-5" />
                          </button>

                          {/* Release Escrow (only for in_progress with payment) */}
                          {collab.status === 'in_progress' && collab.amount > 0 && (
                            <button
                              onClick={() => handleReleaseEscrow(collab.id)}
                              disabled={actionLoading === collab.id}
                              className="text-green-600 hover:text-green-900 disabled:opacity-50"
                              title="Release Escrow"
                            >
                              <BanknotesIcon className="h-5 w-5" />
                            </button>
                          )}

                          {/* Cancellation Actions */}
                          {hasCancellationRequest(collab) && (
                            <>
                              <button
                                onClick={() => handleApproveCancellation(collab.id)}
                                disabled={actionLoading === collab.id}
                                className="text-green-600 hover:text-green-900 disabled:opacity-50"
                                title="Approve Cancellation"
                              >
                                <CheckCircleIcon className="h-5 w-5" />
                              </button>
                              <button
                                onClick={() => handleRejectCancellation(collab.id)}
                                disabled={actionLoading === collab.id}
                                className="text-red-600 hover:text-red-900 disabled:opacity-50"
                                title="Reject Cancellation"
                              >
                                <XCircleIcon className="h-5 w-5" />
                              </button>
                            </>
                          )}

                          {/* View Details */}
                          <button
                            onClick={() => openDetailsModal(collab)}
                            className="text-gray-600 hover:text-gray-900"
                            title="View Details"
                          >
                            <EyeIcon className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-md p-4">
            <p className="text-sm text-gray-600">Total</p>
            <p className="text-2xl font-bold text-gray-900">{collaborations.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <p className="text-sm text-gray-600">In Progress</p>
            <p className="text-2xl font-bold text-blue-600">
              {collaborations.filter(c => c.status === 'in_progress').length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <p className="text-sm text-gray-600">Completed</p>
            <p className="text-2xl font-bold text-green-600">
              {collaborations.filter(c => c.status === 'completed').length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <p className="text-sm text-gray-600">Pending Cancellations</p>
            <p className="text-2xl font-bold text-red-600">
              {collaborations.filter(c => hasCancellationRequest(c)).length}
            </p>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Update Payment Amount
            </h3>
            <form onSubmit={handleUpdatePayment} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Collaboration
                </label>
                <p className="text-sm text-gray-600">{selectedCollab?.title}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Amount ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="input w-full"
                  placeholder="Enter amount"
                  required
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowPaymentModal(false);
                    setSelectedCollab(null);
                    setPaymentAmount('');
                  }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading === 'payment'}
                  className="btn-primary disabled:opacity-50"
                >
                  {actionLoading === 'payment' ? 'Updating...' : 'Update Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedCollab && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-4xl w-full p-6 my-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900">
                Collaboration Details
              </h3>
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedCollab(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircleIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Collaboration ID
                  </label>
                  <p className="text-sm text-gray-900">#{selectedCollab.id}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <span className={`px-2 py-1 text-xs rounded-full capitalize ${getStatusColor(selectedCollab.status)}`}>
                    {selectedCollab.status?.replace('_', ' ')}
                  </span>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title
                  </label>
                  <p className="text-sm text-gray-900">{selectedCollab.title}</p>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <p className="text-sm text-gray-600">{selectedCollab.description || 'No description'}</p>
                </div>
              </div>

              {/* Parties */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Creator
                  </label>
                  <p className="text-sm text-gray-900">
                    {selectedCollab.creator?.username || selectedCollab.creator?.email || 'N/A'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Brand
                  </label>
                  <p className="text-sm text-gray-900">
                    {selectedCollab.brand?.company_name || selectedCollab.brand?.email || 'N/A'}
                  </p>
                </div>
              </div>

              {/* Financial Info */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Amount
                  </label>
                  <p className="text-lg font-semibold text-gray-900">
                    ${selectedCollab.amount?.toFixed(2) || '0.00'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Progress
                  </label>
                  <p className="text-lg font-semibold text-gray-900">
                    {selectedCollab.progress_percentage || 0}%
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type
                  </label>
                  <p className="text-sm text-gray-900 capitalize">
                    {selectedCollab.collaboration_type || 'N/A'}
                  </p>
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Created
                  </label>
                  <p className="text-sm text-gray-900">{formatDate(selectedCollab.created_at)}</p>
                </div>
                {selectedCollab.start_date && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Date
                    </label>
                    <p className="text-sm text-gray-900">{formatDate(selectedCollab.start_date)}</p>
                  </div>
                )}
                {selectedCollab.expected_completion_date && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Expected Completion
                    </label>
                    <p className="text-sm text-gray-900">{formatDate(selectedCollab.expected_completion_date)}</p>
                  </div>
                )}
              </div>

              {/* Deliverables */}
              {(selectedCollab.deliverables?.length > 0 ||
                selectedCollab.draft_deliverables?.length > 0 ||
                selectedCollab.submitted_deliverables?.length > 0) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Deliverables
                  </label>
                  <div className="space-y-2">
                    {selectedCollab.submitted_deliverables?.map((del, idx) => (
                      <div key={idx} className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-sm text-gray-900">{del.title}</p>
                            <p className="text-xs text-gray-600">{del.description || 'No description'}</p>
                          </div>
                          <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full">
                            Approved
                          </span>
                        </div>
                        {del.url && (
                          <a href={del.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">
                            View Deliverable
                          </a>
                        )}
                      </div>
                    ))}
                    {selectedCollab.draft_deliverables?.map((del, idx) => (
                      <div key={idx} className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-sm text-gray-900">{del.title}</p>
                            <p className="text-xs text-gray-600">{del.description || 'No description'}</p>
                          </div>
                          <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full capitalize">
                            {del.status?.replace('_', ' ') || 'Draft'}
                          </span>
                        </div>
                        {del.url && (
                          <a href={del.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">
                            View Deliverable
                          </a>
                        )}
                      </div>
                    ))}
                    {selectedCollab.deliverables?.map((del, idx) => (
                      <div key={idx} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                        <p className="text-sm text-gray-900">{del}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Cancellation Request */}
              {hasCancellationRequest(selectedCollab) && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <label className="block text-sm font-medium text-red-800 mb-2">
                    Cancellation Request
                  </label>
                  <p className="text-sm text-gray-900 mb-1">
                    <strong>Reason:</strong> {selectedCollab.cancellation_request.reason}
                  </p>
                  <p className="text-sm text-gray-600">
                    Requested by: {selectedCollab.cancellation_request.requested_by}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Requested on: {formatDate(selectedCollab.cancellation_request.requested_at)}
                  </p>
                </div>
              )}

              {/* Last Update */}
              {selectedCollab.last_update && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Update
                  </label>
                  <p className="text-sm text-gray-900">{selectedCollab.last_update}</p>
                  {selectedCollab.last_update_date && (
                    <p className="text-xs text-gray-500">{formatDate(selectedCollab.last_update_date)}</p>
                  )}
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedCollab(null);
                }}
                className="btn-primary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
