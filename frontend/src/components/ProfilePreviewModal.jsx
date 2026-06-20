import { useState } from 'react';
import { Bookmark, Bolt, Copy, MessageCircle, Plus, Share2, Trophy } from 'lucide-react';
import { BASE_URL } from '../services/api';
import CreatorBadge from './CreatorBadge';
import GalleryVideo from './GalleryVideo';

const badgePriority = {
  elite_creator: 1,
  top_creator: 2,
  trusted_creator: 3,
  brand_magnet: 4,
  campaign_pro: 5,
  engagement_leader: 6,
  audience_builder: 7,
  rising_creator: 8,
  city_top_10: 9,
  category_leader: 10,
  verified_creator: 11,
  referral_verified: 12,
  creator_to_watch: 13,
  responds_fast: 14,
  creator: 15,
};

const platformConfig = {
  instagram: {
    color: 'text-pink-600',
    icon: <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />,
  },
  tiktok: {
    color: 'text-gray-950',
    icon: <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z" />,
  },
  youtube: {
    color: 'text-red-600',
    icon: <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />,
  },
  facebook: {
    color: 'text-blue-600',
    icon: <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />,
  },
  twitter: {
    color: 'text-gray-950',
    icon: <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />,
  },
};

const badgeExplanations = {
  top_creator: ['Top Creator', 'Elite score, verified profile, strong reviews, delivery history, and response rate'],
  trusted_creator: ['Trusted Creator', 'Strong verified reviews, reliable completion, and fast brand response'],
  responds_fast: ['Responds Fast', 'Typically replies within 2 hours'],
  verified_creator: ['Verified Creator', 'Identity verified by BantuBuzz'],
  referral_verified: ['Referral Verified', 'Earned by bringing active creators to BantuBuzz'],
  engagement_leader: ['Engagement Leader', 'Strong audience engagement across connected platforms'],
  audience_builder: ['Audience Builder', 'Consistently reaches an active audience'],
  rising_creator: ['Rising Creator', 'Growing creator with strong marketplace signals'],
  city_top_10: ['City Top 10', 'Ranked among top creators in their city'],
  category_leader: ['Category Leader', 'Ranked highly in one of their creator categories'],
  creator_to_watch: ['Creator To Watch', 'A creator brands should keep an eye on'],
};

const formatFollowers = (count) => {
  const value = Number(count || 0);
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value.toString();
};

const mediaUrl = (path) => {
  if (!path) return '';
  return path.startsWith('http') ? path : `${BASE_URL}${path}`;
};

const sortedBadges = (profile) => {
  const source = profile.leaderboard_display_badges?.length
    ? profile.leaderboard_display_badges
    : profile.badges?.length
    ? profile.badges
    : profile.is_verified
    ? ['verified_creator']
    : ['creator_to_watch'];

  return source
    .filter((badge) => badge && badge !== 'creator')
    .slice()
    .sort((a, b) => (badgePriority[a] || 99) - (badgePriority[b] || 99));
};

const platformKey = (platform) => String(platform || '').trim().toLowerCase().replace('x', 'twitter');

