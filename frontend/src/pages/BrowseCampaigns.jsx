import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { campaignsAPI, categoriesAPI } from '../services/api';
import Navbar from '../components/Navbar';
import toast from 'react-hot-toast';
import Avatar from '../components/Avatar';
import SEO from '../components/SEO';
import { Bolt } from 'lucide-react';

const BrowseCampaigns = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('');
  const [categories, setCategories] = useState(['All Categories']);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchCampaigns();
  }, [category]);

  const fetchCategories = async () => {
    try {
      const response = await categoriesAPI.getCategories();
      setCategories(['All Categories', ...response.data.categories.map(cat => cat.name)]);
    } catch (error) {
      console.error('Error fetching categories:', error);
      // Keep default 'All Categories' if fetch fails
    }
  };

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const params = category ? { category } : {};
      const response = await campaignsAPI.browseCampaigns(params);
      setCampaigns(response.data.campaigns || []);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      toast.error('Failed to load opportunities');
    } finally {
      setLoading(false);
    }
  };

  const formatBudget = (campaign) => {
    if (campaign.participation_mode === 'proposals' && campaign.budget_min && campaign.budget_max) {
      return `$${campaign.budget_min} - $${campaign.budget_max}`;
    }
    return campaign.budget ? `$${campaign.budget}` : 'Negotiable';
  };

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
      <SEO
        title="Campaign Opportunities"
        description="Browse brand collaboration opportunities. Find campaigns matching your niche and apply to work with top African brands."
        keywords="brand campaigns, collaboration opportunities, influencer jobs, creator opportunities"
      />
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

          <h1 className="text-3xl font-bold text-gray-900 mb-2">Campaign Opportunities</h1>
          <p className="text-gray-600">Browse active campaigns and submit your proposal</p>
        </div>

        {/* Stats Banner */}
        <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-3">
            <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="font-medium text-gray-900">Smart Filtering Active</p>
              <p className="text-sm text-gray-600">
                We're showing you campaigns that match your category, follower count, and location
              </p>
            </div>
          </div>
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
            <h3 className="text-xl font-medium text-gray-900 mb-2">No opportunities found</h3>
            <p className="text-gray-600">Check back later for campaigns matching your profile</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {campaigns.map((campaign) => (
              <div key={campaign.id} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow border border-gray-200">
                <div className="p-6">
                  {/* Header: Category, Mode, Status */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      {campaign.active_spotlight_boost && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                          <Bolt className="h-3 w-3" />
                          Boosted
                        </span>
                      )}
                      <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                        {campaign.category}
                      </span>
                      {campaign.participation_mode === 'proposals' && (
                        <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                          Accepting Proposals
                        </span>
                      )}
                    </div>
                    {campaign.has_applied && (
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        campaign.application_status === 'accepted' ? 'bg-green-100 text-green-700' :
                        campaign.application_status === 'rejected' ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {campaign.application_status === 'accepted' ? 'Accepted' :
                         campaign.application_status === 'rejected' ? 'Rejected' :
                         'Applied'}
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">
                    {campaign.title}
                  </h3>

                  {/* Brand */}
                  {campaign.brand && (
                    <div className="flex items-center gap-2 mb-4 pb-4 border-b">
                      <Avatar
                        src={campaign.brand.logo}
                        alt={campaign.brand.company_name}
                        size="sm"
                        type="brand"
                      />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {campaign.brand.company_name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {campaign.brand.industry}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Campaign Brief Preview */}
                  {campaign.campaign_objective && (
                    <div className="mb-4 p-3 bg-primary/5 rounded-lg border border-primary/20">
                      <p className="text-xs font-medium text-primary mb-1">Campaign Objective</p>
                      <p className="text-sm text-gray-700 line-clamp-2">{campaign.campaign_objective}</p>
                    </div>
                  )}

                  {/* Key Info Grid */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-xs text-gray-600 mb-1">Budget Range</p>
                      <p className="text-lg font-semibold text-gray-900">{formatBudget(campaign)}</p>
                    </div>
                    {campaign.timeline_days && (
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-xs text-gray-600 mb-1">Timeline</p>
                        <p className="text-lg font-semibold text-gray-900">{campaign.timeline_days} days</p>
                      </div>
                    )}
                  </div>

                  {/* Required Mentions */}
                  {(campaign.required_mentions?.hashtags?.length > 0 ||
                    campaign.required_mentions?.mentions?.length > 0) && (
                    <div className="mb-4">
                      <p className="text-xs font-medium text-gray-700 mb-2">Required Mentions</p>
                      <div className="flex flex-wrap gap-2">
                        {campaign.required_mentions.hashtags?.slice(0, 3).map((tag, i) => (
                          <span key={i} className="px-2 py-1 bg-blue-50 text-blue-600 rounded text-xs">
                            {tag}
                          </span>
                        ))}
                        {campaign.required_mentions.mentions?.slice(0, 2).map((mention, i) => (
                          <span key={i} className="px-2 py-1 bg-purple-50 text-purple-600 rounded text-xs">
                            {mention}
                          </span>
                        ))}
                        {(campaign.required_mentions.hashtags?.length + campaign.required_mentions.mentions?.length) > 5 && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                            +{(campaign.required_mentions.hashtags?.length + campaign.required_mentions.mentions?.length) - 5} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Target Audience */}
                  {campaign.target_audience?.age_range && (
                    <div className="mb-4 text-sm">
                      <p className="text-xs font-medium text-gray-700 mb-1">Target Audience</p>
                      <p className="text-gray-600">Age: {campaign.target_audience.age_range}</p>
                    </div>
                  )}

                  {/* Deliverables Preview */}
                  {campaign.milestones && campaign.milestones.length > 0 && (
                    <div className="mb-4 bg-gray-50 rounded-lg p-3">
                      <p className="text-xs font-medium text-gray-700 mb-2">What You'll Deliver:</p>
                      <div className="space-y-1">
                        {campaign.milestones.slice(0, 2).map((milestone, idx) => (
                          milestone.deliverables && milestone.deliverables.length > 0 && (
                            <div key={idx} className="flex items-start gap-2">
                              <svg className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              <span className="text-sm text-gray-700">
                                {milestone.deliverables.map(d =>
                                  `${d.quantity}× ${d.platform} ${d.content_type}`
                                ).join(', ')}
                              </span>
                            </div>
                          )
                        ))}
                        {campaign.milestones.length > 2 && (
                          <p className="text-xs text-gray-500 ml-6">
                            +{campaign.milestones.length - 2} more milestone{campaign.milestones.length - 2 > 1 ? 's' : ''}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Description */}
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {campaign.description}
                  </p>

                  {/* Action Button */}
                  <Link
                    to={`/creator/campaigns/${campaign.id}`}
                    className="block w-full px-4 py-3 bg-primary hover:bg-primary-dark text-white text-center font-medium rounded-lg transition-colors"
                  >
                    {campaign.has_applied ? 'View Application' : 'View Full Brief & Apply'}
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
