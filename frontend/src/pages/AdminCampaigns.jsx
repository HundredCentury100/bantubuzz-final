import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import AdminLayout from '../components/admin/AdminLayout';

export default function AdminCampaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchCampaigns();
  }, [filter]);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/admin/campaigns${filter !== 'all' ? `?status=${filter}` : ''}`);
      setCampaigns(response.data.campaigns || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (campaignId, newStatus) => {
    try {
      await api.put(`/admin/campaigns/${campaignId}/status`, { status: newStatus });
      fetchCampaigns();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update campaign status');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status) => {
    const colors = {
      active: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-blue-100 text-blue-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Campaign Management</h1>
          <p className="mt-2 text-gray-600">Monitor and manage all campaigns</p>
        </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex gap-2">
          {['all', 'active', 'pending', 'completed', 'cancelled'].map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-4 py-2 rounded-lg capitalize transition ${
                filter === tab
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Campaigns Grid */}
      <div className="grid grid-cols-1 gap-6">
        {campaigns.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center text-gray-500">
            No campaigns found
          </div>
        ) : (
          campaigns.map((campaign) => (
            <div key={campaign.id} className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-semibold text-gray-900">{campaign.title}</h3>
                    <span className={`px-3 py-1 text-xs rounded-full capitalize ${getStatusColor(campaign.status)}`}>
                      {campaign.status}
                    </span>
                  </div>
                  <p className="text-gray-600 mb-3">{campaign.description}</p>
                  <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                    <span>Budget: {formatCurrency(campaign.budget)}</span>
                    <span>Applications: {campaign.application_count || 0}</span>
                    <span>Start: {formatDate(campaign.start_date)}</span>
                    <span>End: {formatDate(campaign.end_date)}</span>
                  </div>
                </div>
              </div>

              {/* Campaign Details */}
              <div className="border-t border-gray-200 pt-4 mt-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-gray-500">Brand</p>
                    <p className="font-medium">{campaign.brand_name || `Brand ${campaign.brand_id}`}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Category</p>
                    <p className="font-medium">{campaign.category || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Platform</p>
                    <p className="font-medium capitalize">{campaign.platform || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Created</p>
                    <p className="font-medium">{formatDate(campaign.created_at)}</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Link
                    to={`/admin/campaigns/${campaign.id}`}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-sm"
                  >
                    View Details
                  </Link>
                  {campaign.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleStatusChange(campaign.id, 'active')}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleStatusChange(campaign.id, 'cancelled')}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm"
                      >
                        Reject
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-md p-4">
          <p className="text-sm text-gray-600">Total Campaigns</p>
          <p className="text-2xl font-bold text-purple-600">{campaigns.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-4">
          <p className="text-sm text-gray-600">Active</p>
          <p className="text-2xl font-bold text-green-600">
            {campaigns.filter(c => c.status === 'active').length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-4">
          <p className="text-sm text-gray-600">Pending</p>
          <p className="text-2xl font-bold text-yellow-600">
            {campaigns.filter(c => c.status === 'pending').length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-4">
          <p className="text-sm text-gray-600">Completed</p>
          <p className="text-2xl font-bold text-blue-600">
            {campaigns.filter(c => c.status === 'completed').length}
          </p>
        </div>
      </div>
      </div>
    </AdminLayout>
  );
}
