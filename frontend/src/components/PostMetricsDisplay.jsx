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
  formatPlatformName,
  truncateUrl,
  formatDuration,
} from '../utils/metricsFormatter';

/**
 * PostMetricsDisplay - Main component for displaying post performance metrics
 * Shows reach, engagement, sentiment analysis, and cost per engagement
 * Follows BantuBuzz design system with rounded-3xl cards and primary colors
 */
const PostMetricsDisplay = ({
  collaborationId,
  deliverableId,
  deliverable,
  milestoneId = null,
  isBrand = false,
  collaborationAmount = 0,
}) => {
  const [metrics, setMetrics] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState(null);

  // Fetch cached metrics on mount
  useEffect(() => {
    if (deliverable?.post_url && deliverable?.url_validation_status === 'valid') {
      fetchMetrics();
    }
  }, [deliverable]);

  /**
   * Fetch cached metrics from database
   */
  const fetchMetrics = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await collaborationsAPI.getDeliverableMetrics(
        collaborationId,
        deliverableId
      );

      if (response.data.success) {
        setMetrics(response.data.metrics);
      }
    } catch (err) {
      // If no metrics found, that's okay - user hasn't synced yet
      if (err.response?.status !== 404) {
        console.error('Error fetching metrics:', err);
      }
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Sync metrics from ThunziAI
   */
  const handleSyncMetrics = async () => {
    try {
      setIsSyncing(true);
      setError(null);

      const response = await collaborationsAPI.syncDeliverableMetrics(
        collaborationId,
        milestoneId,
        deliverableId
      );

      if (response.data.success) {
        setMetrics(response.data.metrics);
        toast.success('Metrics synced successfully!');
      }
    } catch (err) {
      console.error('Error syncing metrics:', err);
      const errorMessage = err.response?.data?.message || 'Failed to sync metrics';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSyncing(false);
    }
  };

  // If no post URL submitted, don't show anything
  if (!deliverable?.post_url) {
    return null;
  }

  // If URL is not valid, show warning
  if (deliverable?.url_validation_status !== 'valid') {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 mt-4">
        <p className="text-yellow-800 text-sm">
          Post URL validation pending or failed. Please submit a valid post URL.
        </p>
      </div>
    );
  }

  // Loading state (initial load)
  if (isLoading) {
    return (
      <div className="bg-white rounded-3xl shadow-sm p-6 mt-4">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
          <span className="ml-3 text-gray-600">Loading metrics...</span>
        </div>
      </div>
    );
  }

  // Empty state - no metrics yet
  if (!metrics && !isSyncing) {
    return (
      <div className="bg-white rounded-3xl shadow-sm hover:shadow-md p-6 mt-4">
        <h3 className="text-lg font-semibold text-dark mb-4">📊 Post Performance Metrics</h3>

        <div className="text-center py-12">
          <div className="mb-4">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">📊</span>
            </div>
            <p className="text-gray-600 mb-2">No metrics available yet</p>
            <p className="text-sm text-gray-500">
              Click the button below to fetch performance data from ThunziAI
            </p>
          </div>

          <button
            onClick={handleSyncMetrics}
            disabled={isSyncing}
            className="px-6 py-3 bg-primary text-dark rounded-full font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSyncing ? 'Syncing...' : '🔄 Sync Metrics'}
          </button>
        </div>
      </div>
    );
  }

  // Syncing state
  if (isSyncing) {
    return (
      <div className="bg-white rounded-3xl shadow-sm p-6 mt-4">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
          <span className="ml-3 text-gray-600">Syncing metrics from ThunziAI...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !metrics) {
    return (
      <div className="bg-white rounded-3xl shadow-sm p-6 mt-4">
        <h3 className="text-lg font-semibold text-dark mb-4">📊 Post Performance Metrics</h3>

        <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
          <p className="text-red-800 font-medium mb-2">❌ {error}</p>
          <p className="text-sm text-red-600 mb-4">
            Make sure the post has been published and synced in ThunziAI.
          </p>
          <button
            onClick={handleSyncMetrics}
            className="px-4 py-2 bg-red-600 text-white rounded-full text-sm hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Calculate cost per engagement (for brands only)
  const costPerEngagement = isBrand && metrics
    ? calculateCostPerEngagement(collaborationAmount, metrics.total_engagement)
    : 0;

  return (
    <div className="mt-4 space-y-4">
      {/* Main Metrics Card */}
      <div className="bg-white rounded-3xl shadow-sm hover:shadow-md p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-dark">📊 Post Performance</h3>
            <p className="text-sm text-gray-600 mt-1">
              {formatPlatformName(metrics.post_platform)} • {truncateUrl(metrics.post_url, 40)}
            </p>
          </div>

          <button
            onClick={handleSyncMetrics}
            disabled={isSyncing}
            className="px-4 py-2 bg-primary text-dark rounded-full font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 text-sm"
          >
            {isSyncing ? 'Syncing...' : '🔄 Sync'}
          </button>
        </div>

        {/* Sync Status */}
        {metrics.last_synced_at && (
          <div className="flex items-center gap-2 text-sm mb-4">
            {metrics.sync_status === 'synced' && (
              <>
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                <span className="text-gray-600">
                  Synced {formatTimeAgo(metrics.last_synced_at)}
                </span>
              </>
            )}
            {metrics.sync_status === 'failed' && (
              <>
                <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                <span className="text-red-600">Sync failed: {metrics.sync_error}</span>
              </>
            )}
            {metrics.sync_status === 'pending' && (
              <>
                <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                <span className="text-gray-600">Pending sync</span>
              </>
            )}
          </div>
        )}

        {/* Core Metrics Grid - First Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
          <MetricCard
            title="Reach"
            value={metrics.reach}
            icon="👥"
            formatter={formatNumber}
          />
          <MetricCard
            title="Impressions"
            value={metrics.impressions}
            icon="👁️"
            formatter={formatNumber}
          />
          <MetricCard
            title="Engagement"
            value={metrics.total_engagement}
            icon="💖"
            formatter={formatNumber}
          />
          <MetricCard
            title="Eng. Rate"
            value={metrics.engagement_rate}
            icon="📈"
            formatter={(val) => formatPercentage(val, 2)}
          />
        </div>

        {/* Engagement Breakdown - Second Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <MetricCard
            title="Likes"
            value={metrics.likes}
            icon="👍"
            formatter={formatNumber}
          />
          <MetricCard
            title="Comments"
            value={metrics.comments}
            icon="💬"
            formatter={formatNumber}
          />
          <MetricCard
            title="Shares"
            value={metrics.shares}
            icon="🔄"
            formatter={formatNumber}
          />
          <MetricCard
            title="Saves"
            value={metrics.saves}
            icon="🔖"
            formatter={formatNumber}
          />
        </div>
      </div>

      {/* Sentiment Analysis */}
      {metrics.comments > 0 && (
        <SentimentChart
          positiveCount={metrics.positive_comments}
          neutralCount={metrics.neutral_comments}
          negativeCount={metrics.negative_comments}
        />
      )}

      {/* Video Metrics (if applicable) */}
      {metrics.video_views > 0 && (
        <div className="bg-white rounded-2xl p-6">
          <h4 className="text-lg font-semibold text-dark mb-4">🎥 Video Performance</h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <MetricCard
              title="Views"
              value={metrics.video_views}
              icon="▶️"
              formatter={formatNumber}
            />
            <MetricCard
              title="Avg Watch"
              value={metrics.average_watch_time}
              icon="⏱️"
              formatter={formatDuration}
            />
            <MetricCard
              title="Completion"
              value={metrics.completion_rate}
              icon="✓"
              formatter={(val) => formatPercentage(val, 1)}
            />
            <MetricCard
              title="Duration"
              value={metrics.video_duration}
              icon="🎬"
              formatter={formatDuration}
            />
          </div>
        </div>
      )}

      {/* Cost Per Engagement (Brand View Only) */}
      {isBrand && metrics.total_engagement > 0 && (
        <div className="bg-primary/10 rounded-2xl p-6">
          <h4 className="text-sm font-medium text-gray-700 mb-1">💰 Cost Per Engagement</h4>
          <p className="text-3xl font-bold text-dark mb-2">
            {formatCurrency(costPerEngagement)}
          </p>
          <p className="text-xs text-gray-600">
            {formatCurrency(collaborationAmount)} ÷ {formatNumber(metrics.total_engagement)} engagements
          </p>
        </div>
      )}
    </div>
  );
};

PostMetricsDisplay.propTypes = {
  collaborationId: PropTypes.number.isRequired,
  deliverableId: PropTypes.number.isRequired,
  deliverable: PropTypes.object.isRequired,
  milestoneId: PropTypes.number,
  isBrand: PropTypes.bool,
  collaborationAmount: PropTypes.number,
};

export default PostMetricsDisplay;
