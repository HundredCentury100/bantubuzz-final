import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { collaborationsAPI } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { useMessaging } from '../contexts/MessagingContext';
import useAutoRefresh from '../hooks/useAutoRefresh';
import Navbar from '../components/Navbar';
import Avatar from '../components/Avatar';
import toast from 'react-hot-toast';

const CollaborationDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [collaboration, setCollaboration] = useState(null);
  const [loading, setLoading] = useState(true);

  // Deliverable submission state
  const [showDeliverableModal, setShowDeliverableModal] = useState(false);
  const [deliverableTitle, setDeliverableTitle] = useState('');
  const [deliverableUrl, setDeliverableUrl] = useState('');
  const [deliverableDescription, setDeliverableDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Revision request state
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [selectedDeliverableForRevision, setSelectedDeliverableForRevision] = useState(null);
  const [revisionNotes, setRevisionNotes] = useState('');
  const [requestingRevision, setRequestingRevision] = useState(false);

  const { socket } = useMessaging();
  const [editingDeliverable, setEditingDeliverable] = useState(null);
  
  const isBrand = user?.user_type === 'brand';

  useEffect(() => {
    fetchCollaboration();
  }, [id]);

  // Auto-refresh collaboration data every 30 seconds (fallback for when WebSocket is not connected)
  useAutoRefresh(() => {
    if (!loading) {
      fetchCollaboration();
    }
  }, 30000, !!collaboration); // Only enable when collaboration is loaded

  // Real-time updates via Socket.IO
  useEffect(() => {
    if (!socket) return;

    const handleCollaborationUpdate = (data) => {
      if (data.collaboration_id === parseInt(id)) {
        console.log('Collaboration updated, refreshing...');
        toast.info('Collaboration updated');
        fetchCollaboration();
      }
    };

    socket.on('collaboration_updated', handleCollaborationUpdate);

    return () => {
      socket.off('collaboration_updated', handleCollaborationUpdate);
    };
  }, [socket, id]);

  const fetchCollaboration = async () => {
    try {
      setLoading(true);
      const response = await collaborationsAPI.getCollaboration(id);
      setCollaboration(response.data);
    } catch (error) {
      console.error('Error fetching collaboration:', error);
      toast.error('Failed to load collaboration details');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitDraftDeliverable = async () => {
    if (!deliverableTitle || !deliverableUrl) {
      toast.error('Please provide both title and URL');
      return;
    }

    try {
      setSubmitting(true);

      if (editingDeliverable) {
        // Update existing deliverable
        await collaborationsAPI.updateDraftDeliverable(id, editingDeliverable.id, {
          title: deliverableTitle,
          url: deliverableUrl,
          description: deliverableDescription
        });
        toast.success('Deliverable updated and resubmitted for review!');
      } else {
        // Submit new deliverable
        await collaborationsAPI.submitDraftDeliverable(id, {
          title: deliverableTitle,
          url: deliverableUrl,
          description: deliverableDescription
        });
        toast.success('Deliverable submitted for review!');
      }

      setShowDeliverableModal(false);
      setDeliverableTitle('');
      setDeliverableUrl('');
      setDeliverableDescription('');
      setEditingDeliverable(null);
      fetchCollaboration();
    } catch (error) {
      console.error('Error submitting deliverable:', error);
      toast.error(editingDeliverable ? 'Failed to update deliverable' : 'Failed to submit deliverable');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveDeliverable = async (deliverableId) => {
    try {
      await collaborationsAPI.approveDeliverable(id, deliverableId);
      toast.success('Deliverable approved! Progress updated automatically.');
      fetchCollaboration();
    } catch (error) {
      console.error('Error approving deliverable:', error);
      toast.error('Failed to approve deliverable');
    }
  };

  const handleRequestRevision = async () => {
    if (!revisionNotes.trim()) {
      toast.error('Please provide revision notes');
      return;
    }

    // Check if this will be a paid revision
    const willBePaid = totalRevisions >= freeRevisions;

    if (willBePaid && revisionFee > 0) {
      try {
        setRequestingRevision(true);
        // Call backend to create booking
        const response = await collaborationsAPI.createRevisionBooking(id, {
          deliverable_id: selectedDeliverableForRevision.id,
          notes: revisionNotes,
          fee: revisionFee
        });

        if (response.data.redirect_to_payment && response.data.booking_id) {
          // Store revision context for after payment
          localStorage.setItem('pending_revision_request', JSON.stringify({
            collaboration_id: parseInt(id),
            deliverable_id: selectedDeliverableForRevision.id,
            deliverable_title: selectedDeliverableForRevision.title,
            notes: revisionNotes,
            fee: revisionFee,
            booking_id: response.data.booking_id
          }));

          // Close modal and redirect to payment
          setShowRevisionModal(false);
          setRevisionNotes('');
          setSelectedDeliverableForRevision(null);

          toast.success('Redirecting to payment for revision fee...');
          navigate(`/brand/revision-payment/${response.data.booking_id}`);
        }
      } catch (error) {
        console.error('Error creating revision booking:', error);
        toast.error('Failed to create revision booking');
      } finally {
        setRequestingRevision(false);
      }
      return;
    }

    // Free revision - proceed normally
    try {
      setRequestingRevision(true);
      const response = await collaborationsAPI.requestRevision(
        id,
        selectedDeliverableForRevision.id,
        revisionNotes
      );

      toast.success('Revision requested. Creator will be notified.');
      setShowRevisionModal(false);
      setRevisionNotes('');
      setSelectedDeliverableForRevision(null);
      fetchCollaboration();
    } catch (error) {
      console.error('Error requesting revision:', error);
      toast.error('Failed to request revision');
    } finally {
      setRequestingRevision(false);
    }
  };

  const handleComplete = async () => {
    if (!window.confirm('Are you sure you want to mark this collaboration as completed?')) {
      return;
    }

    try {
      await collaborationsAPI.completeCollaboration(id);
      toast.success('Collaboration marked as completed!');
      fetchCollaboration();
    } catch (error) {
      console.error('Error completing collaboration:', error);
      toast.error('Failed to complete collaboration');
    }
  };

  const handleCancel = async () => {
    if (isBrand) {
      // Brands must request cancellation
      const reason = window.prompt(
        'Please provide a reason for your cancellation request. Our support team will review it:'
      );
      if (!reason) return;

      try {
        await collaborationsAPI.requestCancellation(id, reason);
        toast.success('Cancellation request submitted to support team for review');
        fetchCollaboration();
      } catch (error) {
        console.error('Error requesting cancellation:', error);
        toast.error(error.response?.data?.error || 'Failed to submit cancellation request');
      }
    } else {
      // Creators can cancel directly
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
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      in_progress: 'bg-primary/20 text-primary-dark',
      completed: 'bg-primary/20 text-primary-dark',
      cancelled: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getDeliverableStatusBadge = (status) => {
    const badges = {
      pending_review: 'bg-yellow-100 text-yellow-800',
      revision_requested: 'bg-orange-100 text-orange-800',
      approved: 'bg-green-100 text-green-800'
    };
    const colors = badges[status] || 'bg-gray-100 text-gray-800';
    const text = status.replace('_', ' ');
    return <span className={`px-2 py-1 rounded text-xs font-medium ${colors}`}>{text}</span>;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-light">
        <Navbar />
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!collaboration) {
    return (
      <div className="min-h-screen bg-light">
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

  const totalExpected = collaboration.deliverables?.length || 0;
  const totalApproved = collaboration.submitted_deliverables?.length || 0;
  const totalDrafts = collaboration.draft_deliverables?.length || 0;
  const totalRevisions = collaboration.total_revisions_used || 0;
  const paidRevisions = collaboration.paid_revisions || 0;
  const freeRevisions = collaboration.creator?.free_revisions || 2;
  const revisionFee = collaboration.creator?.revision_fee || 0;

  // Check if user can submit new deliverables based on expected deliverables count
  const expectedDeliverablesCount = collaboration.deliverables?.length || 0;
  const draftsWithoutRevisions = collaboration.draft_deliverables?.filter(d => d.status !== 'revision_requested').length || 0;
  const totalUniqueDeliverables = draftsWithoutRevisions + totalApproved;
  const canSubmitNewDeliverable = totalUniqueDeliverables < expectedDeliverablesCount;

  return (
    <div className="min-h-screen bg-light">
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

        {/* Cancellation Request Pending Alert */}
        {collaboration.cancellation_request && collaboration.cancellation_request.status === 'pending' && (
          <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-400 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  <span className="font-medium">Cancellation Pending:</span> A cancellation request has been submitted to the support team for review.
                </p>
                <p className="text-xs text-yellow-600 mt-1">Reason: {collaboration.cancellation_request.reason}</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Progress Section */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Progress</h2>

              {/* Progress Bar */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Completion (Auto-calculated)</span>
                  <span className="text-2xl font-bold text-primary">{collaboration.progress_percentage}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-4">
                  <div
                    className="bg-primary h-4 rounded-full transition-all"
                    style={{ width: `${collaboration.progress_percentage}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {totalApproved} of {totalExpected} deliverables approved
                </p>
              </div>

              {/* Latest Update */}
              {collaboration.last_update && (
                <div className="bg-light rounded-lg p-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">Latest Update:</p>
                  <p className="text-gray-700">{collaboration.last_update}</p>
                  <p className="text-xs text-gray-500 mt-2">
                    {new Date(collaboration.last_update_date).toLocaleString()}
                  </p>
                </div>
              )}
            </div>

            {/* Revision Policy (Brand View) */}
            {isBrand && (
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                <h3 className="font-semibold text-primary-dark leading-snug mb-2">Creator's Revision Policy</h3>
                <div className="text-sm text-dark leading-relaxed space-y-1">
                  <p><span className="font-medium">{freeRevisions} free revisions</span> included per collaboration</p>
                  <p>Additional revisions: <span className="font-medium">${revisionFee} each</span></p>
                  <p className="text-xs mt-2">Revisions used: {totalRevisions} ({paidRevisions} paid)</p>
                </div>
              </div>
            )}

            {/* Draft Deliverables (Pending Review) */}
            {totalDrafts > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  Deliverables Pending Review ({totalDrafts})
                </h2>
                <div className="space-y-4">
                  {collaboration.draft_deliverables.map((deliverable) => (
                    <div key={deliverable.id} className="border-2 border-yellow-200 rounded-lg p-4 bg-yellow-50">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-gray-900">{deliverable.title}</h4>
                            {getDeliverableStatusBadge(deliverable.status)}
                          </div>
                          <span className="text-xs text-gray-500">
                            Submitted {new Date(deliverable.submitted_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      {deliverable.description && (
                        <p className="text-sm text-gray-600 mb-3">{deliverable.description}</p>
                      )}
                      {deliverable.revision_notes && (
                        <div className="bg-orange-100 border border-orange-200 rounded p-3 mb-3">
                          <p className="text-xs font-medium text-orange-900 mb-1">Revision Requested:</p>
                          <p className="text-sm text-orange-800">{deliverable.revision_notes}</p>
                          <p className="text-xs text-orange-600 mt-1">
                            {new Date(deliverable.revision_requested_at).toLocaleString()}
                          </p>
                        </div>
                      )}
                      <div className="flex items-center gap-3">
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
                        {!isBrand && deliverable.status === 'revision_requested' && collaboration.status === 'in_progress' && (
                          <button
                            onClick={() => {
                              setEditingDeliverable(deliverable);
                              setDeliverableTitle(deliverable.title);
                              setDeliverableUrl(deliverable.url);
                              setDeliverableDescription(deliverable.description || '');
                              setShowDeliverableModal(true);
                            }}
                            className="ml-auto px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium rounded-lg transition-colors"
                          >
                            Edit & Resubmit
                          </button>
                        )}
                        {isBrand && collaboration.status === 'in_progress' && (
                          <div className="ml-auto flex gap-2">
                            <button
                              onClick={() => handleApproveDeliverable(deliverable.id)}
                              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => {
                                setSelectedDeliverableForRevision(deliverable);
                                setShowRevisionModal(true);
                              }}
                              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium rounded-lg transition-colors"
                            >
                              Request Revision
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Approved Deliverables */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">
                  Approved Deliverables ({totalApproved}/{totalExpected})
                </h2>
                {!isBrand && collaboration.status === 'in_progress' && (
                  <div>
                    <button
                      onClick={() => setShowDeliverableModal(true)}
                      disabled={!canSubmitNewDeliverable}
                      className="px-4 py-2 bg-primary hover:bg-primary-dark text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title={!canSubmitNewDeliverable ? `Maximum ${expectedDeliverablesCount} deliverables allowed for this collaboration` : ''}
                    >
                      Submit for Review
                    </button>
                    {!canSubmitNewDeliverable && (
                      <p className="text-xs text-gray-500 mt-1">
                        Maximum of {expectedDeliverablesCount} deliverables reached. You can only edit existing deliverables.
                      </p>
                    )}
                  </div>
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
                  Submitted & Approved:
                </h3>
                {collaboration.submitted_deliverables && collaboration.submitted_deliverables.length > 0 ? (
                  <div className="space-y-3">
                    {collaboration.submitted_deliverables.map((deliverable, idx) => (
                      <div key={idx} className="border-2 border-green-200 rounded-lg p-4 bg-green-50">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium text-gray-900">{deliverable.title}</h4>
                              <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                                Approved
                              </span>
                            </div>
                            <span className="text-xs text-gray-500">
                              {deliverable.approved_at
                                ? `Approved ${new Date(deliverable.approved_at).toLocaleDateString()}`
                                : `Submitted ${new Date(deliverable.submitted_at).toLocaleDateString()}`}
                            </span>
                          </div>
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
                  <p className="text-gray-500 text-sm">No approved deliverables yet</p>
                )}
              </div>
            </div>

            {/* Revision History */}
            {collaboration.revision_requests && collaboration.revision_requests.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Revision History</h2>
                <div className="space-y-3">
                  {collaboration.revision_requests.map((revision, idx) => (
                    <div key={idx} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-medium text-gray-900">{revision.deliverable_title}</h4>
                          <p className="text-xs text-gray-500">
                            {new Date(revision.requested_at).toLocaleString()}
                          </p>
                        </div>
                        {revision.is_paid && (
                          <span className="px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800">
                            Paid Revision - ${revision.fee}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-700">{revision.notes}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            {collaboration.description && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Description</h2>
                <p className="text-gray-700 whitespace-pre-wrap">{collaboration.description}</p>
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
                  alt={isBrand ? (collaboration.creator?.display_name || collaboration.creator?.username || 'Creator') : collaboration.brand?.company_name}
                  size="lg"
                  type={isBrand ? 'user' : 'brand'}
                />
                <div>
                  <p className="font-medium text-gray-900">
                    {isBrand ? (collaboration.creator?.display_name || collaboration.creator?.username || 'Creator') : collaboration.brand?.company_name}
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
                  {/* Send Message Button - Available for both creators and brands */}
                  <Link
                    to="/messages"
                    state={{
                      startConversationWith: {
                        id: isBrand ? collaboration.creator?.user_id : collaboration.brand?.user_id,
                        name: isBrand ? (collaboration.creator?.display_name || collaboration.creator?.username) : collaboration.brand?.company_name,
                        type: isBrand ? 'creator' : 'brand'
                      }
                    }}
                    className="block w-full px-4 py-3 bg-white border-2 border-primary text-primary hover:bg-primary hover:text-white font-medium rounded-lg transition-colors text-center"
                  >
                    Send Message
                  </Link>

                  {/* Mark as Completed Button - Only for brands */}
                  {isBrand && (
                    <button
                      onClick={handleComplete}
                      className="w-full px-4 py-3 bg-primary hover:bg-primary-dark text-white font-medium rounded-lg transition-colors"
                    >
                      Mark as Completed
                    </button>
                  )}
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

            {/* Cancel Collaboration Link (Less Prominent) */}
            {collaboration.status === 'in_progress' && isBrand && (
              <div className="bg-white rounded-lg shadow p-6">
                <button
                  onClick={handleCancel}
                  className="w-full text-sm text-gray-500 hover:text-red-600 underline transition-colors"
                >
                  Need Help? Request Cancellation
                </button>
                <p className="text-xs text-gray-400 mt-2 text-center">
                  Reviewed by support team
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Deliverable Submission Modal */}
      {showDeliverableModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {editingDeliverable ? 'Edit & Resubmit Deliverable' : 'Submit Deliverable for Review'}
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              {editingDeliverable
                ? 'Update your deliverable based on the revision feedback and resubmit for review.'
                : 'Your deliverable will be submitted for brand review before being marked as approved.'
              }
            </p>

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
                onClick={handleSubmitDraftDeliverable}
                disabled={submitting}
                className="flex-1 px-6 py-3 bg-primary hover:bg-primary-dark text-white font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {submitting ? (editingDeliverable ? 'Updating...' : 'Submitting...') : (editingDeliverable ? 'Update & Resubmit' : 'Submit for Review')}
              </button>
              <button
                onClick={() => {
                  setShowDeliverableModal(false);
                  setDeliverableTitle('');
                  setDeliverableUrl('');
                  setDeliverableDescription('');
                  setEditingDeliverable(null);
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

      {/* Revision Request Modal */}
      {showRevisionModal && selectedDeliverableForRevision && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Request Revision</h2>
            <p className="text-sm text-gray-600 mb-4">
              Deliverable: <span className="font-medium">{selectedDeliverableForRevision.title}</span>
            </p>

            {/* Revision Fee Notice */}
            {totalRevisions >= freeRevisions && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
                <p className="text-sm font-medium text-orange-900">
                  This revision will incur a fee of <span className="font-bold">${revisionFee}</span>
                </p>
                <p className="text-xs text-orange-700 mt-1">
                  You've used all {freeRevisions} free revisions for this collaboration.
                </p>
              </div>
            )}

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Revision Notes <span className="text-red-500">*</span>
              </label>
              <textarea
                value={revisionNotes}
                onChange={(e) => setRevisionNotes(e.target.value)}
                rows={5}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Please provide detailed feedback on what needs to be revised..."
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleRequestRevision}
                disabled={requestingRevision}
                className="flex-1 px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {requestingRevision ? 'Requesting...' : 'Request Revision'}
              </button>
              <button
                onClick={() => {
                  setShowRevisionModal(false);
                  setRevisionNotes('');
                  setSelectedDeliverableForRevision(null);
                }}
                disabled={requestingRevision}
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
