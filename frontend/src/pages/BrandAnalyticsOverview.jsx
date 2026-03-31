import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api, { analyticsAPI } from '../services/api';
import toast from 'react-hot-toast';
import AudienceCharts from '../components/AudienceCharts';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
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

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const BrandAnalyticsOverview = () => {
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [audienceData, setAudienceData] = useState(null);
  const [audienceLoading, setAudienceLoading] = useState(true);

  useEffect(() => {
    fetchOverallAnalytics();
    fetchBrandAudience();
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
        setAnalytics(null);
      } else {
        toast.error('Failed to load analytics');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchBrandAudience = async () => {
    try {
      setAudienceLoading(true);
      const response = await analyticsAPI.getBrandAudience();
      setAudienceData(response.data);
    } catch (error) {
      console.error('Error fetching audience data:', error);
      // Don't show error toast as audience data is optional
      setAudienceData(null);
    } finally {
      setAudienceLoading(false);
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

  // Chart configurations
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: '#1F2937',
        padding: 12,
        titleFont: {
          size: 14,
        },
        bodyFont: {
          size: 13,
        },
        cornerRadius: 8,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: '#E5E7EB',
        },
        ticks: {
          callback: function(value) {
            return formatNumber(value);
          },
        },
      },
      x: {
        grid: {
          display: false,
        },
      },
    },
  };

  // Prepare chart data
  const getEngagementBreakdownData = () => {
    if (!analytics) return null;

    return {
      labels: ['Likes', 'Comments', 'Shares', 'Saves'],
      datasets: [
        {
          label: 'Engagement',
          data: [
            analytics.total_likes,
            analytics.total_comments,
            analytics.total_shares,
            analytics.total_saves,
          ],
          backgroundColor: [
            'rgba(204, 219, 83, 0.8)',
            'rgba(31, 41, 55, 0.8)',
            'rgba(200, 255, 9, 0.8)',
            'rgba(131, 138, 54, 0.8)',
          ],
          borderColor: [
            '#ccdb53',
            '#1F2937',
            '#c8ff09',
            '#838a36',
          ],
          borderWidth: 2,
          borderRadius: 8,
        },
      ],
    };
  };

  const getCampaignPerformanceData = () => {
    if (!analytics || !analytics.campaigns) return null;

    // Get top 10 campaigns
    const topCampaigns = analytics.campaigns
      .slice(0, 10)
      .sort((a, b) => b.metrics.engagement - a.metrics.engagement);

    return {
      labels: topCampaigns.map(c => c.creator.display_name || c.creator.username),
      datasets: [
        {
          label: 'Engagement',
          data: topCampaigns.map(c => c.metrics.engagement),
          backgroundColor: 'rgba(204, 219, 83, 0.8)',
          borderColor: '#ccdb53',
          borderWidth: 2,
          borderRadius: 6,
        },
      ],
    };
  };

  const getReachVsEngagementData = () => {
    if (!analytics) return null;

    return {
      labels: ['Reach', 'Impressions', 'Engagement', 'Video Views'],
      datasets: [
        {
          label: 'Performance Metrics',
          data: [
            analytics.total_reach,
            analytics.total_impressions,
            analytics.total_engagement,
            analytics.total_video_views,
          ],
          backgroundColor: 'rgba(204, 219, 83, 0.2)',
          borderColor: '#ccdb53',
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointRadius: 6,
          pointBackgroundColor: '#ccdb53',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointHoverRadius: 8,
        },
      ],
    };
  };

  const getSentimentData = () => {
    if (!analytics || !analytics.sentiment_overview) return null;

    return {
      labels: ['Positive', 'Neutral', 'Negative'],
      datasets: [
        {
          data: [
            analytics.sentiment_overview.positive,
            analytics.sentiment_overview.neutral,
            analytics.sentiment_overview.negative,
          ],
          backgroundColor: [
            'rgba(34, 197, 94, 0.8)',
            'rgba(156, 163, 175, 0.8)',
            'rgba(239, 68, 68, 0.8)',
          ],
          borderColor: [
            '#22c55e',
            '#9ca3af',
            '#ef4444',
          ],
          borderWidth: 2,
        },
      ],
    };
  };

  const lineChartOptions = {
    ...chartOptions,
    plugins: {
      ...chartOptions.plugins,
      legend: {
        display: false,
      },
    },
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          padding: 15,
          font: {
            size: 12,
          },
          usePointStyle: true,
        },
      },
      tooltip: {
        backgroundColor: '#1F2937',
        padding: 12,
        cornerRadius: 8,
      },
    },
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

        {/* Key Metrics Summary */}
        <div className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Total Reach */}
            <div className="bg-white rounded-3xl shadow-sm hover:shadow-md p-6 transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Reach</p>
                  <p className="text-3xl font-bold text-dark">{formatNumber(analytics.total_reach)}</p>
                </div>
                <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center">
                  <UserGroupIcon className="w-7 h-7 text-primary" />
                </div>
              </div>
              <p className="text-xs text-gray-500">Unique users reached</p>
            </div>

            {/* Total Engagement */}
            <div className="bg-white rounded-3xl shadow-sm hover:shadow-md p-6 transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Engagement</p>
                  <p className="text-3xl font-bold text-dark">{formatNumber(analytics.total_engagement)}</p>
                </div>
                <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center">
                  <HeartIcon className="w-7 h-7 text-primary" />
                </div>
              </div>
              <p className="text-xs text-green-600 font-medium">{analytics.avg_engagement_rate}% average rate</p>
            </div>

            {/* Total Investment */}
            <div className="bg-white rounded-3xl shadow-sm hover:shadow-md p-6 transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Investment</p>
                  <p className="text-3xl font-bold text-dark">{formatCurrency(analytics.total_spend)}</p>
                </div>
                <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center">
                  <CurrencyDollarIcon className="w-7 h-7 text-primary" />
                </div>
              </div>
              <p className="text-xs text-gray-500">{analytics.total_posts} posts delivered</p>
            </div>

            {/* Total Views/Impressions */}
            <div className="bg-white rounded-3xl shadow-sm hover:shadow-md p-6 transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Views</p>
                  <p className="text-3xl font-bold text-dark">{formatNumber(analytics.total_impressions)}</p>
                </div>
                <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center">
                  <EyeIcon className="w-7 h-7 text-primary" />
                </div>
              </div>
              <p className="text-xs text-gray-500">Total impressions across campaigns</p>
            </div>
          </div>
        </div>

        {/* Audience Demographics */}
        {audienceData && audienceData.totalPlatforms > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold text-dark">Audience Demographics</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Combined audience across {audienceData.totalCollaborations} collaborations • {audienceData.totalPlatforms} platforms
                </p>
              </div>
            </div>
            <AudienceCharts audienceData={audienceData} loading={audienceLoading} />
          </div>
        )}

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Engagement Breakdown Chart */}
          <div className="bg-white rounded-3xl shadow-sm hover:shadow-md p-6 transition-shadow">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                <ChartBarIcon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-dark">Engagement Breakdown</h3>
                <p className="text-sm text-gray-500">By interaction type</p>
              </div>
            </div>
            <div className="h-80">
              <Bar data={getEngagementBreakdownData()} options={chartOptions} />
            </div>
          </div>

          {/* Performance Trends Chart */}
          <div className="bg-white rounded-3xl shadow-sm hover:shadow-md p-6 transition-shadow">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                <ArrowTrendingUpIcon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-dark">Performance Metrics</h3>
                <p className="text-sm text-gray-500">Overall campaign performance</p>
              </div>
            </div>
            <div className="h-80">
              <Line data={getReachVsEngagementData()} options={lineChartOptions} />
            </div>
          </div>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Top Campaigns Chart */}
          <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm hover:shadow-md p-6 transition-shadow">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                <SparklesIcon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-dark">Top Performing Campaigns</h3>
                <p className="text-sm text-gray-500">By total engagement</p>
              </div>
            </div>
            <div className="h-80">
              <Bar data={getCampaignPerformanceData()} options={chartOptions} />
            </div>
          </div>

          {/* Sentiment Doughnut Chart */}
          {analytics.sentiment_overview.total_comments > 0 && (
            <div className="bg-white rounded-3xl shadow-sm hover:shadow-md p-6 transition-shadow">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                  <ChatBubbleLeftRightIcon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-dark">Sentiment Analysis</h3>
                  <p className="text-sm text-gray-500">{analytics.sentiment_overview.total_comments} comments</p>
                </div>
              </div>
              <div className="h-80 flex items-center justify-center">
                <Doughnut data={getSentimentData()} options={doughnutOptions} />
              </div>
            </div>
          )}
        </div>

        {/* Campaign Statistics Cards */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-dark mb-4">Campaign Statistics</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Total Campaigns */}
            <div className="bg-white rounded-3xl shadow-sm p-6">
              <p className="text-sm text-gray-600 mb-2">Total Campaigns</p>
              <p className="text-4xl font-bold text-dark mb-2">{analytics.total_collaborations}</p>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-primary font-medium">{analytics.active_collaborations} active</span>
                <span className="text-gray-400">•</span>
                <span className="text-green-600 font-medium">{analytics.completed_collaborations} completed</span>
              </div>
            </div>

            {/* Cost Per Engagement */}
            <div className="bg-white rounded-3xl shadow-sm p-6">
              <p className="text-sm text-gray-600 mb-2">Avg Cost Per Engagement</p>
              <p className="text-4xl font-bold text-dark mb-2">{formatCurrency(analytics.avg_cost_per_engagement)}</p>
              <p className="text-xs text-gray-500">Lower is better</p>
            </div>

            {/* Cost Per Reach */}
            <div className="bg-white rounded-3xl shadow-sm p-6">
              <p className="text-sm text-gray-600 mb-2">Avg Cost Per Reach</p>
              <p className="text-4xl font-bold text-dark mb-2">{formatCurrency(analytics.avg_cost_per_reach)}</p>
              <p className="text-xs text-gray-500">Per unique user</p>
            </div>
          </div>
        </div>

        {/* Individual Campaigns */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-dark mb-4">Campaign Details</h2>
          <div className="space-y-4">
            {analytics.campaigns.map((campaign) => (
              <div key={campaign.id} className="bg-white rounded-3xl shadow-sm hover:shadow-md p-6 transition-shadow">
                <div className="flex items-center justify-between flex-wrap gap-4">
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
                        <span className={`capitalize font-medium ${
                          campaign.status === 'completed' ? 'text-green-600' :
                          campaign.status === 'in_progress' ? 'text-primary' :
                          'text-gray-600'
                        }`}>
                          {campaign.status.replace('_', ' ')}
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Campaign Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6 flex-1 max-w-2xl">
                    <div className="text-center">
                      <p className="text-xs text-gray-600 mb-1">Investment</p>
                      <p className="text-lg font-bold text-dark">{formatCurrency(campaign.amount)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-600 mb-1">Reach</p>
                      <p className="text-lg font-bold text-dark">{formatNumber(campaign.metrics.reach)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-600 mb-1">Engagement</p>
                      <p className="text-lg font-bold text-dark">{formatNumber(campaign.metrics.engagement)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-600 mb-1">Eng. Rate</p>
                      <p className="text-lg font-bold text-primary">{campaign.metrics.avg_engagement_rate}%</p>
                    </div>
                  </div>

                  {/* View Analytics Button */}
                  <Link
                    to={`/brand/analytics/${campaign.id}`}
                    className="px-6 py-2.5 bg-primary text-dark rounded-full hover:bg-primary/90 transition-colors text-sm font-medium"
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
            className="px-6 py-3 bg-white border-2 border-gray-200 text-dark rounded-full hover:border-primary hover:bg-primary/5 transition-colors font-medium"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
};

export default BrandAnalyticsOverview;
