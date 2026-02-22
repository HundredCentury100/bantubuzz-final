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
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
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

  // Badges that use image icons — make icon much larger and more prominent
  const isImageBadge = badge === 'top_creator' || badge === 'responds_fast';

  // Icon sizes: image badges get large prominent icons, svg badges stay modest
  const iconSizeClasses = {
    sm: isImageBadge ? 'w-6 h-6' : 'w-3.5 h-3.5',
    md: isImageBadge ? 'w-8 h-8' : 'w-4 h-4',
    lg: isImageBadge ? 'w-10 h-10' : 'w-5 h-5'
  };

  // Text size — same for both, no extra size difference
  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-xs',
    lg: 'text-sm'
  };

  // Padding — same for image badges so pill size stays consistent
  const overlayPadding = isImageBadge ? 'px-2.5 py-1' : 'px-2 py-1';
  const overlayFont = 'font-semibold';
  const overlayShadow = isImageBadge ? 'shadow-md' : 'shadow-sm';

  // Overlay variant - colored pill with white image + white text
  if (variant === 'overlay') {
    return (
      <div className={`inline-flex items-center gap-1.5 ${config.pillBg} ${overlayPadding} rounded-full ${overlayShadow}`}>
        {config.image ? (
          <img
            src={config.image}
            alt={config.label}
            className={`${iconSizeClasses[size]} object-contain brightness-0 invert flex-shrink-0`}
            title={config.label}
          />
        ) : (
          <span className="inline-flex items-center justify-center text-white">
            {config.icon}
          </span>
        )}
        <span className={`${textSizeClasses[size]} text-white ${overlayFont}`}>
          {config.label}
        </span>
      </div>
    );
  }

  // Icon variant (inline next to username)
  if (variant === 'icon') {
    return (
      <div className={`inline-flex items-center gap-1.5 ${config.pillBg} ${overlayPadding} rounded-full`}>
        {config.image ? (
          <img
            src={config.image}
            alt={config.label}
            className={`${iconSizeClasses[size]} object-contain brightness-0 invert flex-shrink-0`}
            title={config.label}
          />
        ) : (
          <span className="inline-flex items-center justify-center text-white">
            {config.icon}
          </span>
        )}
        <span className={`${textSizeClasses[size]} text-white ${overlayFont}`}>
          {config.label}
        </span>
      </div>
    );
  }

  // Full variant - default
  return (
    <div className={`inline-flex items-center gap-1.5 ${config.pillBg} ${overlayPadding} rounded-full`}>
      {config.image ? (
        <img
          src={config.image}
          alt={config.label}
          className={`${iconSizeClasses[size]} object-contain brightness-0 invert flex-shrink-0`}
          title={config.label}
        />
      ) : (
        <span className="inline-flex items-center justify-center text-white">
          {config.icon}
        </span>
      )}
      <span className={`${textSizeClasses[size]} text-white ${overlayFont}`}>
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
