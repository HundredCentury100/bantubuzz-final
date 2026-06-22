import PropTypes from 'prop-types';

export const BADGE_CONFIGS = {
  top_creator: {
    label: 'Top Creator',
    description: 'Elite creator with strong reviews, delivery history, response rate, and marketplace performance.',
    image: '/assets/badges/badgesPNGS_Top%20Creator.png',
  },
  verified_creator: {
    label: 'Verified',
    description: 'Identity verified by BantuBuzz.',
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
  },
  responds_fast: {
    label: 'Responds Fast',
    description: 'Typically replies to brand requests faster than most creators.',
    image: '/assets/badges/responds-fast.png',
    invertImage: true,
  },
  referral_verified: {
    label: 'Referral Verified',
    description: 'Earned through qualified BantuBuzz referrals.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-full w-full" aria-hidden="true">
        <path d="M12 3l2.3 2.1 3.1-.2.7 3 2.5 1.9-1.3 2.8.7 3-2.8 1.4-1.3 2.8-3-.7-2.6 1.7-2.2-2.1-3.1.2-.7-3-2.5-1.9 1.3-2.8-.7-3 2.8-1.4L8.1 4l3 .7L12 3z" fill="currentColor" />
        <path d="M8.5 12.2l2.1 2.1 4.9-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  trusted_creator: {
    label: 'Trusted Creator',
    description: 'Strong verified reviews, reliable completion, and fast brand response.',
    image: '/assets/badges/badgesPNGS_Trusted%20Creator.png',
  },
  elite_creator: {
    label: 'Elite Creator',
    description: 'Highest-tier creator with excellent score, verified profile, campaign history, and reliability.',
    image: '/assets/badges/badgesPNGS_Elite%20Creator.png',
  },
  brand_magnet: {
    label: 'Brand Magnet',
    description: 'Creator with strong marketplace demand and brand-facing performance signals.',
    image: '/assets/badges/badgesPNGS_Brand%20Magnet.png',
  },
  campaign_pro: {
    label: 'Campaign Pro',
    description: 'Has completed campaign work and shown reliable campaign delivery.',
    image: '/assets/badges/badgesPNGS_Campaign%20Pro.png',
  },
  engagement_leader: {
    label: 'Engagement Leader',
    description: "Audience engagement is one of this creator's strongest signals.",
    image: '/assets/badges/badgesPNGS_Engagement%20Leader.png',
  },
  audience_builder: {
    label: 'Audience Builder',
    description: 'Consistently reaches an active audience across connected platforms.',
    image: '/assets/badges/badgesPNGS_Audience%20Builder.png',
  },
  rising_creator: {
    label: 'Rising Creator',
    description: 'Growing creator with promising marketplace and profile signals.',
    image: '/assets/badges/badgesPNGS_Rising%20Creator.png',
  },
  city_top_10: {
    label: 'City Top 10',
    description: 'Ranked among the top creators in their city.',
    image: '/assets/badges/badgesPNGS_City%20Top%2010.png',
  },
  category_leader: {
    label: 'Category Leader',
    description: 'Ranked highly in one of their creator categories.',
    image: '/assets/badges/badgesPNGS_Category%20Leader.png',
  },
  creator_to_watch: {
    label: 'Creator to Watch',
    description: 'A creator with enough promising signals for brands to keep an eye on.',
    image: '/assets/badges/badgesPNGS_Creator%20to%20Watch.png',
  },
};

export const normalizeBadge = (badge) => (badge === 'buzz_creator' ? 'creator_to_watch' : badge);

export const getBadgeConfig = (badge) => BADGE_CONFIGS[normalizeBadge(badge)] || null;

const shellClasses = {
  full: 'bg-gray-950/90 text-white ring-1 ring-white/10 shadow-sm',
  overlay: 'bg-gray-950/90 text-white ring-1 ring-white/25 shadow-lg backdrop-blur-sm',
  card: 'bg-gray-950/90 text-white ring-1 ring-white/25 shadow-lg backdrop-blur-sm',
  icon: 'bg-gray-950/90 text-white ring-1 ring-white/20 shadow-sm',
  'icon-only': 'bg-gray-950/90 text-white ring-1 ring-white/25 shadow-lg backdrop-blur-sm',
};

const sizeClasses = {
  sm: {
    text: 'text-[11px]',
    image: 'h-5 w-5',
    icon: 'h-4 w-4',
    iconOnly: 'h-8 w-8',
    padding: 'py-1 pl-1.5 pr-2.5',
    gap: 'gap-1.5',
  },
  md: {
    text: 'text-xs',
    image: 'h-7 w-7',
    icon: 'h-5 w-5',
    iconOnly: 'h-10 w-10',
    padding: 'py-1.5 pl-1.5 pr-3',
    gap: 'gap-2',
  },
  lg: {
    text: 'text-sm',
    image: 'h-9 w-9',
    icon: 'h-6 w-6',
    iconOnly: 'h-12 w-12',
    padding: 'py-2 pl-2 pr-3.5',
    gap: 'gap-2',
  },
};

const CreatorBadge = ({ badge, size = 'md', variant = 'full' }) => {
  const normalizedBadge = normalizeBadge(badge);

  if (normalizedBadge === 'creator') {
    return null;
  }

  const config = BADGE_CONFIGS[normalizedBadge];
  if (!config) return null;

  const sizes = sizeClasses[size];
  const title = `${config.label}: ${config.description}`;
  const hasArtwork = Boolean(config.image);
  const imageClassName = [
    sizes.image,
    'flex-shrink-0 object-contain',
    config.invertImage ? 'brightness-0 invert' : '',
  ].join(' ');

  if (variant === 'icon-only') {
    return (
      <div
        className={`inline-flex items-center justify-center rounded-full ${shellClasses['icon-only']} p-1`}
        title={title}
        aria-label={title}
      >
        {config.image ? (
          <img
            src={config.image}
            alt=""
            className={[
              sizes.iconOnly,
              'object-contain',
              config.invertImage ? 'brightness-0 invert' : '',
            ].join(' ')}
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

  return (
    <div
      className={`inline-flex max-w-full items-center rounded-full ${shellClasses[variant] || shellClasses.full} ${sizes.padding} ${sizes.gap}`}
      title={title}
      aria-label={title}
    >
      {hasArtwork ? (
        <img
          src={config.image}
          alt=""
          className={imageClassName}
          loading="lazy"
          aria-hidden="true"
        />
      ) : (
        <span className={`inline-flex ${sizes.icon} items-center justify-center text-white`}>
          {config.icon}
        </span>
      )}
      <span className={`${sizes.text} truncate font-semibold leading-none text-white`}>
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
  variant: PropTypes.oneOf(['full', 'icon', 'overlay', 'icon-only', 'card']),
};

export default CreatorBadge;
