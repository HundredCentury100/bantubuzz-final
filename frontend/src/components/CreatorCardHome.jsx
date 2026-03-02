import { Link } from 'react-router-dom';
import ResponsiveImage from './ResponsiveImage';
import CreatorBadge from './CreatorBadge';

const CreatorCardHome = ({ creator, bgColor = 'white', textColor = 'dark' }) => {
  const formatFollowers = (count) => {
    if (!count) return '0';
    if (count >= 1000000) return `${(count / 1000000).toFixed(0)}m`;
    if (count >= 1000) return `${(count / 1000).toFixed(0)}k`;
    return count;
  };

  return (
    <div
      className={`bg-${bgColor} rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-shadow flex-shrink-0 w-full sm:w-[calc(50%-12px)] lg:w-[calc(25%-18px)]`}
    >
      {/* Image */}
      <div className="aspect-square m-4 rounded-2xl overflow-hidden bg-gray-100 relative">
        <ResponsiveImage
          sizes={creator.profile_picture_sizes || creator.profile_picture}
          alt={creator.display_name || creator.username || 'Creator profile'}
          className="w-full h-full"
          objectFit="cover"
          eager={false}
          showLoading={true}
        />
        {/* Badge Overlays on Image */}
        {creator.badges && creator.badges.length > 0 && (
          <div className="absolute top-2 left-2 flex flex-wrap gap-1.5">
            {creator.badges
              .sort((a, b) => {
                const priority = { 'top_creator': 1, 'verified_creator': 2, 'responds_fast': 3, 'creator': 4 };
                return (priority[a] || 99) - (priority[b] || 99);
              })
              .map((badge, idx) => (
                <CreatorBadge key={idx} badge={badge} size="md" variant="overlay" />
              ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="px-4 pb-4">
        {/* Name and Followers */}
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-1.5 mb-1">
              <h3 className={`font-semibold text-${textColor === 'white' ? 'gray-900' : textColor} truncate`}>
                {creator.display_name || creator.username || 'Creator'}
              </h3>
            </div>
          </div>
          <div className="text-right">
            <span className={`text-lg font-bold text-${textColor === 'white' ? 'gray-900' : textColor}`}>
              {formatFollowers(creator.follower_count)}
            </span>
            <p className={`text-xs ${textColor === 'white' ? 'text-gray-700' : 'text-gray-500'}`}>
              Followers
            </p>
          </div>
        </div>

        {/* Location and Price - Inline */}
        <div className="flex items-center justify-between mb-3 text-xs">
          {/* Location */}
          {(creator.city || creator.country || creator.location) && (
            <div className={`flex items-center gap-1 ${textColor === 'white' ? 'text-gray-600' : 'text-gray-600'}`}>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>
                {creator.city && creator.country
                  ? `${creator.city}, ${creator.country}`
                  : creator.location || creator.city || creator.country}
              </span>
            </div>
          )}

          {/* Price - Right aligned */}
          {creator.cheapest_package_price && (
            <span className={`font-semibold ${textColor === 'white' ? 'text-gray-900' : 'text-dark'}`}>
              ${creator.cheapest_package_price}
            </span>
          )}
        </div>

        {/* Category */}
        <div className="flex justify-end items-center mb-3">
          <span className={`text-xs px-3 py-1 border ${textColor === 'white' ? 'border-gray-700 text-gray-900' : 'border-gray-300 text-gray-700'} rounded-full`}>
            {creator.categories?.[0] || 'Lifestyle'}
          </span>
        </div>

        {/* View Profile Button */}
        <Link
          to={`/creators/${creator.id}`}
          className={`block w-full ${
            bgColor === 'primary'
              ? 'bg-white text-dark hover:bg-gray-100'
              : bgColor === 'white'
              ? 'bg-primary text-dark hover:bg-primary/90'
              : 'bg-dark text-white hover:bg-gray-800'
          } text-center py-3 rounded-full font-medium transition-colors`}
        >
          View profile
        </Link>
      </div>
    </div>
  );
};

export default CreatorCardHome;
