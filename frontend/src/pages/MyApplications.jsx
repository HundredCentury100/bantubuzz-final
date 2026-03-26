import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { opportunitiesAPI } from '../services/api';
import Navbar from '../components/Navbar';
import toast from 'react-hot-toast';

const MyApplications = () => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, pending, accepted, rejected, awaiting_payment

  useEffect(() => {
    fetchApplications();
  }, [filter]);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const params = filter !== 'all' ? { status: filter } : {};
      const response = await opportunitiesAPI.getMyApplications(params);
      setApplications(response.data.applications || []);
    } catch (error) {
      console.error('Error fetching applications:', error);
      toast.error('Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-700';
      case 'accepted':
        return 'bg-green-100 text-green-700';
      case 'rejected':
        return 'bg-red-100 text-red-700';
      case 'awaiting_payment':
        return 'bg-blue-100 text-blue-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'pending':
        return 'Under Review';
      case 'accepted':
        return 'Accepted';
      case 'rejected':
        return 'Not Selected';
      case 'awaiting_payment':
        return 'Awaiting Payment';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50">
        <Navbar />
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Applications</h1>
          <p className="text-gray-600">Track your opportunity applications</p>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {[
            { value: 'all', label: 'All Applications' },
            { value: 'pending', label: 'Under Review' },
            { value: 'awaiting_payment', label: 'Awaiting Payment' },
            { value: 'accepted', label: 'Accepted' },
            { value: 'rejected', label: 'Not Selected' }
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setFilter(tab.value)}
              className={`px-4 py-2 rounded-xl font-medium whitespace-nowrap transition-colors ${
                filter === tab.value
                  ? 'bg-primary text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Applications List */}
        {applications.length === 0 ? (
          <div className="bg-white rounded-3xl shadow-lg p-12 text-center">
            <div className="text-gray-400 text-6xl mb-4">📝</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {filter === 'all' ? 'No applications yet' : `No ${filter} applications`}
            </h3>
            <p className="text-gray-600 mb-6">
              {filter === 'all'
                ? 'Start applying to opportunities to see them here'
                : `You don't have any ${filter} applications`}
            </p>
            {filter === 'all' && (
              <Link
                to="/creator/opportunities"
                className="inline-block px-6 py-3 bg-primary text-white rounded-xl hover:bg-primary-dark transition-colors font-medium"
              >
                Browse Opportunities
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {applications.map((application) => (
              <div
                key={application.id}
                className="bg-white rounded-3xl shadow-lg hover:shadow-xl transition-shadow overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-start gap-3 mb-2">
                        <h3 className="text-lg font-bold text-gray-900">
                          {application.campaign?.title || 'Untitled Opportunity'}
                        </h3>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(
                            application.status
                          )}`}
                        >
                          {getStatusLabel(application.status)}
                        </span>
                      </div>
                      {application.campaign?.description && (
                        <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                          {application.campaign.description}
                        </p>
                      )}
                      {application.campaign?.brand && (
                        <div className="flex items-center gap-2">
                          {application.campaign.brand.logo && (
                            <img
                              src={application.campaign.brand.logo}
                              alt={application.campaign.brand.company_name}
                              className="w-6 h-6 rounded-full object-cover"
                            />
                          )}
                          <p className="text-sm text-gray-600">
                            {application.campaign.brand.company_name}
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="text-right ml-4">
                      <p className="text-xl font-bold text-primary">
                        {/* CRITICAL: NO toFixed() */}
                        ${application.proposed_price}
                      </p>
                      <p className="text-xs text-gray-500">Your proposal</p>
                    </div>
                  </div>

                  {/* Application Details */}
                  <div className="grid md:grid-cols-2 gap-4 mb-4 p-4 bg-gray-50 rounded-xl">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Applied On</p>
                      <p className="text-sm text-gray-900 font-medium">
                        {new Date(application.applied_at).toLocaleDateString()}
                      </p>
                    </div>
                    {application.delivery_timeline_days && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Delivery Timeline</p>
                        <p className="text-sm text-gray-900 font-medium">
                          {application.delivery_timeline_days} days
                        </p>
                      </div>
                    )}
                    {application.reviewed_at && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Reviewed On</p>
                        <p className="text-sm text-gray-900 font-medium">
                          {new Date(application.reviewed_at).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Proposal Message */}
                  {application.proposal_message && (
                    <div className="mb-4">
                      <p className="text-xs text-gray-500 mb-1">Your Message:</p>
                      <p className="text-sm text-gray-700 bg-gray-50 rounded-xl p-3">
                        {application.proposal_message}
                      </p>
                    </div>
                  )}

                  {/* Deliverables */}
                  {application.deliverables && (
                    <div className="mb-4">
                      <p className="text-xs text-gray-500 mb-1">Your Deliverables:</p>
                      <p className="text-sm text-gray-700">{application.deliverables}</p>
                    </div>
                  )}

                  {/* Brand Notes (for rejected applications) */}
                  {application.brand_notes && (
                    <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                      <p className="text-xs text-yellow-800 mb-1 font-medium">Note from Brand:</p>
                      <p className="text-sm text-yellow-900">{application.brand_notes}</p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2 justify-end">
                    <Link
                      to={`/creator/opportunities/${application.campaign_id}`}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors text-sm font-medium"
                    >
                      View Opportunity
                    </Link>

                    {application.status === 'awaiting_payment' && application.booking_id && (
                      <Link
                        to={`/bookings/${application.booking_id}/payment`}
                        className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors text-sm font-medium"
                      >
                        View Payment Status
                      </Link>
                    )}

                    {application.status === 'accepted' && (
                      <Link
                        to={`/creator/collaborations`}
                        className="px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors text-sm font-medium"
                      >
                        View Collaboration
                      </Link>
                    )}
                  </div>

                  {/* Status-specific messages */}
                  {application.status === 'pending' && (
                    <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-4">
                      <p className="text-blue-800 text-sm">
                        ⏳ Your application is under review. The brand will respond soon!
                      </p>
                    </div>
                  )}

                  {application.status === 'awaiting_payment' && (
                    <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                      <p className="text-yellow-800 text-sm">
                        💰 Your application was accepted! The brand is processing payment. You'll be
                        notified once payment is confirmed.
                      </p>
                    </div>
                  )}

                  {application.status === 'accepted' && (
                    <div className="mt-4 bg-green-50 border border-green-200 rounded-xl p-4">
                      <p className="text-green-800 text-sm">
                        🎉 Congratulations! Your application was accepted and payment confirmed. Start
                        working on the deliverables!
                      </p>
                    </div>
                  )}

                  {application.status === 'rejected' && (
                    <div className="mt-4 bg-gray-50 border border-gray-200 rounded-xl p-4">
                      <p className="text-gray-700 text-sm">
                        Unfortunately, your application was not selected this time. Keep applying to
                        other opportunities!
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyApplications;