const ProfilePreviewModal = ({ profile, onClose }) => {
  const [activeView, setActiveView] = useState('card');
  const badges = sortedBadges(profile);
  const gallery = (profile.gallery_images?.length ? profile.gallery_images : profile.gallery || []).slice(0, 3);
  const platformStats = profile.platform_stats?.length
    ? profile.platform_stats
    : (profile.platforms || []).map((platform) => ({ platform, followers: 0 }));
  const displayName = profile.display_name || profile.username || 'Creator';
  const location = profile.city && profile.country
    ? `${profile.city}, ${profile.country}`
    : profile.location || profile.city || profile.country || 'Location not set';
  const reviewCount = profile.review_stats?.total_reviews || 0;
  const rating = profile.effective_rating ?? profile.review_stats?.average_rating ?? null;
  const packagesCount = profile.total_packages || profile.package_count || profile.packages?.length || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-6xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
          <div>
            <h2 className="text-2xl font-bold text-dark">Profile Preview</h2>
            <p className="mt-1 text-sm text-gray-600">This is how brands will see your profile</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 transition-colors hover:bg-gray-100"
            aria-label="Close profile preview"
          >
            <svg className="h-6 w-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
          <div className="grid gap-2 sm:grid-cols-2">
            {[
              ['card', 'Creator Card View', 'How you appear in search results'],
              ['full', 'Full Profile View', 'Your complete public profile page'],
            ].map(([key, label, help]) => (
              <button
                key={key}
                onClick={() => setActiveView(key)}
                className={`rounded-lg px-4 py-3 text-center font-medium transition-colors ${
                  activeView === key ? 'bg-primary text-dark' : 'bg-white text-gray-600 hover:bg-gray-100'
                }`}
              >
                <span>{label}</span>
                <span className="mt-1 block text-xs opacity-80">{help}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-light p-6">
          {activeView === 'card' ? (
            <div className="mx-auto max-w-sm rounded-3xl bg-primary p-4 shadow-sm">
              <div className="mb-4 overflow-hidden rounded-2xl bg-white">
                <div className="relative aspect-square overflow-hidden bg-gray-100">
                  {profile.profile_picture ? (
                    <img src={mediaUrl(profile.profile_picture)} alt={displayName} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-sm text-gray-400">No image</div>
                  )}
                  {badges.length > 0 && (
                    <div className="absolute left-2 top-2 flex flex-wrap gap-1.5">
                      {badges.slice(0, 3).map((badge) => (
                        <CreatorBadge key={badge} badge={badge} size="sm" variant="icon-only" />
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="mb-2 flex items-start justify-between gap-3">
                <h3 className="min-w-0 truncate font-semibold text-gray-950">{displayName}</h3>
                <div className="text-right">
                  <span className="text-lg font-bold text-gray-950">{formatFollowers(profile.follower_count || profile.total_followers)}</span>
                  <p className="text-xs text-gray-700">Followers</p>
                </div>
              </div>

              <div className="mb-3 flex items-center gap-1 text-xs text-gray-700">
                <svg className="h-3 w-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="truncate">{location}</span>
              </div>

              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex gap-2">
                  {platformStats.slice(0, 3).map((stat, idx) => {
                    const config = platformConfig[platformKey(stat.platform)] || platformConfig.instagram;
                    return (
                      <svg key={`${stat.platform}-${idx}`} className={`h-5 w-5 ${config.color}`} viewBox="0 0 24 24" fill="currentColor" title={stat.platform}>
                        {config.icon}
                      </svg>
                    );
                  })}
                </div>
                <span className="rounded-full border border-gray-700 px-3 py-1 text-xs text-gray-950">
                  {profile.categories?.[0] || 'Creator'}
                </span>
              </div>

              <div className="block w-full rounded-full bg-white py-3 text-center font-medium text-dark">
                View profile
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-5xl">
              {gallery.length > 0 && (
                <div className="mb-8 grid gap-4 md:grid-cols-3">
                  {gallery.map((item, index) => {
                    const isObject = typeof item === 'object';
                    const isVideo = isObject && item.type === 'video';
                    const itemUrl = isObject ? item.url || item.medium : item;
                    return (
                      <div key={index} className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-gray-100 shadow-lg">
                        {isVideo ? (
                          <GalleryVideo src={mediaUrl(itemUrl)} type={item.mime_type || 'video/mp4'} className="h-full w-full object-cover" />
                        ) : (
                          <img src={mediaUrl(itemUrl)} alt={`Featured work ${index + 1}`} className="h-full w-full object-cover" />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="card mb-8">
                <div className="flex flex-col gap-6 md:flex-row">
                  <div className="flex-shrink-0">
                    {profile.profile_picture ? (
                      <img src={mediaUrl(profile.profile_picture)} alt={displayName} className="h-32 w-32 rounded-full border-4 border-primary/20 object-cover" />
                    ) : (
                      <div className="flex h-32 w-32 items-center justify-center rounded-full bg-primary/10">
                        <svg className="h-16 w-16 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0 flex-1">
                        <h1 className="mb-2 text-3xl font-bold text-dark">{displayName}</h1>

                        {profile.rank?.position && (
                          <div className="mb-3 flex flex-wrap items-center gap-2">
                            <div className="inline-flex items-center gap-2 rounded-md border border-primary/30 bg-primary/10 px-3 py-1.5 text-sm font-semibold text-dark">
                              <Trophy className="h-4 w-4 text-primary-dark" />
                              Ranked #{profile.rank.position} Overall
                            </div>
                            {profile.rank.position <= 50 && (
                              <span className="rounded-md bg-dark px-3 py-1.5 text-sm font-bold text-primary">Top 50 Creator</span>
                            )}
                          </div>
                        )}

                        {profile.active_spotlight_boost && (
                          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1.5 text-sm font-semibold text-amber-800">
                            <Bolt className="h-4 w-4" />
                            Spotlight Boost active
                          </div>
                        )}

                        {badges.length > 0 && (
                          <div className="mb-3">
                            <div className="mb-2 flex flex-wrap gap-2">
                              {badges.map((badge) => (
                                <CreatorBadge key={badge} badge={badge} size="md" />
                              ))}
                            </div>
                            <div className="mt-2 space-y-2">
                              {badges
                                .filter((badge) => badgeExplanations[badge])
                                .slice(0, 4)
                                .map((badge) => (
                                  <div key={badge} className="flex items-start gap-2 text-xs text-gray-600 sm:text-sm">
                                    <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary-dark" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                    <span className="leading-snug">
                                      <strong className="font-semibold">{badgeExplanations[badge][0]}:</strong> {badgeExplanations[badge][1]}
                                    </span>
                                  </div>
                                ))}
                            </div>
                          </div>
                        )}

                        <p className="flex items-center gap-2 text-gray-600">
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          {location}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 md:justify-end">
                        <button className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-gray-300 bg-white text-gray-700" title="Export card">
                          <Copy className="h-5 w-5" />
                        </button>
                        <button className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-gray-300 bg-white text-gray-700" title="Share profile">
                          <Share2 className="h-5 w-5" />
                        </button>
                        <button className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-primary bg-primary px-4 text-sm font-semibold text-white">
                          <MessageCircle className="h-5 w-5" />
                          <span>Message</span>
                        </button>
                        <button className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-primary bg-white px-4 text-sm font-semibold text-primary">
                          <Plus className="h-5 w-5" />
                          <span>Invite</span>
                        </button>
                        <button className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-gray-300 bg-white text-gray-600" title="Save creator">
                          <Bookmark className="h-5 w-5" />
                        </button>
                      </div>
                    </div>

                    <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-4">
                      <div className="rounded-lg bg-light p-3 text-center">
                        <p className="text-2xl font-bold text-dark">{formatFollowers(profile.follower_count || profile.total_followers)}</p>
                        <p className="text-sm text-gray-600">Followers</p>
                      </div>
                      <div className="rounded-lg bg-light p-3 text-center">
                        <p className="text-2xl font-bold text-dark">{packagesCount}</p>
                        <p className="text-sm text-gray-600">Packages</p>
                      </div>
                      <div className="rounded-lg bg-light p-3 text-center">
                        <div className="mb-1 flex items-center justify-center gap-1">
                          <svg className="h-5 w-5 fill-current text-primary-dark" viewBox="0 0 24 24">
                            <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                          </svg>
                          <p className="text-2xl font-bold text-dark">{rating ? Number(rating).toFixed(1) : '--'}</p>
                        </div>
                        <p className="text-sm text-gray-600">{reviewCount} {reviewCount === 1 ? 'Review' : 'Reviews'}</p>
                      </div>
                      <div className="flex items-center justify-center rounded-lg bg-light p-3 text-center">
                        <span className="rounded-full border border-gray-300 px-3 py-1 text-xs capitalize text-gray-700">
                          {profile.availability_status || 'unavailable'}
                        </span>
                      </div>
                    </div>

                    {platformStats.length > 0 && (
                      <div className="mb-4">
                        <p className="mb-3 text-sm font-medium text-gray-700">Connected Platforms</p>
                        <div className="flex flex-wrap gap-2">
                          {platformStats.map((stat, idx) => {
                            const config = platformConfig[platformKey(stat.platform)] || platformConfig.instagram;
                            return (
                              <div key={`${stat.platform}-${idx}`} className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1">
                                <svg className={`h-4 w-4 flex-shrink-0 ${config.color}`} viewBox="0 0 24 24" fill="currentColor">
                                  {config.icon}
                                </svg>
                                <span className="text-xs font-medium text-gray-900">{formatFollowers(stat.followers)}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="card">
                {profile.bio && (
                  <div className="mb-4">
                    <h3 className="mb-2 text-lg font-semibold text-dark">About</h3>
                    <p className="text-gray-700">{profile.bio}</p>
                  </div>
                )}

                {profile.categories?.length > 0 && (
                  <div className="mb-4">
                    <h3 className="mb-2 text-sm font-medium text-gray-700">Categories</h3>
                    <div className="flex flex-wrap gap-2">
                      {profile.categories.map((category) => (
                        <span key={category} className="rounded-full bg-primary/10 px-3 py-1 text-sm text-primary">
                          {category}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {profile.languages?.length > 0 && (
                  <div>
                    <h3 className="mb-2 text-sm font-medium text-gray-700">Languages</h3>
                    <div className="flex flex-wrap gap-2">
                      {profile.languages.map((language) => (
                        <span key={language} className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700">
                          {language}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfilePreviewModal;
