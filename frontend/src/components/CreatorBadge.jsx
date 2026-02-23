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
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
              {/* Blue circle background */}
              <circle cx="12" cy="12" r="10" fill="#1D9BF0" />
              {/* White checkmark */}
              <path
                d="M9.5 12.5L11 14L14.5 10.5"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
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
    sm: isImageBadge ? 'w-4 h-4' : 'w-3 h-3',
    md: isImageBadge ? 'w-5 h-5' : 'w-3.5 h-3.5',
    lg: isImageBadge ? 'w-6 h-6' : 'w-4 h-4'
  };

  // Text size — same for both, no extra size difference
  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-xs',
    lg: 'text-sm'
  };

  // Padding — same for image badges so pill size stays consistent
  const overlayPadding = isImageBadge ? 'px-2 py-0.5' : 'px-1.5 py-0.5';
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
