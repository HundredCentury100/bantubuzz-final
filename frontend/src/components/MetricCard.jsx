import React from 'react';
import PropTypes from 'prop-types';
import { formatNumber } from '../utils/metricsFormatter';

/**
 * MetricCard - Reusable card component for displaying individual metrics
 * Follows BantuBuzz design system with rounded-2xl and bg-primary/10
 */
const MetricCard = ({
  title,
  value,
  icon,
  trend,
  trendDirection,
  formatter,
  subtitle,
  className = ''
}) => {
  // Format value if formatter is provided, otherwise use default number formatter
  const formattedValue = formatter ? formatter(value) : formatNumber(value);

  // Determine trend color
  const getTrendColor = () => {
    if (!trend) return '';
    if (trendDirection === 'up') return 'text-green-600';
    if (trendDirection === 'down') return 'text-red-600';
    return 'text-gray-600';
  };

  return (
    <div className={`bg-primary/10 rounded-2xl p-3 sm:p-4 min-w-0 ${className}`}>
      {/* Icon and Title */}
      <div className="flex min-w-0 items-start gap-2 mb-2">
        {icon && <span className="text-xl sm:text-2xl shrink-0 leading-none">{icon}</span>}
        <span className="min-w-0 text-xs sm:text-sm text-gray-600 font-medium leading-snug break-words">{title}</span>
      </div>

      {/* Value */}
      <p className="text-xl sm:text-2xl font-bold text-dark mb-1 break-words leading-tight">{formattedValue}</p>

      {/* Optional Subtitle */}
      {subtitle && (
        <p className="text-xs text-gray-500">{subtitle}</p>
      )}

      {/* Optional Trend */}
      {trend && (
        <div className="flex items-center gap-1">
          <span className={`text-xs font-medium ${getTrendColor()}`}>
            {trendDirection === 'up' && '↑'}
            {trendDirection === 'down' && '↓'}
            {trend}
          </span>
        </div>
      )}
    </div>
  );
};

MetricCard.propTypes = {
  title: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
  icon: PropTypes.string,
  trend: PropTypes.string,
  trendDirection: PropTypes.oneOf(['up', 'down', 'neutral']),
  formatter: PropTypes.func,
  subtitle: PropTypes.string,
  className: PropTypes.string,
};

export default MetricCard;
