import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { campaignsAPI } from '../services/api';
import Navbar from '../components/Navbar';
import toast from 'react-hot-toast';
import { Bolt } from 'lucide-react';

const Campaigns = () => {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, draft, active, paused, completed
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => {
    fetchCampaigns();
  }, [filter]);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const params = filter !== 'all' ? { status: filter } : {};
      const response = await campaignsAPI.getCampaigns(params);
      setCampaigns(response.data.campaigns);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      toast.error('Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (campaignId, newStatus) => {
    try {
      await campaignsAPI.updateCampaign(campaignId, { status: newStatus });
      toast.success(`Campaign ${newStatus === 'active' ? 'published' : newStatus}`);
      fetchCampaigns();
    } catch (error) {
      console.error('Error updating campaign:', error);
      toast.error('Failed to update campaign status');
    }
  };

  const handleDelete = async (campaignId) => {
    try {
      await campaignsAPI.deleteCampaign(campaignId);
      toast.success('Campaign deleted successfully');
      setDeleteConfirm(null);
      fetchCampaigns();
    } catch (error) {
      console.error('Error deleting campaign:', error);
      toast.error('Failed to delete campaign');
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-700';
      case 'active':
        return 'bg-green-100 text-green-700';
      case 'paused':
        return 'bg-yellow-100 text-yellow-700';
      case 'completed':
        return 'bg-blue-100 text-blue-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const filteredCampaigns = campaigns;

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
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Campaigns</h1>
            <p className="text-gray-600 mt-2">Manage your brand campaigns</p>
          </div>
          <Link
            to="/brand/campaigns/create"
            className="px-6 py-3 bg-primary text-white rounded-xl hover:bg-primary-dark transition-colors font-medium"
          >
            + Create Campaign
          </Link>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {[
            { value: 'all', label: 'All Campaigns' },
            { value: 'draft', label: 'Draft' },
            { value: 'active', label: 'Active' },
            { value: 'paused', label: 'Paused' },
            { value: 'completed', label: 'Complete' }
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

        {/* Campaigns List */}
        {filteredCampaigns.length === 0 ? (
          <div className="bg-white rounded-3xl shadow-lg p-12 text-center">
            <div className="text-gray-400 text-6xl mb-4">📋</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {filter === 'all' ? 'No campaigns yet' : `No ${filter} campaigns`}
            </h3>
            <p className="text-gray-600 mb-6">
              {filter === 'all'
                ? 'Create your first campaign to start working with creators'
                : `You don't have any ${filter} campaigns`}
            </p>
            {filter === 'all' && (
              <Link
                to="/brand/campaigns/create"
                className="inline-block px-6 py-3 bg-primary text-white rounded-xl hover:bg-primary-dark transition-colors font-medium"
              >
                Create Campaign
              </Link>
            )}
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredCampaigns.map((campaign) => (
              <div
                key={campaign.id}
                className="bg-white rounded-3xl shadow-lg hover:shadow-xl transition-shadow overflow-hidden"
              >
                {/* Campaign Header */}
                <div className="p-6 border-b border-gray-100">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="text-lg font-bold text-gray-900 line-clamp-2">
                      {campaign.title}
                    </h3>
                    <div className="flex flex-wrap justify-end gap-2">
                      {campaign.active_spotlight_boost && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                          <Bolt className="h-3 w-3" />
                          Boosted
                        </span>
                      )}
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(
                          campaign.status
                        )}`}
                      >
                        {campaign.status}
                      </span>
                    </div>
                  </div>

                  <p className="text-gray-600 text-sm line-clamp-2 mb-4">
                    {campaign.description}
                  </p>

                  {/* Campaign Stats */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Budget</p>
                      <p className="font-semibold text-gray-900">
                        {campaign.participation_mode === 'proposals' || campaign.participation_mode === 'both'
                          ? `$${campaign.budget_min} - $${campaign.budget_max}`
                          : `$${campaign.budget}`}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Applications</p>
                      <p className="font-semibold text-gray-900">
                        {campaign.proposals_count || 0}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center text-xs text-gray-500">
                    <span>
                      {new Date(campaign.start_date).toLocaleDateString()} -{' '}
                      {new Date(campaign.end_date).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Campaign Actions */}
                <div className="p-4 bg-gray-50 flex items-center justify-between">
                  <div className="flex gap-2">
                    {campaign.status === 'draft' && (
                      <button
                        onClick={() => handleStatusChange(campaign.id, 'active')}
                        className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                      >
                        Publish
                      </button>
                    )}
                    {campaign.status === 'active' && (
                      <button
                        onClick={() => handleStatusChange(campaign.id, 'paused')}
                        className="px-3 py-1.5 bg-yellow-600 text-white text-sm rounded-lg hover:bg-yellow-700 transition-colors"
                      >
                        Pause
                      </button>
                    )}
                    {campaign.status === 'paused' && (
                      <button
                        onClick={() => handleStatusChange(campaign.id, 'active')}
                        className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                      >
                        Resume
                      </button>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Link
                      to={`/brand/campaigns/${campaign.id}`}
                      className="px-3 py-1.5 bg-primary text-white text-sm rounded-lg hover:bg-primary-dark transition-colors"
                    >
                      View
                    </Link>
                    <Link
                      to={`/brand/campaigns/${campaign.id}/edit`}
                      className="px-3 py-1.5 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() => setDeleteConfirm(campaign.id)}
                      className="px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl p-8 max-w-md w-full">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                Delete Campaign?
              </h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete this campaign? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirm)}
                  className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-medium"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Campaigns;
