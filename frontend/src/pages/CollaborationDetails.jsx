import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { collaborationsAPI } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import Navbar from '../components/Navbar';
import Avatar from '../components/Avatar';
import toast from 'react-hot-toast';

const CollaborationDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [collaboration, setCollaboration] = useState(null);
  const [loading, setLoading] = useState(true);

  // Progress update state
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [progressPercentage, setProgressPercentage] = useState('');
  const [progressUpdate, setProgressUpdate] = useState('');
  const [updating, setUpdating] = useState(false);

  // Deliverable submission state
  const [showDeliverableModal, setShowDeliverableModal] = useState(false);
  const [deliverableTitle, setDeliverableTitle] = useState('');
  const [deliverableUrl, setDeliverableUrl] = useState('');
  const [deliverableDescription, setDeliverableDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isBrand = user?.user_type === 'brand';

  useEffect(() => {
    fetchCollaboration();
  }, [id]);

  const fetchCollaboration = async () => {
    try {
      setLoading(true);
      const response = await collaborationsAPI.getCollaboration(id);
      setCollaboration(response.data);
      setProgressPercentage(response.data.progress_percentage.toString());
    } catch (error) {
      console.error('Error fetching collaboration:', error);
      toast.error('Failed to load collaboration details');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProgress = async () => {
    if (!progressPercentage || progressPercentage < 0 || progressPercentage > 100) {
      toast.error('Please enter a valid progress percentage (0-100)');
      return;
    }

    try {
      setUpdating(true);
      await collaborationsAPI.updateProgress(id, {
        progress_percentage: parseInt(progressPercentage),
        update: progressUpdate
      });
      toast.success('Progress updated successfully');
      setShowProgressModal(false);
      setProgressUpdate('');
      fetchCollaboration();
    } catch (error) {
      console.error('Error updating progress:', error);
      toast.error('Failed to update progress');
    } finally {
      setUpdating(false);
    }
  };

  const handleSubmitDeliverable = async () => {
    if (!deliverableTitle || !deliverableUrl) {
      toast.error('Please provide both title and URL');
      return;
    }

    try {
      setSubmitting(true);
      await collaborationsAPI.submitDeliverable(id, {
        title: deliverableTitle,
        url: deliverableUrl,
        description: deliverableDescription
      });
      toast.success('Deliverable submitted successfully');
      setShowDeliverableModal(false);
      setDeliverableTitle('');
      setDeliverableUrl('');
      setDeliverableDescription('');
      fetchCollaboration();
    } catch (error) {
      console.error('Error submitting deliverable:', error);
      toast.error('Failed to submit deliverable');
    } finally {
      setSubmitting(false);
    }
  };

  const handleComplete = async () => {
    if (!window.confirm('Are you sure you want to mark this collaboration as completed?')) {
      return;
    }

    try {
      await collaborationsAPI.completeCollaboration(id);
      toast.success('Collaboration marked as completed');
      fetchCollaboration();
    } catch (error) {
      console.error('Error completing collaboration:', error);
      toast.error('Failed to complete collaboration');
    }
  };

  const handleCancel = async () => {
    const reason = window.prompt('Please provide a reason for cancellation:');
    if (!reason) return;

    try {
      await collaborationsAPI.cancelCollaboration(id, reason);
      toast.success('Collaboration cancelled');
      fetchCollaboration();
    } catch (error) {
      console.error('Error cancelling collaboration:', error);
      toast.error('Failed to cancel collaboration');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      in_progress: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!collaboration) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Collaboration not found</h2>
          <Link to={`/${isBrand ? 'brand' : 'creator'}/collaborations`} className="text-primary hover:text-primary-dark">
            Back to Collaborations
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            to={`/${isBrand ? 'brand' : 'creator'}/collaborations`}
            className="text-gray-600 hover:text-gray-900 flex items-center gap-2 mb-4"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Collaborations
          </Link>

          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-gray-900">{collaboration.title}</h1>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(collaboration.status)}`}>
                  {collaboration.status.replace('_', ' ')}
                </span>
              </div>
              <p className="text-gray-600">
                {collaboration.collaboration_type === 'campaign' ? 'Campaign Collaboration' : 'Package Collaboration'}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Progress Section */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Progress</h2>
                {!isBrand && collaboration.status === 'in_progress' && (
                  <button
                    onClick={() => setShowProgressModal(true)}
                    className="px-4 py-2 bg-primary hover:bg-primary-dark text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    Update Progress
                  </button>
                )}
              </div>

              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Completion</span>
                  <span className="text-2xl font-bold text-primary">{collaboration.progress_percentage}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-4">
                  <div
                    className="bg-primary h-4 rounded-full transition-all"
                    style={{ width: `${collaboration.progress_percentage}%` }}
                  ></div>
                </div>
              </div>

              {/* Latest Update */}
              {collaboration.last_update && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">Latest Update:</p>
                  <p className="text-gray-700">{collaboration.last_update}</p>
                  <p className="text-xs text-gray-500 mt-2">
                    {new Date(collaboration.last_update_date).toLocaleString()}
                  </p>
                </div>
              )}
            </div>

            {/* Deliverables Section */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Deliverables</h2>
                {!isBrand && collaboration.status === 'in_progress' && (
                  <button
                    onClick={() => setShowDeliverableModal(true)}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    Submit Deliverable
                  </button>
                )}
              </div>

              {/* Expected Deliverables */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Expected:</h3>
                <ul className="space-y-2">
                  {collaboration.deliverables?.map((deliverable, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-gray-700">
                      <svg className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{deliverable}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Submitted Deliverables */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">
                  Submitted: ({collaboration.submitted_deliverables?.length || 0})
                </h3>
                {collaboration.submitted_deliverables && collaboration.submitted_deliverables.length > 0 ? (
                  <div className="space-y-3">
                    {collaboration.submitted_deliverables.map((deliverable, idx) => (
                      <div key={idx} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-medium text-gray-900">{deliverable.title}</h4>
                          <span className="text-xs text-gray-500">
                            {new Date(deliverable.submitted_at).toLocaleDateString()}
                          </span>
                        </div>
                        {deliverable.description && (
                          <p className="text-sm text-gray-600 mb-2">{deliverable.description}</p>
                        )}
                        <a
                          href={deliverable.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:text-primary-dark flex items-center gap-1"
                        >
                          View Deliverable
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">No deliverables submitted yet</p>
                )}
              </div>
            </div>

            {/* Description */}
            {collaboration.description && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Description</h2>
                <p className="text-gray-700 whitespace-pre-wrap">{collaboration.description}</p>
              </div>
            )}

            {/* Notes */}
            {collaboration.notes && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Notes</h2>
                <p className="text-gray-700 whitespace-pre-wrap">{collaboration.notes}</p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Stats Card */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Details</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600">Amount</p>
                  <p className="text-2xl font-bold text-primary">${collaboration.amount}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Start Date</p>
                  <p className="text-gray-900">
                    {new Date(collaboration.start_date).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Expected Completion</p>
                  <p className="text-gray-900">
                    {collaboration.expected_completion_date
                      ? new Date(collaboration.expected_completion_date).toLocaleDateString()
                      : 'Not set'}
                  </p>
                </div>
                {collaboration.actual_completion_date && (
                  <div>
                    <p className="text-sm text-gray-600">Completed On</p>
                    <p className="text-gray-900">
                      {new Date(collaboration.actual_completion_date).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Partner Info */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                {isBrand ? 'Creator' : 'Brand'}
              </h3>
              <div className="flex items-center gap-3">
                <Avatar
                  src={isBrand ? collaboration.creator?.profile_picture : collaboration.brand?.logo}
                  alt={isBrand ? collaboration.creator?.user?.email?.split('@')[0] : collaboration.brand?.company_name}
                  size="lg"
                  type={isBrand ? 'user' : 'brand'}
                />
                <div>
                  <p className="font-medium text-gray-900">
                    {isBrand ? collaboration.creator?.user?.email?.split('@')[0] : collaboration.brand?.company_name}
                  </p>
                  {isBrand && collaboration.creator?.follower_count && (
                    <p className="text-sm text-gray-600">
                      {collaboration.creator.follower_count.toLocaleString()} followers
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            {collaboration.status === 'in_progress' && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Actions</h3>
                <div className="space-y-3">
                  {isBrand && (
                    <button
                      onClick={handleComplete}
                      className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
                    >
                      Mark as Completed
                    </button>
                  )}
                  <button
                    onClick={handleCancel}
                    className="w-full px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
                  >
                    Cancel Collaboration
                  </button>
                </div>
              </div>
            )}

            {/* Review Button */}
            {collaboration.status === 'completed' && isBrand && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Feedback</h3>
                <Link
                  to={`/${isBrand ? 'brand' : 'creator'}/collaborations/${id}/review`}
                  className="block w-full px-4 py-3 bg-primary hover:bg-primary-dark text-white font-medium rounded-lg transition-colors text-center"
                >
                  Leave a Review
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Progress Update Modal */}
      {showProgressModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Update Progress</h2>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Progress Percentage
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={progressPercentage}
                onChange={(e) => setProgressPercentage(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Update Message (Optional)
              </label>
              <textarea
                value={progressUpdate}
                onChange={(e) => setProgressUpdate(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Describe what you've accomplished..."
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleUpdateProgress}
                disabled={updating}
                className="flex-1 px-6 py-3 bg-primary hover:bg-primary-dark text-white font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {updating ? 'Updating...' : 'Update'}
              </button>
              <button
                onClick={() => {
                  setShowProgressModal(false);
                  setProgressUpdate('');
                }}
                disabled={updating}
                className="px-6 py-3 border-2 border-gray-300 hover:border-gray-400 text-gray-700 font-medium rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deliverable Submission Modal */}
      {showDeliverableModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Submit Deliverable</h2>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={deliverableTitle}
                onChange={(e) => setDeliverableTitle(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="e.g., Instagram Post #1"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                URL <span className="text-red-500">*</span>
              </label>
              <input
                type="url"
                value={deliverableUrl}
                onChange={(e) => setDeliverableUrl(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="https://..."
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description (Optional)
              </label>
              <textarea
                value={deliverableDescription}
                onChange={(e) => setDeliverableDescription(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Add any notes about this deliverable..."
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleSubmitDeliverable}
                disabled={submitting}
                className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Submit'}
              </button>
              <button
                onClick={() => {
                  setShowDeliverableModal(false);
                  setDeliverableTitle('');
                  setDeliverableUrl('');
                  setDeliverableDescription('');
                }}
                disabled={submitting}
                className="px-6 py-3 border-2 border-gray-300 hover:border-gray-400 text-gray-700 font-medium rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CollaborationDetails;
