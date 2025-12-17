import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import ResponsiveImage from '../components/ResponsiveImage';
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
      const response = await creatorsAPI.getCreators({ per_page: 8 });
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
    navigate(`/creators?${params.toString()}`);
  };

  const formatFollowers = (count) => {
    if (!count) return '0';
    if (count >= 1000000) return `${(count / 1000000).toFixed(0)}m`;
    if (count >= 1000) return `${(count / 1000).toFixed(0)}k`;
    return count;
  };

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
            <div className="bg-white rounded-full shadow-lg flex items-center p-2 pl-8">
              <div className="flex-1 flex items-center border-r border-gray-200 pr-4">
                <div className="w-full">
                  <label className="block text-left text-sm font-semibold text-gray-900">Platform</label>
                  <select
                    value={filters.platform}
                    onChange={(e) => setFilters(prev => ({ ...prev, platform: e.target.value }))}
                    className="w-full text-primary text-sm bg-transparent border-none focus:outline-none cursor-pointer"
                  >
                    <option value="">Choose a platform</option>
                    <option value="Instagram">Instagram</option>
                    <option value="TikTok">TikTok</option>
                    <option value="YouTube">YouTube</option>
                    <option value="Twitter">Twitter</option>
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
                    className="w-full text-primary text-sm bg-transparent border-none focus:outline-none placeholder-primary"
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
          </form>
        </div>
      </section>

      {/* Featured Section */}
      <section className="py-12 px-6 lg:px-12 xl:px-20">
        <div className="w-full">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h2 className="text-3xl font-bold mb-1">Featured</h2>
              <p className="text-primary">Hire Top Influencers across all Platforms</p>
            </div>
            <Link to="/creators" className="text-gray-900 font-medium hover:underline">
              See All
            </Link>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {featuredCreators.slice(0, 4).map((creator) => (
                  <div
                    key={creator.id}
                    className="bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                  >
                    {/* Image */}
                    <div className="aspect-square m-4 rounded-2xl overflow-hidden bg-gray-100">
                      <ResponsiveImage
                        sizes={creator.profile_picture_sizes || creator.profile_picture}
                        alt={creator.user?.email || 'Creator profile'}
                        className="w-full h-full"
                        objectFit="cover"
                        showLoading={true}
                      />
                    </div>

                    {/* Content */}
                    <div className="px-4 pb-4">
                      {/* Name and Followers */}
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="font-semibold text-gray-900">
                          {creator.user?.email?.split('@')[0] || 'Creator'}
                        </h3>
                        <div className="text-right">
                          <span className="text-lg font-bold">{formatFollowers(creator.follower_count)}</span>
                          <p className="text-xs text-gray-500">Followers</p>
                        </div>
                      </div>

                      {/* Social Icons and Category */}
                      <div className="flex justify-between items-center mb-4">
                        <div className="flex gap-2">
                          {/* Instagram */}
                          <svg className="w-4 h-4 text-gray-600" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                          </svg>
                          {/* TikTok */}
                          <svg className="w-4 h-4 text-gray-600" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                          </svg>
                          {/* YouTube */}
                          <svg className="w-4 h-4 text-gray-600" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                          </svg>
                        </div>
                        <span className="text-xs px-3 py-1 border border-gray-300 rounded-full">
                          {creator.categories?.[0] || 'Lifestyle'}
                        </span>
                      </div>

                      {/* Send Message Button */}
                      <Link
                        to={`/creators/${creator.id}`}
                        className="block w-full bg-dark text-white text-center py-3 rounded-full font-medium hover:bg-gray-800 transition-colors"
                      >
                        Send message
                      </Link>
                    </div>
                  </div>
                ))}
              </div>

              {/* Navigation Arrows */}
              <div className="flex justify-center mt-8 gap-1">
                <button className="p-3 bg-dark text-white rounded-l-lg hover:bg-gray-800 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button className="p-3 bg-dark text-white rounded-r-lg hover:bg-gray-800 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </>
          )}
        </div>
      </section>

      {/* Instagram Section */}
      <section className="py-12 px-6 lg:px-12 xl:px-20">
        <div className="w-full">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h2 className="text-3xl font-bold mb-1">Instagram</h2>
              <p className="text-primary">Hire Instagram influencers</p>
            </div>
            <Link to="/creators?platform=Instagram" className="text-gray-900 font-medium hover:underline">
              See All
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredCreators.slice(0, 4).map((creator) => (
              <div
                key={`ig-${creator.id}`}
                className="bg-primary rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
              >
                {/* Image */}
                <div className="aspect-square m-4 rounded-2xl overflow-hidden bg-white/20">
                  <ResponsiveImage
                    sizes={creator.profile_picture_sizes || creator.profile_picture}
                    alt={creator.user?.email || 'Creator profile'}
                    className="w-full h-full"
                    objectFit="cover"
                    showLoading={true}
                  />
                </div>

                {/* Content */}
                <div className="px-4 pb-4">
                  {/* Name and Followers */}
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-semibold text-gray-900">
                      {creator.user?.email?.split('@')[0] || 'Creator'}
                    </h3>
                    <div className="text-right">
                      <span className="text-lg font-bold">{formatFollowers(creator.follower_count)}</span>
                      <p className="text-xs text-gray-700">Followers</p>
                    </div>
                  </div>

                  {/* Social Icon and Category */}
                  <div className="flex justify-between items-center mb-4">
                    <svg className="w-4 h-4 text-gray-700" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                    </svg>
                    <span className="text-xs px-3 py-1 border border-gray-700 rounded-full text-gray-900">
                      {creator.categories?.[0] || 'Model'}
                    </span>
                  </div>

                  {/* Send Message Button */}
                  <Link
                    to={`/creators/${creator.id}`}
                    className="block w-full bg-white text-dark text-center py-3 rounded-full font-medium hover:bg-gray-100 transition-colors"
                  >
                    Send message
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TikTok Section */}
      <section className="py-12 px-6 lg:px-12 xl:px-20">
        <div className="w-full">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h2 className="text-3xl font-bold mb-1">Tiktok</h2>
              <p className="text-primary">Hire Titok influencers</p>
            </div>
            <Link to="/creators?platform=TikTok" className="text-gray-900 font-medium hover:underline">
              See All
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredCreators.slice(0, 4).map((creator) => (
              <div
                key={`tt-${creator.id}`}
                className="bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
              >
                {/* Image */}
                <div className="aspect-square m-4 rounded-2xl overflow-hidden bg-gray-100">
                  <ResponsiveImage
                    sizes={creator.profile_picture_sizes || creator.profile_picture}
                    alt={creator.user?.email || 'Creator profile'}
                    className="w-full h-full"
                    objectFit="cover"
                    showLoading={true}
                  />
                </div>

                {/* Content */}
                <div className="px-4 pb-4">
                  {/* Name and Followers */}
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-semibold text-gray-900">
                      {creator.user?.email?.split('@')[0] || 'Creator'}
                    </h3>
                    <div className="text-right">
                      <span className="text-lg font-bold">{formatFollowers(creator.follower_count)}</span>
                      <p className="text-xs text-gray-500">Followers</p>
                    </div>
                  </div>

                  {/* Social Icon and Category */}
                  <div className="flex justify-between items-center mb-4">
                    <svg className="w-4 h-4 text-gray-600" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                    </svg>
                    <span className="text-xs px-3 py-1 border border-gray-300 rounded-full">
                      {creator.categories?.[0] || 'Travel'}
                    </span>
                  </div>

                  {/* Send Message Button */}
                  <Link
                    to={`/creators/${creator.id}`}
                    className="block w-full bg-primary text-dark text-center py-3 rounded-full font-medium hover:bg-primary/90 transition-colors"
                  >
                    Send message
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

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
                to={`/creators?category=${category.name}`}
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
                  <p className="text-primary leading-relaxed">
                    Search thousands of vetted Instagram, TikTok, and YouTube influencers.
                  </p>
                </div>

                <div>
                  <h4 className="font-bold text-lg leading-snug mb-2">Purchase & Chat Securely</h4>
                  <p className="text-primary leading-relaxed">
                    Safely purchase and communicate through Bantubuzz. We hold your payment until the work is completed.
                  </p>
                </div>

                <div>
                  <h4 className="font-bold text-lg leading-snug mb-2">Receive Quality Content</h4>
                  <p className="text-primary leading-relaxed">
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
                  <p className="text-primary">
                    Specify demographics including niche, location and following size of the influencers you want to target.
                  </p>
                </div>

                <div>
                  <h4 className="font-bold text-lg mb-2">Post Campaign</h4>
                  <p className="text-primary">
                    Centralize your images, requirements, and more in a campaign brief sent to 170,000 influencers.
                  </p>
                </div>

                <div>
                  <h4 className="font-bold text-lg mb-2">Influencers Apply</h4>
                  <p className="text-primary">
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
                  <p className="text-primary">
                    Track Instagram, TikTok, and YouTube content in real time from a single dashboard. Say goodbye to manual tracking and messy spreadsheets.
                  </p>
                </div>

                <div>
                  <h4 className="font-bold text-lg mb-2">Advanced Analytics & Reporting</h4>
                  <p className="text-primary">
                    Analyze content performance over time, including impressions, engagement and more. Organize performance by campaign and effortlessly build reports.
                  </p>
                </div>

                <div>
                  <h4 className="font-bold text-lg mb-2">Fully Automated</h4>
                  <p className="text-primary">
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
