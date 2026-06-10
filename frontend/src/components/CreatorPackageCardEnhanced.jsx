import React from 'react';
import { Link } from 'react-router-dom';
import {
  FaInstagram, FaTiktok, FaYoutube, FaTwitter, FaCheckCircle,
  FaStar, FaMapMarkerAlt, FaUsers, FaChartLine, FaBolt
} from 'react-icons/fa';

const CreatorPackageCardEnhanced = ({ package: pkg, onSelect, isSelected = false }) => {
  const creator = pkg.creator;

  if (!creator) return null;

  const formatNumber = (num) => {
    if (!num) return '0';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString();
  };

  const getPlatformIcon = (platform) => {
    const platformLower = platform?.toLowerCase() || '';
    switch (platformLower) {
      case 'instagram':
        return <FaInstagram className="text-pink-600" size={16} />;
      case 'tiktok':
        return <FaTiktok className="text-black" size={16} />;
      case 'youtube':
        return <FaYoutube className="text-red-600" size={16} />;
      case 'twitter':
        return <FaTwitter className="text-blue-400" size={16} />;
      default:
        return null;
    }
  };

  const getEngagementColor = (rate) => {
    if (rate >= 6) return 'text-blue-600 bg-blue-50';
    if (rate >= 4) return 'text-green-600 bg-green-50';
    if (rate >= 2) return 'text-orange-600 bg-orange-50';
    return 'text-red-600 bg-red-50';
  };

  const getEngagementLabel = (rate) => {
    if (rate >= 6) return 'Excellent';
    if (rate >= 4) return 'Good';
    if (rate >= 2) return 'Medium';
    return 'Low';
  };

  const getFollowerTier = (followers) => {
    if (followers >= 1000000) return { label: 'Mega', color: 'bg-purple-100 text-purple-800' };
    if (followers >= 100000) return { label: 'Macro', color: 'bg-blue-100 text-blue-800' };
    if (followers >= 10000) return { label: 'Mid-tier', color: 'bg-green-100 text-green-800' };
    return { label: 'Micro', color: 'bg-gray-100 text-gray-800' };
  };

  const getBadgeDisplay = (badge) => {
    switch (badge) {
      case 'top_creator':
        return { icon: <FaStar />, label: 'Top Creator', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' };
      case 'responds_fast':
        return { icon: <FaBolt />, label: 'Responds Fast', color: 'bg-green-100 text-green-800 border-green-300' };
      case 'verified_creator':
        return { icon: <FaCheckCircle />, label: 'Verified', color: 'bg-blue-100 text-blue-800 border-blue-300' };
      case 'referral_verified':
        return { icon: <FaCheckCircle />, label: 'Referral Verified', color: 'bg-lime-100 text-lime-900 border-lime-300' };
      default:
        return { icon: <FaUsers />, label: 'Creator', color: 'bg-gray-100 text-gray-800 border-gray-300' };
    }
  };

  const followerTier = getFollowerTier(creator.total_followers || 0);
  const engagementRate = creator.engagement_rate || 0;

  return (
    <div
      className={`relative bg-white rounded-xl border-2 transition-all duration-200 hover:shadow-lg ${
        isSelected ? 'border-primary shadow-md ring-2 ring-primary/20' : 'border-gray-200 hover:border-primary/50'
      }`}
    >
      {/* Selected Badge */}
      {isSelected && (
        <div className="absolute -top-3 -right-3 bg-primary text-white rounded-full p-2 shadow-lg z-10">
          <FaCheckCircle size={20} />
        </div>
      )}

      {/* Creator Header */}
      <div className="p-5 pb-3 border-b border-gray-100">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            {creator.profile_picture ? (
              <img
                src={creator.profile_picture}
                alt={creator.display_name}
                className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-sm"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white font-bold text-xl shadow-sm">
                {creator.display_name?.charAt(0) || 'C'}
              </div>
            )}
            {creator.verified && (
              <div className="absolute -bottom-1 -right-1 bg-blue-500 text-white rounded-full p-1">
                <FaCheckCircle size={12} />
              </div>
            )}
          </div>

          {/* Creator Info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-gray-900 text-lg truncate">{creator.display_name}</h3>

            {/* Location */}
            {creator.city && (
              <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                <FaMapMarkerAlt size={12} />
                {creator.city}{creator.country && `, ${creator.country}`}
              </p>
            )}

            {/* Badges */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {creator.badges?.slice(0, 2).map((badge, idx) => {
                const badgeInfo = getBadgeDisplay(badge);
                return (
                  <span
                    key={idx}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${badgeInfo.color}`}
                  >
                    {badgeInfo.icon}
                    {badgeInfo.label}
                  </span>
                );
              })}
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${followerTier.color}`}>
                {followerTier.label}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="p-5 pb-3 border-b border-gray-100 bg-gray-50">
        <div className="grid grid-cols-2 gap-4">
          {/* Total Followers */}
          <div>
            <div className="flex items-center gap-2 text-gray-600 text-xs font-medium mb-1">
              <FaUsers size={12} />
              Total Followers
            </div>
            <p className="text-2xl font-bold text-gray-900">{formatNumber(creator.total_followers)}</p>
          </div>

          {/* Engagement Rate */}
          <div>
            <div className="flex items-center gap-2 text-gray-600 text-xs font-medium mb-1">
              <FaChartLine size={12} />
              Engagement
            </div>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-bold text-gray-900">{engagementRate.toFixed(1)}%</p>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${getEngagementColor(engagementRate)}`}>
                {getEngagementLabel(engagementRate)}
              </span>
            </div>
          </div>
        </div>

        {/* Platform Breakdown */}
        {creator.platforms && creator.platforms.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-medium text-gray-600 mb-2">Platform Breakdown</p>
            <div className="space-y-2">
              {creator.platforms.map((platform, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-5">{getPlatformIcon(platform.platform)}</span>
                    <span className="font-medium text-gray-700 capitalize">{platform.platform}</span>
                  </div>
                  <span className="text-gray-900 font-semibold">{formatNumber(platform.followers)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Package Details */}
      <div className="p-5">
        <h4 className="font-bold text-gray-900 mb-2">{pkg.title}</h4>
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{pkg.description}</p>

        {/* Package Meta */}
        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 mb-3">
          {pkg.platform_type && (
            <span className="inline-flex items-center gap-1 bg-gray-100 px-2 py-1 rounded">
              {getPlatformIcon(pkg.platform_type)}
              <span className="capitalize">{pkg.platform_type}</span>
            </span>
          )}
          {pkg.content_type && (
            <span className="bg-gray-100 px-2 py-1 rounded capitalize">
              {pkg.content_type}
            </span>
          )}
          {pkg.duration_days && (
            <span className="bg-gray-100 px-2 py-1 rounded">
              {pkg.duration_days} days
            </span>
          )}
        </div>

        {/* Deliverables */}
        {pkg.deliverables && pkg.deliverables.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-medium text-gray-600 mb-2">Deliverables:</p>
            <ul className="space-y-1">
              {pkg.deliverables.slice(0, 3).map((deliverable, idx) => (
                <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                  <FaCheckCircle className="text-green-500 mt-0.5 flex-shrink-0" size={14} />
                  <span className="line-clamp-1">
                    {typeof deliverable === 'string' ? deliverable : `${deliverable.quantity}x ${deliverable.content_type}`}
                  </span>
                </li>
              ))}
              {pkg.deliverables.length > 3 && (
                <li className="text-xs text-gray-500 ml-5">
                  +{pkg.deliverables.length - 3} more
                </li>
              )}
            </ul>
          </div>
        )}

        {/* Price & Action */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <div>
            <p className="text-xs text-gray-500">Package Price</p>
            <p className="text-2xl font-bold text-primary">${pkg.price}</p>
          </div>
          <div className="flex gap-2">
            {creator.user_id && (
              <Link
                to={`/creator/${creator.user_id}`}
                className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
              >
                View Profile
              </Link>
            )}
            <button
              onClick={() => onSelect(pkg)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                isSelected
                  ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  : 'bg-primary text-white hover:bg-primary/90 shadow-sm hover:shadow-md'
              }`}
            >
              {isSelected ? 'Selected' : 'Select'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreatorPackageCardEnhanced;
