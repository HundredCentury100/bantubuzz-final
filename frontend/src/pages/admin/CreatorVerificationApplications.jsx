import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import AdminLayout from '../../components/admin/AdminLayout';
import api from '../../services/api';

export default function CreatorVerificationApplications() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [selectedApp, setSelectedApp] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [previewDoc, setPreviewDoc] = useState(null);

  useEffect(() => {
    fetchApplications();
  }, [filter]);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/verification/applications', {
        params: { status: filter !== 'all' ? filter : undefined }
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
    if (!confirm('Are you sure you want to approve this verification application? This will grant the creator a verified badge.')) {
      return;
    }

    setActionLoading(true);
    try {
      await api.post(`/admin/verification/applications/${appId}/approve`);
      toast.success('Application approved! Creator is now verified.');
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
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getDocumentUrl = (path) => {
    if (!path) return null;
    return `https://bantubuzz.com${path}`;
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
            <h1 className="text-3xl font-bold text-gray-900">Creator Verification Applications</h1>
            <p className="text-gray-500 mt-1">Review creator verification applications with ID documents ($5/month verified badge)</p>
          </div>
          <div className="flex gap-2">
            {[
              { key: 'all', label: `All (${stats.total})`, color: 'gray' },
              { key: 'pending', label: `Pending (${stats.pending})`, color: 'yellow' },
              { key: 'approved', label: `Approved (${stats.approved})`, color: 'green' },
              { key: 'rejected', label: `Rejected (${stats.rejected})`, color: 'red' }
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
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
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
                        <div className="flex items-center gap-3">
                          {app.creator?.profile_picture ? (
                            <img
                              src={app.creator.profile_picture}
                              alt={app.creator.display_name}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                              <span className="text-gray-500 text-sm font-medium">
                                {app.creator?.display_name?.charAt(0) || '?'}
                              </span>
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-gray-900">{app.creator?.display_name || 'Unknown'}</p>
                            <p className="text-xs text-gray-500">@{app.creator?.username || 'N/A'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{app.real_name}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 capitalize">
                        {app.id_type?.replace('_', ' ')}
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
                            className="px-4 py-2 text-sm bg-primary text-dark rounded-lg hover:bg-primary-dark transition font-medium"
                          >
                            Review Application
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
          <div className="bg-white rounded-2xl w-full max-w-5xl shadow-2xl my-8">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">Verification Application Review</h3>
                  <p className="text-sm text-gray-500 mt-1">Application ID: #{selectedApp.id} • Submitted {formatDate(selectedApp.created_at)}</p>
                </div>
                <button
                  onClick={() => setSelectedApp(null)}
                  className="text-gray-400 hover:text-gray-600 transition"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              {/* Creator Info Card */}
              <div className="bg-primary/10 rounded-xl p-4 border border-primary/20">
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Creator Information
                </h4>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500 mb-1">Display Name</p>
                    <p className="font-medium text-gray-900">{selectedApp.creator?.display_name}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 mb-1">Username</p>
                    <p className="font-medium text-gray-900">@{selectedApp.creator?.username}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 mb-1">Email</p>
                    <p className="font-medium text-gray-900">{selectedApp.creator?.email || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Personal Information */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                  </svg>
                  Personal & ID Information
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm bg-gray-50 p-4 rounded-lg">
                  <div>
                    <p className="text-gray-500 mb-1">Real Name (as on ID)</p>
                    <p className="font-medium text-gray-900">{selectedApp.real_name}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 mb-1">ID Type</p>
                    <p className="font-medium text-gray-900 capitalize">{selectedApp.id_type?.replace('_', ' ')}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-gray-500 mb-1">ID Number</p>
                    <p className="font-medium text-gray-900">{selectedApp.id_number}</p>
                  </div>
                  {selectedApp.reason && (
                    <div className="col-span-2">
                      <p className="text-gray-500 mb-1">Reason for Verification</p>
                      <p className="font-medium text-gray-900">{selectedApp.reason}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Documents */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Uploaded Documents
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  {selectedApp.id_document_front && (
                    <div className="border-2 border-gray-200 rounded-xl p-3 hover:border-primary transition">
                      <p className="text-sm font-medium text-gray-700 mb-2">ID/Passport Front</p>
                      <div
                        onClick={() => setPreviewDoc(getDocumentUrl(selectedApp.id_document_front))}
                        className="cursor-pointer group relative"
                      >
                        <img
                          src={getDocumentUrl(selectedApp.id_document_front)}
                          alt="ID Front"
                          className="w-full h-48 object-cover rounded-lg"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center rounded-lg">
                          <span className="text-white text-sm font-medium">Click to view full size</span>
                        </div>
                      </div>
                      <a
                        href={getDocumentUrl(selectedApp.id_document_front)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 text-xs text-primary hover:underline flex items-center gap-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Download
                      </a>
                    </div>
                  )}
                  {selectedApp.selfie_with_id && (
                    <div className="border-2 border-gray-200 rounded-xl p-3 hover:border-primary transition">
                      <p className="text-sm font-medium text-gray-700 mb-2">Selfie with ID</p>
                      <div
                        onClick={() => setPreviewDoc(getDocumentUrl(selectedApp.selfie_with_id))}
                        className="cursor-pointer group relative"
                      >
                        <img
                          src={getDocumentUrl(selectedApp.selfie_with_id)}
                          alt="Selfie"
                          className="w-full h-48 object-cover rounded-lg"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center rounded-lg">
                          <span className="text-white text-sm font-medium">Click to view full size</span>
                        </div>
                      </div>
                      <a
                        href={getDocumentUrl(selectedApp.selfie_with_id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 text-xs text-primary hover:underline flex items-center gap-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Download
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Social Media */}
              {(selectedApp.instagram_verified || selectedApp.tiktok_verified || selectedApp.facebook_verified) && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    Social Media Accounts
                  </h4>
                  <div className="space-y-2 text-sm bg-gray-50 p-4 rounded-lg">
                    {selectedApp.instagram_verified && (
                      <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-pink-600" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                        </svg>
                        <span className="text-gray-600">Instagram:</span>
                        <span className="font-medium text-gray-900">@{selectedApp.instagram_username}</span>
                        <span className="text-gray-500">({selectedApp.instagram_followers?.toLocaleString()} followers)</span>
                      </div>
                    )}
                    {selectedApp.tiktok_verified && (
                      <div className="flex items-center gap-2">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                        </svg>
                        <span className="text-gray-600">TikTok:</span>
                        <span className="font-medium text-gray-900">@{selectedApp.tiktok_username}</span>
                        <span className="text-gray-500">({selectedApp.tiktok_followers?.toLocaleString()} followers)</span>
                      </div>
                    )}
                    {selectedApp.facebook_verified && (
                      <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                        </svg>
                        <span className="text-gray-600">Facebook:</span>
                        <span className="font-medium text-gray-900">{selectedApp.facebook_username}</span>
                        <span className="text-gray-500">({selectedApp.facebook_followers?.toLocaleString()} followers)</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Admin Notes */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Admin Notes (Internal)</label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Add internal notes about this application for other admins..."
                />
                <button
                  onClick={() => handleUpdateNotes(selectedApp.id)}
                  className="mt-2 px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                >
                  Save Notes
                </button>
              </div>

              {/* Rejection Reason Display */}
              {selectedApp.status === 'rejected' && selectedApp.rejection_reason && (
                <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
                  <p className="text-sm font-semibold text-red-900 mb-1 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    Rejection Reason:
                  </p>
                  <p className="text-sm text-red-800">{selectedApp.rejection_reason}</p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            {selectedApp.status === 'pending' && (
              <div className="p-6 border-t border-gray-200 bg-gray-50">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => handleApprove(selectedApp.id)}
                    disabled={actionLoading}
                    className="flex-1 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    {actionLoading ? 'Processing...' : 'Approve & Grant Verified Badge'}
                  </button>
                  <button
                    onClick={() => {
                      const reason = prompt('Enter rejection reason (will be sent to the creator):');
                      if (reason?.trim()) {
                        setRejectReason(reason.trim());
                        handleReject(selectedApp.id);
                      }
                    }}
                    disabled={actionLoading}
                    className="flex-1 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    Reject Application
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Document Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[60] p-4" onClick={() => setPreviewDoc(null)}>
          <div className="relative max-w-6xl max-h-[90vh]">
            <button
              onClick={() => setPreviewDoc(null)}
              className="absolute -top-12 right-0 text-white hover:text-gray-300 transition"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <img
              src={previewDoc}
              alt="Document preview"
              className="max-w-full max-h-[90vh] object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
