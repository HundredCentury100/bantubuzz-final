import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { brandsAPI, BASE_URL } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import Navbar from '../components/Navbar';
import CreatorBadge from '../components/CreatorBadge';
import toast from 'react-hot-toast';
import SEO from '../components/SEO';

const SavedCreators = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [creators, setCreators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savedCreatorIds, setSavedCreatorIds] = useState(new Set());

  useEffect(() => {
    // Redirect if not a brand
    if (user && user.user_type !== 'brand') {
      toast.error('Only brands can access saved creators');
      navigate('/');
      return;
    }

    fetchSavedCreators();
  }, [user, navigate]);

  const fetchSavedCreators = async () => {
    try {
      setLoading(true);
      const response = await brandsAPI.getSavedCreators();
      const saved = response.data.creators || [];
      setCreators(saved);
      setSavedCreatorIds(new Set(saved.map(c => c.id)));
    } catch (error) {
      console.error('Error fetching saved creators:', error);
      toast.error('Failed to load saved creators');
    } finally {
      setLoading(false);
    }
  };

  const handleUnsaveCreator = async (creatorId) => {
    try {
      await brandsAPI.unsaveCreator(creatorId);
      setSavedCreatorIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(creatorId);
        return newSet;
      });
      // Remove from display
      setCreators(prev => prev.filter(c => c.id !== creatorId));
      toast.success('Creator removed from saved');
    } catch (error) {
      console.error('Error unsaving creator:', error);
      toast.error('Failed to unsave creator');
    }
  };

  return (
    <div className="min-h-screen bg-light">
      <SEO
        title="Saved Creators"
        description="View and manage your saved creators"
        keywords="saved creators, favorite creators, bookmarked creators"
      />
      <Navbar />

      <div className="container-custom section-padding">
        {/* Navigation */}
        <div className="mb-6">
          <Link
            to="/brand/dashboard"
            className="text-gray-600 hover:text-gray-900 flex items-center gap-2 w-fit"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </Link>
        </div>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-dark mb-2">Saved Creators</h1>
          <p className="text-gray-600">Manage your saved creators</p>
        </div>

        {/* Results Count */}
        <div className="mb-6 flex items-center justify-between">
          <p className="text-gray-600">
            {creators.length} saved creator{creators.length !== 1 ? 's' : ''}
          </p>
          <Link
            to="/browse/creators"
            className="px-4 py-2 bg-primary hover:bg-primary-dark text-white font-medium rounded-lg transition-colors"
          >
            Browse More Creators
          </Link>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : creators.length === 0 ? (
          /* Empty State */
          <div className="card text-center py-20">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-700 mb-2">No saved creators yet</h3>
            <p className="text-gray-500 mb-4">Start browsing and save creators you like</p>
            <Link
              to="/browse/creators"
              className="inline-block px-6 py-3 bg-primary hover:bg-primary-dark text-white font-medium rounded-lg transition-colors"
            >
              Browse Creators
            </Link>
          </div>
        ) : (
          /* Creators Grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {creators.map((creator) => (
              <div
                key={creator.id}
                className="bg-primary p-4 rounded-3xl shadow-sm hover:shadow-md transition-shadow relative"
              >
                {/* Unsave Heart Icon - Top Right */}
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    handleUnsaveCreator(creator.id);
                  }}
                  className="absolute top-6 right-6 z-10 w-10 h-10 flex items-center justify-center bg-white/90 hover:bg-white rounded-full shadow-md transition-all hover:scale-110"
                  title="Remove from saved"
                >
                  <svg className="w-6 h-6 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                  </svg>
                </button>

                {/* White Inner Container */}
                <div className="bg-white rounded-2xl overflow-hidden mb-4">
                  {/* Image */}
                  <div className="aspect-square overflow-hidden bg-gray-100 relative">
                    {creator.profile_picture ? (
                      <img
                        src={`${BASE_URL}${creator.profile_picture}`}
                        alt={creator.display_name || creator.username || creator.user?.email?.split('@')[0] || 'Creator'}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-gray-400 text-sm">No image</span>
                      </div>
                    )}
                    {/* Badge Overlays on Image */}
                    {creator.badges && creator.badges.length > 0 && (
                      <div className="absolute top-2 left-2 flex flex-wrap gap-1.5">
                        {creator.badges
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

                {/* Name and Followers - On Primary Background */}
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-semibold text-gray-900">
                      {creator.display_name || creator.username || creator.user?.email?.split('@')[0] || 'Creator'}
                    </h3>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold text-gray-900">
                      {creator.follower_count >= 1000000
                        ? `${(creator.follower_count / 1000000).toFixed(0)}m`
                        : creator.follower_count >= 1000
                        ? `${(creator.follower_count / 1000).toFixed(0)}k`
                        : creator.follower_count || 0}
                    </span>
                    <p className="text-xs text-gray-700">Followers</p>
                  </div>
                </div>

                {/* Location */}
                {(creator.city || creator.country || creator.location) && (
                  <div className="flex items-center gap-1 mb-3 text-gray-600 text-xs">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>
                      {creator.city && creator.country
                        ? `${creator.city}, ${creator.country}`
                        : creator.location || creator.city || creator.country}
                    </span>
                  </div>
                )}

                {/* Platform Icons and Category - On Primary Background */}
                <div className="flex justify-between items-center mb-4">
                  {/* Platform Icons */}
                  <div className="flex gap-2">
                    {creator.platforms && creator.platforms.length > 0 ? (
                      creator.platforms.slice(0, 3).map((platform) => {
                        // Platform-specific icons and colors
                        const platformConfig = {
                          Instagram: {
                            icon: <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>,
                            color: 'text-pink-600'
                          },
                          TikTok: {
                            icon: <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>,
                            color: 'text-gray-900'
                          },
                          YouTube: {
                            icon: <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>,
                            color: 'text-red-600'
                          },
                          Facebook: {
                            icon: <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>,
                            color: 'text-blue-600'
                          },
                          Twitter: {
                            icon: <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>,
                            color: 'text-blue-400'
                          },
                          LinkedIn: {
                            icon: <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>,
                            color: 'text-blue-700'
                          }
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
                    {creator.categories?.[0] || 'Model'}
                  </span>
                </div>

                {/* View Profile Button - White on Primary Background */}
                <Link
                  to={`/creators/${creator.id}`}
                  className="block w-full bg-white text-dark text-center py-3 rounded-full font-medium hover:bg-gray-100 transition-colors"
                >
                  View profile
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SavedCreators;
