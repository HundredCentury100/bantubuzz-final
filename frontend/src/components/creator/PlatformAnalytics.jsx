import { useState, useEffect } from 'react';
import { ChartBarIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { PLATFORM_CONFIGS } from '../../constants/platformConfig';
import api from '../../services/api';

const PlatformAnalytics = ({ creatorId }) => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedPlatform, setExpandedPlatform] = useState(null);

  useEffect(() => {
    if (creatorId) {
      fetchPlatformAnalytics();
    }
  }, [creatorId]);

  const fetchPlatformAnalytics = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/creators/${creatorId}/platform-analytics`);
      if (response.data.success) {
        setAnalytics(response.data);
      }
    } catch (error) {
      console.error('Error fetching platform analytics:', error);
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

  // Calculate overall stats from all platforms
  const getOverallStats = () => {
    if (!analytics || !analytics.platforms || analytics.platforms.length === 0) {
      return { totalFollowers: 0, totalViews: 0, avgEngagementRate: 0, totalReach: 0, totalLikes: 0, platformCount: 0 };
    }

    const totalFollowers = analytics.platforms.reduce((sum, p) => sum + (p.followers || 0), 0);

    // Calculate total views across all platforms
    // Use avg_views from Thunzi platform-level data
    const totalViews = analytics.platforms.reduce((sum, p) => {
      const avgViews = p.metrics?.avg_views || 0;
      const totalPosts = p.total_posts || 0;
      return sum + (avgViews * totalPosts);
    }, 0);

    // Calculate weighted average engagement rate
    // Weight each platform's engagement by its follower count for accurate overall metric
    let weightedEngagementSum = 0;
    let totalFollowersWithEngagement = 0;

    analytics.platforms.forEach(p => {
      if (p.metrics && p.metrics.avg_engagement_rate > 0 && p.followers > 0) {
        weightedEngagementSum += p.metrics.avg_engagement_rate * p.followers;
        totalFollowersWithEngagement += p.followers;
      }
    });

    const avgEngagementRate = totalFollowersWithEngagement > 0
      ? weightedEngagementSum / totalFollowersWithEngagement
      : 0;

    // Calculate total reach across all platforms
    const totalReach = analytics.platforms.reduce((sum, p) => {
      const reach = p.metrics?.avg_reach || 0;
      const posts = p.total_posts || 0;
      // Multiply avg reach by number of posts to get total reach
      return sum + (reach * posts);
    }, 0);

    // Calculate total likes across all platforms
    const totalLikes = analytics.platforms.reduce((sum, p) => {
      const likes = p.metrics?.avg_likes || 0;
      const posts = p.total_posts || 0;
      // Multiply avg likes by number of posts to get total likes
      return sum + (likes * posts);
    }, 0);

    return {
      totalFollowers,
      totalViews,
      avgEngagementRate: avgEngagementRate.toFixed(2),
      totalReach,
      totalLikes,
      platformCount: analytics.platforms.length
    };
  };

  if (loading) {
    return (
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-dark mb-4">Platform Analytics</h2>
        <div className="card flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  // No platforms connected - empty state
  if (!analytics || !analytics.has_platforms || analytics.platforms.length === 0) {
    return (
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-dark mb-4">Platform Analytics</h2>
        <div className="card text-center py-12">
          <ChartBarIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-700 mb-2">No Platform Data Available</h3>
          <p className="text-gray-500">This creator hasn't connected any platforms yet</p>
        </div>
      </div>
    );
  }

  const overallStats = getOverallStats();

  return (
    <div className="mb-8">
      {/* Header with Verification Badge */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
        <h2 className="text-2xl font-bold text-dark">Platform Analytics</h2>
        <div className="flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full">
          <CheckCircleIcon className="w-5 h-5 text-primary" />
          <span className="text-sm font-medium text-dark">DATA VERIFIED BY THUNZI AI</span>
        </div>
      </div>

      {/* Overall Summary Card */}
      <div className="card mb-6 bg-gradient-to-br from-primary/5 to-primary/10">
        <h3 className="text-lg font-semibold text-dark mb-4">Overall Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="text-center">
            <p className="text-3xl font-bold text-primary">{formatNumber(overallStats.totalFollowers)}</p>
            <p className="text-sm text-gray-600 mt-1">Total Followers</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-primary">{formatNumber(overallStats.totalViews)}</p>
            <p className="text-sm text-gray-600 mt-1">Total Views</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-primary">{formatNumber(overallStats.totalReach)}</p>
            <p className="text-sm text-gray-600 mt-1">Total Reach</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-primary">{formatNumber(overallStats.totalLikes)}</p>
            <p className="text-sm text-gray-600 mt-1">Total Likes</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-primary">{overallStats.avgEngagementRate}%</p>
            <p className="text-sm text-gray-600 mt-1">Avg Engagement</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-primary">{overallStats.platformCount}</p>
            <p className="text-sm text-gray-600 mt-1">Platforms</p>
          </div>
        </div>
      </div>

      {/* Platform Cards Grid - Compact Like Packages */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {analytics.platforms.map((platform, index) => {
          const platformConfig = PLATFORM_CONFIGS[platform.platform] || {};
          const PlatformIcon = platformConfig.icon;
          // Use unique key: platform + account_name + index to handle duplicate platform types
          const platformKey = `${platform.platform}_${platform.account_name}_${index}`;
          const isExpanded = expandedPlatform === platformKey;

          return (
            <div
              key={platformKey}
              className="card cursor-pointer hover:shadow-lg transition-all"
              onClick={() => setExpandedPlatform(isExpanded ? null : platformKey)}
            >
              {/* Platform Header */}
              <div className="flex items-center gap-3 mb-3">
                {PlatformIcon && (
                  <div className={`w-10 h-10 rounded-lg ${platformConfig.gradient} flex items-center justify-center flex-shrink-0`}>
                    <PlatformIcon className="w-6 h-6 text-white" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-dark capitalize truncate">
                    {platform.platform}
                  </h3>
                  <p className="text-xs text-gray-500 truncate">{platform.account_name}</p>
                </div>
              </div>

              {/* Compact Stats - Always Visible */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Followers:</span>
                  <span className="font-semibold text-dark">{formatNumber(platform.followers)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Posts:</span>
                  <span className="font-semibold text-dark">{formatNumber(platform.total_posts)}</span>
                </div>
              </div>

              {/* Expanded Metrics - Show on Click */}
              {isExpanded && platform.metrics && (
                <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Engagement Rate:</span>
                    <span className="font-semibold text-primary">{platform.metrics.avg_engagement_rate}%</span>
                  </div>

                  {/* Sentiment Score (NEW) */}
                  {platform.metrics.avg_sentiment_score !== undefined && platform.metrics.avg_sentiment_score > 0 && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">Sentiment Score:</span>
                      <span className={`font-semibold ${
                        platform.metrics.avg_sentiment_score >= 0.7 ? 'text-green-600' :
                        platform.metrics.avg_sentiment_score >= 0.4 ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        {(platform.metrics.avg_sentiment_score * 100).toFixed(0)}%
                      </span>
                    </div>
                  )}

                  {/* Additional Metrics */}
                  {platform.metrics.avg_likes > 0 && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">Avg Likes:</span>
                      <span className="font-semibold text-dark">{formatNumber(platform.metrics.avg_likes)}</span>
                    </div>
                  )}
                  {platform.metrics.avg_comments > 0 && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">Avg Comments:</span>
                      <span className="font-semibold text-dark">{formatNumber(platform.metrics.avg_comments)}</span>
                    </div>
                  )}
                  {platform.metrics.avg_reach > 0 && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">Avg Reach:</span>
                      <span className="font-semibold text-dark">{formatNumber(platform.metrics.avg_reach)}</span>
                    </div>
                  )}
                  {platform.metrics.avg_views > 0 && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">Avg Views:</span>
                      <span className="font-semibold text-dark">{formatNumber(platform.metrics.avg_views)}</span>
                    </div>
                  )}

                  {platform.last_synced && (
                    <div className="text-xs text-gray-500 mt-2 pt-2 border-t border-gray-100">
                      Last synced: {new Date(platform.last_synced).toLocaleDateString()}
                    </div>
                  )}
                </div>
              )}

              {/* Click indicator */}
              <div className="mt-3 text-center">
                <span className="text-xs text-primary">
                  {isExpanded ? 'Click to collapse' : 'Click for details'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-gray-500 text-center mt-4">
        Last updated: {new Date(analytics.last_updated).toLocaleString()}
      </p>
    </div>
  );
};

export default PlatformAnalytics;
