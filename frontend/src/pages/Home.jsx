import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Avatar from '../components/Avatar';
import { creatorsAPI } from '../services/api';
import {
  SparklesIcon,
  UserGroupIcon,
  CurrencyDollarIcon,
  ShieldCheckIcon,
  ChartBarIcon,
  ChatBubbleLeftRightIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline';

const Home = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [featuredCreators, setFeaturedCreators] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [filters, setFilters] = useState({
    category: '',
    location: '',
    min_followers: '',
    max_price: '',
  });

  // Fetch featured creators on mount
  useEffect(() => {
    fetchFeaturedCreators();
  }, []);

  const fetchFeaturedCreators = async () => {
    try {
      setLoading(true);
      const response = await creatorsAPI.getCreators({ per_page: 20 });
      const creators = response.data.creators || [];

      // Sort by highest rating first, then by review count
      const sortedCreators = creators
        .sort((a, b) => {
          const ratingA = a.review_stats?.average_rating || 0;
          const ratingB = b.review_stats?.average_rating || 0;
          const reviewsA = a.review_stats?.total_reviews || 0;
          const reviewsB = b.review_stats?.total_reviews || 0;

          if (ratingB !== ratingA) {
            return ratingB - ratingA;
          }
          return reviewsB - reviewsA;
        })
        .slice(0, 6);

      setFeaturedCreators(sortedCreators);
    } catch (error) {
      console.error('Error fetching featured creators:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();

    // Build query params
    const params = new URLSearchParams();
    if (searchQuery) params.append('search', searchQuery);
    if (filters.category) params.append('category', filters.category);
    if (filters.location) params.append('location', filters.location);
    if (filters.min_followers) params.append('min_followers', filters.min_followers);
    if (filters.max_price) params.append('max_price', filters.max_price);

    // Navigate to browse page with filters
    navigate(`/creators?${params.toString()}`);
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      category: '',
      location: '',
      min_followers: '',
      max_price: '',
    });
    setSearchQuery('');
  };

  const formatFollowers = (count) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count;
  };
  const features = [
    {
      icon: UserGroupIcon,
      title: 'Verified Creators',
      description: 'Access to thousands of vetted African creators across all niches and platforms.',
    },
    {
      icon: CurrencyDollarIcon,
      title: 'Direct Payments',
      description: 'Secure payments via Paynow with instant processing. No middleman fees.',
    },
    {
      icon: ChatBubbleLeftRightIcon,
      title: 'Real-time Messaging',
      description: 'Communicate directly with creators and brands through our built-in chat.',
    },
    {
      icon: ChartBarIcon,
      title: 'Analytics Dashboard',
      description: 'Track your earnings, bookings, and campaign performance in real-time.',
    },
    {
      icon: ShieldCheckIcon,
      title: 'Secure Platform',
      description: 'Your data and transactions are protected with industry-standard security.',
    },
    {
      icon: SparklesIcon,
      title: 'Easy Discovery',
      description: 'Smart filters and search to find the perfect match for your campaigns.',
    },
  ];

  const stats = [
    { value: '1000+', label: 'Active Creators' },
    { value: '500+', label: 'Brands' },
    { value: '$2M+', label: 'Paid to Creators' },
    { value: '10K+', label: 'Successful Campaigns' },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      {/* Hero Section with Featured Creators */}
      <section className="bg-gradient-to-br from-primary/10 via-white to-primary/5 section-padding">
        <div className="container-custom">
          <div className="max-w-4xl mx-auto text-center mb-12">
            <h1 className="text-5xl md:text-6xl font-black text-dark mb-6 leading-tight">
              Connect African Creators
              <br />
              with <span className="text-primary">Global Brands</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              The premier platform for authentic creator-brand collaborations across Africa.
              Discover talent, launch campaigns, and grow your influence.
            </p>

            {/* Search Bar */}
            <form onSubmit={handleSearch} className="max-w-3xl mx-auto mb-8">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                  <MagnifyingGlassIcon className="h-6 w-6 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search for creators by name, category, or location..."
                  className="w-full pl-12 pr-32 py-4 text-lg border-2 border-gray-200 rounded-full focus:border-primary focus:outline-none"
                />
                <button
                  type="submit"
                  className="absolute right-2 top-1/2 -translate-y-1/2 btn btn-primary px-6 py-2"
                >
                  Search
                </button>
              </div>

              {/* Filters Toggle */}
              <div className="mt-4 flex items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-2 text-gray-600 hover:text-primary transition-colors"
                >
                  <FunnelIcon className="h-5 w-5" />
                  {showFilters ? 'Hide Filters' : 'Show Filters'}
                </button>
                {(filters.category || filters.location || filters.min_followers || filters.max_price) && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="text-sm text-primary hover:text-primary-dark"
                  >
                    Clear Filters
                  </button>
                )}
              </div>

              {/* Filters Panel */}
              {showFilters && (
                <div className="mt-6 p-6 bg-white rounded-2xl shadow-lg border border-gray-100">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Category
                      </label>
                      <select
                        value={filters.category}
                        onChange={(e) => handleFilterChange('category', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      >
                        <option value="">All Categories</option>
                        <option value="Fashion & Beauty">Fashion & Beauty</option>
                        <option value="Technology">Technology</option>
                        <option value="Food & Beverage">Food & Beverage</option>
                        <option value="Travel">Travel</option>
                        <option value="Fitness">Fitness</option>
                        <option value="Gaming">Gaming</option>
                        <option value="Entertainment">Entertainment</option>
                        <option value="Education">Education</option>
                        <option value="Business">Business</option>
                        <option value="Lifestyle">Lifestyle</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Location
                      </label>
                      <input
                        type="text"
                        value={filters.location}
                        onChange={(e) => handleFilterChange('location', e.target.value)}
                        placeholder="e.g., Zimbabwe, Kenya..."
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Min Followers
                      </label>
                      <select
                        value={filters.min_followers}
                        onChange={(e) => handleFilterChange('min_followers', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      >
                        <option value="">Any</option>
                        <option value="1000">1K+</option>
                        <option value="5000">5K+</option>
                        <option value="10000">10K+</option>
                        <option value="50000">50K+</option>
                        <option value="100000">100K+</option>
                        <option value="500000">500K+</option>
                        <option value="1000000">1M+</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Max Price (USD)
                      </label>
                      <input
                        type="number"
                        value={filters.max_price}
                        onChange={(e) => handleFilterChange('max_price', e.target.value)}
                        placeholder="e.g., 500"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>
              )}
            </form>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Link to="/register/creator" className="btn btn-primary text-lg px-8 py-4">
                Join as Creator
              </Link>
              <Link to="/register/brand" className="btn btn-outline text-lg px-8 py-4">
                Join as Brand
              </Link>
            </div>
          </div>

          {/* Featured Creators Section */}
          <div className="mt-16">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-dark mb-2">Featured</h2>
              <p className="text-sm text-gray-600">
                Hire top influencers across all platforms
              </p>
            </div>

            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
            ) : featuredCreators.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {featuredCreators.map((creator, index) => (
                  <Link
                    key={creator.id}
                    to={`/creators/${creator.id}`}
                    className="group relative rounded-2xl overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1"
                  >
                    {/* Profile Picture as Background */}
                    <div className="relative h-80">
                      {creator.profile_picture ? (
                        <img
                          src={`http://localhost:5000${creator.profile_picture}`}
                          alt={creator.user?.email}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-primary/30 via-primary/20 to-purple-500/30 flex items-center justify-center">
                          <svg className="w-24 h-24 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                      )}

                      {/* Gradient Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>

                      {/* Top Badges */}
                      <div className="absolute top-3 left-3 right-3 flex items-start justify-between z-10">
                        {/* Top Creator Badge */}
                        {index === 0 && creator.review_stats?.average_rating > 0 && (
                          <div className="bg-yellow-400 text-dark px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-lg">
                            <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24">
                              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                            </svg>
                            Top Creator
                          </div>
                        )}

                        {/* Rating Badge */}
                        {creator.review_stats?.average_rating > 0 && (
                          <div className="bg-white/90 backdrop-blur-sm text-dark px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-lg ml-auto">
                            <svg className="w-3 h-3 text-yellow-400 fill-current" viewBox="0 0 24 24">
                              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                            </svg>
                            {creator.review_stats.average_rating}
                          </div>
                        )}
                      </div>

                      {/* Bottom Info Overlay */}
                      <div className="absolute bottom-0 left-0 right-0 p-4 text-white z-10">
                        {/* Creator Name */}
                        <h3 className="font-bold text-lg mb-1 group-hover:text-primary transition-colors">
                          {creator.user?.email?.split('@')[0] || 'Creator'}
                        </h3>

                        {/* Bio or Category */}
                        {creator.bio ? (
                          <p className="text-sm text-white/90 mb-2 line-clamp-1">
                            {creator.bio}
                          </p>
                        ) : creator.categories && creator.categories.length > 0 && (
                          <p className="text-sm text-white/90 mb-2">
                            {creator.categories[0]}
                          </p>
                        )}

                        {/* Location and Followers */}
                        <div className="flex items-center justify-between text-xs text-white/80">
                          {creator.location && (
                            <div className="flex items-center gap-1">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              <span>{creator.location}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            <span>{formatFollowers(creator.follower_count)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              <div className="text-center">
                <Link
                  to="/creators"
                  className="btn btn-outline text-lg px-8 py-3 inline-flex items-center gap-2"
                >
                  View All Creators
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </Link>
              </div>
            </>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg">No creators available at the moment.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-dark text-white py-16">
        <div className="container-custom">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-4xl md:text-5xl font-black text-primary mb-2">
                  {stat.value}
                </div>
                <div className="text-gray-400">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="section-padding bg-light">
        <div className="container-custom">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-dark mb-4">Why Choose BantuBuzz?</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Everything you need for successful creator-brand collaborations in one platform.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="card">
                <div className="bg-primary/10 w-14 h-14 rounded-lg flex items-center justify-center mb-4">
                  <feature.icon className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-dark mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works - For Creators */}
      <section className="section-padding">
        <div className="container-custom">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-dark mb-4">How It Works for Creators</h2>
            <p className="text-xl text-gray-600">Start earning from your influence in 3 simple steps</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-primary text-dark w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                1
              </div>
              <h3 className="text-xl font-bold text-dark mb-2">Create Your Profile</h3>
              <p className="text-gray-600">
                Showcase your work, audience, and create service packages for brands.
              </p>
            </div>

            <div className="text-center">
              <div className="bg-primary text-dark w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                2
              </div>
              <h3 className="text-xl font-bold text-dark mb-2">Get Discovered</h3>
              <p className="text-gray-600">
                Brands find you through search and send collaboration requests.
              </p>
            </div>

            <div className="text-center">
              <div className="bg-primary text-dark w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                3
              </div>
              <h3 className="text-xl font-bold text-dark mb-2">Collaborate & Earn</h3>
              <p className="text-gray-600">
                Work with brands, deliver content, and get paid directly via Paynow.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works - For Brands */}
      <section className="section-padding bg-light">
        <div className="container-custom">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-dark mb-4">How It Works for Brands</h2>
            <p className="text-xl text-gray-600">Launch successful campaigns in minutes</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-dark text-primary w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                1
              </div>
              <h3 className="text-xl font-bold text-dark mb-2">Find Creators</h3>
              <p className="text-gray-600">
                Browse thousands of African creators or post your campaign requirements.
              </p>
            </div>

            <div className="text-center">
              <div className="bg-dark text-primary w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                2
              </div>
              <h3 className="text-xl font-bold text-dark mb-2">Book & Pay</h3>
              <p className="text-gray-600">
                Select a package, make secure payment via Paynow, and start collaborating.
              </p>
            </div>

            <div className="text-center">
              <div className="bg-dark text-primary w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                3
              </div>
              <h3 className="text-xl font-bold text-dark mb-2">Track Results</h3>
              <p className="text-gray-600">
                Monitor campaign progress and measure ROI through your dashboard.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-primary to-primary-dark section-padding">
        <div className="container-custom text-center">
          <h2 className="text-4xl font-bold text-dark mb-4">Ready to Get Started?</h2>
          <p className="text-xl text-dark-light mb-8 max-w-2xl mx-auto">
            Join thousands of creators and brands already collaborating on BantuBuzz.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register/creator" className="btn btn-secondary text-lg px-8 py-4">
              Sign Up as Creator
            </Link>
            <Link to="/creators" className="btn bg-white text-dark hover:bg-gray-100 text-lg px-8 py-4">
              Browse Creators
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Home;
