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

        {/* Engagement Breakdown */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-dark mb-4">Engagement Breakdown</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="card">
              <div className="flex items-center gap-3 mb-2">
                <HeartIcon className="w-5 h-5 text-pink-500" />
                <p className="text-sm text-gray-600">Likes</p>
              </div>
              <p className="text-2xl font-bold text-dark">{formatNumber(raw_data.likes)}</p>
            </div>

            <div className="card">
              <div className="flex items-center gap-3 mb-2">
                <ChatBubbleLeftRightIcon className="w-5 h-5 text-blue-500" />
                <p className="text-sm text-gray-600">Comments</p>
              </div>
              <p className="text-2xl font-bold text-dark">{formatNumber(raw_data.comments)}</p>
            </div>

            <div className="card">
              <div className="flex items-center gap-3 mb-2">
                <ShareIcon className="w-5 h-5 text-green-500" />
                <p className="text-sm text-gray-600">Shares</p>
              </div>
              <p className="text-2xl font-bold text-dark">{formatNumber(raw_data.shares)}</p>
            </div>

            <div className="card">
              <div className="flex items-center gap-3 mb-2">
                <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
                <p className="text-sm text-gray-600">Saves</p>
              </div>
              <p className="text-2xl font-bold text-dark">{formatNumber(raw_data.saves)}</p>
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

        {/* Deliverables Table */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-dark mb-4">Deliverables Performance</h2>
          <div className="card overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Title</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Platform</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Status</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Reach</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Engagement</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Eng. Rate</th>
                </tr>
              </thead>
              <tbody>
                {deliverables.map((deliverable) => (
                  <tr key={deliverable.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <p className="text-sm font-medium text-dark">{deliverable.title}</p>
                      {deliverable.url && (
                        <a
                          href={deliverable.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline"
                        >
                          View Post
                        </a>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm text-gray-600 capitalize">{deliverable.platform || 'N/A'}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        deliverable.status === 'approved' ? 'bg-green-100 text-green-800' :
                        deliverable.status === 'pending_review' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {deliverable.status?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="text-sm text-gray-700">
                        {deliverable.has_metrics ? formatNumber(deliverable.metrics?.reach || 0) : '-'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="text-sm text-gray-700">
                        {deliverable.has_metrics ? formatNumber(deliverable.metrics?.total_engagement || 0) : '-'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="text-sm text-gray-700">
                        {deliverable.has_metrics ? `${deliverable.metrics?.engagement_rate || 0}%` : '-'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
