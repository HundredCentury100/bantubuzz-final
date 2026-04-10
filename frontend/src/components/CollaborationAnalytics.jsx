import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import toast from 'react-hot-toast';
import { collaborationsAPI } from '../services/api';
import MetricCard from './MetricCard';
import SentimentChart from './SentimentChart';
import {
  formatNumber,
  formatPercentage,
  formatTimeAgo,
  formatCurrency,
  calculateCostPerEngagement,
} from '../utils/metricsFormatter';

/**
 * CollaborationAnalytics - Aggregated metrics for all deliverables in a collaboration
 * Shows conditional metrics based on what platforms are included
 * Follows BantuBuzz design system with rounded-3xl cards and primary colors
 */
const CollaborationAnalytics = ({
  collaborationId,
  isBrand = false,
  collaborationAmount = 0,
}) => {
  const [analytics, setAnalytics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch aggregated analytics on mount
  useEffect(() => {
    if (collaborationId) {
      fetchAnalytics();
    }
  }, [collaborationId]);

  /**
   * Fetch aggregated analytics from backend
   */
  const fetchAnalytics = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await collaborationsAPI.getCollaborationAnalytics(collaborationId);

      if (response.data.success) {
        setAnalytics(response.data.analytics);
      }
    } catch (err) {
      // If no analytics found, that's okay - no metrics synced yet
      if (err.response?.status !== 404) {
        console.error('Error fetching collaboration analytics:', err);
        setError(err.response?.data?.message || 'Failed to load analytics');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="bg-white rounded-3xl shadow-sm p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
          <span className="ml-3 text-gray-600">Loading collaboration analytics...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-white rounded-3xl shadow-sm p-6">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
          <p className="text-red-800 font-medium">❌ {error}</p>
        </div>
      </div>
    );
  }

  // Empty state - no metrics yet
  if (!analytics || analytics.total_posts === 0) {
    return (
      <div className="bg-white rounded-3xl shadow-sm hover:shadow-md p-6">
        <h3 className="text-lg font-semibold text-dark mb-4">📊 Collaboration Performance</h3>

        <div className="text-center py-12">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">📊</span>
          </div>
          <p className="text-gray-600 mb-2">No analytics available yet</p>
          <p className="text-sm text-gray-500">
            Sync individual deliverable metrics to see aggregated collaboration performance
          </p>
        </div>
      </div>
    );
  }

  // Calculate cost per engagement (for brands only)
  const costPerEngagement = isBrand && analytics.total_engagement > 0
    ? calculateCostPerEngagement(collaborationAmount, analytics.total_engagement)
    : 0;

  // Determine which metrics are available (based on platforms included)
  const availability = analytics.metrics_availability || {};
  const availableMetrics = {
    reach: availability.reach_available,
    impressions: availability.reach_available, // Using reach as impressions
    saves: analytics.total_saves > 0,
    engagementRate: availability.engagement_rate_available,
    videoViews: analytics.total_video_views > 0,
    sentiment: analytics.sentiment_breakdown &&
               (analytics.sentiment_breakdown.positive > 0 ||
                analytics.sentiment_breakdown.negative > 0 ||
                analytics.sentiment_breakdown.neutral > 0),
  };

  // Determine overall sentiment based on aggregated data
  let overallSentiment = null;
  if (availableMetrics.sentiment) {
    const { positive = 0, negative = 0, neutral = 0 } = analytics.sentiment_breakdown;
    const total = positive + negative + neutral;
    if (total > 0) {
      const positivePercent = (positive / total) * 100;
      const negativePercent = (negative / total) * 100;

      if (positivePercent > 50) overallSentiment = 'positive';
      else if (negativePercent > 50) overallSentiment = 'negative';
      else overallSentiment = 'neutral';
    }
  }

  return (
    <div className="space-y-4">
      {/* Main Analytics Card */}
      <div className="bg-white rounded-3xl shadow-sm hover:shadow-md p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-dark">📊 Collaboration Performance</h3>
            <p className="text-sm text-gray-600 mt-1">
              Aggregated from {analytics.total_posts} post{analytics.total_posts !== 1 ? 's' : ''}
              {analytics.platforms_included?.length > 0 && (
                <span className="ml-1">
                  ({analytics.platforms_included.join(', ')})
                </span>
              )}
            </p>
          </div>

          <button
            onClick={fetchAnalytics}
            className="px-4 py-2 bg-primary text-dark rounded-full font-medium hover:bg-primary/90 transition-colors text-sm"
          >
            🔄 Refresh
          </button>
        </div>

        {/* Last Updated */}
        {analytics.last_synced_at && (
          <div className="flex items-center gap-2 text-sm mb-4">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            <span className="text-gray-600">
              Updated {formatTimeAgo(analytics.last_synced_at)}
            </span>
          </div>
        )}

        {/* Core Metrics Grid - First Row (Conditional) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
          {availableMetrics.reach && (
            <MetricCard
              title="Total Reach"
              value={analytics.total_reach}
              icon="👥"
              formatter={formatNumber}
              subtitle={availability.reach_post_count
                ? `${availability.reach_post_count} post${availability.reach_post_count !== 1 ? 's' : ''}`
                : null}
            />
          )}
          {availableMetrics.impressions && (
            <MetricCard
              title="Total Impressions"
              value={analytics.total_reach}
              icon="👁️"
              formatter={formatNumber}
            />
          )}
          <MetricCard
            title="Total Engagement"
            value={analytics.total_engagement}
            icon="💖"
            formatter={formatNumber}
            subtitle={`${analytics.total_posts} post${analytics.total_posts !== 1 ? 's' : ''}`}
          />
          {availableMetrics.engagementRate && (
            <MetricCard
              title="Avg. Eng. Rate"
              value={analytics.avg_engagement_rate}
              icon="📈"
              formatter={(val) => formatPercentage(val, 2)}
              subtitle={availability.engagement_rate_post_count
                ? `${availability.engagement_rate_post_count} post${availability.engagement_rate_post_count !== 1 ? 's' : ''}`
                : null}
            />
          )}
        </div>

        {/* Engagement Breakdown - Second Row (Conditional) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <MetricCard
            title="Total Likes"
            value={analytics.total_likes}
            icon="👍"
            formatter={formatNumber}
          />
          <MetricCard
            title="Total Comments"
            value={analytics.total_comments}
            icon="💬"
            formatter={formatNumber}
          />
          <MetricCard
            title="Total Shares"
            value={analytics.total_shares}
            icon="🔄"
            formatter={formatNumber}
          />
          {availableMetrics.saves && (
            <MetricCard
              title="Total Saves"
              value={analytics.total_saves}
              icon="🔖"
              formatter={formatNumber}
            />
          )}
        </div>
      </div>

      {/* Sentiment Analysis (if available - YouTube posts) */}
      {availableMetrics.sentiment && analytics.total_comments > 0 && (
        <div className="bg-white rounded-3xl shadow-sm hover:shadow-md p-6">
          <h4 className="text-lg font-semibold text-dark mb-4">😊 Overall Sentiment</h4>
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Aggregated Sentiment</span>
              {overallSentiment && (
                <span className={`text-sm font-semibold ${
                  overallSentiment === 'positive' ? 'text-green-600' :
                  overallSentiment === 'negative' ? 'text-red-600' : 'text-gray-600'
                }`}>
                  {overallSentiment.toUpperCase()}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500">
              Based on {analytics.total_comments} total comments
            </p>
          </div>
          <SentimentChart
            positiveCount={analytics.sentiment_breakdown.positive}
            neutralCount={analytics.sentiment_breakdown.neutral}
            negativeCount={analytics.sentiment_breakdown.negative}
          />
        </div>
      )}

      {/* Video Metrics (if applicable) */}
      {availableMetrics.videoViews && (
        <div className="bg-white rounded-3xl shadow-sm hover:shadow-md p-6">
          <h4 className="text-lg font-semibold text-dark mb-4">🎥 Video Performance</h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <MetricCard
              title="Total Views"
              value={analytics.total_video_views}
              icon="▶️"
              formatter={formatNumber}
            />
            {analytics.avg_completion_rate > 0 && (
              <MetricCard
                title="Avg. Completion"
                value={analytics.avg_completion_rate}
                icon="✓"
                formatter={(val) => formatPercentage(val, 1)}
              />
            )}
          </div>
        </div>
      )}

      {/* Cost Per Engagement (Brand View Only) */}
      {isBrand && analytics.total_engagement > 0 && (
        <div className="bg-primary/10 rounded-3xl p-6">
          <h4 className="text-sm font-medium text-gray-700 mb-1">💰 Cost Per Engagement</h4>
          <p className="text-3xl font-bold text-dark mb-2">
            {formatCurrency(costPerEngagement)}
          </p>
          <p className="text-xs text-gray-600">
            {formatCurrency(collaborationAmount)} ÷ {formatNumber(analytics.total_engagement)} engagements
          </p>
        </div>
      )}

      {/* Platform Breakdown */}
      {analytics.platform_breakdown && Object.keys(analytics.platform_breakdown).length > 0 && (
        <div className="bg-white rounded-3xl shadow-sm hover:shadow-md p-6">
          <h4 className="text-lg font-semibold text-dark mb-4">📱 Platform Breakdown</h4>
          <div className="space-y-3">
            {Object.entries(analytics.platform_breakdown).map(([platform, data]) => (
              <div key={platform} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">
                    {platform === 'youtube' && '📺'}
                    {platform === 'instagram' && '📸'}
                    {platform === 'tiktok' && '🎵'}
                    {platform === 'facebook' && '👥'}
                    {platform === 'twitter' && '🐦'}
                  </span>
                  <div>
                    <p className="font-medium text-dark capitalize">{platform}</p>
                    <p className="text-xs text-gray-600">{data.post_count} post{data.post_count !== 1 ? 's' : ''}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-dark">{formatNumber(data.total_engagement)}</p>
                  <p className="text-xs text-gray-600">engagements</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

CollaborationAnalytics.propTypes = {
  collaborationId: PropTypes.number.isRequired,
  isBrand: PropTypes.bool,
  collaborationAmount: PropTypes.number,
};

export default CollaborationAnalytics;
