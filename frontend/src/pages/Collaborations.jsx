import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collaborationsAPI } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import Navbar from '../components/Navbar';
import Avatar from '../components/Avatar';
import toast from 'react-hot-toast';

const Collaborations = () => {
  const { user } = useAuth();
  const [collaborations, setCollaborations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [pagination, setPagination] = useState({
    current_page: 1,
    total_pages: 1,
    total: 0
  });

  const isBrand = user?.user_type === 'brand';

  useEffect(() => {
    fetchCollaborations();
  }, [statusFilter, typeFilter, pagination.current_page]);

  const fetchCollaborations = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.current_page,
        per_page: 10
      };

      if (statusFilter) params.status = statusFilter;
      if (typeFilter) params.type = typeFilter;

      const response = await collaborationsAPI.getCollaborations(params);
      setCollaborations(response.data.collaborations || []);
      setPagination({
        current_page: response.data.current_page,
        total_pages: response.data.pages,
        total: response.data.total
      });
    } catch (error) {
      console.error('Error fetching collaborations:', error);
      toast.error('Failed to load collaborations');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      in_progress: 'bg-primary text-primary-dark',
      completed: 'bg-primary text-primary-dark',
      cancelled: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getTypeIcon = (type) => {
    if (type === 'campaign') {
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
        </svg>
      );
    }
    return (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    );
  };

  return (
    <div className="min-h-screen bg-light">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            to={isBrand ? '/brand/dashboard' : '/creator/dashboard'}
            className="text-gray-600 hover:text-gray-900 flex items-center gap-2 mb-4"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </Link>

          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Collaborations</h1>
          <p className="text-gray-600">
            Track all your {isBrand ? 'ongoing and completed' : 'active'} collaborations
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPagination(prev => ({ ...prev, current_page: 1 }));
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="">All Statuses</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            {/* Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
              <select
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value);
                  setPagination(prev => ({ ...prev, current_page: 1 }));
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="">All Types</option>
                <option value="campaign">Campaigns</option>
                <option value="package">Packages</option>
              </select>
            </div>

            {/* Stats */}
            <div className="flex items-end">
              <div className="bg-primary/10 rounded-lg p-4 w-full">
                <p className="text-sm text-gray-600">Total Collaborations</p>
                <p className="text-2xl font-bold text-primary">{pagination.total}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Collaborations List */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : collaborations.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-700 mb-2">No collaborations found</h3>
            <p className="text-gray-500 mb-4">
              {statusFilter || typeFilter
                ? 'Try adjusting your filters'
                : isBrand
                ? 'Start by accepting campaign applications or adding packages to campaigns'
                : 'Apply to campaigns or wait for brands to book your packages'}
            </p>
            {!statusFilter && !typeFilter && (
              <Link
                to={isBrand ? '/brand/campaigns' : '/creator/campaigns'}
                className="inline-block px-6 py-3 bg-primary hover:bg-primary-dark text-white font-medium rounded-lg transition-colors"
              >
                {isBrand ? 'View Campaigns' : 'Browse Campaigns'}
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {collaborations.map((collab) => (
                <div
                  key={collab.id}
                  className="block bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6"
                >
                  <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
                    {/* Avatar + Status (mobile: side by side) */}
                    <div className="flex sm:flex-col items-center sm:items-start gap-3 sm:gap-0 w-full sm:w-auto">
                      <div className="flex-shrink-0">
                        <Avatar
                          src={isBrand ? collab.creator?.profile_picture : collab.brand?.logo}
                          alt={isBrand ? collab.creator?.user?.email?.split('@')[0] : collab.brand?.company_name}
                          size="lg"
                          type={isBrand ? 'user' : 'brand'}
                        />
                      </div>
                      <span className={`sm:hidden px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(collab.status)}`}>
                        {collab.status.replace('_', ' ')}
                      </span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 w-full">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0 pr-2">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <div className="text-gray-500 flex-shrink-0">
                              {getTypeIcon(collab.collaboration_type)}
                            </div>
                            <h3 className="text-base sm:text-lg font-bold text-gray-900 truncate">
                              {collab.title}
                            </h3>
                          </div>
                          <p className="text-sm text-gray-600">
                            {isBrand ? 'With' : 'For'}: {isBrand ? collab.creator?.user?.email?.split('@')[0] : collab.brand?.company_name}
                          </p>
                        </div>
                        <span className={`hidden sm:inline-block flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(collab.status)}`}>
                          {collab.status.replace('_', ' ')}
                        </span>
                      </div>

                      {/* Stats Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                        <div>
                          <p className="text-xs text-gray-600">Amount</p>
                          <p className="text-base sm:text-lg font-bold text-primary">${collab.amount}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Progress</p>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-primary h-2 rounded-full transition-all"
                                style={{ width: `${collab.progress_percentage}%` }}
                              ></div>
                            </div>
                            <span className="text-xs sm:text-sm font-semibold text-gray-900">{collab.progress_percentage}%</span>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Start Date</p>
                          <p className="text-xs sm:text-sm font-medium text-gray-900">
                            {new Date(collab.start_date).toLocaleDateString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Due Date</p>
                          <p className="text-xs sm:text-sm font-medium text-gray-900">
                            {collab.expected_completion_date
                              ? new Date(collab.expected_completion_date).toLocaleDateString()
                              : 'Not set'}
                          </p>
                        </div>
                      </div>

                      {/* Latest Update */}
                      {collab.last_update && (
                        <div className="bg-light rounded-lg p-3">
                          <p className="text-xs font-medium text-gray-700 mb-1">Latest Update:</p>
                          <p className="text-sm text-gray-600">{collab.last_update}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(collab.last_update_date).toLocaleDateString()}
                          </p>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-4">
                        <Link
                          to="/messages"
                          state={{
                            startConversationWith: {
                              id: isBrand ? collab.creator?.user_id : collab.brand?.user_id,
                              email: isBrand ? collab.creator?.user?.email : collab.brand?.user?.email
                            }
                          }}
                          className="flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                          Send Message
                        </Link>
                        <Link
                          to={`/${isBrand ? 'brand' : 'creator'}/collaborations/${collab.id}`}
                          className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          View Details
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {pagination.total_pages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-8">
                <button
                  onClick={() => setPagination(prev => ({ ...prev, current_page: prev.current_page - 1 }))}
                  disabled={pagination.current_page === 1}
                  className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Previous
                </button>

                <span className="px-4 py-2 text-gray-700">
                  Page {pagination.current_page} of {pagination.total_pages}
                </span>

                <button
                  onClick={() => setPagination(prev => ({ ...prev, current_page: prev.current_page + 1 }))}
                  disabled={pagination.current_page === pagination.total_pages}
                  className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Collaborations;
