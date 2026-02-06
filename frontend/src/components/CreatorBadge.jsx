import PropTypes from 'prop-types';

const CreatorBadge = ({ badge, size = 'md' }) => {
  const getBadgeConfig = (badgeType) => {
    switch (badgeType) {
      case 'top_creator':
        return {
          label: 'Top Creator',
          icon: (
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          ),
          bgColor: 'bg-gradient-to-r from-yellow-400 to-yellow-500',
          textColor: 'text-white',
          borderColor: 'border-yellow-500'
        };
      case 'verified_creator':
        return {
          label: 'Verified Creator',
          icon: (
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          ),
          bgColor: 'bg-gradient-to-r from-blue-500 to-blue-600',
          textColor: 'text-white',
          borderColor: 'border-blue-600'
        };
      case 'creator':
      default:
        return {
          label: 'Creator',
          icon: (
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
            </svg>
          ),
          bgColor: 'bg-gradient-to-r from-gray-600 to-gray-700',
          textColor: 'text-white',
          borderColor: 'border-gray-700'
        };
    }
  };

  const config = getBadgeConfig(badge);
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1',
    lg: 'text-sm px-3 py-1.5 gap-1.5'
  };

  return (
    <span
      className={`inline-flex items-center ${sizeClasses[size]} ${config.bgColor} ${config.textColor} rounded-full font-medium shadow-sm`}
      title={config.label}
    >
      {config.icon}
      <span>{config.label}</span>
    </span>
  );
};

CreatorBadge.propTypes = {
  badge: PropTypes.oneOf(['creator', 'verified_creator', 'top_creator']).isRequired,
  size: PropTypes.oneOf(['sm', 'md', 'lg'])
};

export default CreatorBadge;
