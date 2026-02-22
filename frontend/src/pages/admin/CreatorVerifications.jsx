import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import AdminLayout from '../../components/AdminLayout';
import api from '../../services/api';

export default function CreatorVerifications() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending'); // 'all' | 'pending' | 'approved' | 'rejected'
  const [selectedApp, setSelectedApp] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [adminNotes, setAdminNotes] = useState('');

  useEffect(() => {
    fetchApplications();
  }, [filter]);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/verification/applications', {
        params: { status: filter }
      });
      setApplications(response.data.applications || []);
    } catch (error) {
      console.error('Error fetching applications:', error);
      toast.error('Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (appId) => {
    setActionLoading(true);
    try {
      await api.post(`/admin/verification/applications/${appId}/approve`);
      toast.success('Application approved successfully');
      fetchApplications();
      setSelectedApp(null);
    } catch (error) {
      console.error('Error approving application:', error);
      toast.error(error.response?.data?.error || 'Failed to approve application');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (appId) => {
    if (!rejectReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

    setActionLoading(true);
    try {
      await api.post(`/admin/verification/applications/${appId}/reject`, {
        reason: rejectReason
      });
      toast.success('Application rejected');
      fetchApplications();
      setSelectedApp(null);
      setRejectReason('');
    } catch (error) {
      console.error('Error rejecting application:', error);
      toast.error(error.response?.data?.error || 'Failed to reject application');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateNotes = async (appId) => {
    try {
      await api.post(`/admin/verification/applications/${appId}/notes`, {
        notes: adminNotes
      });
      toast.success('Notes saved');
    } catch (error) {
      console.error('Error saving notes:', error);
      toast.error('Failed to save notes');
    }
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const stats = {
    total: applications.length,
    pending: applications.filter(a => a.status === 'pending').length,
    approved: applications.filter(a => a.status === 'approved').length,
    rejected: applications.filter(a => a.status === 'rejected').length
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Creator Verifications</h1>
            <p className="text-gray-500 mt-1">Review and approve creator verification applications</p>
          </div>
          <div className="flex gap-2">
            {[
              { key: 'all', label: `All (${stats.total})` },
              { key: 'pending', label: `Pending (${stats.pending})` },
              { key: 'approved', label: `Approved (${stats.approved})` },
              { key: 'rejected', label: `Rejected (${stats.rejected})` }
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-4 py-2 rounded-lg text-sm transition ${
                  filter === f.key
                    ? 'bg-primary text-dark font-semibold'
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
            <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
            <p className="text-sm text-gray-500 mt-1">Total Applications</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
            <p className="text-3xl font-bold text-yellow-600">{stats.pending}</p>
            <p className="text-sm text-gray-500 mt-1">Pending Review</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
            <p className="text-3xl font-bold text-green-600">{stats.approved}</p>
            <p className="text-sm text-gray-500 mt-1">Approved</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
            <p className="text-3xl font-bold text-red-600">{stats.rejected}</p>
            <p className="text-sm text-gray-500 mt-1">Rejected</p>
          </div>
        </div>

        {/* Applications Table */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : applications.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-gray-500 font-medium">No applications found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Creator</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Real Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Submitted</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {applications.map((app) => (
                    <tr key={app.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-gray-900">{app.creator?.display_name || 'Unknown'}</p>
                          <p className="text-xs text-gray-500">@{app.creator?.username || 'N/A'}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{app.real_name}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 capitalize">
                        {app.id_type.replace('_', ' ')}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{formatDate(app.created_at)}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs rounded-full font-medium capitalize ${
                          app.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          app.status === 'approved' ? 'bg-green-100 text-green-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {app.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center">
                          <button
                            onClick={() => {
                              setSelectedApp(app);
                              setAdminNotes(app.admin_notes || '');
                            }}
                            className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                          >
                            Review
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Application Review Modal */}
      {selectedApp && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg w-full max-w-4xl shadow-xl my-8">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Verification Application</h3>
                  <p className="text-sm text-gray-500">ID #{selectedApp.id}</p>
                </div>
                <button
                  onClick={() => setSelectedApp(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              {/* Personal Info */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Personal Information</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Creator</p>
                    <p className="font-medium text-gray-900">{selectedApp.creator?.display_name}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Username</p>
                    <p className="font-medium text-gray-900">@{selectedApp.creator?.username}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Real Name</p>
                    <p className="font-medium text-gray-900">{selectedApp.real_name}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">ID Type</p>
                    <p className="font-medium text-gray-900 capitalize">{selectedApp.id_type.replace('_', ' ')}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-gray-500">ID Number</p>
                    <p className="font-medium text-gray-900">{selectedApp.id_number}</p>
                  </div>
                  {selectedApp.reason && (
                    <div className="col-span-2">
                      <p className="text-gray-500">Reason for Verification</p>
                      <p className="font-medium text-gray-900">{selectedApp.reason}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Documents */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Uploaded Documents</h4>
                <div className="grid grid-cols-3 gap-4">
                  {selectedApp.id_document_front && (
                    <div>
                      <p className="text-xs text-gray-500 mb-2">ID Front</p>
                      <a
                        href={`https://bantubuzz.com${selectedApp.id_document_front}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block border border-gray-200 rounded-lg p-2 hover:border-primary transition"
                      >
                        <img
                          src={`https://bantubuzz.com${selectedApp.id_document_front}`}
                          alt="ID Front"
                          className="w-full h-32 object-cover rounded"
                        />
                      </a>
                    </div>
                  )}
                  {selectedApp.id_document_back && (
                    <div>
                      <p className="text-xs text-gray-500 mb-2">ID Back</p>
                      <a
                        href={`https://bantubuzz.com${selectedApp.id_document_back}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block border border-gray-200 rounded-lg p-2 hover:border-primary transition"
                      >
                        <img
                          src={`https://bantubuzz.com${selectedApp.id_document_back}`}
                          alt="ID Back"
                          className="w-full h-32 object-cover rounded"
                        />
                      </a>
                    </div>
                  )}
                  {selectedApp.selfie_with_id && (
                    <div>
                      <p className="text-xs text-gray-500 mb-2">Selfie with ID</p>
                      <a
                        href={`https://bantubuzz.com${selectedApp.selfie_with_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block border border-gray-200 rounded-lg p-2 hover:border-primary transition"
                      >
                        <img
                          src={`https://bantubuzz.com${selectedApp.selfie_with_id}`}
                          alt="Selfie"
                          className="w-full h-32 object-cover rounded"
                        />
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Social Media */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Social Media Accounts</h4>
                <div className="space-y-2 text-sm">
                  {selectedApp.instagram_verified && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600">Instagram:</span>
                      <span className="font-medium">@{selectedApp.instagram_username}</span>
                      <span className="text-gray-500">({selectedApp.instagram_followers?.toLocaleString()} followers)</span>
                    </div>
                  )}
                  {selectedApp.tiktok_verified && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600">TikTok:</span>
                      <span className="font-medium">@{selectedApp.tiktok_username}</span>
                      <span className="text-gray-500">({selectedApp.tiktok_followers?.toLocaleString()} followers)</span>
                    </div>
                  )}
                  {selectedApp.facebook_verified && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600">Facebook:</span>
                      <span className="font-medium">{selectedApp.facebook_username}</span>
                      <span className="text-gray-500">({selectedApp.facebook_followers?.toLocaleString()} followers)</span>
                    </div>
                  )}
                  {!selectedApp.instagram_verified && !selectedApp.tiktok_verified && !selectedApp.facebook_verified && (
                    <p className="text-gray-500">No social media accounts linked</p>
                  )}
                </div>
              </div>

              {/* Admin Notes */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Admin Notes</label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Add internal notes about this application..."
                />
                <button
                  onClick={() => handleUpdateNotes(selectedApp.id)}
                  className="mt-2 px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                >
                  Save Notes
                </button>
              </div>

              {/* Rejection Reason (for rejected apps) */}
              {selectedApp.status === 'rejected' && selectedApp.rejection_reason && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm font-semibold text-red-900 mb-1">Rejection Reason:</p>
                  <p className="text-sm text-red-800">{selectedApp.rejection_reason}</p>
                </div>
              )}
            </div>

            {/* Action Buttons (only for pending) */}
            {selectedApp.status === 'pending' && (
              <div className="p-6 border-t border-gray-200 bg-gray-50">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => handleApprove(selectedApp.id)}
                    disabled={actionLoading}
                    className="flex-1 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition disabled:opacity-50"
                  >
                    {actionLoading ? 'Processing...' : 'Approve & Verify Creator'}
                  </button>
                  <button
                    onClick={() => {
                      const reason = prompt('Enter rejection reason:');
                      if (reason) {
                        setRejectReason(reason);
                        handleReject(selectedApp.id);
                      }
                    }}
                    disabled={actionLoading}
                    className="flex-1 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition disabled:opacity-50"
                  >
                    Reject Application
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
