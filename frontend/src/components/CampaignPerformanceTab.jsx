import { useState, useEffect } from 'react';
import { FaChartLine, FaUsers, FaEye, FaHeart, FaDollarSign, FaTrophy } from 'react-icons/fa';
import { campaignsAPI } from '../services/api';
import toast from 'react-hot-toast';

const CampaignPerformanceTab = ({ campaignId }) => {
  const [loading, setLoading] = useState(true);
  const [performance, setPerformance] = useState(null);

  useEffect(() => {
    fetchPerformance();
  }, [campaignId]);

  const fetchPerformance = async () => {
    try {
      setLoading(true);
      const response = await campaignsAPI.getPerformance(campaignId);
      setPerformance(response.data);
    } catch (error) {
      console.error('Failed to fetch performance:', error);
      toast.error('Failed to load performance data');
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

  const formatCurrency = (amount) => {
    return `R${Number(amount).toFixed(2)}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading performance data...</p>
        </div>
      </div>
    );
  }

  if (!performance || !performance.overview) {
    return (
      <div className="text-center py-20">
        <div className="text-gray-400 text-6xl mb-4">📊</div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No performance data yet</h3>
        <p className="text-gray-600">
          Performance metrics will appear once collaborations are active
        </p>
      </div>
    );
  }

  const { overview, creators, platforms } = performance;

  return (
    <div className="space-y-6">
      {/* Overview Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Spend */}
        <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <FaDollarSign className="text-green-600" size={24} />
            <span className="text-xs text-gray-500">Total Spend</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{formatCurrency(overview.total_spend)}</p>
          <p className="text-sm text-gray-600 mt-1">{overview.total_creators} creators</p>
        </div>

        {/* Total Reach */}
        <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <FaUsers className="text-blue-600" size={24} />
            <span className="text-xs text-gray-500">Total Reach</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{formatNumber(overview.total_reach)}</p>
          <p className="text-sm text-gray-600 mt-1">followers reached</p>
        </div>

        {/* Total Engagements */}
        <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <FaHeart className="text-red-600" size={24} />
            <span className="text-xs text-gray-500">Engagements</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{formatNumber(overview.total_engagements)}</p>
          <p className="text-sm text-gray-600 mt-1">{overview.engagement_rate}% rate</p>
        </div>

        {/* Total Views */}
        <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <FaEye className="text-purple-600" size={24} />
            <span className="text-xs text-gray-500">Total Views</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{formatNumber(overview.total_views)}</p>
          <p className="text-sm text-gray-600 mt-1">video views</p>
        </div>
      </div>

      {/* ROI & Cost Per Engagement */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl p-6 border-2 border-primary/20">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 bg-primary rounded-full">
              <FaTrophy className="text-white" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Estimated ROI</p>
              <p className={`text-3xl font-bold ${overview.estimated_roi >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {overview.estimated_roi >= 0 ? '+' : ''}{overview.estimated_roi}%
              </p>
            </div>
          </div>
          <p className="text-xs text-gray-500">Based on engagement value estimation</p>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 border-2 border-blue-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 bg-blue-600 rounded-full">
              <FaDollarSign className="text-white" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Cost Per Engagement</p>
              <p className="text-3xl font-bold text-blue-900">{formatCurrency(overview.cost_per_engagement)}</p>
            </div>
          </div>
          <p className="text-xs text-gray-500">Average cost across all engagements</p>
        </div>
      </div>

      {/* Budget Utilization (if campaign has budget) */}
      {performance.campaign_info && performance.campaign_info.budget > 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-200">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Budget Utilization</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-xl">
              <p className="text-sm text-gray-600 mb-1">Total Budget</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(performance.campaign_info.budget)}</p>
            </div>
            <div className="text-center p-4 bg-primary/10 rounded-xl">
              <p className="text-sm text-gray-600 mb-1">Spent</p>
              <p className="text-2xl font-bold text-primary">{formatCurrency(overview.total_spend)}</p>
              <p className="text-xs text-gray-500 mt-1">{overview.budget_utilization || 0}% utilized</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-xl">
              <p className="text-sm text-gray-600 mb-1">Remaining</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(overview.budget_remaining || 0)}</p>
            </div>
          </div>
          {/* Budget Progress Bar */}
          <div className="mt-4">
            <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${
                  (overview.budget_utilization || 0) > 90 ? 'bg-red-500' :
                  (overview.budget_utilization || 0) > 70 ? 'bg-yellow-500' :
                  'bg-primary'
                }`}
                style={{ width: `${Math.min(overview.budget_utilization || 0, 100)}%` }}
              ></div>
            </div>
          </div>
        </div>
      )}

      {/* Engagement Breakdown */}
      <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-200">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Engagement Breakdown</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 bg-pink-50 rounded-xl">
            <p className="text-2xl font-bold text-pink-600">{formatNumber(overview.total_likes)}</p>
            <p className="text-sm text-gray-600 mt-1">Likes</p>
          </div>
          <div className="text-center p-4 bg-blue-50 rounded-xl">
            <p className="text-2xl font-bold text-blue-600">{formatNumber(overview.total_comments)}</p>
            <p className="text-sm text-gray-600 mt-1">Comments</p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-xl">
            <p className="text-2xl font-bold text-green-600">{formatNumber(overview.total_shares)}</p>
            <p className="text-sm text-gray-600 mt-1">Shares</p>
          </div>
        </div>
      </div>

      {/* Creator Performance Table */}
      {creators && creators.length > 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-200">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Creator Performance</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-2 text-sm font-semibold text-gray-700">Creator</th>
                  <th className="text-right py-3 px-2 text-sm font-semibold text-gray-700">Reach</th>
                  <th className="text-right py-3 px-2 text-sm font-semibold text-gray-700">Views</th>
                  <th className="text-right py-3 px-2 text-sm font-semibold text-gray-700">Engagements</th>
                  <th className="text-right py-3 px-2 text-sm font-semibold text-gray-700">Eng. Rate</th>
                  <th className="text-right py-3 px-2 text-sm font-semibold text-gray-700">Cost</th>
                  <th className="text-right py-3 px-2 text-sm font-semibold text-gray-700">CPE</th>
                </tr>
              </thead>
              <tbody>
                {creators.map((creator, idx) => (
                  <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-2">
                        {creator.creator_picture ? (
                          <img
                            src={creator.creator_picture}
                            alt={creator.creator_name}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
                            <span className="text-xs text-gray-600">{creator.creator_name?.charAt(0)}</span>
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-medium text-gray-900">{creator.creator_name}</p>
                          <p className="text-xs text-gray-500">{creator.platform}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-2 text-right text-sm text-gray-900">{formatNumber(creator.reach)}</td>
                    <td className="py-3 px-2 text-right text-sm text-gray-900">{formatNumber(creator.views)}</td>
                    <td className="py-3 px-2 text-right text-sm text-gray-900">{formatNumber(creator.engagements)}</td>
                    <td className="py-3 px-2 text-right">
                      <span className={`text-sm font-medium ${
                        creator.engagement_rate > 3 ? 'text-green-600' :
                        creator.engagement_rate > 1 ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        {creator.engagement_rate}%
                      </span>
                    </td>
                    <td className="py-3 px-2 text-right text-sm text-gray-900">{formatCurrency(creator.cost)}</td>
                    <td className="py-3 px-2 text-right text-sm text-gray-900">{formatCurrency(creator.cost_per_engagement)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Platform Breakdown */}
      {platforms && Object.keys(platforms).length > 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-200">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Platform Performance</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.values(platforms).map((platform, idx) => (
              <div key={idx} className="border border-gray-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-gray-900">{platform.platform}</h4>
                  <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                    {platform.creators_count} creator{platform.creators_count > 1 ? 's' : ''}
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Reach:</span>
                    <span className="font-medium">{formatNumber(platform.total_reach)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Views:</span>
                    <span className="font-medium">{formatNumber(platform.total_views)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Engagements:</span>
                    <span className="font-medium">{formatNumber(platform.total_engagements)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Eng. Rate:</span>
                    <span className={`font-medium ${
                      platform.engagement_rate > 3 ? 'text-green-600' :
                      platform.engagement_rate > 1 ? 'text-yellow-600' :
                      'text-gray-900'
                    }`}>
                      {platform.engagement_rate}%
                    </span>
                  </div>
                  <div className="flex justify-between text-sm pt-2 border-t border-gray-100">
                    <span className="text-gray-600">Spend:</span>
                    <span className="font-bold text-primary">{formatCurrency(platform.total_spend)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CampaignPerformanceTab;
