import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import {
  HeartIcon,
  ChatBubbleLeftRightIcon,
  ShareIcon,
  UserGroupIcon,
  EyeIcon
} from '@heroicons/react/24/outline';

const PostAnalyticsCard = ({ deliverable, formatNumber }) => {
  // Extract nested metrics object - API returns metrics.metrics.reach, etc.
  const metricsData = deliverable.metrics?.metrics || {};
  const sentimentData = deliverable.metrics?.sentiment || {};

  if (!deliverable.has_metrics) {
    return (
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-dark">{deliverable.title}</h3>
            <p className="text-sm text-gray-500 capitalize mt-1">
              {deliverable.platform || 'N/A'} {deliverable.url_submitted_at && `• Posted ${new Date(deliverable.url_submitted_at).toLocaleDateString()}`}
            </p>
          </div>
        </div>
        <div className="text-center py-8">
          <p className="text-gray-500 text-sm">No metrics available yet</p>
          <p className="text-xs text-gray-400 mt-1">Metrics will appear after syncing with ThunziAI</p>
        </div>
      </div>
    );
  }

  // Engagement breakdown data
  const engagementChartData = [
    { name: 'Likes', value: metricsData.likes || 0, color: '#ec4899' },
    { name: 'Comments', value: metricsData.comments || 0, color: '#3b82f6' },
    { name: 'Shares', value: metricsData.shares || 0, color: '#10b981' },
    { name: 'Saves', value: metricsData.saves || 0, color: '#8b5cf6' }
  ];

  // Sentiment data (only if there are comments)
  const hasSentiment = sentimentData.positive > 0 || sentimentData.neutral > 0 ||
                       sentimentData.negative > 0 || sentimentData.critical > 0;

  const sentimentChartData = hasSentiment ? [
    { name: 'Positive', value: sentimentData.positive, color: '#10b981' },
    { name: 'Neutral', value: sentimentData.neutral, color: '#6b7280' },
    { name: 'Negative', value: sentimentData.negative, color: '#f59e0b' },
    { name: 'Critical', value: sentimentData.critical, color: '#ef4444' }
  ].filter(item => item.value > 0) : [];

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-2 rounded shadow-lg border border-gray-200">
          <p className="text-xs font-semibold text-dark">{payload[0].payload.name}</p>
          <p className="text-xs text-gray-600">{payload[0].value.toLocaleString()}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="card">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-dark">{deliverable.title}</h3>
          <div className="flex items-center gap-2 mt-1">
            <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${
              deliverable.platform === 'facebook' ? 'bg-blue-100 text-blue-800' :
              deliverable.platform === 'instagram' ? 'bg-pink-100 text-pink-800' :
              deliverable.platform === 'youtube' ? 'bg-red-100 text-red-800' :
              deliverable.platform === 'tiktok' ? 'bg-gray-100 text-gray-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {deliverable.platform || 'N/A'}
            </span>
            {deliverable.metrics?.published_at && (
              <span className="text-xs text-gray-500">
                • {new Date(deliverable.metrics.published_at).toLocaleDateString()}
              </span>
            )}
          </div>
          {deliverable.url && (
            <a
              href={deliverable.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline mt-1 inline-block"
            >
              View Post →
            </a>
          )}
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <UserGroupIcon className="w-4 h-4 text-gray-600" />
            <p className="text-xs text-gray-600">Reach</p>
          </div>
          <p className="text-xl font-bold text-dark">{formatNumber(metricsData.reach)}</p>
        </div>

        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <HeartIcon className="w-4 h-4 text-pink-500" />
            <p className="text-xs text-gray-600">Likes</p>
          </div>
          <p className="text-xl font-bold text-dark">{formatNumber(metricsData.likes)}</p>
        </div>

        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <ChatBubbleLeftRightIcon className="w-4 h-4 text-blue-500" />
            <p className="text-xs text-gray-600">Comments</p>
          </div>
          <p className="text-xl font-bold text-dark">{formatNumber(metricsData.comments)}</p>
        </div>

        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <ShareIcon className="w-4 h-4 text-green-500" />
            <p className="text-xs text-gray-600">Shares</p>
          </div>
          <p className="text-xl font-bold text-dark">{formatNumber(metricsData.shares)}</p>
        </div>
      </div>

      {/* Engagement Rate Badge */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Engagement Rate</span>
          <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
            metricsData.engagement_rate >= 5 ? 'bg-green-100 text-green-700' :
            metricsData.engagement_rate >= 2 ? 'bg-yellow-100 text-yellow-700' :
            'bg-gray-100 text-gray-700'
          }`}>
            {metricsData.engagement_rate}%
          </span>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Engagement Breakdown Chart */}
        <div>
          <h4 className="text-sm font-semibold text-dark mb-3">Engagement Breakdown</h4>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={engagementChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis
                dataKey="name"
                tick={{ fill: '#6b7280', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#6b7280', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(251, 191, 36, 0.1)' }} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {engagementChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Sentiment Chart (if available) */}
        <div>
          <h4 className="text-sm font-semibold text-dark mb-3">
            Sentiment Analysis
            {metricsData.comments > 0 && (
              <span className="text-xs font-normal text-gray-500 ml-2">
                ({metricsData.comments} {metricsData.comments === 1 ? 'comment' : 'comments'})
              </span>
            )}
          </h4>
          {sentimentChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={sentimentChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {sentimentChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[200px] bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500">No sentiment data available</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PostAnalyticsCard;
