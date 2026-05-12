import { Link } from 'react-router-dom';
import { FaCheckCircle, FaStar, FaEye, FaHeart } from 'react-icons/fa';

const CreatorPackageCard = ({ package: pkg, onRemove }) => {
  const creator = pkg.creator;

  // Format large numbers with K/M suffix
  const formatNumber = (num) => {
    if (!num) return '0';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString();
  };

  // Get platform icon/badge
  const getPlatformBadge = (platform) => {
    const badges = {
      Instagram: { bg: 'bg-pink-100', text: 'text-pink-700' },
      TikTok: { bg: 'bg-black', text: 'text-white' },
      YouTube: { bg: 'bg-red-100', text: 'text-red-700' },
      Twitter: { bg: 'bg-blue-100', text: 'text-blue-700' },
      Twitch: { bg: 'bg-purple-100', text: 'text-purple-700' },
      UGC: { bg: 'bg-gray-100', text: 'text-gray-700' },
    };

    return badges[platform] || badges.UGC;
  };

  const platformStyle = pkg.platform_type ? getPlatformBadge(pkg.platform_type) : null;

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden hover:border-primary hover:shadow-lg transition-all duration-200">
      {/* Creator Header */}
      <div className="p-4 bg-gradient-to-r from-primary/5 to-blue-50 border-b border-gray-200">
        <div className="flex items-center gap-3">
          {creator?.profile_picture ? (
            <img
              src={creator.profile_picture}
              alt={creator.display_name}
              className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-md"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center">
              <span className="text-gray-600 font-bold text-lg">
                {creator?.display_name?.charAt(0) || '?'}
              </span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900 truncate">
                {creator?.display_name || 'Creator'}
              </h3>
              {creator?.verified && (
                <FaCheckCircle className="text-primary flex-shrink-0" size={14} />
              )}
            </div>
            <p className="text-xs text-gray-600 truncate">{creator?.category || 'Content Creator'}</p>
          </div>
          {creator?.rating > 0 && (
            <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-lg shadow-sm">
              <FaStar className="text-yellow-500" size={12} />
              <span className="text-sm font-semibold text-gray-900">
                {creator.rating}
              </span>
              <span className="text-xs text-gray-500">
                ({creator.total_reviews})
              </span>
            </div>
          )}
        </div>

        {/* Creator Stats */}
        <div className="grid grid-cols-3 gap-2 mt-3">
          <div className="bg-white rounded-lg px-2 py-1.5 text-center">
            <p className="text-xs text-gray-500">Followers</p>
            <p className="text-sm font-bold text-gray-900">
              {formatNumber(creator?.follower_count)}
            </p>
          </div>
          <div className="bg-white rounded-lg px-2 py-1.5 text-center">
            <div className="flex items-center justify-center gap-1">
              <FaEye className="text-gray-400" size={10} />
              <p className="text-xs text-gray-500">Avg Views</p>
            </div>
            <p className="text-sm font-bold text-gray-900">
              {formatNumber(creator?.avg_views)}
            </p>
          </div>
          <div className="bg-white rounded-lg px-2 py-1.5 text-center">
            <div className="flex items-center justify-center gap-1">
              <FaHeart className="text-gray-400" size={10} />
              <p className="text-xs text-gray-500">Engagement</p>
            </div>
            <p className="text-sm font-bold text-gray-900">
              {creator?.engagement_rate}%
            </p>
          </div>
        </div>
      </div>

      {/* Package Content */}
      <div className="p-4">
        {/* Platform & Content Type Badges */}
        <div className="flex flex-wrap gap-2 mb-3">
          {pkg.is_multi_platform && pkg.platforms?.length > 0 ? (
            pkg.platforms.map((platform, idx) => (
              <span
                key={idx}
                className={`px-2 py-1 rounded-lg text-xs font-medium ${getPlatformBadge(platform).bg} ${getPlatformBadge(platform).text}`}
              >
                {platform}
              </span>
            ))
          ) : (
            pkg.platform_type && (
              <span
                className={`px-2 py-1 rounded-lg text-xs font-medium ${platformStyle.bg} ${platformStyle.text}`}
              >
                {pkg.platform_type}
              </span>
            )
          )}
          {pkg.content_type && (
            <span className="px-2 py-1 rounded-lg text-xs font-medium bg-gray-100 text-gray-700">
              {pkg.content_type}
            </span>
          )}
          {pkg.collaboration_type && (
            <span className="px-2 py-1 rounded-lg text-xs font-medium bg-blue-100 text-blue-700">
              {pkg.collaboration_type}
            </span>
          )}
        </div>

        {/* Package Title & Description */}
        <h4 className="font-semibold text-gray-900 mb-2 line-clamp-1">{pkg.title}</h4>
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{pkg.description}</p>

        {/* Deliverables */}
        {pkg.deliverables && pkg.deliverables.length > 0 && (
          <div className="mb-3">
            <p className="text-xs font-medium text-gray-500 mb-2">Deliverables:</p>
            <div className="flex flex-wrap gap-1">
              {pkg.deliverables.slice(0, 3).map((item, idx) => (
                <span
                  key={idx}
                  className="px-2 py-1 bg-gray-50 text-gray-700 rounded text-xs"
                >
                  {item.quantity}x {item.content_type}
                </span>
              ))}
              {pkg.deliverables.length > 3 && (
                <span className="px-2 py-1 bg-gray-50 text-gray-600 rounded text-xs">
                  +{pkg.deliverables.length - 3} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Price & Duration */}
        <div className="flex justify-between items-center pt-3 border-t border-gray-100">
          <div>
            <p className="text-2xl font-bold text-primary">${pkg.price}</p>
            <p className="text-xs text-gray-500">{pkg.duration_days} days delivery</p>
          </div>
          <div className="flex gap-2">
            {creator?.user_id && (
              <Link
                to={`/creator/${creator.user_id}`}
                className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
              >
                View Profile
              </Link>
            )}
            {onRemove && (
              <button
                onClick={() => onRemove(pkg.id)}
                className="px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium"
              >
                Remove
              </button>
            )}
          </div>
        </div>

        {/* Creator Bio Preview (truncated) */}
        {creator?.bio && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-600 line-clamp-2 italic">
              "{creator.bio}"
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreatorPackageCard;
