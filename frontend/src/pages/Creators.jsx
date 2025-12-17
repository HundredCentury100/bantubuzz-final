import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { creatorsAPI, brandsAPI, BASE_URL } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import Navbar from '../components/Navbar';
import ResponsiveImage from '../components/ResponsiveImage';
import toast from 'react-hot-toast';
import Avatar from '../components/Avatar';

const CATEGORIES = [
  'Fashion & Beauty',
  'Lifestyle',
  'Tech & Gaming',
  'Food & Cooking',
  'Travel',
  'Fitness & Health',
  'Business & Finance',
  'Entertainment',
  'Education',
  'Art & Design'
];

const FOLLOWER_RANGES = [
  { label: 'Any', value: '' },
  { label: '1K+', value: 1000 },
  { label: '10K+', value: 10000 },
  { label: '50K+', value: 50000 },
  { label: '100K+', value: 100000 },
  { label: '500K+', value: 500000 }
];

const Creators = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [creators, setCreators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savedCreatorIds, setSavedCreatorIds] = useState(new Set());
  const [filters, setFilters] = useState({
    category: searchParams.get('category') || searchParams.get('search') || '',
    location: '',
    min_followers: '',
    search: ''
  });
  const [pagination, setPagination] = useState({
    current_page: 1,
    total_pages: 1,
    total: 0
  });

  useEffect(() => {
    fetchCreators();
    if (user?.user_type === 'brand') {
      fetchSavedCreators();
    }
  }, [pagination.current_page, filters]);

  const fetchCreators = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.current_page,
        per_page: 12,
        ...filters
      };

      // Remove empty filters
      Object.keys(params).forEach(key => {
        if (params[key] === '') delete params[key];
      });

      const response = await creatorsAPI.getCreators(params);
      setCreators(response.data.creators || []);
      setPagination(prev => ({
        ...prev,
        total_pages: response.data.pages,
        total: response.data.total
      }));
    } catch (error) {
      console.error('Error fetching creators:', error);
      toast.error('Failed to load creators');
    } finally {
      setLoading(false);
    }
  };

  const fetchSavedCreators = async () => {
    try {
      const response = await brandsAPI.getSavedCreators();
      const saved = response.data.creators || [];
      setSavedCreatorIds(new Set(saved.map(c => c.id)));
    } catch (error) {
      console.error('Error fetching saved creators:', error);
    }
  };

  const handleSaveCreator = async (creatorId) => {
    if (user?.user_type !== 'brand') {
      toast.error('Only brands can save creators');
      return;
    }

    try {
      const isSaved = savedCreatorIds.has(creatorId);

      if (isSaved) {
        await brandsAPI.unsaveCreator(creatorId);
        setSavedCreatorIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(creatorId);
          return newSet;
        });
        toast.success('Creator removed from saved');
      } else {
        await brandsAPI.saveCreator(creatorId);
        setSavedCreatorIds(prev => new Set([...prev, creatorId]));
        toast.success('Creator saved successfully');
      }
    } catch (error) {
      console.error('Error saving creator:', error);
      toast.error('Failed to save creator');
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, current_page: 1 }));
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchCreators();
  };

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, current_page: newPage }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-light">
      <Navbar />

      <div className="container-custom section-padding">
        {/* Navigation */}
        <div className="mb-6">
          <Link
            to={user?.user_type === 'brand' ? '/brand/dashboard' : '/'}
            className="text-gray-600 hover:text-gray-900 flex items-center gap-2 w-fit"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to {user?.user_type === 'brand' ? 'Dashboard' : 'Home'}
          </Link>
        </div>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-dark mb-2">Discover Creators</h1>
          <p className="text-gray-600">Find the perfect creator for your brand</p>
        </div>

        {/* Filters */}
        <div className="card mb-8">
          <form onSubmit={handleSearch}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              {/* Category Filter */}
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
                  {CATEGORIES.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              {/* Location Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Location
                </label>
                <input
                  type="text"
                  value={filters.location}
                  onChange={(e) => handleFilterChange('location', e.target.value)}
                  placeholder="e.g., Harare, Bulawayo"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>

              {/* Followers Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Minimum Followers
                </label>
                <select
                  value={filters.min_followers}
                  onChange={(e) => handleFilterChange('min_followers', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  {FOLLOWER_RANGES.map(range => (
                    <option key={range.label} value={range.value}>{range.label}</option>
                  ))}
                </select>
              </div>

              {/* Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search
                </label>
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  placeholder="Search creators..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary w-full md:w-auto"
            >
              Apply Filters
            </button>
          </form>
        </div>

        {/* Results Count */}
        <div className="mb-6">
          <p className="text-gray-600">
            Showing {creators.length} of {pagination.total} creators
          </p>
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-700 mb-2">No creators found</h3>
            <p className="text-gray-500">Try adjusting your filters</p>
          </div>
        ) : (
          /* Creators Grid */
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
              {creators.map((creator) => (
                <div key={creator.id} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow overflow-hidden">
                  {/* Creator Avatar - Full Width Image */}
                  <div className="relative w-full h-64 bg-gradient-to-br from-primary/20 to-primary/5 overflow-hidden">
                    <ResponsiveImage
                      sizes={creator.profile_picture_sizes || creator.profile_picture}
                      alt={creator.display_name || creator.username || 'Creator'}
                      className="w-full h-64"
                      objectFit="cover"
                      showLoading={true}
                    />
                  </div>

                  {/* Content */}
                  <div className="p-6">
                    {/* Creator Info */}
                    <h3 className="font-bold text-lg text-dark mb-1">
                      {creator.display_name || creator.username || 'Creator'}
                    </h3>
                    <p className="text-sm text-gray-500 mb-4">{creator.location || 'Location not set'}</p>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-2 mb-4">
                    <div className="text-center p-2 bg-gray-50 rounded">
                      <p className="text-xs text-gray-600">Followers</p>
                      <p className="font-bold text-dark text-sm">
                        {creator.follower_count >= 1000
                          ? `${(creator.follower_count / 1000).toFixed(1)}K`
                          : creator.follower_count || 0}
                      </p>
                    </div>
                    <div className="text-center p-2 bg-gray-50 rounded">
                      <p className="text-xs text-gray-600">Engagement</p>
                      <p className="font-bold text-dark text-sm">
                        {creator.engagement_rate ? `${creator.engagement_rate.toFixed(1)}%` : 'N/A'}
                      </p>
                    </div>
                    <div className="text-center p-2 bg-gray-50 rounded">
                      <p className="text-xs text-gray-600">Rating</p>
                      <div className="flex items-center justify-center gap-1">
                        <svg className="w-4 h-4 text-primary-dark fill-current" viewBox="0 0 24 24">
                          <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                        </svg>
                        <p className="font-bold text-dark text-sm">
                          {creator.review_stats?.average_rating || 0}
                        </p>
                      </div>
                      <p className="text-xs text-gray-500">
                        ({creator.review_stats?.total_reviews || 0})
                      </p>
                    </div>
                  </div>

                  {/* Categories */}
                  {creator.categories && creator.categories.length > 0 && (
                    <div className="mb-4">
                      <div className="flex flex-wrap gap-1">
                        {creator.categories.slice(0, 2).map((category, idx) => (
                          <span
                            key={idx}
                            className="text-xs px-2 py-1 bg-primary/10 text-primary rounded"
                          >
                            {category}
                          </span>
                        ))}
                        {creator.categories.length > 2 && (
                          <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                            +{creator.categories.length - 2}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                    {/* Bio */}
                    {creator.bio && (
                      <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                        {creator.bio}
                      </p>
                    )}

                    {/* Availability Status */}
                    <div className="mb-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                        creator.availability_status === 'available' ? 'bg-primary text-primary-dark' :
                        creator.availability_status === 'busy' ? 'bg-primary text-primary-dark' :
                        'bg-red-100 text-red-800'
                      }`}>
                        <span className={`w-2 h-2 rounded-full mr-2 ${
                          creator.availability_status === 'available' ? 'bg-primary' :
                          creator.availability_status === 'busy' ? 'bg-primary' :
                          'bg-red-600'
                        }`}></span>
                        {creator.availability_status || 'unavailable'}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Link
                        to={`/creators/${creator.id}`}
                        className="flex-1 btn btn-primary text-center text-sm py-2"
                      >
                        View Profile
                      </Link>
                      {user?.user_type === 'brand' && (
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            handleSaveCreator(creator.id);
                          }}
                          className={`px-3 py-2 rounded-lg border transition-colors ${
                            savedCreatorIds.has(creator.id)
                              ? 'bg-primary text-white border-primary'
                              : 'bg-white text-gray-600 border-gray-300 hover:border-primary hover:text-primary'
                          }`}
                          title={savedCreatorIds.has(creator.id) ? 'Unsave' : 'Save'}
                        >
                          <svg className="w-5 h-5" fill={savedCreatorIds.has(creator.id) ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {pagination.total_pages > 1 && (
              <div className="flex justify-center items-center gap-2">
                <button
                  onClick={() => handlePageChange(pagination.current_page - 1)}
                  disabled={pagination.current_page === 1}
                  className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Previous
                </button>

                <div className="flex gap-2">
                  {[...Array(pagination.total_pages)].map((_, idx) => {
                    const pageNum = idx + 1;
                    // Show first page, last page, current page, and pages around current
                    if (
                      pageNum === 1 ||
                      pageNum === pagination.total_pages ||
                      (pageNum >= pagination.current_page - 1 && pageNum <= pagination.current_page + 1)
                    ) {
                      return (
                        <button
                          key={pageNum}
                          onClick={() => handlePageChange(pageNum)}
                          className={`px-4 py-2 border rounded-lg ${
                            pageNum === pagination.current_page
                              ? 'bg-primary text-white border-primary'
                              : 'border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    } else if (
                      pageNum === pagination.current_page - 2 ||
                      pageNum === pagination.current_page + 2
                    ) {
                      return <span key={pageNum} className="px-2">...</span>;
                    }
                    return null;
                  })}
                </div>

                <button
                  onClick={() => handlePageChange(pagination.current_page + 1)}
                  disabled={pagination.current_page === pagination.total_pages}
                  className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Creators;
