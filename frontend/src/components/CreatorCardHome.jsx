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
            {creator.badges.map((badge, idx) => (
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

        {/* Category */}
        <div className="flex justify-end items-center mb-4">
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
