import PropTypes from 'prop-types';

const CreatorBadge = ({ badge, size = 'md', variant = 'full' }) => {
  // Don't render anything for basic creators
  if (badge === 'creator') {
    return null;
  }

  const getBadgeConfig = (badgeType) => {
    switch (badgeType) {
      case 'top_creator':
        return {
          label: 'Top Creator',
          icon: (
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          ),
          badgeBg: 'bg-yellow-500',
          textColor: 'text-gray-800'
        };
      case 'verified_creator':
        return {
          label: 'Verified Creator',
          icon: (
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          ),
          badgeBg: 'bg-blue-500',
          textColor: 'text-gray-800'
        };
      default:
        return null;
    }
  };

  const config = getBadgeConfig(badge);
  if (!config) return null;

  // Icon only variant (for display next to username)
  if (variant === 'icon') {
    const iconSizeClasses = {
      sm: 'w-4 h-4',
      md: 'w-4 h-4',
      lg: 'w-5 h-5'
    };

    return (
      <span
        className={`inline-flex items-center justify-center ${iconSizeClasses[size]} ${config.badgeBg} text-white rounded-full p-0.5`}
        title={config.label}
      >
        {config.icon}
      </span>
    );
  }

  // Overlay variant (for image overlay)
  if (variant === 'overlay') {
    return (
      <span
        className={`inline-flex items-center px-2 py-1 ${config.badgeBg} text-white text-xs font-medium rounded-md`}
        title={config.label}
      >
        {config.label}
      </span>
    );
  }

  // Full variant (icon + text) - default
  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  const badgeSizeClasses = {
    sm: 'w-5 h-5 p-1',
    md: 'w-5 h-5 p-1',
    lg: 'w-6 h-6 p-1.5'
  };

  return (
    <div className="inline-flex items-center gap-1.5">
      <span
        className={`inline-flex items-center justify-center ${badgeSizeClasses[size]} ${config.badgeBg} text-white rounded-full`}
        title={config.label}
      >
        {config.icon}
      </span>
      <span className={`${sizeClasses[size]} ${config.textColor} font-medium`}>
        {config.label}
      </span>
    </div>
  );
};

CreatorBadge.propTypes = {
  badge: PropTypes.oneOf(['creator', 'verified_creator', 'top_creator']).isRequired,
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  variant: PropTypes.oneOf(['full', 'icon', 'overlay'])
};

export default CreatorBadge;
