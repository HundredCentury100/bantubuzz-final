import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { Link } from 'react-router-dom';
import { proposalsAPI } from '../services/api';
import {
  FileText,
  Loader,
  AlertCircle,
  Check,
  X,
  Clock,
  DollarSign,
  Calendar,
  Eye,
  Award
} from 'lucide-react';

const MyProposals = () => {
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchProposals();
  }, []);

  const fetchProposals = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await proposalsAPI.getProposals();
      setProposals(response.data.proposals || []);
    } catch (err) {
      console.error('Error fetching proposals:', err);
      setError(err.response?.data?.error || 'Failed to load proposals');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: {
        color: 'bg-yellow-100 text-yellow-800',
        icon: <Clock size={16} />,
        text: 'Pending',
      },
      accepted: {
        color: 'bg-green-100 text-green-800',
        icon: <Check size={16} />,
        text: 'Accepted',
      },
      rejected: {
        color: 'bg-red-100 text-red-800',
        icon: <X size={16} />,
        text: 'Rejected',
      },
    };
    return badges[status] || badges.pending;
  };

  const filteredProposals = proposals.filter((proposal) => {
    if (statusFilter === 'all') return true;
    return proposal.status === statusFilter;
  });

  const timeAgo = (date) => {
    const now = new Date();
    const submitted = new Date(date);
    const diffInHours = Math.floor((now - submitted) / (1000 * 60 * 60));
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
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <FileText className="text-primary" size={32} />
            <h1 className="text-3xl font-bold text-gray-900">My Proposals</h1>
          </div>
          <p className="text-gray-600">Track your submitted proposals and their status</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <p className="text-sm text-gray-600 mb-1">Total Proposals</p>
            <p className="text-3xl font-bold text-gray-900">{proposals.length}</p>
          </div>
          <div className="bg-yellow-50 rounded-lg shadow-sm p-6">
            <p className="text-sm text-yellow-800 mb-1">Pending</p>
            <p className="text-3xl font-bold text-yellow-900">
              {proposals.filter((p) => p.status === 'pending').length}
            </p>
          </div>
          <div className="bg-green-50 rounded-lg shadow-sm p-6">
            <p className="text-sm text-green-800 mb-1">Accepted</p>
            <p className="text-3xl font-bold text-green-900">
              {proposals.filter((p) => p.status === 'accepted').length}
            </p>
          </div>
          <div className="bg-red-50 rounded-lg shadow-sm p-6">
            <p className="text-sm text-red-800 mb-1">Rejected</p>
            <p className="text-3xl font-bold text-red-900">
              {proposals.filter((p) => p.status === 'rejected').length}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex gap-2">
            {['all', 'pending', 'accepted', 'rejected'].map((status) => (
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
                <h3 className="text-red-800 font-semibold">Error Loading Proposals</h3>
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            </div>
            <button
              onClick={fetchProposals}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Proposals List */}
        {!loading && !error && (
          <>
            {filteredProposals.length > 0 ? (
              <div className="space-y-4">
                {filteredProposals.map((proposal) => {
                  const statusBadge = getStatusBadge(proposal.status);
                  return (
                    <div
                      key={proposal.id}
                      className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="p-6">
                        {/* Header */}
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <Link
                              to={`/briefs/${proposal.brief_id}`}
                              className="text-xl font-semibold text-gray-900 hover:text-primary transition-colors"
                            >
                              {proposal.brief?.title}
                            </Link>
                            <p className="text-sm text-gray-500 mt-1">
                              Submitted {timeAgo(proposal.created_at)}
                            </p>
                          </div>
                          <span
                            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${statusBadge.color}`}
                          >
                            {statusBadge.icon}
                            {statusBadge.text}
                          </span>
                        </div>

                        {/* Message Preview */}
                        <p className="text-gray-700 mb-4 line-clamp-2">{proposal.message}</p>

                        {/* Details Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                          <div className="flex items-center gap-2">
                            <DollarSign className="text-green-600" size={20} />
                            <div>
                              <p className="text-xs text-gray-500">Total Price</p>
                              <p className="font-semibold text-gray-900">
                                ${parseFloat(proposal.total_price).toFixed(2)}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Award className="text-primary" size={20} />
                            <div>
                              <p className="text-xs text-gray-500">Milestones</p>
                              <p className="font-semibold text-gray-900">
                                {proposal.milestones?.length || 0}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Calendar className="text-blue-600" size={20} />
                            <div>
                              <p className="text-xs text-gray-500">Pricing Type</p>
                              <p className="font-semibold text-gray-900">
                                {proposal.pricing_type === 'total'
                                  ? 'Evenly Divided'
                                  : 'Per Milestone'}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Milestones Summary */}
                        {proposal.milestones && proposal.milestones.length > 0 && (
                          <div className="border-t border-gray-200 pt-4">
                            <h4 className="text-sm font-semibold text-gray-900 mb-2">
                              Milestone Breakdown
                            </h4>
                            <div className="space-y-2">
                              {proposal.milestones.map((milestone, index) => (
                                <div
                                  key={index}
                                  className="flex items-center justify-between text-sm"
                                >
                                  <span className="text-gray-700">
                                    {milestone.milestone_number}. {milestone.title}
                                  </span>
                                  <div className="flex items-center gap-4">
                                    <span className="text-gray-500">
                                      {milestone.duration_days} days
                                    </span>
                                    {milestone.price && (
                                      <span className="font-semibold text-primary">
                                        ${parseFloat(milestone.price).toFixed(2)}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <Link
                            to={`/briefs/${proposal.brief_id}`}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
                          >
                            <Eye size={20} />
                            View Brief
                          </Link>
                        </div>

                        {/* Accepted Notice */}
                        {proposal.status === 'accepted' && (
                          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                            <div className="flex items-center gap-2">
                              <Check className="text-green-600" size={20} />
                              <p className="text-sm text-green-800">
                                <strong>Congratulations!</strong> Your proposal was accepted. The
                                brand will create a booking and proceed to payment.
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Rejected Notice */}
                        {proposal.status === 'rejected' && (
                          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                            <div className="flex items-center gap-2">
                              <X className="text-red-600" size={20} />
                              <p className="text-sm text-red-800">
                                Unfortunately, your proposal was not selected for this project.
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                <FileText className="mx-auto text-gray-400 mb-4" size={64} />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {statusFilter === 'all' ? 'No proposals yet' : `No ${statusFilter} proposals`}
                </h3>
                <p className="text-gray-600 mb-6">
                  {statusFilter === 'all'
                    ? 'Start browsing briefs and submit your first proposal'
                    : `You don't have any ${statusFilter} proposals`}
                </p>
                {statusFilter === 'all' ? (
                  <Link
                    to="/creator/briefs"
                    className="inline-block px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
                  >
                    Browse Briefs
                  </Link>
                ) : (
                  <button
                    onClick={() => setStatusFilter('all')}
                    className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
                  >
                    View All Proposals
                  </button>
                )}
              </div>
            )}
          </>
        )}

        {/* Info Box */}
        {!loading && !error && proposals.length > 0 && (
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">About Proposals</h3>
            <ul className="space-y-2 text-blue-800 text-sm">
              <li className="flex items-start gap-2">
                <Clock size={16} className="mt-0.5 flex-shrink-0" />
                <span>
                  <strong>Pending:</strong> Your proposal is under review by the brand
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Check size={16} className="mt-0.5 flex-shrink-0" />
                <span>
                  <strong>Accepted:</strong> Brand will create a booking and proceed to payment
                </span>
              </li>
              <li className="flex items-start gap-2">
                <X size={16} className="mt-0.5 flex-shrink-0" />
                <span>
                  <strong>Rejected:</strong> Brand selected a different creator for this project
                </span>
              </li>
            </ul>
          </div>
        )}
      </div>
      </div>
    </div>
  );
};

export default MyProposals;
