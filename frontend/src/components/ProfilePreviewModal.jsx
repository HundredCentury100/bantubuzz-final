import { useState } from 'react';
import { BASE_URL } from '../services/api';
import CreatorBadge from './CreatorBadge';

const ProfilePreviewModal = ({ profile, onClose }) => {
  const [activeView, setActiveView] = useState('card'); // 'card' or 'full'

  // Mock badges based on creator's status
  const getBadges = () => {
    const badges = [];

    // All creators get the creator badge
    badges.push('creator');

    // Add verified_creator badge if verification conditions are met
    // (You can check verification status from profile.is_verified or similar)
    if (profile.is_verified) {
      badges.push('verified_creator');
    }

    return badges;
  };

  const badges = getBadges();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-3xl z-10">
          <div>
            <h2 className="text-2xl font-bold text-dark">Profile Preview</h2>
            <p className="text-sm text-gray-600 mt-1">This is how brands will see your profile</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* View Toggle */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveView('card')}
              className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors ${
                activeView === 'card'
                  ? 'bg-primary text-dark'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
                Creator Card View
              </div>
              <p className="text-xs mt-1 opacity-80">How you appear in search results</p>
            </button>
            <button
              onClick={() => setActiveView('full')}
              className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors ${
                activeView === 'full'
                  ? 'bg-primary text-dark'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Full Profile View
              </div>
              <p className="text-xs mt-1 opacity-80">Your complete profile page</p>
            </button>
          </div>
        </div>

        {/* Preview Content */}
        <div className="p-6">
          {activeView === 'card' ? (
            /* Creator Card Preview */
            <div className="max-w-sm mx-auto">
              <div className="bg-primary p-4 rounded-3xl shadow-sm">
                {/* White Inner Container */}
                <div className="bg-white rounded-2xl overflow-hidden mb-4">
                  {/* Image */}
                  <div className="aspect-square overflow-hidden bg-gray-100 relative">
                    {profile.profile_picture ? (
                      <img
                        src={`${BASE_URL}${profile.profile_picture}`}
                        alt={profile.username || 'Creator'}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-gray-400 text-sm">No image</span>
                      </div>
                    )}
                    {/* Badge Overlays on Image */}
                    {badges && badges.length > 0 && (
                      <div className="absolute top-2 left-2 flex flex-wrap gap-1.5">
                        {badges
                          .sort((a, b) => {
                            const priority = { 'top_creator': 1, 'verified_creator': 2, 'responds_fast': 3, 'creator': 4 };
                            return (priority[a] || 99) - (priority[b] || 99);
                          })
                          .map((badge, idx) => (
                            <CreatorBadge key={idx} badge={badge} size="md" variant="overlay" />
                          ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Name and Followers */}
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-semibold text-gray-900">
                      {profile.username || 'Creator'}
                    </h3>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold text-gray-900">
                      {profile.follower_count >= 1000000
                        ? `${(profile.follower_count / 1000000).toFixed(0)}m`
                        : profile.follower_count >= 1000
                        ? `${(profile.follower_count / 1000).toFixed(0)}k`
                        : profile.follower_count || 0}
                    </span>
                    <p className="text-xs text-gray-700">Followers</p>
                  </div>
                </div>

                {/* Location */}
                {(profile.city || profile.country || profile.location) && (
                  <div className="flex items-center gap-1 text-gray-600 mb-3 text-xs">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>
                      {profile.city && profile.country
                        ? `${profile.city}, ${profile.country}`
                        : profile.location || profile.city || profile.country}
                    </span>
                  </div>
                )}

                {/* Platform Icons and Category */}
                <div className="flex justify-between items-center mb-3">
                  {/* Platform Icons */}
                  <div className="flex gap-2">
                    {profile.platforms && profile.platforms.length > 0 ? (
                      profile.platforms.slice(0, 3).map((platform) => {
                        const platformConfig = {
                          Instagram: { icon: <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>, color: 'text-pink-600' },
                          TikTok: { icon: <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>, color: 'text-gray-900' },
                          YouTube: { icon: <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>, color: 'text-red-600' },
                          Facebook: { icon: <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>, color: 'text-blue-600' },
                          Twitter: { icon: <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>, color: 'text-gray-900' }
                        };
                        const config = platformConfig[platform] || platformConfig.Instagram;
                        return (
                          <svg
                            key={platform}
                            className={`w-5 h-5 ${config.color}`}
                            viewBox="0 0 24 24"
                            fill="currentColor"
                            title={platform}
                          >
                            {config.icon}
                          </svg>
                        );
                      })
                    ) : (
                      <svg className="w-5 h-5 text-gray-400" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                      </svg>
                    )}
                  </div>
                  <span className="text-xs px-3 py-1 border border-gray-700 rounded-full text-gray-900">
                    {profile.categories?.[0] || 'Creator'}
                  </span>
                </div>

                {/* View Profile Button */}
                <div className="block w-full bg-white text-dark text-center py-3 rounded-full font-medium">
                  View profile
                </div>
              </div>
            </div>
          ) : (
            /* Full Profile Preview */
            <div className="max-w-4xl mx-auto">
              <div className="bg-white rounded-3xl shadow-sm p-8">
                <div className="flex flex-col md:flex-row gap-6">
                  {/* Avatar */}
                  <div className="flex-shrink-0">
                    {profile.profile_picture ? (
                      <img
                        src={`${BASE_URL}${profile.profile_picture}`}
                        alt={profile.username || 'Creator'}
                        className="w-32 h-32 rounded-full object-cover border-4 border-primary/20"
                      />
                    ) : (
                      <div className="w-32 h-32 bg-primary/10 rounded-full flex items-center justify-center">
                        <svg className="w-16 h-16 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Creator Info */}
                  <div className="flex-1">
                    <h1 className="text-3xl font-bold text-dark mb-2">
                      {profile.username || 'Creator'}
                    </h1>

                    {/* Badges */}
                    {badges && badges.length > 0 && (
                      <div className="mb-3">
                        <div className="flex flex-wrap gap-2 mb-2">
                          {badges
                            .sort((a, b) => {
                              const priority = { 'top_creator': 1, 'verified_creator': 2, 'responds_fast': 3, 'creator': 4 };
                              return (priority[a] || 99) - (priority[b] || 99);
                            })
                            .map((badge, idx) => (
                              <CreatorBadge key={idx} badge={badge} size="md" />
                            ))}
                        </div>

                        {/* Badge Explanations */}
                        <div className="mt-2 space-y-2">
                          {badges.includes('verified_creator') && (
                            <div className="flex items-start gap-2 text-xs sm:text-sm text-gray-600">
                              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                              <span className="leading-snug"><strong className="font-semibold">Verified Creator:</strong> Identity verified by BantuBuzz</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <p className="text-gray-600 flex items-center gap-2 mb-4">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {profile.city && profile.country
                        ? `${profile.city}, ${profile.country}`
                        : profile.location || profile.city || profile.country || 'Location not set'}
                    </p>

                    {/* Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div className="text-center p-3 bg-light rounded-lg">
                        <p className="text-2xl font-bold text-dark">
                          {profile.follower_count >= 1000
                            ? `${(profile.follower_count / 1000).toFixed(1)}K`
                            : profile.follower_count || 0}
                        </p>
                        <p className="text-sm text-gray-600">Followers</p>
                      </div>
                      <div className="text-center p-3 bg-light rounded-lg flex items-center justify-center">
                        <span className="text-xs px-3 py-1 border border-gray-300 rounded-full text-gray-700 capitalize">
                          {profile.availability_status || 'unavailable'}
                        </span>
                      </div>
                    </div>

                    {/* Bio */}
                    {profile.bio && (
                      <p className="text-gray-700 mb-4">{profile.bio}</p>
                    )}

                    {/* Categories */}
                    {profile.categories && profile.categories.length > 0 && (
                      <div className="mb-4">
                        <h3 className="text-sm font-medium text-gray-700 mb-2">Categories</h3>
                        <div className="flex flex-wrap gap-2">
                          {profile.categories.map((category, idx) => (
                            <span
                              key={idx}
                              className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm"
                            >
                              {category}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Languages */}
                    {profile.languages && profile.languages.length > 0 && (
                      <div className="mb-4">
                        <h3 className="text-sm font-medium text-gray-700 mb-2">Languages</h3>
                        <div className="flex flex-wrap gap-2">
                          {profile.languages.map((language, idx) => (
                            <span
                              key={idx}
                              className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                            >
                              {language}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Social Links */}
                    {profile.social_links && Object.keys(profile.social_links).some(key => profile.social_links[key]) && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-700 mb-2">Social Media</h3>
                        <div className="flex gap-3">
                          {profile.social_links.instagram && (
                            <div className="transition-colors">
                              <svg className="w-7 h-7" viewBox="0 0 24 24" fill="url(#instagram-gradient)">
                                <defs>
                                  <linearGradient id="instagram-gradient" x1="0%" y1="100%" x2="100%" y2="0%">
                                    <stop offset="0%" style={{stopColor: '#f09433', stopOpacity: 1}} />
                                    <stop offset="25%" style={{stopColor: '#e6683c', stopOpacity: 1}} />
                                    <stop offset="50%" style={{stopColor: '#dc2743', stopOpacity: 1}} />
                                    <stop offset="75%" style={{stopColor: '#cc2366', stopOpacity: 1}} />
                                    <stop offset="100%" style={{stopColor: '#bc1888', stopOpacity: 1}} />
                                  </linearGradient>
                                </defs>
                                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                              </svg>
                            </div>
                          )}
                          {profile.social_links.tiktok && (
                            <svg className="w-7 h-7" viewBox="0 0 24 24" fill="#000000">
                              <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
                            </svg>
                          )}
                          {profile.social_links.youtube && (
                            <svg className="w-7 h-7" viewBox="0 0 24 24" fill="#FF0000">
                              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                            </svg>
                          )}
                          {profile.social_links.twitter && (
                            <svg className="w-7 h-7" viewBox="0 0 24 24" fill="#000000">
                              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                            </svg>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfilePreviewModal;
