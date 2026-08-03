import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { collaborationsAPI } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { useMessaging } from '../contexts/MessagingContext';
import useAutoRefresh from '../hooks/useAutoRefresh';
import Navbar from '../components/Navbar';
import Avatar from '../components/Avatar';
import DeliverableURLInput from '../components/DeliverableURLInput';
import PostMetricsDisplay from '../components/PostMetricsDisplay';
import CollaborationAnalytics from '../components/CollaborationAnalytics';
import MarkCompleteButton from '../components/MarkCompleteButton';
import PortfolioFormModal from '../components/PortfolioFormModal';
import toast from 'react-hot-toast';

const getDeliveryTiming = (dateValue) => {
  if (!dateValue) return null;
  const dueDate = new Date(dateValue);
  if (Number.isNaN(dueDate.getTime())) return null;
  const diffMs = dueDate.getTime() - Date.now();
  const overdue = diffMs < 0;
  const absMs = Math.abs(diffMs);
  const days = Math.floor(absMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((absMs / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((absMs / (1000 * 60)) % 60);
  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0 || days > 0) parts.push(`${hours}h`);
  parts.push(`${minutes}m`);
  return {
    dueDate,
    overdue,
    within12Hours: !overdue && diffMs <= 12 * 60 * 60 * 1000,
    label: parts.join(' '),
  };
};

const getDeliverableLabel = (deliverable, fallback = 'Deliverable') => {
  if (typeof deliverable === 'string') return deliverable;
  if (!deliverable || typeof deliverable !== 'object') return fallback;

  const platform = deliverable.platform || deliverable.post_platform || deliverable.channel;
  const contentType = deliverable.content_type || deliverable.type || deliverable.deliverable_type || deliverable.title || deliverable.name;
  const quantity = deliverable.quantity || deliverable.count;

  const parts = [];
  if (platform) parts.push(String(platform));
  if (quantity) parts.push(String(quantity));
  if (contentType) parts.push(String(contentType));

  return parts.length ? parts.join(' ') : fallback;
};

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
  const [bulkDraftTitles, setBulkDraftTitles] = useState([]);
  const [sharedDraftUrl, setSharedDraftUrl] = useState('');
  const [draftLinksByTitle, setDraftLinksByTitle] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Revision request state
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [selectedDeliverableForRevision, setSelectedDeliverableForRevision] = useState(null);
  const [revisionNotes, setRevisionNotes] = useState('');
  const [requestingRevision, setRequestingRevision] = useState(false);
  const [approvingDeliverable, setApprovingDeliverable] = useState(null); // Track which deliverable is being approved
  const [approvingAll, setApprovingAll] = useState(false); // Track if approving all

  // Cancel collaboration state (creator only)
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  // Success Story modal state
  const [showSuccessStoryModal, setShowSuccessStoryModal] = useState(false);

  const { socket } = useMessaging();
  const [editingDeliverable, setEditingDeliverable] = useState(null);

  const isBrand = user?.user_type === 'brand';
  const requiresContentReview =
    collaboration?.requires_content_review !== false &&
    collaboration?.requires_content_review !== 'false' &&
    collaboration?.requires_content_review !== 0 &&
    collaboration?.requires_content_review !== '0';
  const deliveryTiming = getDeliveryTiming(collaboration?.expected_completion_date);
  const isEditingUserInput =
    showDeliverableModal ||
    showRevisionModal ||
    showCancelModal ||
    showSuccessStoryModal ||
    !!editingDeliverable ||
    submitting ||
    requestingRevision ||
    cancelling;

  useEffect(() => {
    fetchCollaboration();
  }, [id]);

  // Auto-refresh collaboration data every 30 seconds (fallback for when WebSocket is not connected)
  useAutoRefresh(() => {
    if (!loading && !isEditingUserInput) {
      fetchCollaboration();
    }
  }, 30000, !!collaboration && !isEditingUserInput); // Only enable when collaboration is loaded and the user is not editing

  // Real-time updates via Socket.IO
  useEffect(() => {
    if (!socket) return;

    const handleCollaborationUpdate = (data) => {
      if (data.collaboration_id === parseInt(id)) {
        if (isEditingUserInput) {
          return;
        }
        console.log('Collaboration updated, refreshing...');
        toast.info('Collaboration updated');
        fetchCollaboration();
      }
    };

    socket.on('collaboration_updated', handleCollaborationUpdate);

    return () => {
      socket.off('collaboration_updated', handleCollaborationUpdate);
    };
  }, [socket, id, isEditingUserInput]);

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
    if (bulkDraftTitles.length > 0) {
      const sharedUrl = sharedDraftUrl.trim();
      const missingTitle = bulkDraftTitles.find((title) => !sharedUrl && !draftLinksByTitle[title]?.trim());

      if (missingTitle) {
        toast.error(`Please add a Google Drive link for ${missingTitle}, or use one shared link for all items.`);
        return;
      }

      try {
        setSubmitting(true);
        for (const title of bulkDraftTitles) {
          await collaborationsAPI.submitDraftDeliverable(id, {
            title,
            url: sharedUrl || draftLinksByTitle[title].trim(),
            description: sharedUrl
              ? 'Same content submitted across all platforms via shared Google Drive link.'
              : `Platform-specific Google Drive draft for ${title}.`
          });
        }

        toast.success('Draft content submitted for review!');
        setShowDeliverableModal(false);
        setBulkDraftTitles([]);
        setSharedDraftUrl('');
        setDraftLinksByTitle({});
        fetchCollaboration();
      } catch (error) {
        console.error('Error submitting deliverables:', error);
        toast.error(error.response?.data?.error || 'Failed to submit draft content');
      } finally {
        setSubmitting(false);
      }
      return;
    }

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
      setBulkDraftTitles([]);
      setSharedDraftUrl('');
      setDraftLinksByTitle({});
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
    // Prevent double-clicking
    if (approvingDeliverable === deliverableId) {
      return;
    }

    try {
      setApprovingDeliverable(deliverableId);
      const response = await collaborationsAPI.approveDeliverable(id, deliverableId);
      toast.success('Deliverable approved! Progress updated automatically.');
      fetchCollaboration();
    } catch (error) {
      console.error('Error approving deliverable:', error);

      // Check if this is a real error or just a timeout after success
      const errorMessage = error.response?.data?.error || error.message;

      // If error is network/timeout related, don't show error - just refetch
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout') || !error.response) {
        console.log('Network issue but approval may have succeeded. Refetching data...');
        fetchCollaboration();
      } else {
        // Real error from backend
        toast.error(errorMessage || 'Failed to approve deliverable');
      }
    } finally {
      setApprovingDeliverable(null);
    }
  };

  const handleApproveAll = async () => {
    if (approvingAll) return;

    try {
      setApprovingAll(true);
      const response = await collaborationsAPI.approveAllDeliverables(id);
      toast.success(`Successfully approved ${response.data.approved_count} deliverable(s)!`);
      fetchCollaboration();
    } catch (error) {
      console.error('Error approving all deliverables:', error);
      const errorMessage = error.response?.data?.error || error.message;
      toast.error(errorMessage || 'Failed to approve all deliverables');
    } finally {
      setApprovingAll(false);
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
      // Brands must request cancellation - creates a formal dispute
      const reason = window.prompt(
        'Please provide a detailed reason for your cancellation request (minimum 20 characters). A dispute will be created and reviewed by our support team:'
      );
      if (!reason) return;

      if (reason.trim().length < 20) {
        toast.error('Please provide a detailed reason (minimum 20 characters)');
        return;
      }

      try {
        const response = await collaborationsAPI.requestCancellation(id, reason);

        if (response.data.dispute_reference) {
          toast.success(
            `Cancellation dispute ${response.data.dispute_reference} created. Support team will review your request.`,
            { duration: 5000 }
          );
        } else {
          toast.success('Cancellation request submitted to support team for review');
        }

        fetchCollaboration();
      } catch (error) {
        console.error('Error requesting cancellation:', error);
        const errorMessage = error.response?.data?.error || error.response?.data?.message || 'Failed to submit cancellation request';
        toast.error(errorMessage);
      }
    } else {
      // Creators: show cancel modal
      setShowCancelModal(true);
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancelReason.trim() || cancelReason.trim().length < 10) {
      toast.error('Please provide a detailed reason (minimum 10 characters)');
      return;
    }

    try {
      setCancelling(true);
      const response = await collaborationsAPI.cancelCollaboration(id, cancelReason.trim());

      toast.success('Collaboration cancelled. Rating penalty has been applied.');
      setShowCancelModal(false);
      setCancelReason('');
      fetchCollaboration();
    } catch (error) {
      console.error('Error cancelling collaboration:', error);
      const errorMessage = error.response?.data?.error || 'Failed to cancel collaboration';
      toast.error(errorMessage);
    } finally {
      setCancelling(false);
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

  const expectedDeliverables = Array.isArray(collaboration.deliverables)
    ? collaboration.deliverables.map((deliverable, index) => getDeliverableLabel(deliverable, `Deliverable ${index + 1}`))
    : [];
  const submittedDeliverables = Array.isArray(collaboration.submitted_deliverables) ? collaboration.submitted_deliverables : [];
  const draftDeliverables = Array.isArray(collaboration.draft_deliverables) ? collaboration.draft_deliverables : [];
  const packageDeliverables = Array.isArray(collaboration.package_deliverables) ? collaboration.package_deliverables : [];
  const revisionRequests = Array.isArray(collaboration.revision_requests) ? collaboration.revision_requests : [];
  const totalExpected = expectedDeliverables.length;
  const totalApproved = submittedDeliverables.length;
  const totalDrafts = draftDeliverables.length;
  const totalRevisions = collaboration.total_revisions_used || 0;
  const paidRevisions = collaboration.paid_revisions || 0;
  const freeRevisions = collaboration.creator?.free_revisions || 2;
  const revisionFee = collaboration.creator?.revision_fee || 0;

  // Check if user can submit new deliverables based on expected deliverables count
  const expectedDeliverablesCount = expectedDeliverables.length;
  const draftsWithoutRevisions = draftDeliverables.filter(d => d.status !== 'revision_requested').length || 0;
  const totalUniqueDeliverables = draftsWithoutRevisions + totalApproved;
  const canSubmitNewDeliverable = totalUniqueDeliverables < expectedDeliverablesCount;
  const missingExpectedDeliverables = totalExpected === 0;

  return (
    <div className="min-h-screen bg-light">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-28 sm:pb-8">
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

        {collaboration.status === 'in_progress' && deliveryTiming && (
          <div className={`mb-6 rounded-2xl border-2 p-4 ${
            deliveryTiming.overdue
              ? 'border-red-200 bg-red-50'
              : deliveryTiming.within12Hours
                ? 'border-amber-200 bg-amber-50'
                : 'border-primary/30 bg-primary/10'
          }`}>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className={`font-semibold ${
                  deliveryTiming.overdue ? 'text-red-900' : deliveryTiming.within12Hours ? 'text-amber-900' : 'text-dark'
                }`}>
                  {deliveryTiming.overdue ? 'Delivery is overdue' : `Delivery due in ${deliveryTiming.label}`}
                </p>
                <p className="mt-1 text-sm text-gray-700">
                  Due {deliveryTiming.dueDate.toLocaleString()}
                  {!isBrand && deliveryTiming.within12Hours && !deliveryTiming.overdue
                    ? '. Late delivery may impact your ratings.'
                    : ''}
                </p>
              </div>
              {!isBrand && deliveryTiming.within12Hours && !deliveryTiming.overdue && (
                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-amber-900">
                  12-hour reminder
                </span>
              )}
            </div>
          </div>
        )}

        {/* Live URLs Submitted - Awaiting Brand Review */}
        {isBrand && collaboration.status === 'in_progress' && collaboration.live_urls_submitted_at && (
          <div className="mb-6 bg-green-50 border-l-4 border-green-400 p-4 rounded-r-lg">
            <div className="flex items-start justify-between">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-green-700">
                    <span className="font-medium">Live Post URLs Submitted!</span>
                  </p>
                  <p className="text-sm text-green-600 mt-2">
                    Creator submitted live post URLs on {new Date(collaboration.live_urls_submitted_at).toLocaleDateString()}. Please review the posts and mark this collaboration as complete when satisfied.
                  </p>
                  {collaboration.auto_complete_eligible_at && (
                    <p className="text-xs text-green-700 mt-2">
                      <span className="font-medium">Auto-complete:</span> This collaboration will automatically complete on {new Date(collaboration.auto_complete_eligible_at).toLocaleDateString()} if not marked complete sooner.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Cancellation Request Pending Alert */}
        {collaboration.cancellation_request && collaboration.cancellation_request.status === 'pending' && (
          <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg">
            <div className="flex items-start justify-between">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-700">
                    <span className="font-medium">Cancellation Dispute Pending:</span> {collaboration.cancellation_request.dispute_reference && (
                      <span className="font-mono bg-yellow-100 px-2 py-0.5 rounded text-xs">
                        {collaboration.cancellation_request.dispute_reference}
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-yellow-600 mt-2">
                    A cancellation dispute has been submitted to the support team for review.
                  </p>
                  <p className="text-xs text-yellow-600 mt-2">
                    <span className="font-medium">Reason:</span> {collaboration.cancellation_request.reason}
                  </p>
                  {isBrand && collaboration.cancellation_request.dispute_reference && (
                    <p className="text-xs text-yellow-700 mt-2">
                      You can track this dispute in your notifications or contact support for updates.
                    </p>
                  )}
                  {!isBrand && (
                    <p className="text-xs text-yellow-700 mt-2">
                      The brand has requested to cancel this collaboration. Support will review and notify you of the decision.
                    </p>
                  )}
                </div>
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
              {collaboration.last_update && collaboration.last_update_date && (
                <div className="bg-light rounded-lg p-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">Latest Update:</p>
                  <p className="text-gray-700">{collaboration.last_update}</p>
                  <p className="text-xs text-gray-500 mt-2">
                    {new Date(collaboration.last_update_date).toLocaleString('en-ZA', {
                      timeZone: 'Africa/Johannesburg',
                      dateStyle: 'medium',
                      timeStyle: 'short'
                    })}
                  </p>
                </div>
              )}
            </div>

            {missingExpectedDeliverables && (
              <div className="rounded-lg border-2 border-amber-200 bg-amber-50 p-5">
                <h2 className="text-lg font-bold text-amber-950">Deliverables missing</h2>
                <p className="mt-2 text-sm text-amber-900">
                  This collaboration was created without expected deliverables, so delivery actions are disabled for safety.
                  Future package and campaign-cart collaborations are blocked from activating without at least one deliverable.
                </p>
                <p className="mt-2 text-xs text-amber-800">
                  Collaboration ID: {collaboration.id}. An admin can complete, cancel, or recreate it with deliverables from the admin collaboration tools.
                </p>
              </div>
            )}

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

            {/* CONTENT REVIEW = YES: Two-Stage Workflow */}
            {requiresContentReview && !missingExpectedDeliverables && (
              <div className="space-y-6">
                {/* Expected Content Section */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Expected Content</h2>
                  <ul className="space-y-2">
                    {expectedDeliverables.map((deliverable, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-gray-700">
                        <svg className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>{deliverable}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Collaboration Brief (Visible to Both Creator and Brand) */}
                {(collaboration.brief || collaboration.guidelines || collaboration.rules || collaboration.additional_notes) && (
                  <div className="bg-blue-50 border-2 border-blue-200 rounded-lg shadow p-6">
                    <h2 className="text-xl font-bold text-blue-900 mb-4">
                      {isBrand ? 'Your Collaboration Brief' : 'Collaboration Brief from Brand'}
                    </h2>

                    {collaboration.brief && (
                      <div className="mb-4">
                        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">What to Do</p>
                        <p className="text-gray-900 whitespace-pre-wrap bg-white p-4 rounded-lg border border-blue-100">{collaboration.brief}</p>
                      </div>
                    )}

                    {collaboration.guidelines && (
                      <div className="mb-4">
                        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Brief & Guidelines</p>
                        <p className="text-gray-900 whitespace-pre-wrap bg-white p-4 rounded-lg border border-blue-100">{collaboration.guidelines}</p>
                      </div>
                    )}

                    {collaboration.rules && (
                      <div className="mb-4">
                        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Rules & Expectations</p>
                        <p className="text-gray-900 whitespace-pre-wrap bg-white p-4 rounded-lg border border-blue-100">{collaboration.rules}</p>
                      </div>
                    )}

                    {collaboration.additional_notes && (
                      <div>
                        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Additional Notes</p>
                        <p className="text-gray-900 whitespace-pre-wrap bg-white p-4 rounded-lg border border-blue-100">{collaboration.additional_notes}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* STAGE 1: Content Pending Review */}
                {totalDrafts > 0 && (
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-xl font-bold text-gray-900">
                        Content Pending Review ({totalDrafts})
                      </h2>
                      {/* Approve All Button - Only show for brands when there are multiple pending items */}
                      {isBrand && collaboration.status === 'in_progress' && draftDeliverables.filter(d => d.status === 'pending_review').length > 1 && (
                        <button
                          onClick={handleApproveAll}
                          disabled={approvingAll || approvingDeliverable !== null}
                          className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                          {approvingAll ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                              Approving All...
                            </>
                          ) : (
                            <>
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Approve All
                            </>
                          )}
                        </button>
                      )}
                    </div>
                    <div className="space-y-4">
                      {draftDeliverables.map((deliverable) => (
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
                              View Content
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
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
                                  disabled={approvingDeliverable === deliverable.id}
                                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {approvingDeliverable === deliverable.id ? 'Approving...' : 'Approve Content'}
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedDeliverableForRevision(deliverable);
                                    setShowRevisionModal(true);
                                  }}
                                  disabled={approvingDeliverable === deliverable.id}
                                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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

                {/* Creator: Expected Content Cards with Individual Submit Buttons */}
                {!isBrand && collaboration.status === 'in_progress' && (
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-xl font-bold text-gray-900">
                        Your Content Items
                      </h2>
                      {/* Submit All Button - Show when multiple items can be submitted */}
                      {canSubmitNewDeliverable && expectedDeliverables.length > 1 && (
                        <button
                          onClick={() => {
                            const pendingTitles = expectedDeliverables.filter(delivName => {
                              // Check if this deliverable hasn't been submitted yet
                              const alreadySubmitted = draftDeliverables.some(d => d.title === delivName && d.status !== 'revision_requested') ||
                                                      submittedDeliverables.some(d => d.title === delivName);
                              return !alreadySubmitted;
                            });
                            setBulkDraftTitles(pendingTitles);
                            setSharedDraftUrl('');
                            setDraftLinksByTitle({});
                            setDeliverableTitle('');
                            setDeliverableUrl('');
                            setDeliverableDescription('');
                            setEditingDeliverable(null);
                            setShowDeliverableModal(true);
                          }}
                          className="px-6 py-3 bg-primary hover:bg-primary-dark text-white font-medium rounded-lg transition-colors flex items-center gap-2"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Submit All
                        </button>
                      )}
                    </div>

                    <div className="space-y-4">
                      {expectedDeliverables.map((deliverableName, idx) => {
                        // Check if this deliverable has been submitted (as draft or approved)
                        const draftVersion = draftDeliverables.find(d => d.title === deliverableName);
                        const approvedVersion = submittedDeliverables.find(d => d.title === deliverableName);
                        const isSubmitted = (draftVersion && draftVersion.status !== 'revision_requested') || approvedVersion;

                        return (
                          <div
                            key={idx}
                            className={`border-2 rounded-lg p-4 ${
                              approvedVersion
                                ? 'border-green-200 bg-green-50'
                                : isSubmitted
                                  ? 'border-yellow-200 bg-yellow-50'
                                  : 'border-gray-200 bg-gray-50'
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-medium text-gray-900">{deliverableName}</h4>
                                  {approvedVersion && (
                                    <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                                      Approved
                                    </span>
                                  )}
                                  {isSubmitted && !approvedVersion && (
                                    <span className="px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                                      Pending Review
                                    </span>
                                  )}
                                  {!isSubmitted && !approvedVersion && (
                                    <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-600">
                                      Not Submitted
                                    </span>
                                  )}
                                </div>
                                {isSubmitted && draftVersion && (
                                  <span className="text-xs text-gray-500">
                                    Submitted {new Date(draftVersion.submitted_at).toLocaleDateString()}
                                  </span>
                                )}
                              </div>

                              {/* Individual Submit Button */}
                              {!isSubmitted && !approvedVersion && (
                                <button
                                  onClick={() => {
                                    setBulkDraftTitles([]);
                                    setSharedDraftUrl('');
                                    setDraftLinksByTitle({});
                                    setDeliverableTitle(deliverableName);
                                    setDeliverableUrl('');
                                    setDeliverableDescription('');
                                    setEditingDeliverable(null);
                                    setShowDeliverableModal(true);
                                  }}
                                  className="ml-4 px-3 py-2 bg-primary hover:bg-primary-dark text-white text-sm font-medium rounded-lg transition-colors flex-shrink-0"
                                >
                                  <span className="hidden sm:inline">Submit Content for Review</span>
                                  <span className="inline sm:hidden">Submit</span>
                                </button>
                              )}
                            </div>

                            {/* Show draft content URL if submitted */}
                            {isSubmitted && draftVersion && (
                              <div className="mt-3">
                                <a
                                  href={draftVersion.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm text-primary hover:text-primary-dark flex items-center gap-1"
                                >
                                  View Submitted Content
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                  </svg>
                                </a>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {totalUniqueDeliverables === 0 && (
                      <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <p className="text-sm text-blue-900">
                          <span className="font-semibold">Ready to start?</span> Submit your draft content for each item above for brand review.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* STAGE 2: Live Posts (Only appears when content is approved) */}
                {submittedDeliverables.length > 0 && (
                  <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">
                      Live Posts ({totalApproved}/{totalExpected})
                    </h2>

                    {/* Notification for Creator after approval */}
                    {!isBrand && submittedDeliverables.some(d => !d.post_url) && (
                      <div className="mb-6 bg-green-50 border-2 border-green-300 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <svg className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <div>
                            <p className="font-semibold text-green-900 mb-1">Your content has been approved!</p>
                            <p className="text-sm text-green-800">
                              You can now post it live on your social media platforms and submit your post URL{submittedDeliverables.filter(d => !d.post_url).length > 1 ? 's' : ''} here.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Waiting state for Brand after approval */}
                    {isBrand && submittedDeliverables.some(d => !d.post_url) && (
                      <div className="mb-6 bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <svg className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <div>
                            <p className="font-semibold text-blue-900 mb-1">Content approved. Waiting for creator to post live.</p>
                            <p className="text-sm text-blue-800">
                              The creator will post the approved content to their social media and submit their URL{submittedDeliverables.filter(d => !d.post_url).length > 1 ? 's' : ''} here.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="space-y-3">
                      {submittedDeliverables.map((deliverable, idx) => (
                        <div key={idx} className="border-2 border-green-200 rounded-lg p-4 bg-green-50">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium text-gray-900">{deliverable.title}</h4>
                                <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                                  Content Approved
                                </span>
                              </div>
                              <span className="text-xs text-gray-500">
                                Approved {new Date(deliverable.approved_at || deliverable.submitted_at).toLocaleDateString()}
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
                            className="text-sm text-primary hover:text-primary-dark flex items-center gap-1 mb-3"
                          >
                            View Approved Content
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>

                          {/* Post URL Input for Live Post (Creator Only) */}
                          {!isBrand && (
                            <DeliverableURLInput
                              collaborationId={parseInt(id)}
                              deliverableId={deliverable.id}
                              deliverable={deliverable}
                              onSuccess={(updatedDeliverable) => {
                                fetchCollaboration();
                              }}
                            />
                          )}

                          {/* Post Performance Metrics */}
                          {deliverable.post_url && deliverable.url_validation_status === 'valid' && (
                            <PostMetricsDisplay
                              collaborationId={parseInt(id)}
                              deliverableId={deliverable.id}
                              deliverable={deliverable}
                              milestoneId={null}
                              isBrand={isBrand}
                              collaborationAmount={collaboration.amount}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* CONTENT REVIEW = NO: Direct Post Workflow - No Draft Review */}
            {!requiresContentReview && !missingExpectedDeliverables && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  Live Posts
                </h2>

                {/* Status Message */}
                {!collaboration.live_urls_submitted_at && (
                  <div className={`mb-6 rounded-lg p-4 border-2 ${isBrand ? 'bg-yellow-50 border-yellow-200' : 'bg-blue-50 border-blue-200'}`}>
                    <p className={`text-sm font-medium ${isBrand ? 'text-yellow-900' : 'text-blue-900'}`}>
                      {isBrand
                        ? '⏳ Waiting for creator to post live and submit their URLs.'
                        : '✍️ Your collaboration is active. Post your content live and submit your post URL below.'}
                    </p>
                  </div>
                )}

                {/* Collaboration Brief (Visible to Both Creator and Brand) */}
                {(collaboration.brief || collaboration.guidelines || collaboration.rules || collaboration.additional_notes) && (
                  <div className="bg-blue-50 border-2 border-blue-200 rounded-lg shadow p-6 mb-6">
                    <h2 className="text-xl font-bold text-blue-900 mb-4">
                      {isBrand ? 'Your Collaboration Brief' : 'Collaboration Brief from Brand'}
                    </h2>

                    {collaboration.brief && (
                      <div className="mb-4">
                        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">What to Do</p>
                        <p className="text-gray-900 whitespace-pre-wrap bg-white p-4 rounded-lg border border-blue-100">{collaboration.brief}</p>
                      </div>
                    )}

                    {collaboration.guidelines && (
                      <div className="mb-4">
                        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Brief & Guidelines</p>
                        <p className="text-gray-900 whitespace-pre-wrap bg-white p-4 rounded-lg border border-blue-100">{collaboration.guidelines}</p>
                      </div>
                    )}

                    {collaboration.rules && (
                      <div className="mb-4">
                        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Rules & Expectations</p>
                        <p className="text-gray-900 whitespace-pre-wrap bg-white p-4 rounded-lg border border-blue-100">{collaboration.rules}</p>
                      </div>
                    )}

                    {collaboration.additional_notes && (
                      <div>
                        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Additional Notes</p>
                        <p className="text-gray-900 whitespace-pre-wrap bg-white p-4 rounded-lg border border-blue-100">{collaboration.additional_notes}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Expected Posts with Direct URL Submission */}
                <div className="space-y-4">
                  {expectedDeliverables.map((deliverableName, idx) => {
                    // For NO track, find matching record from submitted_deliverables or package_deliverables
                    const submittedPost = submittedDeliverables.find(d => d.title === deliverableName) ||
                                         packageDeliverables.find(d => d.title === deliverableName);

                    return (
                      <div key={idx} className={`rounded-lg p-4 border-2 ${submittedPost?.post_url ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
                        <div className="flex items-start gap-3 mb-3">
                          <svg className={`w-6 h-6 flex-shrink-0 mt-0.5 ${submittedPost?.post_url ? 'text-green-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <div className="flex-1">
                            <h3 className="font-medium text-gray-900 mb-1">{deliverableName}</h3>
                            {submittedPost?.post_url ? (
                              <span className="text-xs text-green-700">✓ URL Submitted</span>
                            ) : (
                              <span className="text-xs text-gray-600">Pending URL submission</span>
                            )}
                          </div>
                        </div>

                        {/* URL Input or Display */}
                        {submittedPost?.post_url ? (
                          <div>
                            {submittedPost.post_url?.startsWith('http') ? (
                              <a
                                href={submittedPost.post_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-primary hover:text-primary-dark flex items-center gap-1 mb-3"
                              >
                                View Live Post
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                              </a>
                            ) : (
                              <p className="mb-3 text-sm text-green-800">
                                Facebook Post ID: <span className="font-mono">{submittedPost.post_id || submittedPost.post_url}</span>
                              </p>
                            )}

                            {/* Post Performance Metrics */}
                            {submittedPost.url_validation_status === 'valid' && (
                              <PostMetricsDisplay
                                collaborationId={parseInt(id)}
                                deliverableId={submittedPost.id}
                                deliverable={submittedPost}
                                milestoneId={null}
                                isBrand={isBrand}
                                collaborationAmount={collaboration.amount}
                              />
                            )}
                          </div>
                        ) : (
                          // Show URL input for creator, or waiting message for brand
                          !isBrand ? (
                            submittedPost ? (
                              <DeliverableURLInput
                                collaborationId={parseInt(id)}
                                deliverableId={submittedPost.id}
                                deliverable={submittedPost}
                                onSuccess={() => fetchCollaboration()}
                              />
                            ) : (
                              <div className="text-sm text-gray-600 bg-blue-50 border border-blue-200 rounded p-3">
                                Post this content live on your social media first. Once posted, you'll be able to submit your post URL here.
                              </div>
                            )
                          ) : (
                            <div className="text-sm text-gray-600">
                              Waiting for creator to post and submit URL...
                            </div>
                          )
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Revision History */}
            {revisionRequests.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Revision History</h2>
                <div className="space-y-3">
                  {revisionRequests.map((revision, idx) => (
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

            {/* Collaboration Analytics (Aggregated Post Metrics) */}
            {totalApproved > 0 && (
              <CollaborationAnalytics
                collaborationId={parseInt(id)}
                isBrand={isBrand}
                collaborationAmount={collaboration.amount}
              />
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

                  {/* Mark as Completed Button - Available to brands for active collaborations */}
                  {isBrand && (
                    <MarkCompleteButton
                      collaborationId={parseInt(id)}
                      collaborationTitle={collaboration.title}
                      creatorName={collaboration.creator?.display_name || collaboration.creator?.username || 'Creator'}
                      amount={collaboration.amount}
                      onSuccess={() => {
                        toast.success('Collaboration completed! Payment released to creator.');
                        fetchCollaboration();
                      }}
                      className="w-full"
                    />
                  )}
                </div>
              </div>
            )}

            {/* Review Button - Brand */}
            {collaboration.status === 'completed' && isBrand && !collaboration.has_review && (
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

            {collaboration.status === 'completed' && isBrand && collaboration.has_review && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-2">Feedback</h3>
                <p className="text-sm text-gray-600">Review submitted for this collaboration.</p>
              </div>
            )}

            {/* Add to Success Stories Button - Creator */}
            {collaboration.status === 'completed' && !isBrand && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Success Stories</h3>
                <button
                  onClick={() => setShowSuccessStoryModal(true)}
                  className="block w-full px-4 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors text-center flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add to Success Stories
                </button>
                <p className="text-xs text-gray-500 mt-2 text-center">
                  Showcase this collaboration on your profile
                </p>
              </div>
            )}

            {/* Cancel Collaboration Link */}
            {collaboration.status === 'in_progress' && (
              <div className="bg-white rounded-lg shadow p-6">
                <button
                  onClick={handleCancel}
                  className="w-full text-sm text-gray-500 hover:text-red-600 underline transition-colors"
                >
                  {isBrand ? 'Need Help? Request Cancellation' : 'Cancel Collaboration'}
                </button>
                <p className="text-xs text-gray-400 mt-2 text-center">
                  {isBrand ? 'Reviewed by support team' : 'Rating penalty applies'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Deliverable Submission Modal */}
      {showDeliverableModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {bulkDraftTitles.length > 0
                ? (requiresContentReview ? 'Submit Draft Content for Review' : 'Submit Live Post URLs')
                : editingDeliverable
                ? (requiresContentReview ? 'Edit & Resubmit Deliverable' : 'Edit Delivery')
                : (requiresContentReview ? 'Submit Deliverable for Review' : 'Submit Live Post URL')}
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              {bulkDraftTitles.length > 0
                ? (requiresContentReview
                  ? 'Upload your draft content to Google Drive, set sharing to Anyone with the link, then submit the matching link below.'
                  : 'Paste the live post URL or post ID for each content item once it has been published.')
                : editingDeliverable
                ? (requiresContentReview
                  ? 'Update your deliverable based on the revision feedback and resubmit for review.'
                  : 'Update the live post URL or post ID for this delivery.')
                : (requiresContentReview
                  ? 'Your deliverable will be submitted for brand review before being marked as approved.'
                  : 'Submit the live post URL or platform post ID for this deliverable.')
              }
            </p>

            {bulkDraftTitles.length > 0 ? (
              <div className="space-y-5 mb-6">
                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                  <p className="text-sm font-semibold text-gray-900 mb-3">Content items in this package</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {bulkDraftTitles.map((title) => (
                      <div key={title} className="rounded-xl bg-white border border-gray-200 px-3 py-2 text-sm text-gray-800">
                        {title}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-primary/30 bg-primary/10 p-4">
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Are you posting the same content across all platforms?
                  </label>
                  <p className="text-xs text-gray-700 mb-3">
                    {requiresContentReview
                      ? 'Upload to Google Drive, set sharing to Anyone with the link, and paste the link here.'
                      : 'If the same live post is used for all items, paste the public URL or post ID here.'}
                  </p>
                  <input
                    type="url"
                    value={sharedDraftUrl}
                    onChange={(e) => setSharedDraftUrl(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder={requiresContentReview ? 'https://drive.google.com/...' : 'https://www.tiktok.com/@creator/video/...'}
                    disabled={submitting}
                  />
                </div>

                <div>
                  <p className="text-sm font-semibold text-gray-900 mb-2">Different content per platform</p>
                  <p className="text-xs text-gray-600 mb-3">
                    {requiresContentReview
                      ? 'Leave the shared link empty and paste a separate Google Drive link for each item. Make sure each file is shared with Anyone with the link.'
                      : 'Leave the shared field empty and paste a separate live URL or post ID for each platform.'}
                  </p>
                  <div className="space-y-3">
                    {bulkDraftTitles.map((title) => (
                      <div key={title}>
                        <label className="block text-xs font-medium text-gray-700 mb-1">{title}</label>
                        <input
                          type="url"
                          value={draftLinksByTitle[title] || ''}
                          onChange={(e) => setDraftLinksByTitle((current) => ({ ...current, [title]: e.target.value }))}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                          placeholder={requiresContentReview ? 'https://drive.google.com/...' : 'https://www.tiktok.com/@creator/video/...'}
                          disabled={submitting || !!sharedDraftUrl.trim()}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <>
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
                {requiresContentReview ? 'Google Drive Link' : 'Live Post URL or Post ID'} <span className="text-red-500">*</span>
              </label>
              <input
                type="url"
                value={deliverableUrl}
                onChange={(e) => setDeliverableUrl(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder={requiresContentReview ? 'https://drive.google.com/...' : 'https://www.tiktok.com/@creator/video/...'}
              />
              <p className="mt-2 text-xs text-gray-500">
                {requiresContentReview
                  ? 'Upload your draft to Google Drive and set sharing to Anyone with the link before submitting.'
                  : 'Paste the public live post URL or the platform post ID after publishing.'}
              </p>
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
              </>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleSubmitDraftDeliverable}
                disabled={submitting}
                className="flex-1 px-6 py-3 bg-primary hover:bg-primary-dark text-white font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {submitting
                  ? (editingDeliverable ? 'Updating...' : 'Submitting...')
                  : (editingDeliverable
                    ? (requiresContentReview ? 'Update & Resubmit' : 'Update Delivery')
                    : (requiresContentReview ? 'Submit for Review' : 'Submit Delivery'))}
              </button>
              <button
                onClick={() => {
                  setShowDeliverableModal(false);
                  setDeliverableTitle('');
                  setDeliverableUrl('');
                  setDeliverableDescription('');
                  setBulkDraftTitles([]);
                  setSharedDraftUrl('');
                  setDraftLinksByTitle({});
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

      {/* Cancel Collaboration Modal (Creator Only) */}
      {showCancelModal && !isBrand && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Cancel Collaboration</h2>

            {/* Warning Notice */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-3">
                <svg className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <p className="font-semibold text-red-900 mb-1">Rating Penalty Warning</p>
                  <p className="text-sm text-red-800">
                    Cancelling this collaboration will apply a <span className="font-bold">-0.10 star penalty</span> to your creator rating (maximum -0.50 stars from cancellations).
                  </p>
                  <p className="text-xs text-red-700 mt-2">
                    The brand will be automatically refunded ${parseFloat(collaboration.amount || 0).toFixed(2)} to their wallet.
                  </p>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for Cancellation <span className="text-red-500">*</span>
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={5}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Please provide a detailed reason for cancelling this collaboration (minimum 10 characters)..."
                disabled={cancelling}
              />
              <p className="text-xs text-gray-500 mt-1">
                {cancelReason.length}/10 characters minimum
              </p>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
              <p className="text-xs text-yellow-800">
                <span className="font-semibold">Note:</span> Frequent cancellations can negatively impact your profile visibility and future collaboration opportunities. Please only cancel if absolutely necessary.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowCancelModal(false);
                  setCancelReason('');
                }}
                disabled={cancelling}
                className="flex-1 px-6 py-3 border-2 border-gray-300 hover:border-gray-400 text-gray-700 font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                Keep Collaboration
              </button>
              <button
                onClick={handleConfirmCancel}
                disabled={cancelling || !cancelReason.trim() || cancelReason.trim().length < 10}
                className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {cancelling ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Cancelling...
                  </span>
                ) : (
                  'Confirm Cancellation'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Story Modal */}
      {showSuccessStoryModal && (
        <PortfolioFormModal
          item={null}
          collaborationData={{
            collaboration_id: collaboration.id,
            title: collaboration.title,
            description: collaboration.description,
            brand_name: collaboration.brand?.business_name || collaboration.brand?.company_name,
            platform: collaboration.booking?.package?.platform_type,
            collaboration_type: collaboration.booking?.package?.content_type,
            campaign_objective: collaboration.booking?.package?.campaign_objective,
            project_date: collaboration.actual_completion_date
          }}
          onClose={() => setShowSuccessStoryModal(false)}
          onSuccess={(portfolioItem) => {
            setShowSuccessStoryModal(false);
            toast.success('Successfully added to your Success Stories!');
            // Optionally navigate to creator profile
            // navigate('/creator/profile');
          }}
        />
      )}
    </div>
  );
};

export default CollaborationDetails;
