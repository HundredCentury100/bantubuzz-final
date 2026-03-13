/**
 * Utility functions for formatting analytics metrics
 */

/**
 * Format large numbers with K, M, B suffixes
 * @param {number} value - The number to format
 * @param {number} decimals - Number of decimal places (default: 1)
 * @returns {string} Formatted string (e.g., "15K", "1.2M")
 */
export const formatNumber = (value, decimals = 1) => {
  if (value === null || value === undefined) return '0';

  const num = Number(value);

  if (num >= 1_000_000_000) {
    return (num / 1_000_000_000).toFixed(decimals) + 'B';
  }
  if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(decimals) + 'M';
  }
  if (num >= 1_000) {
    return (num / 1_000).toFixed(decimals) + 'K';
  }

  return num.toLocaleString();
};

/**
 * Format percentage values
 * @param {number} value - The percentage value
 * @param {number} decimals - Number of decimal places (default: 2)
 * @returns {string} Formatted percentage (e.g., "9.05%")
 */
export const formatPercentage = (value, decimals = 2) => {
  if (value === null || value === undefined) return '0%';
  return Number(value).toFixed(decimals) + '%';
};

/**
 * Calculate percentage from two numbers
 * @param {number} part - The part value
 * @param {number} total - The total value
 * @param {number} decimals - Number of decimal places (default: 1)
 * @returns {number} Calculated percentage
 */
export const calculatePercentage = (part, total, decimals = 1) => {
  if (!total || total === 0) return 0;
  return Number(((part / total) * 100).toFixed(decimals));
};

/**
 * Format time duration in seconds to readable format
 * @param {number} seconds - Duration in seconds
 * @returns {string} Formatted duration (e.g., "1m 23s", "2h 15m")
 */
export const formatDuration = (seconds) => {
  if (!seconds || seconds === 0) return '0s';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  }
  return `${secs}s`;
};

/**
 * Format timestamp to relative time (e.g., "2 hours ago")
 * @param {string|Date} timestamp - The timestamp to format
 * @returns {string} Relative time string
 */
export const formatTimeAgo = (timestamp) => {
  if (!timestamp) return 'Never';

  const date = new Date(timestamp);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  const intervals = {
    year: 31536000,
    month: 2592000,
    week: 604800,
    day: 86400,
    hour: 3600,
    minute: 60,
  };

  for (const [unit, secondsInUnit] of Object.entries(intervals)) {
    const interval = Math.floor(seconds / secondsInUnit);
    if (interval >= 1) {
      return `${interval} ${unit}${interval > 1 ? 's' : ''} ago`;
    }
  }

  return 'Just now';
};

/**
 * Format currency values
 * @param {number} value - The currency value
 * @param {string} currency - Currency symbol (default: '$')
 * @param {number} decimals - Number of decimal places (default: 2)
 * @returns {string} Formatted currency (e.g., "$9.99")
 */
export const formatCurrency = (value, currency = '$', decimals = 2) => {
  if (value === null || value === undefined) return `${currency}0.00`;
  return `${currency}${Number(value).toFixed(decimals)}`;
};

/**
 * Format engagement rate
 * @param {number} engagement - Total engagement count
 * @param {number} reach - Total reach count
 * @returns {string} Formatted engagement rate (e.g., "9.05%")
 */
export const formatEngagementRate = (engagement, reach) => {
  if (!reach || reach === 0) return '0%';
  const rate = (engagement / reach) * 100;
  return formatPercentage(rate, 2);
};

/**
 * Get sentiment emoji based on sentiment type
 * @param {string} sentiment - Sentiment type (positive/negative/neutral/critical)
 * @returns {string} Emoji representation
 */
export const getSentimentEmoji = (sentiment) => {
  const sentimentMap = {
    positive: '😊',
    neutral: '😐',
    negative: '😞',
    critical: '😠',
  };
  return sentimentMap[sentiment?.toLowerCase()] || '😐';
};

/**
 * Get sentiment color for UI display
 * @param {string} sentiment - Sentiment type
 * @returns {string} Tailwind color class
 */
export const getSentimentColor = (sentiment) => {
  const colorMap = {
    positive: 'text-green-600',
    neutral: 'text-gray-500',
    negative: 'text-red-600',
    critical: 'text-red-700',
  };
  return colorMap[sentiment?.toLowerCase()] || 'text-gray-500';
};

/**
 * Get sentiment background color
 * @param {string} sentiment - Sentiment type
 * @returns {string} Hex color code for Chart.js
 */
export const getSentimentBgColor = (sentiment) => {
  const colorMap = {
    positive: '#ccdb53',  // primary color
    neutral: '#9ca3af',   // gray-400
    negative: '#ef4444',  // red-500
    critical: '#dc2626',  // red-600
  };
  return colorMap[sentiment?.toLowerCase()] || '#9ca3af';
};

/**
 * Format post platform name for display
 * @param {string} platform - Platform identifier (instagram/facebook/youtube/tiktok/twitter)
 * @returns {string} Formatted platform name
 */
export const formatPlatformName = (platform) => {
  const platformNames = {
    instagram: 'Instagram',
    facebook: 'Facebook',
    youtube: 'YouTube',
    tiktok: 'TikTok',
    twitter: 'Twitter/X',
  };
  return platformNames[platform?.toLowerCase()] || platform;
};

/**
 * Truncate URL for display
 * @param {string} url - The URL to truncate
 * @param {number} maxLength - Maximum length (default: 50)
 * @returns {string} Truncated URL
 */
export const truncateUrl = (url, maxLength = 50) => {
  if (!url) return '';
  if (url.length <= maxLength) return url;
  return url.substring(0, maxLength) + '...';
};

/**
 * Calculate cost per engagement
 * @param {number} totalCost - Total collaboration cost
 * @param {number} totalEngagement - Total engagement count
 * @returns {number} Cost per engagement
 */
export const calculateCostPerEngagement = (totalCost, totalEngagement) => {
  if (!totalEngagement || totalEngagement === 0) return 0;
  return totalCost / totalEngagement;
};
