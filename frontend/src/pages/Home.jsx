import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { creatorsAPI } from '../services/api';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

const Home = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [featuredCreators, setFeaturedCreators] = useState([]);
  const [loading, setLoading] = useState(true);
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
      const response = await creatorsAPI.getCreators({ per_page: 4 });
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
    if (searchQuery) params.append('search', searchQuery);
    if (filters.category) params.append('category', filters.category);
    navigate(`/creators?${params.toString()}`);
  };

  const formatFollowers = (count) => {
    if (!count) return 'UGC';
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}m`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
    return count;
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />

      {/* Hero Section */}
      <section className="pt-16 pb-6 px-6 lg:px-12 xl:px-20">
        <div className="w-full">
          {/* Hero Heading */}
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-black mb-4 leading-tight">
              <span className="text-primary">
                Connecting talent with opportunity.
              </span>
            </h1>
            <p className="text-base md:text-lg text-gray-600 max-w-3xl mx-auto">
              Find and hire top Instagram, TikTok, YouTube, and UGC influencers to create unique content for your brand
            </p>
          </div>

          {/* Search Section */}
          <div className="max-w-5xl mx-auto mb-4">
            <form onSubmit={handleSearch} className="space-y-4">
              {/* Platform and Category Dropdowns */}
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Platform
                  </label>
                  <select
                    value={filters.platform}
                    onChange={(e) => setFilters(prev => ({ ...prev, platform: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-gray-700"
                  >
                    <option value="">Any</option>
                    <option value="Instagram">Instagram</option>
                    <option value="TikTok">TikTok</option>
                    <option value="YouTube">YouTube</option>
                    <option value="Twitter">Twitter</option>
                  </select>
                </div>

                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category
                  </label>
                  <input
                    type="text"
                    value={filters.category}
                    onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                    placeholder="Enter keywords, niches or categories"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
              </div>

              {/* Search Button */}
              <div className="flex justify-center">
                <button
                  type="submit"
                  className="bg-primary text-dark px-12 py-3 rounded-full hover:bg-primary-light transition-all flex items-center gap-2 text-base font-bold shadow-lg hover:shadow-xl"
                >
                  <MagnifyingGlassIcon className="h-5 w-5" />
                  Search
                </button>
              </div>

              {/* Filter Buttons Row */}
              <div className="flex flex-wrap justify-center gap-2 pt-2">
                {['Content Type', 'Followers', 'Location', 'Price', 'Gender', 'Age', 'Ethnicity', 'Language'].map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    className="px-4 py-2 text-sm border border-gray-300 rounded-full hover:border-primary hover:text-primary transition-colors flex items-center gap-1"
                  >
                    {filter}
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                ))}
                <button
                  type="button"
                  className="px-4 py-2 text-sm text-primary hover:text-primary-dark font-semibold"
                >
                  Clear All
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* Featured Section */}
      <section className="pt-4 pb-12 bg-gray-50">
        <div className="w-full px-6 lg:px-12 xl:px-20">
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-2">Featured</h2>
            <p className="text-gray-600">Hire top influencers across all platforms</p>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : featuredCreators.length > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {featuredCreators.slice(0, 4).map((creator, index) => (
                  <Link
                    key={creator.id}
                    to={`/creators/${creator.id}`}
                    className="group block bg-white rounded-2xl overflow-hidden hover:shadow-lg transition-shadow"
                  >
                    {/* Creator Image */}
                    <div className="relative aspect-[3/4]">
                      {creator.profile_picture ? (
                        <img
                          src={`http://localhost:5000${creator.profile_picture}`}
                          alt={creator.user?.email}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-primary/20 flex items-center justify-center">
                          <svg className="w-20 h-20 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                      )}

                      {/* Badges */}
                      <div className="absolute top-3 left-3 flex gap-2">
                        {creator.user?.email === 'kudzaimoudy@gmail.com' && (
                          <>
                            <span className="bg-primary text-dark px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                              <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24">
                                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                              </svg>
                              Top Creator
                            </span>
                            <span className="bg-primary text-dark px-2 py-1 rounded-full text-xs font-semibold">
                              Responds Fast
                            </span>
                          </>
                        )}
                      </div>

                      {/* Follower Badge */}
                      <div className="absolute bottom-3 left-3">
                        <span className="bg-white/90 backdrop-blur-sm text-gray-900 px-2 py-1 rounded-md text-xs font-semibold flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          {formatFollowers(creator.follower_count)}
                        </span>
                      </div>

                      {/* Rating Badge */}
                      {creator.review_stats?.average_rating > 0 && (
                        <div className="absolute bottom-3 right-3">
                          <span className="bg-white/90 backdrop-blur-sm text-gray-900 px-2 py-1 rounded-md text-xs font-semibold flex items-center gap-1">
                            <svg className="w-3 h-3 text-primary-dark fill-current" viewBox="0 0 24 24">
                              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                            </svg>
                            {creator.review_stats.average_rating.toFixed(1)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Creator Info */}
                    <div className="p-4">
                      <h3 className="font-bold text-gray-900 mb-1 group-hover:text-primary transition-colors">
                        {creator.user?.email?.split('@')[0] || 'Creator'}
                      </h3>
                      <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                        {creator.bio || creator.categories?.[0] || 'Professional content creator'}
                      </p>
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-500">
                          {creator.location || 'Zimbabwe'}
                        </p>
                        {creator.cheapest_package_price && (
                          <p className="text-lg font-bold text-primary">
                            ${creator.cheapest_package_price}
                          </p>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              <div className="text-center">
                <Link
                  to="/creators"
                  className="inline-block border-2 border-primary text-primary px-8 py-3 rounded-full hover:bg-primary hover:text-dark transition-colors font-bold"
                >
                  See All
                </Link>
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">No creators available at the moment.</p>
            </div>
          )}
        </div>
      </section>

      {/* Instagram Section */}
      <section className="py-12">
        <div className="w-full px-6 lg:px-12 xl:px-20">
          <div className="mb-8">
            <h2 className="text-3xl font-bold mb-2">Instagram</h2>
            <p className="text-gray-600">Hire Instagram influencers</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredCreators.slice(0, 4).map((creator) => (
              <Link
                key={`ig-${creator.id}`}
                to={`/creators/${creator.id}`}
                className="group block bg-white rounded-2xl overflow-hidden hover:shadow-lg transition-shadow"
              >
                <div className="relative aspect-[3/4]">
                  {creator.profile_picture ? (
                    <img
                      src={`http://localhost:5000${creator.profile_picture}`}
                      alt={creator.user?.email}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-primary/20"></div>
                  )}

                  <div className="absolute bottom-3 left-3">
                    <span className="bg-white/90 backdrop-blur-sm text-gray-900 px-2 py-1 rounded-md text-xs font-semibold flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      {formatFollowers(creator.follower_count)}
                    </span>
                  </div>

                  {creator.review_stats?.average_rating > 0 && (
                    <div className="absolute bottom-3 right-3">
                      <span className="bg-white/90 backdrop-blur-sm text-gray-900 px-2 py-1 rounded-md text-xs font-semibold flex items-center gap-1">
                        <svg className="w-3 h-3 text-primary-dark fill-current" viewBox="0 0 24 24">
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                        </svg>
                        {creator.review_stats.average_rating.toFixed(1)}
                      </span>
                    </div>
                  )}
                </div>

                <div className="p-4">
                  <h3 className="font-bold text-gray-900 mb-1 group-hover:text-primary transition-colors">
                    {creator.user?.email?.split('@')[0] || 'Creator'}
                  </h3>
                  <p className="text-sm text-gray-600 mb-1 line-clamp-2">
                    {creator.bio || creator.categories?.[0] || 'Content Creator'}
                  </p>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-500">
                      {creator.location || 'Zimbabwe'}
                    </p>
                    {creator.cheapest_package_price && (
                      <p className="text-lg font-bold text-primary">
                        ${creator.cheapest_package_price}
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* TikTok Section */}
      <section className="py-12 bg-gray-50">
        <div className="w-full px-6 lg:px-12 xl:px-20">
          <div className="mb-8">
            <h2 className="text-3xl font-bold mb-2">TikTok</h2>
            <p className="text-gray-600">Hire TikTok influencers</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredCreators.slice(0, 4).map((creator) => (
              <Link
                key={`tt-${creator.id}`}
                to={`/creators/${creator.id}`}
                className="group block bg-white rounded-2xl overflow-hidden hover:shadow-lg transition-shadow"
              >
                <div className="relative aspect-[3/4]">
                  {creator.profile_picture ? (
                    <img
                      src={`http://localhost:5000${creator.profile_picture}`}
                      alt={creator.user?.email}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-primary/20"></div>
                  )}

                  <div className="absolute top-3 left-3">
                    <span className="bg-primary text-dark px-2 py-1 rounded-full text-xs font-bold">
                      Top Creator
                    </span>
                  </div>

                  <div className="absolute bottom-3 left-3">
                    <span className="bg-white/90 backdrop-blur-sm text-gray-900 px-2 py-1 rounded-md text-xs font-semibold flex items-center gap-1">
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z"/>
                      </svg>
                      {formatFollowers(creator.follower_count)}
                    </span>
                  </div>
                </div>

                <div className="p-4">
                  <h3 className="font-bold text-gray-900 mb-1 group-hover:text-primary transition-colors">
                    {creator.user?.email?.split('@')[0] || 'Creator'}
                  </h3>
                  <p className="text-sm text-gray-600 mb-1 line-clamp-2">
                    {creator.categories?.join(', ') || 'Content Creator'}
                  </p>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-500">
                      {creator.location || 'Zimbabwe'}
                    </p>
                    {creator.cheapest_package_price && (
                      <p className="text-lg font-bold text-primary">
                        ${creator.cheapest_package_price}
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-12">
        <div className="w-full px-6 lg:px-12 xl:px-20">
          <h2 className="text-3xl font-bold mb-8">Categories</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { name: 'Fashion' },
              { name: 'Music & Dance' },
              { name: 'Beauty' },
              { name: 'Travel' }
            ].map((category) => (
              <Link
                key={category.name}
                to={`/creators?category=${category.name}`}
                className="group relative rounded-2xl overflow-hidden aspect-[4/3] hover:shadow-lg transition-shadow"
              >
                <div className="w-full h-full bg-primary"></div>
                <div className="absolute inset-0 bg-dark/30 group-hover:bg-dark/40 transition-colors"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <h3 className="text-white text-2xl font-bold">{category.name}</h3>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Home;
