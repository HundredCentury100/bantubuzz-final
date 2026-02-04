import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { Link, useNavigate } from 'react-router-dom';
import { briefsAPI, proposalsAPI } from '../services/api';
import {
  Briefcase,
  Plus,
  Loader,
  AlertCircle,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  DollarSign
} from 'lucide-react';

const ManageBriefs = () => {
  const navigate = useNavigate();
  const [briefs, setBriefs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedBrief, setSelectedBrief] = useState(null);
  const [proposals, setProposals] = useState([]);
  const [loadingProposals, setLoadingProposals] = useState(false);
  const [acceptModalData, setAcceptModalData] = useState(null); // { proposalId, briefId }

  useEffect(() => {
    fetchBriefs();
  }, []);

  const fetchBriefs = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await briefsAPI.getBriefs();
      setBriefs(response.data.briefs || []);
    } catch (err) {
      console.error('Error fetching briefs:', err);
      setError(err.response?.data?.error || 'Failed to load briefs');
    } finally {
      setLoading(false);
    }
  };

  const fetchProposals = async (briefId) => {
    try {
      setLoadingProposals(true);
      const response = await briefsAPI.getBriefProposals(briefId);
      setProposals(response.data.proposals || []);
    } catch (err) {
      console.error('Error fetching proposals:', err);
    } finally {
      setLoadingProposals(false);
    }
  };

  const handleViewProposals = (brief) => {
    setSelectedBrief(brief);
    fetchProposals(brief.id);
  };

  const handleAcceptProposal = (proposalId) => {
    // Show modal to ask about closing brief
    setAcceptModalData({ proposalId, briefId: selectedBrief.id });
  };

  const confirmAcceptProposal = async (closeBrief) => {
    if (!acceptModalData) return;

    try {
      const response = await proposalsAPI.acceptProposal(acceptModalData.proposalId);

      // If user chose to keep brief open (as campaign), reopen it
      if (!closeBrief && response.data.booking_id) {
        try {
          await briefsAPI.publishBrief(acceptModalData.briefId); // Reopen the brief
        } catch (err) {
          console.error('Error reopening brief:', err);
        }
      }

      setAcceptModalData(null);
      setSelectedBrief(null);

      if (response.data.booking_id) {
        navigate(`/bookings/${response.data.booking_id}/payment`);
      }
    } catch (err) {
      console.error('Error accepting proposal:', err);
      alert(err.response?.data?.error || 'Failed to accept proposal');
      setAcceptModalData(null);
    }
  };

  const handleRejectProposal = async (proposalId) => {
    const reason = prompt('Enter reason for rejection (optional):');
    if (reason === null) return;

    try {
      await proposalsAPI.rejectProposal(proposalId, reason);
      fetchProposals(selectedBrief.id);
      alert('Proposal rejected');
    } catch (err) {
      console.error('Error rejecting proposal:', err);
      alert(err.response?.data?.error || 'Failed to reject proposal');
    }
  };

  const handleDeleteBrief = async (briefId) => {
    if (!confirm('Are you sure you want to delete this brief?')) return;

    try {
      await briefsAPI.deleteBrief(briefId);
      fetchBriefs();
    } catch (err) {
      console.error('Error deleting brief:', err);
      alert(err.response?.data?.error || 'Failed to delete brief');
    }
  };

  const handlePublishBrief = async (briefId) => {
    try {
      await briefsAPI.publishBrief(briefId);
      fetchBriefs();
    } catch (err) {
      console.error('Error publishing brief:', err);
      alert(err.response?.data?.error || 'Failed to publish brief');
    }
  };

  const handleCloseBrief = async (briefId) => {
    if (!confirm('Close this brief? No more proposals can be submitted.')) return;

    try {
      await briefsAPI.closeBrief(briefId);
      fetchBriefs();
    } catch (err) {
      console.error('Error closing brief:', err);
      alert(err.response?.data?.error || 'Failed to close brief');
    }
  };

  const filteredBriefs = briefs.filter((brief) => {
    if (statusFilter === 'all') return true;
    return brief.status === statusFilter;
  });

  const getStatusBadge = (status) => {
    const badges = {
      draft: { color: 'bg-gray-100 text-gray-800', text: 'Draft' },
      open: { color: 'bg-green-100 text-green-800', text: 'Open' },
      closed: { color: 'bg-red-100 text-red-800', text: 'Closed' },
    };
    return badges[status] || badges.draft;
  };

  const timeAgo = (date) => {
    const now = new Date();
    const posted = new Date(date);
    const diffInHours = Math.floor((now - posted) / (1000 * 60 * 60));
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return `${Math.floor(diffInDays / 7)}w ago`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-light">
        <Navbar />
        <div className="container-custom section-padding flex justify-center items-center">
          <Loader className="animate-spin text-primary" size={48} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-light">
      <Navbar />
      <div className="container-custom section-padding py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Briefcase className="text-primary" size={32} />
              <h1 className="text-3xl font-bold text-gray-900">My Briefs</h1>
            </div>
            <p className="text-gray-600">Create and manage your project briefs</p>
          </div>
          <Link
            to="/brand/briefs/create"
            className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
          >
            <Plus size={20} />
            Create Brief
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <p className="text-sm text-gray-600 mb-1">Total Briefs</p>
            <p className="text-3xl font-bold text-gray-900">{briefs.length}</p>
          </div>
          <div className="bg-light rounded-lg shadow-sm p-6">
            <p className="text-sm text-gray-600 mb-1">Drafts</p>
            <p className="text-3xl font-bold text-gray-900">
              {briefs.filter((b) => b.status === 'draft').length}
            </p>
          </div>
          <div className="bg-green-50 rounded-lg shadow-sm p-6">
            <p className="text-sm text-green-800 mb-1">Open</p>
            <p className="text-3xl font-bold text-green-900">
              {briefs.filter((b) => b.status === 'open').length}
            </p>
          </div>
          <div className="bg-red-50 rounded-lg shadow-sm p-6">
            <p className="text-sm text-red-800 mb-1">Closed</p>
            <p className="text-3xl font-bold text-red-900">
              {briefs.filter((b) => b.status === 'closed').length}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex gap-2">
            {['all', 'draft', 'open', 'closed'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  statusFilter === status
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="text-red-600" size={24} />
              <div>
                <h3 className="text-red-800 font-semibold">Error Loading Briefs</h3>
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            </div>
            <button
              onClick={fetchBriefs}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Briefs List */}
        {!loading && !error && (
          <>
            {filteredBriefs.length > 0 ? (
              <div className="space-y-4">
                {filteredBriefs.map((brief) => {
                  const statusBadge = getStatusBadge(brief.status);
                  return (
                    <div
                      key={brief.id}
                      className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-6"
                    >
                      {/* Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-xl font-bold text-gray-900">{brief.title}</h3>
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-medium ${statusBadge.color}`}
                            >
                              {statusBadge.text}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500">Posted {timeAgo(brief.created_at)}</p>
                        </div>
                      </div>

                      {/* Description */}
                      <p className="text-gray-700 mb-4 line-clamp-2">{brief.description}</p>

                      {/* Details */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div>
                          <p className="text-xs text-gray-500">Budget</p>
                          <p className="font-semibold text-gray-900">
                            {brief.budget_min && brief.budget_max
                              ? `$${brief.budget_min} - $${brief.budget_max}`
                              : 'Negotiable'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Timeline</p>
                          <p className="font-semibold text-gray-900">{brief.timeline_days} days</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Milestones</p>
                          <p className="font-semibold text-gray-900">
                            {brief.milestones?.length || 0}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Proposals</p>
                          <p className="font-semibold text-primary">
                            {brief.proposals_count || 0}
                          </p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-200">
                        {brief.status === 'draft' && (
                          <>
                            <button
                              onClick={() => handlePublishBrief(brief.id)}
                              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                            >
                              <CheckCircle size={16} />
                              Publish
                            </button>
                            <button
                              onClick={() => navigate(`/brand/briefs/edit/${brief.id}`)}
                              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                              <Edit size={16} />
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteBrief(brief.id)}
                              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                            >
                              <Trash2 size={16} />
                              Delete
                            </button>
                          </>
                        )}

                        {brief.status === 'open' && (
                          <>
                            <button
                              onClick={() => handleViewProposals(brief)}
                              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
                            >
                              <FileText size={16} />
                              View Proposals ({brief.proposals_count || 0})
                            </button>
                            <button
                              onClick={() => handleCloseBrief(brief.id)}
                              className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                            >
                              <XCircle size={16} />
                              Close
                            </button>
                          </>
                        )}

                        <Link
                          to={`/briefs/${brief.id}`}
                          className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-light transition-colors"
                        >
                          <Eye size={16} />
                          View Details
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                <Briefcase className="mx-auto text-gray-400 mb-4" size={64} />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {statusFilter === 'all' ? 'No briefs yet' : `No ${statusFilter} briefs`}
                </h3>
                <p className="text-gray-600 mb-6">
                  {statusFilter === 'all'
                    ? 'Create your first brief to find the perfect creator'
                    : `You don't have any ${statusFilter} briefs`}
                </p>
                {statusFilter === 'all' ? (
                  <Link
                    to="/brand/briefs/create"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
                  >
                    <Plus size={20} />
                    Create Brief
                  </Link>
                ) : (
                  <button
                    onClick={() => setStatusFilter('all')}
                    className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
                  >
                    View All Briefs
                  </button>
                )}
              </div>
            )}
          </>
        )}

        {/* Accept Proposal Confirmation Modal */}
        {acceptModalData && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Accept Proposal</h3>
              <p className="text-gray-600 mb-6">
                What would you like to do with this brief after accepting the proposal?
              </p>

              <div className="space-y-3 mb-6">
                <button
                  onClick={() => confirmAcceptProposal(true)}
                  className="w-full p-4 border-2 border-gray-300 rounded-lg hover:border-primary hover:bg-primary/5 transition-colors text-left"
                >
                  <div className="font-semibold text-gray-900 mb-1">Close Brief</div>
                  <div className="text-sm text-gray-600">
                    Stop accepting new proposals. This is a one-time project.
                  </div>
                </button>

                <button
                  onClick={() => confirmAcceptProposal(false)}
                  className="w-full p-4 border-2 border-gray-300 rounded-lg hover:border-primary hover:bg-primary/5 transition-colors text-left"
                >
                  <div className="font-semibold text-gray-900 mb-1">Keep as Campaign</div>
                  <div className="text-sm text-gray-600">
                    Keep brief open to accept more proposals from other creators.
                  </div>
                </button>
              </div>

              <button
                onClick={() => setAcceptModalData(null)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Proposals Modal */}
        {selectedBrief && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">
                    Proposals for: {selectedBrief.title}
                  </h2>
                  <button
                    onClick={() => setSelectedBrief(null)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <XCircle size={24} />
                  </button>
                </div>

                {loadingProposals ? (
                  <div className="flex justify-center py-12">
                    <Loader className="animate-spin text-primary" size={48} />
                  </div>
                ) : proposals.length > 0 ? (
                  <div className="space-y-4">
                    {proposals.map((proposal) => (
                      <div key={proposal.id} className="border border-gray-200 rounded-lg p-4">
                        {/* Proposal Header */}
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="font-semibold text-gray-900">
                              {proposal.creator?.username || 'Creator'}
                            </h3>
                            <p className="text-sm text-gray-500">
                              Submitted {timeAgo(proposal.created_at)}
                            </p>
                          </div>
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium ${
                              proposal.status === 'pending'
                                ? 'bg-yellow-100 text-yellow-800'
                                : proposal.status === 'accepted'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {proposal.status.charAt(0).toUpperCase() + proposal.status.slice(1)}
                          </span>
                        </div>

                        {/* Message */}
                        <p className="text-gray-700 mb-4">{proposal.message}</p>

                        {/* Price */}
                        <div className="flex items-center gap-2 mb-4">
                          <DollarSign className="text-green-600" size={20} />
                          <span className="text-lg font-bold text-gray-900">
                            ${parseFloat(proposal.total_price).toFixed(2)}
                          </span>
                          <span className="text-sm text-gray-500">
                            Total {proposal.pricing_type === 'total' ? '(Evenly Divided)' : '(Custom Per Milestone)'}
                          </span>
                        </div>

                        {/* Milestones */}
                        {proposal.milestones && proposal.milestones.length > 0 && (
                          <div className="mb-4">
                            <h4 className="text-sm font-semibold text-gray-900 mb-2">Milestones</h4>
                            <div className="space-y-2">
                              {proposal.milestones.map((milestone, index) => (
                                <div key={index} className="text-sm p-2 bg-light rounded">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="font-medium text-gray-900">
                                      {milestone.milestone_number}. {milestone.title}
                                    </span>
                                    {milestone.price && (
                                      <span className="font-semibold text-primary">
                                        ${parseFloat(milestone.price).toFixed(2)}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-gray-600 text-xs">
                                    {milestone.duration_days} days • {milestone.deliverables?.length || 0}{' '}
                                    deliverables
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Actions */}
                        {proposal.status === 'pending' && (
                          <div className="flex gap-2 pt-4 border-t border-gray-200">
                            <button
                              onClick={() => handleAcceptProposal(proposal.id)}
                              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                            >
                              <CheckCircle size={16} />
                              Accept & Proceed to Payment
                            </button>
                            <button
                              onClick={() => handleRejectProposal(proposal.id)}
                              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                            >
                              <XCircle size={16} />
                              Reject
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <FileText className="mx-auto text-gray-400 mb-4" size={64} />
                    <p className="text-gray-600">No proposals received yet</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
};

export default ManageBriefs;
