import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../services/api';
import toast from 'react-hot-toast';
import {
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ChatBubbleLeftRightIcon,
  HeartIcon,
  EyeIcon,
  ShareIcon,
  UserGroupIcon,
  CurrencyDollarIcon,
  SparklesIcon,
  ArrowLeftIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import SentimentPieChart from '../components/analytics/SentimentPieChart';
import EngagementBarChart from '../components/analytics/EngagementBarChart';
import PostAnalyticsCard from '../components/analytics/PostAnalyticsCard';

const BrandAnalytics = () => {
  const { collaborationId } = useParams();
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState(null);
  const [collaboration, setCollaboration] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (collaborationId) {
      fetchAnalytics();
    }
  }, [collaborationId]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);

      // Fetch collaboration details
      const collabRes = await api.get(`/collaborations/${collaborationId}`);
      setCollaboration(collabRes.data);

      // Fetch analytics
      const analyticsRes = await api.get(`/collaborations/${collaborationId}/analytics`);

      if (analyticsRes.data.success) {
        setAnalytics(analyticsRes.data.analytics);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
      if (error.response?.status === 404) {
        toast.error('Analytics not available for this collaboration');
      } else {
        toast.error('Failed to load analytics');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSyncMetrics = async () => {
    try {
      setSyncing(true);
      toast.loading('Syncing metrics from ThunziAI...');

      await api.post(`/collaborations/${collaborationId}/sync-all-metrics`);

      toast.dismiss();
      toast.success('Metrics synced successfully!');

      // Refresh analytics
      await fetchAnalytics();
    } catch (error) {
      toast.dismiss();
      console.error('Error syncing metrics:', error);
      toast.error(error.response?.data?.message || 'Failed to sync metrics');
    } finally {
      setSyncing(false);
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

  if (!analytics) {
    return (
      <div className="min-h-screen bg-light">
        <Navbar />
        <div className="container-custom section-padding">
          <div className="text-center py-12">
            <ChartBarIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-700 mb-2">No Analytics Available</h3>
            <p className="text-gray-500 mb-4">
              Analytics will be available once the creator submits post URLs and metrics are synced.
            </p>
            <Link
              to="/brand/collaborations"
              className="inline-block px-6 py-3 bg-dark text-white rounded-full hover:bg-gray-800 transition-colors"
            >
              Back to Collaborations
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { raw_data, insights, sentiment, mentions, deliverables } = analytics;

  return (
    <div className="min-h-screen bg-light">
      <Navbar />

      <div className="container-custom section-padding">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-white rounded-full transition-colors"
            >
              <ArrowLeftIcon className="w-6 h-6 text-gray-600" />
            </button>
            <div>
              <h1 className="text-4xl font-bold text-dark">Campaign Analytics</h1>
              <p className="text-gray-600 mt-1">
                {analytics.creator.display_name} - {collaboration?.title || 'Collaboration'}
              </p>
            </div>
          </div>

          <button
            onClick={handleSyncMetrics}
            disabled={syncing}
            className="flex items-center gap-2 px-6 py-3 bg-primary text-dark rounded-full hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <ArrowPathIcon className={`w-5 h-5 ${syncing ? 'animate-spin' : ''}`} />
            <span>{syncing ? 'Syncing...' : 'Sync Metrics'}</span>
          </button>
        </div>

        {/* Raw Performance Data */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-dark mb-4">Performance Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Reach */}
            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Reach</p>
                  <p className="text-3xl font-bold text-dark">{formatNumber(raw_data.reach)}</p>
                </div>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <UserGroupIcon className="w-6 h-6 text-primary" />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">Unique users reached</p>
            </div>

            {/* Engagement */}
            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Engagement</p>
                  <p className="text-3xl font-bold text-dark">{formatNumber(raw_data.total_engagement)}</p>
                </div>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <HeartIcon className="w-6 h-6 text-primary" />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">{raw_data.avg_engagement_rate}% engagement rate</p>
            </div>

            {/* Impressions */}
            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Impressions</p>
                  <p className="text-3xl font-bold text-dark">{formatNumber(raw_data.impressions)}</p>
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
                  <p className="text-3xl font-bold text-dark">{formatNumber(raw_data.video_views)}</p>
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

        {/* Engagement Visualization */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-dark mb-4">Engagement Analysis</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Engagement Breakdown Chart */}
            <div className="card">
              <h3 className="text-lg font-semibold text-dark mb-4">Engagement Breakdown</h3>
              <EngagementBarChart data={raw_data} />
            </div>

            {/* Sentiment Distribution Chart */}
            <div className="card">
              <h3 className="text-lg font-semibold text-dark mb-4">Sentiment Distribution</h3>
              <SentimentPieChart sentiment={sentiment} />
            </div>
          </div>
        </div>

        {/* Actionable Insights */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-dark mb-4">Actionable Insights</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Cost Per Engagement */}
            <div className="card">
              <div className="flex items-center gap-3 mb-3">
                <CurrencyDollarIcon className="w-5 h-5 text-primary" />
                <p className="text-sm text-gray-600">Cost Per Engagement</p>
              </div>
              <p className="text-2xl font-bold text-dark">{formatCurrency(insights.cost_per_engagement)}</p>
              <p className="text-xs text-gray-500 mt-2">Lower is better</p>
            </div>

            {/* ROI */}
            <div className="card">
              <div className="flex items-center gap-3 mb-3">
                <ArrowTrendingUpIcon className="w-5 h-5 text-primary" />
                <p className="text-sm text-gray-600">ROI</p>
              </div>
              <p className={`text-2xl font-bold ${insights.roi_percentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {insights.roi_percentage >= 0 ? '+' : ''}{insights.roi_percentage}%
              </p>
              <p className="text-xs text-gray-500 mt-2">Return on investment</p>
            </div>

            {/* Performance Rating */}
            <div className="card">
              <div className="flex items-center gap-3 mb-3">
                <SparklesIcon className="w-5 h-5 text-primary" />
                <p className="text-sm text-gray-600">Performance Rating</p>
              </div>
              <p className="text-2xl font-bold text-dark">{insights.performance_rating}</p>
              <p className="text-xs text-gray-500 mt-2">Based on engagement rate</p>
            </div>

            {/* Cost Per Reach */}
            <div className="card">
              <div className="flex items-center gap-3 mb-3">
                <UserGroupIcon className="w-5 h-5 text-primary" />
                <p className="text-sm text-gray-600">Cost Per Reach</p>
              </div>
              <p className="text-2xl font-bold text-dark">{formatCurrency(insights.cost_per_reach)}</p>
              <p className="text-xs text-gray-500 mt-2">Per unique user</p>
            </div>
          </div>
        </div>

        {/* Sentiment Analysis */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-dark mb-4">Sentiment Analysis</h2>
          <div className="card">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Overall Sentiment */}
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-3 h-3 rounded-full ${
                    sentiment.overall === 'positive' ? 'bg-green-500' :
                    sentiment.overall === 'negative' ? 'bg-red-500' :
                    'bg-gray-400'
                  }`}></div>
                  <p className="text-lg font-semibold text-dark capitalize">{sentiment.overall} Sentiment</p>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 mb-6">
                  <div
                    className={`h-3 rounded-full ${
                      sentiment.overall === 'positive' ? 'bg-green-500' :
                      sentiment.overall === 'negative' ? 'bg-red-500' :
                      'bg-gray-400'
                    }`}
                    style={{ width: `${sentiment.sentiment_score}%` }}
                  ></div>
                </div>
                <p className="text-sm text-gray-600">
                  Sentiment Score: <span className="font-semibold">{sentiment.sentiment_score}/100</span>
                </p>
              </div>

              {/* Comment Breakdown */}
              <div>
                <p className="text-sm text-gray-600 mb-4">Comment Breakdown ({sentiment.total_comments} total)</p>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">Positive</span>
                    <span className="text-sm font-semibold text-green-600">{sentiment.positive}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">Neutral</span>
                    <span className="text-sm font-semibold text-gray-600">{sentiment.neutral}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">Negative</span>
                    <span className="text-sm font-semibold text-red-600">{sentiment.negative}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">Critical</span>
                    <span className="text-sm font-semibold text-red-800">{sentiment.critical}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Brand Mentions */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-dark mb-4">Brand Mentions</h2>
          <div className="card">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Mentions</p>
                <p className="text-3xl font-bold text-dark">{mentions.total}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Posts with Mentions</p>
                <p className="text-3xl font-bold text-dark">{mentions.posts_with_mentions}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Platforms</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {Object.keys(mentions.platforms).map((platform) => (
                    <span
                      key={platform}
                      className="px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium"
                    >
                      {platform}: {mentions.platforms[platform]}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Individual Post Analytics */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-dark mb-4">Individual Post Performance</h2>
          <div className="space-y-6">
            {deliverables.map((deliverable) => (
              <PostAnalyticsCard
                key={deliverable.id}
                deliverable={deliverable}
                formatNumber={formatNumber}
              />
            ))}
          </div>
        </div>

        {/* Back Button */}
        <div className="flex justify-center">
          <Link
            to="/brand/collaborations"
            className="px-6 py-3 bg-white border-2 border-gray-200 text-dark rounded-full hover:border-primary hover:bg-primary/5 transition-colors"
          >
            Back to Collaborations
          </Link>
        </div>
      </div>
    </div>
  );
};

export default BrandAnalytics;
