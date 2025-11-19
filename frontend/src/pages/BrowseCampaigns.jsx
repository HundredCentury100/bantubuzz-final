import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { campaignsAPI } from '../services/api';
import Navbar from '../components/Navbar';
import toast from 'react-hot-toast';
import Avatar from '../components/Avatar';

const BrowseCampaigns = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('');

  useEffect(() => {
    fetchCampaigns();
  }, [category]);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const params = category ? { category } : {};
      const response = await campaignsAPI.browseCampaigns(params);
      setCampaigns(response.data.campaigns || []);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      toast.error('Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    'All Categories',
    'Fashion & Beauty',
    'Food & Beverage',
    'Technology',
    'Lifestyle',
    'Travel',
    'Fitness & Health',
    'Gaming',
    'Education',
    'Entertainment',
    'Other'
  ];

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
          <Link
            to="/creator/dashboard"
            className="text-gray-600 hover:text-gray-900 flex items-center gap-2 mb-4"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </Link>

          <h1 className="text-3xl font-bold text-gray-900 mb-2">Browse Campaigns</h1>
          <p className="text-gray-600">Find and apply to brand campaigns</p>
        </div>

        {/* Filters */}
        <div className="mb-6">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value === 'All Categories' ? '' : e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            {categories.map(cat => (
              <option key={cat} value={cat === 'All Categories' ? '' : cat}>{cat}</option>
            ))}
          </select>
        </div>

        {/* Campaigns Grid */}
        {campaigns.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <h3 className="text-xl font-medium text-gray-900 mb-2">No campaigns found</h3>
            <p className="text-gray-600">Check back later for new opportunities</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {campaigns.map((campaign) => (
              <div key={campaign.id} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow">
                <div className="p-6">
                  {/* Category and Status */}
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm text-gray-600">{campaign.category}</span>
                    {campaign.has_applied && (
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-primary text-primary-dark">
                        Applied
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {campaign.title}
                  </h3>

                  {/* Description */}
                  <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                    {campaign.description}
                  </p>

                  {/* Brand */}
                  {campaign.brand && (
                    <div className="flex items-center gap-2 mb-4">
                      <Avatar
                        src={campaign.brand.logo}
                        alt={campaign.brand.company_name}
                        size="sm"
                        type="brand"
                      />
                      <p className="text-sm text-gray-600">
                        By: {campaign.brand.company_name}
                      </p>
                    </div>
                  )}

                  {/* Stats */}
                  <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
                    <div>
                      <p className="text-xs text-gray-600">Budget</p>
                      <p className="text-lg font-semibold text-gray-900">${campaign.budget}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Packages</p>
                      <p className="text-lg font-semibold text-gray-900">{campaign.packages_count || 0}</p>
                    </div>
                  </div>

                  {/* Action */}
                  <Link
                    to={`/creator/campaigns/${campaign.id}`}
                    className="block w-full px-4 py-2 bg-primary hover:bg-primary-dark text-white text-center font-medium rounded-lg transition-colors"
                  >
                    View Details
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BrowseCampaigns;
