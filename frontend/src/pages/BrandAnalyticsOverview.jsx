import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../services/api';
import toast from 'react-hot-toast';
import {
  ChartBarIcon,
  ArrowTrendingUpIcon,
  UserGroupIcon,
  HeartIcon,
  EyeIcon,
  CurrencyDollarIcon,
  SparklesIcon,
  ArrowLeftIcon,
  ChatBubbleLeftRightIcon,
} from '@heroicons/react/24/outline';
import Avatar from '../components/Avatar';

const BrandAnalyticsOverview = () => {
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOverallAnalytics();
  }, []);

  const fetchOverallAnalytics = async () => {
    try {
      setLoading(true);

      const response = await api.get('/collaborations/analytics/summary');

      if (response.data.success) {
        setAnalytics(response.data.summary);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
      if (error.response?.status === 404) {
        // No analytics available yet - set empty state
        setAnalytics(null);
      } else {
        toast.error('Failed to load analytics');
      }
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num) => {
    if (!num) return '0';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString();
  };

  const formatCurrency = (amount) => {
    return `$${parseFloat(amount || 0).toFixed(2)}`;
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

  if (!analytics || analytics.total_collaborations === 0) {
    return (
      <div className="min-h-screen bg-light">
        <Navbar />
        <div className="container-custom section-padding">
          <div className="text-center py-12">
            <ChartBarIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-700 mb-2">No Analytics Available Yet</h3>
            <p className="text-gray-500 mb-6">
              Start collaborating with creators to see your campaign performance analytics here.
            </p>
            <Link
              to="/browse/creators"
              className="inline-block px-6 py-3 bg-primary text-dark rounded-full hover:bg-primary/90 transition-colors font-medium"
            >
              Find Creators
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-light">
      <Navbar />

      <div className="container-custom section-padding">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/brand/dashboard')}
              className="p-2 hover:bg-white rounded-full transition-colors"
            >
              <ArrowLeftIcon className="w-6 h-6 text-gray-600" />
            </button>
            <div>
              <h1 className="text-4xl font-bold text-dark">Analytics Overview</h1>
              <p className="text-gray-600 mt-1">
                Performance across all {analytics.total_collaborations} campaigns
              </p>
            </div>
          </div>
        </div>

        {/* Overall Performance Metrics */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-dark mb-4">Overall Performance</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Total Reach */}
            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Reach</p>
                  <p className="text-3xl font-bold text-dark">{formatNumber(analytics.total_reach)}</p>
                </div>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <UserGroupIcon className="w-6 h-6 text-primary" />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">Unique users reached</p>
            </div>

            {/* Total Engagement */}
            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Engagement</p>
                  <p className="text-3xl font-bold text-dark">{formatNumber(analytics.total_engagement)}</p>
                </div>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <HeartIcon className="w-6 h-6 text-primary" />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">{analytics.avg_engagement_rate}% average rate</p>
            </div>

            {/* Total Impressions */}
            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Impressions</p>
                  <p className="text-3xl font-bold text-dark">{formatNumber(analytics.total_impressions)}</p>
                </div>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <EyeIcon className="w-6 h-6 text-primary" />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">Total views</p>
            </div>

            {/* Video Views */}
            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Video Views</p>
                  <p className="text-3xl font-bold text-dark">{formatNumber(analytics.total_video_views)}</p>
                </div>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">Video content views</p>
            </div>
          </div>
        </div>

        {/* Engagement Breakdown */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-dark mb-4">Engagement Breakdown</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {/* Likes */}
            <div className="card">
              <p className="text-sm text-gray-600 mb-2">Likes</p>
              <p className="text-2xl font-bold text-dark">{formatNumber(analytics.total_likes)}</p>
            </div>

            {/* Comments */}
            <div className="card">
              <p className="text-sm text-gray-600 mb-2">Comments</p>
              <p className="text-2xl font-bold text-dark">{formatNumber(analytics.total_comments)}</p>
            </div>

            {/* Shares */}
            <div className="card">
              <p className="text-sm text-gray-600 mb-2">Shares</p>
              <p className="text-2xl font-bold text-dark">{formatNumber(analytics.total_shares)}</p>
            </div>

            {/* Saves */}
            <div className="card">
              <p className="text-sm text-gray-600 mb-2">Saves</p>
              <p className="text-2xl font-bold text-dark">{formatNumber(analytics.total_saves)}</p>
            </div>
          </div>
        </div>

        {/* Financial Insights */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-dark mb-4">Financial Insights</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Total Investment */}
            <div className="card">
              <div className="flex items-center gap-3 mb-3">
                <CurrencyDollarIcon className="w-5 h-5 text-primary" />
                <p className="text-sm text-gray-600">Total Investment</p>
              </div>
              <p className="text-3xl font-bold text-dark">{formatCurrency(analytics.total_spend)}</p>
              <p className="text-xs text-gray-500 mt-2">{analytics.total_posts} posts delivered</p>
            </div>

            {/* Avg Cost Per Engagement */}
            <div className="card">
              <div className="flex items-center gap-3 mb-3">
                <HeartIcon className="w-5 h-5 text-primary" />
                <p className="text-sm text-gray-600">Avg Cost Per Engagement</p>
              </div>
              <p className="text-2xl font-bold text-dark">{formatCurrency(analytics.avg_cost_per_engagement)}</p>
              <p className="text-xs text-gray-500 mt-2">Lower is better</p>
            </div>

            {/* Avg Cost Per Reach */}
            <div className="card">
              <div className="flex items-center gap-3 mb-3">
                <UserGroupIcon className="w-5 h-5 text-primary" />
                <p className="text-sm text-gray-600">Avg Cost Per Reach</p>
              </div>
              <p className="text-2xl font-bold text-dark">{formatCurrency(analytics.avg_cost_per_reach)}</p>
              <p className="text-xs text-gray-500 mt-2">Per unique user</p>
            </div>

            {/* Overall ROI */}
            <div className="card">
              <div className="flex items-center gap-3 mb-3">
                <ArrowTrendingUpIcon className="w-5 h-5 text-primary" />
                <p className="text-sm text-gray-600">Overall ROI</p>
              </div>
              <p className={`text-2xl font-bold ${analytics.overall_roi >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {analytics.overall_roi >= 0 ? '+' : ''}{analytics.overall_roi}%
              </p>
              <p className="text-xs text-gray-500 mt-2">Return on investment</p>
            </div>
          </div>
        </div>

        {/* Campaign Statistics */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-dark mb-4">Campaign Statistics</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Total Campaigns */}
            <div className="card">
              <p className="text-sm text-gray-600 mb-2">Total Campaigns</p>
              <p className="text-4xl font-bold text-dark">{analytics.total_collaborations}</p>
            </div>

            {/* Active Campaigns */}
            <div className="card">
              <p className="text-sm text-gray-600 mb-2">Active Campaigns</p>
              <p className="text-4xl font-bold text-primary">{analytics.active_collaborations}</p>
            </div>

            {/* Completed Campaigns */}
            <div className="card">
              <p className="text-sm text-gray-600 mb-2">Completed Campaigns</p>
              <p className="text-4xl font-bold text-green-600">{analytics.completed_collaborations}</p>
            </div>
          </div>
        </div>

        {/* Sentiment Overview */}
        {analytics.sentiment_overview.total_comments > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-dark mb-4">Overall Sentiment</h2>
            <div className="card">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Overall Sentiment */}
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-3 h-3 rounded-full ${
                      analytics.sentiment_overview.overall === 'positive' ? 'bg-green-500' :
                      analytics.sentiment_overview.overall === 'negative' ? 'bg-red-500' :
                      'bg-gray-400'
                    }`}></div>
                    <p className="text-lg font-semibold text-dark capitalize">
                      {analytics.sentiment_overview.overall} Sentiment
                    </p>
                  </div>
                  <p className="text-sm text-gray-600">
                    Across {analytics.sentiment_overview.total_comments} comments
                  </p>
                </div>

                {/* Comment Breakdown */}
                <div>
                  <p className="text-sm text-gray-600 mb-4">Comment Distribution</p>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">Positive</span>
                      <span className="text-sm font-semibold text-green-600">
                        {analytics.sentiment_overview.positive}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">Neutral</span>
                      <span className="text-sm font-semibold text-gray-600">
                        {analytics.sentiment_overview.neutral}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">Negative</span>
                      <span className="text-sm font-semibold text-red-600">
                        {analytics.sentiment_overview.negative}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Individual Campaigns */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-dark mb-4">Individual Campaigns</h2>
          <div className="space-y-4">
            {analytics.campaigns.map((campaign) => (
              <div key={campaign.id} className="card hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  {/* Creator Info */}
                  <div className="flex items-center gap-4">
                    <Avatar
                      src={campaign.creator.profile_picture}
                      alt={campaign.creator.display_name}
                      size="md"
                      type="user"
                    />
                    <div>
                      <p className="font-semibold text-dark">{campaign.creator.display_name}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(campaign.created_at).toLocaleDateString()} •{' '}
                        <span className={`capitalize ${
                          campaign.status === 'completed' ? 'text-green-600' :
                          campaign.status === 'in_progress' ? 'text-primary' :
                          'text-gray-600'
                        }`}>
                          {campaign.status}
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Campaign Stats */}
                  <div className="grid grid-cols-4 gap-6 flex-1 max-w-2xl mx-6">
                    <div className="text-center">
                      <p className="text-xs text-gray-600">Investment</p>
                      <p className="text-lg font-bold text-dark">{formatCurrency(campaign.amount)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-600">Reach</p>
                      <p className="text-lg font-bold text-dark">{formatNumber(campaign.metrics.reach)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-600">Engagement</p>
                      <p className="text-lg font-bold text-dark">{formatNumber(campaign.metrics.engagement)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-600">Eng. Rate</p>
                      <p className="text-lg font-bold text-primary">{campaign.metrics.avg_engagement_rate}%</p>
                    </div>
                  </div>

                  {/* View Analytics Button */}
                  <Link
                    to={`/brand/analytics/${campaign.id}`}
                    className="px-4 py-2 bg-primary text-dark rounded-full hover:bg-primary/90 transition-colors text-sm font-medium"
                  >
                    View Details
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Back Button */}
        <div className="flex justify-center">
          <Link
            to="/brand/dashboard"
            className="px-6 py-3 bg-white border-2 border-gray-200 text-dark rounded-full hover:border-primary hover:bg-primary/5 transition-colors"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
};

export default BrandAnalyticsOverview;
