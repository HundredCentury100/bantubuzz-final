import {
  UserGroupIcon,
  DocumentTextIcon,
  ArrowTrendingUpIcon
} from '@heroicons/react/24/outline';
import { PLATFORM_CONFIGS } from '../../constants/platformConfig';

const PlatformAnalyticsCard = ({ platform }) => {
  const platformConfig = PLATFORM_CONFIGS[platform.platform] || {};
  const PlatformIcon = platformConfig.icon;
  const metrics = platform.metrics || {};

  const formatNumber = (num) => {
    if (!num) return '0';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString();
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Get follower label based on platform
  const getFollowerLabel = () => {
    switch (platform.platform) {
      case 'youtube':
        return 'SUBSCRIBERS';
      default:
        return 'FOLLOWERS';
    }
  };

  // Platform-specific metric configurations
  const platformMetrics = [
    {
      label: getFollowerLabel(),
      value: formatNumber(metrics.subscribers || metrics.followers || platform.followers),
      icon: UserGroupIcon,
      color: platformConfig.textColor || 'text-gray-600'
    },
    {
      label: 'TOTAL POSTS',
      value: formatNumber(metrics.total_posts || platform.total_posts),
      icon: DocumentTextIcon,
      color: platformConfig.textColor || 'text-gray-600'
    },
    {
      label: 'AVG ENG. RATE',
      value: `${metrics.avg_engagement_rate || 0}%`,
      icon: ArrowTrendingUpIcon,
      color: platformConfig.textColor || 'text-gray-600'
    }
  ];

  return (
    <div className="card mb-6">
      {/* Platform Header */}
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          {PlatformIcon && (
            <div className={`w-10 h-10 rounded-lg ${platformConfig.gradient} flex items-center justify-center`}>
              <PlatformIcon className="w-6 h-6 text-white" />
            </div>
          )}
          <div>
            <h3 className="text-lg font-semibold text-dark capitalize">{platform.platform}</h3>
            <p className="text-sm text-gray-500">
              {platform.account_name} • {platform.total_posts} posts
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">Last synced</p>
          <p className="text-xs font-medium text-gray-700">{formatDate(platform.last_synced)}</p>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-3 gap-4">
        {platformMetrics.map((metric, index) => {
          const Icon = metric.icon;
          return (
            <div key={index} className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Icon className={`w-4 h-4 ${metric.color}`} />
                <p className="text-xs text-gray-600 font-medium">{metric.label}</p>
              </div>
              <p className="text-2xl font-bold text-dark">{metric.value}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PlatformAnalyticsCard;
