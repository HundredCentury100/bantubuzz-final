import PropTypes from 'prop-types';

const CreatorBadge = ({ badge, size = 'md', variant = 'full' }) => {
  // Don't render anything for basic creators
  if (badge === 'creator') {
    return null;
  }

  const getBadgeConfig = (badgeType) => {
    const placeholderIcon = (path, fill = 'none') => (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill={fill} aria-hidden="true">
        <path d={path} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );

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
      case 'referral_verified':
        return {
          label: 'Referral Verified',
          description: 'Earned through qualified BantuBuzz referrals',
          icon: (
            <svg viewBox="0 0 24 24" fill="none" className="h-full w-full" aria-hidden="true">
              <path d="M12 3l2.3 2.1 3.1-.2.7 3 2.5 1.9-1.3 2.8.7 3-2.8 1.4-1.3 2.8-3-.7-2.6 1.7-2.2-2.1-3.1.2-.7-3-2.5-1.9 1.3-2.8-.7-3 2.8-1.4L8.1 4l3 .7L12 3z" fill="currentColor" />
              <path d="M8.5 12.2l2.1 2.1 4.9-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ),
          pillBg: 'bg-primary-dark',
          textColor: 'text-white',
          badgeBg: 'bg-primary-dark'
        };
      case 'trusted_creator':
        return {
          label: 'Trusted Creator',
          icon: placeholderIcon('M12 3l7 4v5c0 4.5-2.9 7.8-7 9-4.1-1.2-7-4.5-7-9V7l7-4zM9 12l2 2 4-4'),
          pillBg: 'bg-emerald-600',
          textColor: 'text-white',
          badgeBg: 'bg-emerald-600'
        };
      case 'elite_creator':
        return {
          label: 'Elite Creator',
          icon: placeholderIcon('M12 3l2.7 5.5 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.8 1-6.1-4.4-4.3 6.1-.9L12 3z'),
          pillBg: 'bg-purple-700',
          textColor: 'text-white',
          badgeBg: 'bg-purple-700'
        };
      case 'brand_magnet':
        return {
          label: 'Brand Magnet',
          icon: placeholderIcon('M12 5v14M5 12h14M7 7l10 10M17 7L7 17'),
          pillBg: 'bg-slate-800',
          textColor: 'text-white',
          badgeBg: 'bg-slate-800'
        };
      case 'campaign_pro':
        return {
          label: 'Campaign Pro',
          icon: placeholderIcon('M4 7h16M7 7V5h10v2M6 7l1 13h10l1-13M10 11v5M14 11v5'),
          pillBg: 'bg-indigo-600',
          textColor: 'text-white',
          badgeBg: 'bg-indigo-600'
        };
      case 'engagement_leader':
        return {
          label: 'Engagement Leader',
          icon: placeholderIcon('M5 13l4 4L19 7'),
          pillBg: 'bg-pink-600',
          textColor: 'text-white',
          badgeBg: 'bg-pink-600'
        };
      case 'audience_builder':
        return {
          label: 'Audience Builder',
          icon: placeholderIcon('M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75'),
          pillBg: 'bg-cyan-700',
          textColor: 'text-white',
          badgeBg: 'bg-cyan-700'
        };
      case 'rising_creator':
        return {
          label: 'Rising Creator',
          icon: placeholderIcon('M4 17l6-6 4 4 6-8M14 7h6v6'),
          pillBg: 'bg-orange-600',
          textColor: 'text-white',
          badgeBg: 'bg-orange-600'
        };
      case 'city_top_10':
        return {
          label: 'City Top 10',
          icon: placeholderIcon('M12 21s7-4.5 7-11a7 7 0 10-14 0c0 6.5 7 11 7 11zM12 10.5a2 2 0 100-4 2 2 0 000 4'),
          pillBg: 'bg-blue-700',
          textColor: 'text-white',
          badgeBg: 'bg-blue-700'
        };
      case 'category_leader':
        return {
          label: 'Category Leader',
          icon: placeholderIcon('M8 21h8M12 17v4M7 4h10v4a5 5 0 01-10 0V4zM5 6H3a3 3 0 003 3M19 6h2a3 3 0 01-3 3'),
          pillBg: 'bg-primary-dark',
          textColor: 'text-white',
          badgeBg: 'bg-primary-dark'
        };
      case 'creator_to_watch':
        return {
          label: 'Creator To Watch',
          icon: placeholderIcon('M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 15a3 3 0 100-6 3 3 0 000 6'),
          pillBg: 'bg-gray-700',
          textColor: 'text-white',
          badgeBg: 'bg-gray-700'
        };
      case 'buzz_creator':
        return {
          label: 'Buzz Creator',
          icon: placeholderIcon('M12 3l2.2 4.5 5 .7-3.6 3.5.8 5-4.4-2.3-4.4 2.3.8-5L4 8.2l5-.7L12 3z'),
          pillBg: 'bg-gray-700',
          textColor: 'text-white',
          badgeBg: 'bg-gray-700'
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
  badge: PropTypes.oneOf([
    'creator',
    'verified_creator',
    'top_creator',
    'responds_fast',
    'referral_verified',
    'trusted_creator',
    'elite_creator',
    'brand_magnet',
    'campaign_pro',
    'engagement_leader',
    'audience_builder',
    'rising_creator',
    'city_top_10',
    'category_leader',
    'creator_to_watch',
    'buzz_creator',
  ]).isRequired,
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  variant: PropTypes.oneOf(['full', 'icon', 'overlay'])
};

export default CreatorBadge;
