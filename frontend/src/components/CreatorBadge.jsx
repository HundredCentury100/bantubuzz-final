import PropTypes from 'prop-types';

const BADGE_CONFIGS = {
  top_creator: {
    label: 'Top Creator',
    image: '/assets/badges/badgesPNGS_Top%20Creator.png',
    pillBg: 'bg-yellow-400',
    textColor: 'text-gray-950',
  },
  verified_creator: {
    label: 'Verified',
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="10" fill="#1D9BF0" />
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
  },
  responds_fast: {
    label: 'Responds Fast',
    image: '/assets/badges/responds-fast.png',
    invertImage: true,
    pillBg: 'bg-green-500',
    textColor: 'text-white',
  },
  referral_verified: {
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
  },
  trusted_creator: {
    label: 'Trusted Creator',
    image: '/assets/badges/badgesPNGS_Trusted%20Creator.png',
    pillBg: 'bg-emerald-600',
    textColor: 'text-white',
  },
  elite_creator: {
    label: 'Elite Creator',
    image: '/assets/badges/badgesPNGS_Elite%20Creator.png',
    pillBg: 'bg-purple-700',
    textColor: 'text-white',
  },
  brand_magnet: {
    label: 'Brand Magnet',
    image: '/assets/badges/badgesPNGS_Brand%20Magnet.png',
    pillBg: 'bg-slate-800',
    textColor: 'text-white',
  },
  campaign_pro: {
    label: 'Campaign Pro',
    image: '/assets/badges/badgesPNGS_Campaign%20Pro.png',
    pillBg: 'bg-indigo-600',
    textColor: 'text-white',
  },
  engagement_leader: {
    label: 'Engagement Leader',
    image: '/assets/badges/badgesPNGS_Engagement%20Leader.png',
    pillBg: 'bg-pink-600',
    textColor: 'text-white',
  },
  audience_builder: {
    label: 'Audience Builder',
    image: '/assets/badges/badgesPNGS_Audience%20Builder.png',
    pillBg: 'bg-cyan-700',
    textColor: 'text-white',
  },
  rising_creator: {
    label: 'Rising Creator',
    image: '/assets/badges/badgesPNGS_Rising%20Creator.png',
    pillBg: 'bg-orange-600',
    textColor: 'text-white',
  },
  city_top_10: {
    label: 'City Top 10',
    image: '/assets/badges/badgesPNGS_City%20Top%2010.png',
    pillBg: 'bg-blue-700',
    textColor: 'text-white',
  },
  category_leader: {
    label: 'Category Leader',
    image: '/assets/badges/badgesPNGS_Category%20Leader.png',
    pillBg: 'bg-primary-dark',
    textColor: 'text-white',
  },
  creator_to_watch: {
    label: 'Creator To Watch',
    image: '/assets/badges/badgesPNGS_Creator%20to%20Watch.png',
    pillBg: 'bg-gray-700',
    textColor: 'text-white',
  },
};

const normalizeBadge = (badge) => (badge === 'buzz_creator' ? 'creator_to_watch' : badge);

const CreatorBadge = ({ badge, size = 'md', variant = 'full' }) => {
  const normalizedBadge = normalizeBadge(badge);

  if (normalizedBadge === 'creator') {
    return null;
  }

  const config = BADGE_CONFIGS[normalizedBadge];
  if (!config) return null;

  const hasArtwork = Boolean(config.image) && !config.invertImage;
  const iconSizeClasses = {
    sm: hasArtwork ? 'h-5 w-5' : 'h-4 w-4',
    md: hasArtwork ? 'h-7 w-7' : 'h-5 w-5',
    lg: hasArtwork ? 'h-9 w-9' : 'h-6 w-6',
  };
  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-xs',
    lg: 'text-sm',
  };
  const padding = hasArtwork ? 'py-1 pl-1 pr-2.5' : 'px-2 py-0.5';
  const shadow = hasArtwork ? 'shadow-md' : 'shadow-sm';
  const iconOnlySizeClasses = {
    sm: hasArtwork ? 'h-8 w-8' : 'h-7 w-7',
    md: hasArtwork ? 'h-10 w-10' : 'h-8 w-8',
    lg: hasArtwork ? 'h-12 w-12' : 'h-10 w-10',
  };
  const imageClassName = [
    iconSizeClasses[size],
    'flex-shrink-0 object-contain',
    config.invertImage ? 'brightness-0 invert' : '',
  ].join(' ');
  const iconOnlyImageClassName = [
    iconOnlySizeClasses[size],
    'object-contain',
    config.invertImage ? 'brightness-0 invert' : '',
  ].join(' ');

  if (variant === 'icon-only') {
    return (
      <div
        className={`inline-flex items-center justify-center rounded-full ${config.pillBg} p-1 ${shadow}`}
        title={config.label}
        aria-label={config.label}
      >
        {config.image ? (
          <img
            src={config.image}
            alt=""
            className={iconOnlyImageClassName}
            loading="lazy"
            aria-hidden="true"
          />
        ) : (
          <span className="inline-flex h-5 w-5 items-center justify-center text-white">
            {config.icon}
          </span>
        )}
      </div>
    );
  }

  const content = (
    <>
      {config.image ? (
        <img
          src={config.image}
          alt={config.label}
          className={imageClassName}
          title={config.label}
          loading="lazy"
        />
      ) : (
        <span className="inline-flex h-4 w-4 items-center justify-center text-white">
          {config.icon}
        </span>
      )}
      <span className={`${textSizeClasses[size]} ${config.textColor} font-semibold leading-none`}>
        {config.label}
      </span>
    </>
  );

  if (variant === 'overlay' || variant === 'icon') {
    return (
      <div className={`inline-flex items-center gap-1.5 rounded-full ${config.pillBg} ${padding} ${shadow}`}>
        {content}
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-1.5 rounded-full ${config.pillBg} ${padding} ${shadow}`}>
      {content}
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
  variant: PropTypes.oneOf(['full', 'icon', 'overlay', 'icon-only']),
};

export default CreatorBadge;
