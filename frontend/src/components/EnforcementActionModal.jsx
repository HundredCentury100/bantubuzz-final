import { useState } from 'react';
import { toast } from 'react-hot-toast';

const EnforcementActionModal = ({ reportId, reportedUser, actionType, onClose, onSuccess }) => {
  const [duration, setDuration] = useState('7');
  const [reason, setReason] = useState('');
  const [severity, setSeverity] = useState('moderate');
  const [submitting, setSubmitting] = useState(false);

  const getActionTitle = () => {
    switch (actionType) {
      case 'warn':
        return 'Issue Warning';
      case 'restrict_messaging':
        return 'Restrict Messaging';
      case 'suspend_account':
        return 'Suspend Account';
      default:
        return 'Take Action';
    }
  };

  const getActionDescription = () => {
    switch (actionType) {
      case 'warn':
        return 'Issue a formal warning to this user. This will be recorded in their violation history.';
      case 'restrict_messaging':
        return 'Prevent this user from sending messages for a specified duration. They will still be able to browse and view content.';
      case 'suspend_account':
        return 'Suspend this user\'s account for a specified duration. They will not be able to access the platform during this time.';
      default:
        return '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!reason.trim() || reason.trim().length < 20) {
      toast.error('Please provide a detailed reason (minimum 20 characters)');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/admin/moderation/reports/${reportId}/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          action_type: actionType,
          action_duration_days: actionType !== 'warn' ? parseInt(duration) : null,
          reason: reason.trim(),
          severity
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success(data.message || 'Enforcement action taken successfully');
        onSuccess();
      } else {
        toast.error(data.error || 'Failed to take enforcement action');
      }
    } catch (error) {
      console.error('Error taking enforcement action:', error);
      toast.error('Failed to take enforcement action');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-red-50 border-b border-red-200 px-6 py-4 rounded-t-3xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-red-800">{getActionTitle()}</h2>
              <p className="text-sm text-red-600 mt-1">This action will be logged and cannot be undone</p>
            </div>
            <button
              onClick={onClose}
              className="text-red-400 hover:text-red-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Description */}
          <div className="bg-gray-50 rounded-2xl p-4">
            <p className="text-sm text-gray-700">{getActionDescription()}</p>
          </div>

          {/* User Info */}
          <div>
            <h3 className="text-lg font-bold text-dark mb-2">Target User</h3>
            <div className="bg-gray-50 rounded-2xl p-4">
              <p className="text-sm font-medium text-dark">{reportedUser?.email}</p>
              <p className="text-xs text-gray-600 mt-1">User Type: {reportedUser?.user_type}</p>
            </div>
          </div>

          {/* Severity */}
          <div>
            <label className="block text-sm font-medium text-dark mb-2">
              Severity Level <span className="text-red-500">*</span>
            </label>
            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="minor">Minor - First offense or minor violation</option>
              <option value="moderate">Moderate - Clear violation of policies</option>
              <option value="severe">Severe - Serious or repeated violations</option>
            </select>
          </div>

          {/* Duration (not for warnings) */}
          {actionType !== 'warn' && (
            <div>
              <label className="block text-sm font-medium text-dark mb-2">
                Duration <span className="text-red-500">*</span>
              </label>
              <select
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="1">1 day</option>
                <option value="3">3 days</option>
                <option value="7">7 days (1 week)</option>
                <option value="14">14 days (2 weeks)</option>
                <option value="30">30 days (1 month)</option>
                <option value="90">90 days (3 months)</option>
                <option value="365">365 days (1 year)</option>
              </select>
              <p className="text-xs text-gray-500 mt-2">
                The restriction will automatically expire after this duration.
              </p>
            </div>
          )}

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-dark mb-2">
              Reason for Action <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              minLength={20}
              rows={4}
              placeholder="Provide a detailed explanation for this enforcement action (minimum 20 characters)..."
              className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
            />
            <p className="text-xs text-gray-500 mt-2">
              {reason.length} characters (minimum 20 required)
            </p>
          </div>

          {/* Preview */}
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
            <h4 className="text-sm font-bold text-blue-800 mb-2">User will receive:</h4>
            <div className="bg-white rounded-xl p-3">
              <p className="text-sm text-dark mb-2">
                <strong>Action:</strong> {getActionTitle()}
              </p>
              {actionType !== 'warn' && (
                <p className="text-sm text-dark mb-2">
                  <strong>Duration:</strong> {duration} {parseInt(duration) === 1 ? 'day' : 'days'}
                </p>
              )}
              <p className="text-sm text-dark">
                <strong>Severity:</strong> {severity.charAt(0).toUpperCase() + severity.slice(1)}
              </p>
            </div>
            <p className="text-xs text-blue-700 mt-2">
              The user will be notified via email. This action will appear in their violation history.
            </p>
          </div>

          {/* Warning */}
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
            <div className="flex items-start gap-2">
              <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-red-800">Warning</p>
                <p className="text-xs text-red-700 mt-1">
                  This enforcement action will be permanently recorded and cannot be undone.
                  Please ensure you have thoroughly reviewed the report and user history before proceeding.
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 px-6 py-3 bg-gray-100 text-dark rounded-full hover:bg-gray-200 transition-colors font-medium disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !reason.trim() || reason.trim().length < 20}
              className="flex-1 px-6 py-3 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Taking Action...' : `Confirm ${getActionTitle()}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EnforcementActionModal;
