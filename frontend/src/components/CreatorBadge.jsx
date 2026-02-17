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
          image: '/assets/badges/top-creator.png',
          pillBg: 'bg-yellow-400',
          textColor: 'text-white',
          badgeBg: 'bg-yellow-400'
        };
      case 'verified_creator':
        return {
          label: 'Verified',
          icon: (
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          ),
          pillBg: 'bg-blue-500',
          textColor: 'text-white',
          badgeBg: 'bg-blue-500'
        };
      case 'responds_fast':
        return {
          label: 'Responds Fast',
          image: '/assets/badges/responds-fast.png',
          pillBg: 'bg-green-500',
          textColor: 'text-white',
          badgeBg: 'bg-green-500'
        };
      default:
        return null;
    }
  };

  const config = getBadgeConfig(badge);
  if (!config) return null;

  const iconSizeClasses = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-xs',
    lg: 'text-sm'
  };

  // Overlay variant - colored pill with white image + white text (matches screenshot)
  if (variant === 'overlay') {
    return (
      <div className={`inline-flex items-center gap-1 ${config.pillBg} px-2 py-1 rounded-full shadow-sm`}>
        {config.image ? (
          <img
            src={config.image}
            alt={config.label}
            className={`${iconSizeClasses[size]} object-contain brightness-0 invert`}
            title={config.label}
          />
        ) : (
          <span className="inline-flex items-center justify-center text-white">
            {config.icon}
          </span>
        )}
        <span className={`${textSizeClasses[size]} text-white font-semibold`}>
          {config.label}
        </span>
      </div>
    );
  }

  // Icon variant (inline next to username)
  if (variant === 'icon') {
    return (
      <div className={`inline-flex items-center gap-1 ${config.pillBg} px-2 py-0.5 rounded-full`}>
        {config.image ? (
          <img
            src={config.image}
            alt={config.label}
            className={`${iconSizeClasses[size]} object-contain brightness-0 invert`}
            title={config.label}
          />
        ) : (
          <span className="inline-flex items-center justify-center text-white">
            {config.icon}
          </span>
        )}
        <span className={`${textSizeClasses[size]} text-white font-semibold`}>
          {config.label}
        </span>
      </div>
    );
  }

  // Full variant - default
  return (
    <div className={`inline-flex items-center gap-1 ${config.pillBg} px-2.5 py-1 rounded-full`}>
      {config.image ? (
        <img
          src={config.image}
          alt={config.label}
          className={`${iconSizeClasses[size]} object-contain brightness-0 invert`}
          title={config.label}
        />
      ) : (
        <span className="inline-flex items-center justify-center text-white">
          {config.icon}
        </span>
      )}
      <span className={`${textSizeClasses[size]} text-white font-semibold`}>
        {config.label}
      </span>
    </div>
  );
};

CreatorBadge.propTypes = {
  badge: PropTypes.oneOf(['creator', 'verified_creator', 'top_creator', 'responds_fast']).isRequired,
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  variant: PropTypes.oneOf(['full', 'icon', 'overlay'])
};

export default CreatorBadge;
