import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import CreatorBadge from '../components/CreatorBadge';
import { creatorsAPI, BASE_URL } from '../services/api';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import SEO from '../components/SEO';

const Home = () => {
  const navigate = useNavigate();
  const [featuredCreators, setFeaturedCreators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('search');
  const [filters, setFilters] = useState({
    platform: '',
    category: ''
  });

  useEffect(() => {
    fetchFeaturedCreators();
  }, []);

  const fetchFeaturedCreators = async () => {
    try {
      setLoading(true);
      const response = await creatorsAPI.getCreators({ per_page: 12 });
      const creators = response.data.creators || [];
      setFeaturedCreators(creators);
    } catch (error) {
      console.error('Error fetching featured creators:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (filters.category) params.append('category', filters.category);
    if (filters.platform) params.append('platform', filters.platform);
    navigate(`/browse/creators?${params.toString()}`);
  };

  const formatFollowers = (count) => {
    if (!count) return '0';
    if (count >= 1000000) return `${(count / 1000000).toFixed(0)}m`;
    if (count >= 1000) return `${(count / 1000).toFixed(0)}k`;
    return count;
  };

  // Creator Card Component
  const CreatorCard = ({ creator, bgColor = 'white' }) => (
    <div className={`bg-${bgColor} rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-shadow flex-shrink-0`}>
      {/* Image */}
      <div className="aspect-square m-4 rounded-2xl overflow-hidden bg-gray-100 relative">
        {creator.profile_picture ? (
          <img
            src={`${BASE_URL}${creator.profile_picture}`}
            alt={creator.display_name || creator.username || 'Creator profile'}
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
            {creator.badges.map((badge, idx) => (
              <CreatorBadge key={idx} badge={badge} size="md" variant="overlay" />
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="px-4 pb-4">
        {/* Name and Followers */}
        <div className="flex justify-between items-start mb-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1">
              <h3 className="font-semibold text-gray-900 truncate">
                {creator.display_name || creator.username || 'Creator'}
              </h3>
            </div>
          </div>
          <div className="text-right ml-2">
            <span className="text-lg font-bold text-gray-900">{formatFollowers(creator.follower_count)}</span>
            <p className={`text-xs ${bgColor === 'primary' ? 'text-gray-700' : 'text-gray-500'}`}>Followers</p>
          </div>
        </div>

        {/* Location */}
        {(creator.city || creator.country || creator.location) && (
          <div className={`flex items-center gap-1 mb-3 text-xs ${bgColor === 'primary' ? 'text-gray-700' : 'text-gray-600'}`}>
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

        {/* Platform Icons and Category */}
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
                    className={`w-4 h-4 ${config.color}`}
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    title={platform}
                  >
                    {config.icon}
                  </svg>
                );
              })
            ) : (
              <svg className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
            )}
          </div>
          <span className={`text-xs px-3 py-1 border ${bgColor === 'primary' ? 'border-gray-700' : 'border-gray-300'} rounded-full text-gray-900`}>
            {creator.categories?.[0] || 'Lifestyle'}
          </span>
        </div>

        {/* View Profile Button */}
        <Link
          to={`/creators/${creator.id}`}
          className={`block w-full ${
            bgColor === 'primary'
              ? 'bg-white text-dark hover:bg-gray-100'
              : 'bg-dark text-white hover:bg-gray-800'
          } text-center py-3 rounded-full font-medium transition-colors`}
        >
          View profile
        </Link>
      </div>
    </div>
  );

  // Platform Section Component
  const PlatformSection = ({ title, subtitle, linkTo, bgColor = 'white', creators }) => (
    <section className="py-12 px-6 lg:px-12 xl:px-20">
      <div className="w-full">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h2 className="text-3xl font-bold mb-1">{title}</h2>
            <p className="text-gray-600">{subtitle}</p>
          </div>
          <Link to={linkTo} className="text-gray-900 font-medium hover:underline">
            See All
          </Link>
        </div>

        {/* Desktop: Grid */}
        <div className="hidden lg:grid grid-cols-4 gap-6">
          {creators.slice(0, 4).map((creator, idx) => (
            <CreatorCard key={`${title}-${creator.id}-${idx}`} creator={creator} bgColor={bgColor} />
          ))}
        </div>

        {/* Mobile/Tablet: Horizontal Scroll */}
        <div className="lg:hidden overflow-x-auto scrollbar-hide -mx-6 px-6">
          <div className="flex gap-4 pb-2">
            {creators.slice(0, 8).map((creator, idx) => (
              <div key={`${title}-mobile-${creator.id}-${idx}`} className="w-[280px] flex-shrink-0">
                <CreatorCard creator={creator} bgColor={bgColor} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );

  return (
    <div className="min-h-screen flex flex-col bg-light">
      <SEO
        title="Home"
        description="Connect with top African creators and brands. BantuBuzz is Africa's premier platform for influencer marketing and brand collaborations."
        keywords="home, African influencers, brand partnerships, creator marketplace"
      />
      <Navbar />

      {/* Hero Section */}
      <section className="pt-20 pb-16 px-6 lg:px-12 xl:px-20">
        <div className="w-full max-w-6xl mx-auto text-center">
          {/* Hero Heading */}
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-12 leading-tight">
            Find Influencers to
            <br />
            <span className="text-primary italic">Collaborate</span> With
          </h1>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="max-w-4xl mx-auto">
            {/* Desktop: Horizontal Layout */}
            <div className="hidden md:block">
              <div className="bg-white rounded-full shadow-lg flex items-center p-2 pl-8">
                <div className="flex-1 flex items-center border-r border-gray-200 pr-4">
                  <div className="w-full">
                    <label className="block text-left text-sm font-semibold text-gray-900">Platform</label>
                    <select
                      value={filters.platform}
                      onChange={(e) => setFilters(prev => ({ ...prev, platform: e.target.value }))}
                      className="w-full text-gray-700 text-sm bg-transparent border-none focus:outline-none cursor-pointer"
                    >
                      <option value="">Choose a platform</option>
                      <option value="Facebook">Facebook</option>
                      <option value="TikTok">TikTok</option>
                      <option value="Instagram">Instagram</option>
                      <option value="YouTube">YouTube</option>
                      <option value="Twitter">Twitter</option>
                      <option value="LinkedIn">LinkedIn</option>
                      <option value="Threads">Threads</option>
                      <option value="Twitch">Twitch</option>
                      <option value="UGC">UGC</option>
                    </select>
                  </div>
                </div>
                <div className="flex-1 flex items-center pl-4">
                  <div className="w-full">
                    <label className="block text-left text-sm font-semibold text-gray-900">Category</label>
                    <input
                      type="text"
                      value={filters.category}
                      onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                      placeholder="Enter keywords, niches or categories"
                      className="w-full text-gray-700 text-sm bg-transparent border-none focus:outline-none placeholder-gray-500"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="bg-primary hover:bg-primary/90 text-dark p-4 rounded-full transition-colors ml-2"
                >
                  <MagnifyingGlassIcon className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Mobile: Vertical Stacked Layout */}
            <div className="md:hidden space-y-3">
              <div className="bg-white rounded-2xl shadow-lg p-4">
                <label className="block text-left text-sm font-semibold text-gray-900 mb-2">Platform</label>
                <select
                  value={filters.platform}
                  onChange={(e) => setFilters(prev => ({ ...prev, platform: e.target.value }))}
                  className="w-full text-gray-700 text-sm bg-transparent border-none focus:outline-none cursor-pointer py-2"
                >
                  <option value="">Choose a platform</option>
                  <option value="Facebook">Facebook</option>
                  <option value="TikTok">TikTok</option>
                  <option value="Instagram">Instagram</option>
                  <option value="YouTube">YouTube</option>
                  <option value="Twitter">Twitter</option>
                  <option value="LinkedIn">LinkedIn</option>
                  <option value="Threads">Threads</option>
                  <option value="Twitch">Twitch</option>
                  <option value="UGC">UGC</option>
                </select>
              </div>

              <div className="bg-white rounded-2xl shadow-lg p-4">
                <label className="block text-left text-sm font-semibold text-gray-900 mb-2">Category</label>
                <input
                  type="text"
                  value={filters.category}
                  onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                  placeholder="Enter keywords, niches or categories"
                  className="w-full text-gray-700 text-sm bg-transparent border-none focus:outline-none placeholder-gray-500 py-2"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-dark text-white py-4 rounded-2xl font-semibold hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
              >
                <MagnifyingGlassIcon className="w-5 h-5" />
                <span>Search</span>
              </button>
            </div>
          </form>
        </div>
      </section>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : (
        <>
          {/* Featured Section */}
          <PlatformSection
            title="Featured"
            subtitle="Hire Top Influencers across all Platforms"
            linkTo="/browse/creators"
            bgColor="white"
            creators={featuredCreators}
          />

          {/* Facebook Section */}
          <PlatformSection
            title="Facebook"
            subtitle="Hire Facebook influencers"
            linkTo="/browse/creators?platform=Facebook"
            bgColor="primary"
            creators={featuredCreators}
          />

          {/* Instagram Section */}
          <PlatformSection
            title="Instagram"
            subtitle="Hire Instagram influencers"
            linkTo="/browse/creators?platform=Instagram"
            bgColor="primary"
            creators={featuredCreators}
          />

          {/* TikTok Section */}
          <PlatformSection
            title="TikTok"
            subtitle="Hire TikTok influencers"
            linkTo="/browse/creators?platform=TikTok"
            bgColor="white"
            creators={featuredCreators}
          />
        </>
      )}

      {/* Categories Section */}
      <section className="py-12 px-6 lg:px-12 xl:px-20">
        <div className="w-full">
          <h2 className="text-3xl font-bold mb-8">Categories</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { name: 'Fashion', color: 'from-gray-300 to-gray-100' },
              { name: 'Lifestyle', color: 'from-amber-200 to-amber-100' },
              { name: 'Model', color: 'from-amber-300 to-amber-200' },
              { name: 'Travel', color: 'from-gray-200 to-gray-100' }
            ].map((category) => (
              <Link
                key={category.name}
                to={`/browse/creators?category=${category.name}`}
                className="relative aspect-[4/3] rounded-2xl overflow-hidden group bg-gradient-to-b hover:shadow-lg transition-shadow"
              >
                <div className={`absolute inset-0 bg-gradient-to-b ${category.color}`}></div>
                <div className="absolute bottom-4 left-4">
                  <span className="text-white font-semibold text-lg drop-shadow-lg">{category.name}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* How BantuBuzz Works Section */}
      <section className="py-16 px-6 lg:px-12 xl:px-20">
        <div className="w-full max-w-4xl">
          <h2 className="text-3xl font-bold mb-12">HOW BANTUBUZZ WORKS?</h2>

          {/* Tabs */}
          <div className="flex gap-4 mb-8">
            <button
              onClick={() => setActiveTab('search')}
              className={`px-6 py-3 rounded-full font-medium transition-colors ${
                activeTab === 'search'
                  ? 'bg-primary text-dark'
                  : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
              }`}
            >
              Search
            </button>
            <button
              onClick={() => setActiveTab('campaigns')}
              className={`px-6 py-3 rounded-full font-medium transition-colors ${
                activeTab === 'campaigns'
                  ? 'bg-primary text-dark'
                  : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
              }`}
            >
              Campaigns
            </button>
            <button
              onClick={() => setActiveTab('track')}
              className={`px-6 py-3 rounded-full font-medium transition-colors ${
                activeTab === 'track'
                  ? 'bg-primary text-dark'
                  : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
              }`}
            >
              Track
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'search' && (
            <div>
              <h3 className="text-2xl font-bold mb-6">
                Find and Hire Influencers in Seconds on the Marketplace
              </h3>

              <div className="space-y-6">
                <div>
                  <h4 className="font-bold text-lg leading-snug mb-2">Search Influencers</h4>
                  <p className="text-gray-700 leading-relaxed">
                    Search thousands of vetted Instagram, TikTok, and YouTube influencers.
                  </p>
                </div>

                <div>
                  <h4 className="font-bold text-lg leading-snug mb-2">Purchase & Chat Securely</h4>
                  <p className="text-gray-700 leading-relaxed">
                    Safely purchase and communicate through Bantubuzz. We hold your payment until the work is completed.
                  </p>
                </div>

                <div>
                  <h4 className="font-bold text-lg leading-snug mb-2">Receive Quality Content</h4>
                  <p className="text-gray-700 leading-relaxed">
                    Receive your high-quality content from influencers directly through the platform.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'campaigns' && (
            <div>
              <h3 className="text-2xl font-bold mb-6">
                Post Campaigns and Have 170,000+ Influencers Come to You
              </h3>

              <div className="space-y-6">
                <div>
                  <h4 className="font-bold text-lg mb-2">Set Targeting</h4>
                  <p className="text-gray-700">
                    Specify demographics including niche, location and following size of the influencers you want to target.
                  </p>
                </div>

                <div>
                  <h4 className="font-bold text-lg mb-2">Post Campaign</h4>
                  <p className="text-gray-700">
                    Centralize your images, requirements, and more in a campaign brief sent to 170,000 influencers.
                  </p>
                </div>

                <div>
                  <h4 className="font-bold text-lg mb-2">Influencers Apply</h4>
                  <p className="text-gray-700">
                    Targeted influencers submit their pricing, and you choose who to collaborate with.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'track' && (
            <div>
              <h3 className="text-2xl font-bold mb-6">
                Track Post Analytics and Performance in Real Time
              </h3>

              <div className="space-y-6">
                <div>
                  <h4 className="font-bold text-lg mb-2">One-Click Tracking</h4>
                  <p className="text-gray-700">
                    Track Instagram, TikTok, and YouTube content in real time from a single dashboard. Say goodbye to manual tracking and messy spreadsheets.
                  </p>
                </div>

                <div>
                  <h4 className="font-bold text-lg mb-2">Advanced Analytics & Reporting</h4>
                  <p className="text-gray-700">
                    Analyze content performance over time, including impressions, engagement and more. Organize performance by campaign and effortlessly build reports.
                  </p>
                </div>

                <div>
                  <h4 className="font-bold text-lg mb-2">Fully Automated</h4>
                  <p className="text-gray-700">
                    Metrics are updated every 24 hours, ensuring performance data is always up-to-date.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Join CTA Sections */}
      <section className="py-16 px-6 lg:px-12 xl:px-20">
        <div className="grid md:grid-cols-2 gap-8">
          {/* Join as Brand */}
          <div className="bg-dark p-12 rounded-3xl">
            <h3 className="text-3xl font-bold mb-4 text-white">Join as a Brand</h3>
            <p className="text-gray-300 mb-8">
              Find and collaborate with the perfect influencers for your brand campaigns.
            </p>
            <Link
              to="/register/brand"
              className="inline-block bg-primary text-dark px-8 py-3 rounded-full font-semibold hover:bg-primary/90 transition-colors"
            >
              Get Started
            </Link>
          </div>

          {/* Join as Creator */}
          <div className="bg-primary text-dark p-12 rounded-3xl">
            <h3 className="text-3xl font-bold mb-4">Join as a Creator</h3>
            <p className="text-gray-700 mb-8">
              Showcase your talent, connect with brands, and grow your influence.
            </p>
            <Link
              to="/register/creator"
              className="inline-block bg-dark text-white px-8 py-3 rounded-full font-semibold hover:bg-gray-800 transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Home;
