import { useState } from 'react';
import { toast } from 'react-hot-toast';
import EnforcementActionModal from './EnforcementActionModal';

const AdminReportReviewModal = ({ report, onClose, onActionTaken }) => {
  const [showEnforcementModal, setShowEnforcementModal] = useState(false);
  const [selectedAction, setSelectedAction] = useState(null);
  const [dismissing, setDismissing] = useState(false);

  const reportData = report.report;
  const userProfile = report.user_profile;

  const handleTakeAction = (actionType) => {
    setSelectedAction(actionType);
    setShowEnforcementModal(true);
  };

  const handleDismiss = async () => {
    if (!window.confirm('Are you sure you want to dismiss this report? This action cannot be undone.')) {
      return;
    }

    setDismissing(true);
    try {
      // Call dismiss action directly (we'll add this to EnforcementActionModal)
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/admin/moderation/reports/${reportData.id}/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          action_type: 'dismiss',
          reason: 'Report reviewed and dismissed by admin'
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success('Report dismissed successfully');
        onActionTaken();
      } else {
        toast.error(data.error || 'Failed to dismiss report');
      }
    } catch (error) {
      console.error('Error dismissing report:', error);
      toast.error('Failed to dismiss report');
    } finally {
      setDismissing(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'reviewed':
        return 'bg-blue-100 text-blue-800';
      case 'action_taken':
        return 'bg-green-100 text-green-800';
      case 'dismissed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-3xl">
          <div>
            <h2 className="text-2xl font-bold text-dark">Report Review</h2>
            <p className="text-sm text-gray-600 mt-1">{reportData.report_number}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Report Info */}
          <div className="bg-gray-50 rounded-2xl p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Status</p>
                <span className={`inline-block mt-1 px-3 py-1 text-xs font-medium rounded-full ${getStatusBadgeColor(reportData.status)}`}>
                  {reportData.status}
                </span>
              </div>
              <div>
                <p className="text-sm text-gray-600">Category</p>
                <p className="text-sm font-medium text-dark mt-1">{reportData.report_category}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Submitted</p>
                <p className="text-sm font-medium text-dark mt-1">{formatDate(reportData.created_at)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Conversation ID</p>
                <p className="text-sm font-medium text-dark mt-1">{reportData.conversation_id}</p>
              </div>
            </div>
          </div>

          {/* Description */}
          {reportData.description && (
            <div>
              <h3 className="text-lg font-bold text-dark mb-2">Report Description</h3>
              <div className="bg-gray-50 rounded-2xl p-4">
                <p className="text-sm text-gray-700">{reportData.description}</p>
              </div>
            </div>
          )}

          {/* Reporter Info */}
          <div>
            <h3 className="text-lg font-bold text-dark mb-3">Reporter</h3>
            <div className="bg-gray-50 rounded-2xl p-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="text-sm font-medium text-dark mt-1">{reportData.reporter?.email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">User Type</p>
                  <p className="text-sm font-medium text-dark mt-1">{reportData.reporter?.user_type}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Reported User Info */}
          <div>
            <h3 className="text-lg font-bold text-dark mb-3">Reported User</h3>
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="text-sm font-medium text-dark mt-1">{reportData.reported_user?.email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">User Type</p>
                  <p className="text-sm font-medium text-dark mt-1">{reportData.reported_user?.user_type}</p>
                </div>
              </div>

              {/* User Restrictions */}
              {(reportData.reported_user?.is_messaging_restricted || reportData.reported_user?.is_account_suspended) && (
                <div className="bg-red-100 rounded-xl p-3 mb-4">
                  <p className="text-sm font-medium text-red-800 mb-2">Active Restrictions:</p>
                  {reportData.reported_user?.is_messaging_restricted && (
                    <p className="text-xs text-red-700">
                      • Messaging Restricted
                      {reportData.reported_user?.messaging_restricted_until && ` until ${formatDate(reportData.reported_user.messaging_restricted_until)}`}
                    </p>
                  )}
                  {reportData.reported_user?.is_account_suspended && (
                    <p className="text-xs text-red-700">
                      • Account Suspended
                      {reportData.reported_user?.account_suspended_until && ` until ${formatDate(reportData.reported_user.account_suspended_until)}`}
                    </p>
                  )}
                </div>
              )}

              {/* User Statistics */}
              <div className="grid grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-dark">{userProfile.statistics.reports_received}</p>
                  <p className="text-xs text-gray-600">Reports</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-dark">{userProfile.statistics.active_violations}</p>
                  <p className="text-xs text-gray-600">Violations</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-dark">{userProfile.statistics.blocks_received}</p>
                  <p className="text-xs text-gray-600">Blocks</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-dark">{userProfile.statistics.safety_warnings}</p>
                  <p className="text-xs text-gray-600">Warnings</p>
                </div>
              </div>
            </div>
          </div>

          {/* Violation History */}
          {userProfile.violations && userProfile.violations.length > 0 && (
            <div>
              <h3 className="text-lg font-bold text-dark mb-3">Violation History</h3>
              <div className="space-y-2">
                {userProfile.violations.map((violation) => (
                  <div key={violation.id} className="bg-gray-50 rounded-2xl p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <span className="text-sm font-medium text-dark">{violation.violation_type}</span>
                        <span className="ml-2 text-xs text-gray-600">({violation.severity})</span>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-full ${violation.status === 'active' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-600'}`}>
                        {violation.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mb-2">{violation.description}</p>
                    <p className="text-xs text-gray-500">
                      {formatDate(violation.created_at)}
                      {violation.action_expires_at && ` • Expires: ${formatDate(violation.action_expires_at)}`}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Taken Info (if already actioned) */}
          {reportData.action_taken && (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
              <h3 className="text-lg font-bold text-dark mb-2">Action Taken</h3>
              <p className="text-sm font-medium text-green-800 mb-2">{reportData.action_taken}</p>
              {reportData.action_notes && (
                <p className="text-sm text-gray-700">{reportData.action_notes}</p>
              )}
              <p className="text-xs text-gray-500 mt-2">
                Taken: {formatDate(reportData.action_taken_at)}
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        {reportData.status === 'pending' && (
          <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex gap-3 rounded-b-3xl">
            <button
              onClick={() => handleTakeAction('warn')}
              className="flex-1 px-4 py-3 bg-yellow-500 text-white rounded-full hover:bg-yellow-600 transition-colors font-medium"
            >
              Issue Warning
            </button>
            <button
              onClick={() => handleTakeAction('restrict_messaging')}
              className="flex-1 px-4 py-3 bg-orange-500 text-white rounded-full hover:bg-orange-600 transition-colors font-medium"
            >
              Restrict Messaging
            </button>
            <button
              onClick={() => handleTakeAction('suspend_account')}
              className="flex-1 px-4 py-3 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors font-medium"
            >
              Suspend Account
            </button>
            <button
              onClick={handleDismiss}
              disabled={dismissing}
              className="flex-1 px-4 py-3 bg-gray-500 text-white rounded-full hover:bg-gray-600 transition-colors font-medium disabled:opacity-50"
            >
              {dismissing ? 'Dismissing...' : 'Dismiss'}
            </button>
          </div>
        )}

        {reportData.status !== 'pending' && (
          <div className="px-6 py-4 border-t border-gray-200">
            <button
              onClick={onClose}
              className="w-full px-4 py-3 bg-gray-100 text-dark rounded-full hover:bg-gray-200 transition-colors font-medium"
            >
              Close
            </button>
          </div>
        )}
      </div>

      {/* Enforcement Action Modal */}
      {showEnforcementModal && (
        <EnforcementActionModal
          reportId={reportData.id}
          reportedUser={reportData.reported_user}
          actionType={selectedAction}
          onClose={() => setShowEnforcementModal(false)}
          onSuccess={() => {
            setShowEnforcementModal(false);
            onActionTaken();
          }}
        />
      )}
    </div>
  );
};

export default AdminReportReviewModal;
