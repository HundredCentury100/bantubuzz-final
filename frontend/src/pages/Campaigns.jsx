import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { campaignsAPI } from '../services/api';
import Navbar from '../components/Navbar';
import toast from 'react-hot-toast';

const Campaigns = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, draft, active, paused, completed

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const response = await campaignsAPI.getCampaigns();
      setCampaigns(response.data.campaigns || []);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      toast.error('Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (campaignId) => {
    if (!window.confirm('Are you sure you want to delete this campaign?')) {
      return;
    }

    try {
      await campaignsAPI.deleteCampaign(campaignId);
      toast.success('Campaign deleted successfully');
      fetchCampaigns();
    } catch (error) {
      console.error('Error deleting campaign:', error);
      toast.error('Failed to delete campaign');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      draft: 'bg-gray-100 text-gray-800',
      active: 'bg-primary text-primary-dark',
      paused: 'bg-primary text-primary-dark',
      completed: 'bg-primary text-primary-dark',
      cancelled: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const filteredCampaigns = campaigns.filter(campaign => {
    if (filter === 'all') return true;
    return campaign.status === filter;
  });

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

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Campaigns</h1>
              <p className="text-gray-600 mt-1">Create and manage your marketing campaigns</p>
            </div>
            <Link
              to="/brand/campaigns/create"
              className="px-6 py-3 bg-primary hover:bg-primary-dark text-white font-medium rounded-lg transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Campaign
            </Link>
          </div>

          {/* Navigation */}
          <div className="mb-4">
            <Link
              to="/brand/dashboard"
              className="text-gray-600 hover:text-gray-900 flex items-center gap-2 w-fit"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Dashboard
            </Link>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2 border-b border-gray-200">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 font-medium transition-colors ${
                filter === 'all'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              All ({campaigns.length})
            </button>
            <button
              onClick={() => setFilter('draft')}
              className={`px-4 py-2 font-medium transition-colors ${
                filter === 'draft'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Draft ({campaigns.filter(c => c.status === 'draft').length})
            </button>
            <button
              onClick={() => setFilter('active')}
              className={`px-4 py-2 font-medium transition-colors ${
                filter === 'active'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Active ({campaigns.filter(c => c.status === 'active').length})
            </button>
            <button
              onClick={() => setFilter('completed')}
              className={`px-4 py-2 font-medium transition-colors ${
                filter === 'completed'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Completed ({campaigns.filter(c => c.status === 'completed').length})
            </button>
          </div>
        </div>

        {/* Campaigns List */}
        {filteredCampaigns.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <h3 className="text-xl font-medium text-gray-900 mb-2">No campaigns found</h3>
            <p className="text-gray-600 mb-6">
              {filter === 'all'
                ? "You haven't created any campaigns yet."
                : `No ${filter} campaigns at the moment.`}
            </p>
            <Link
              to="/brand/campaigns/create"
              className="inline-block px-6 py-3 bg-primary hover:bg-primary-dark text-white font-medium rounded-lg transition-colors"
            >
              Create Your First Campaign
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCampaigns.map((campaign) => (
              <div key={campaign.id} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow">
                <div className="p-6">
                  {/* Status Badge */}
                  <div className="flex items-center justify-between mb-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(campaign.status)}`}>
                      {campaign.status}
                    </span>
                    <span className="text-sm text-gray-600">{campaign.category}</span>
                  </div>

                  {/* Title */}
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {campaign.title}
                  </h3>

                  {/* Description */}
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {campaign.description}
                  </p>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4 mb-4 pb-4 border-b border-gray-200">
                    <div>
                      <p className="text-xs text-gray-600">Budget</p>
                      <p className="text-lg font-semibold text-gray-900">${campaign.budget}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Applications</p>
                      <p className="text-lg font-semibold text-gray-900">{campaign.applicants_count || 0}</p>
                    </div>
                  </div>

                  {/* Dates */}
                  <div className="text-xs text-gray-600 mb-4">
                    <p>Start: {new Date(campaign.start_date).toLocaleDateString()}</p>
                    <p>End: {new Date(campaign.end_date).toLocaleDateString()}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Link
                      to={`/brand/campaigns/${campaign.id}`}
                      className="flex-1 px-4 py-2 bg-primary hover:bg-primary-dark text-white text-sm font-medium rounded-lg transition-colors text-center"
                    >
                      View Details
                    </Link>
                    <Link
                      to={`/brand/campaigns/${campaign.id}/edit`}
                      className="px-4 py-2 border-2 border-gray-300 hover:border-gray-400 text-gray-700 text-sm font-medium rounded-lg transition-colors"
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() => handleDelete(campaign.id)}
                      className="px-4 py-2 border-2 border-red-300 hover:border-red-400 text-red-600 text-sm font-medium rounded-lg transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Campaigns;
