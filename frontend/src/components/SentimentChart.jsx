import React from 'react';
import PropTypes from 'prop-types';
import { Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend
} from 'chart.js';
import { calculatePercentage, getSentimentEmoji } from '../utils/metricsFormatter';

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend);

/**
 * SentimentChart - Donut chart component for displaying comment sentiment breakdown
 * Uses BantuBuzz color scheme: primary (positive), gray (neutral), red (negative)
 */
const SentimentChart = ({
  positiveCount = 0,
  neutralCount = 0,
  negativeCount = 0,
  className = ''
}) => {
  const totalComments = positiveCount + neutralCount + negativeCount;

  // If no comments, show empty state
  if (totalComments === 0) {
    return (
      <div className={`bg-white rounded-2xl p-6 ${className}`}>
        <h4 className="text-lg font-semibold text-dark mb-4">💬 Comment Sentiment</h4>
        <div className="text-center py-8">
          <p className="text-gray-500">No comment data available</p>
        </div>
      </div>
    );
  }

  // Calculate percentages
  const positivePercent = calculatePercentage(positiveCount, totalComments);
  const neutralPercent = calculatePercentage(neutralCount, totalComments);
  const negativePercent = calculatePercentage(negativeCount, totalComments);

  // Chart.js configuration
  const chartData = {
    labels: ['Positive', 'Neutral', 'Negative'],
    datasets: [
      {
        data: [positiveCount, neutralCount, negativeCount],
        backgroundColor: [
          '#ccdb53', // primary (positive)
          '#9ca3af', // gray-400 (neutral)
          '#ef4444', // red-500 (negative)
        ],
        borderWidth: 0,
        hoverOffset: 4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        display: false, // We'll use custom legend
      },
      tooltip: {
        backgroundColor: '#1F2937',
        padding: 12,
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        borderColor: '#ccdb53',
        borderWidth: 1,
        callbacks: {
          label: (context) => {
            const label = context.label || '';
            const value = context.parsed || 0;
            const percentage = calculatePercentage(value, totalComments);
            return `${label}: ${value} (${percentage}%)`;
          },
        },
      },
    },
    cutout: '65%', // Makes it a donut chart
  };

  return (
    <div className={`bg-white rounded-2xl p-6 ${className}`}>
      <h4 className="text-lg font-semibold text-dark mb-4">💬 Comment Sentiment</h4>

      <div className="flex items-center gap-8">
        {/* Donut Chart */}
        <div className="w-32 h-32 flex-shrink-0">
          <Doughnut data={chartData} options={chartOptions} />
        </div>

        {/* Sentiment Breakdown */}
        <div className="flex-1 space-y-3">
          {/* Positive */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">{getSentimentEmoji('positive')}</span>
              <span className="text-dark font-medium">Positive</span>
            </div>
            <span className="font-semibold text-dark">
              {positiveCount} ({positivePercent}%)
            </span>
          </div>

          {/* Neutral */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">{getSentimentEmoji('neutral')}</span>
              <span className="text-gray-600 font-medium">Neutral</span>
            </div>
            <span className="font-medium text-gray-600">
              {neutralCount} ({neutralPercent}%)
            </span>
          </div>

          {/* Negative */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">{getSentimentEmoji('negative')}</span>
              <span className="text-gray-600 font-medium">Negative</span>
            </div>
            <span className="font-medium text-gray-600">
              {negativeCount} ({negativePercent}%)
            </span>
          </div>
        </div>
      </div>

      {/* Total Comments */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <p className="text-sm text-gray-600">
          Total Comments: <span className="font-semibold text-dark">{totalComments}</span>
        </p>
      </div>
    </div>
  );
};

SentimentChart.propTypes = {
  positiveCount: PropTypes.number,
  neutralCount: PropTypes.number,
  negativeCount: PropTypes.number,
  className: PropTypes.string,
};

export default SentimentChart;
