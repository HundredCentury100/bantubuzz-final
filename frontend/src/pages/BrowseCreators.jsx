import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { creatorsAPI, brandsAPI, BASE_URL } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import Navbar from '../components/Navbar';
import toast from 'react-hot-toast';
import Avatar from '../components/Avatar';
import SEO from '../components/SEO';
import { Search, Filter, X } from 'lucide-react';

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

const BrowseCreators = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [creators, setCreators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savedCreatorIds, setSavedCreatorIds] = useState(new Set());
  const [filters, setFilters] = useState({
    category: '',
    location: '',
    min_followers: '',
    search: '',
    platform: '',
    languages: [],
    follower_range: '',
    min_rating: '',
    price_range: ''
  });
  const [pagination, setPagination] = useState({
    current_page: 1,
    total_pages: 1,
    total: 0
  });

  // Initialize filters from URL params on mount
  useEffect(() => {
    const categoryParam = searchParams.get('category');
    const platformParam = searchParams.get('platform');
    const searchParam = searchParams.get('search');

    if (categoryParam || platformParam || searchParam) {
      setFilters(prev => ({
        ...prev,
        category: categoryParam || '',
        platform: platformParam || '',
        search: searchParam || ''
      }));
    }
  }, []);

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
        if (params[key] === '' || (Array.isArray(params[key]) && params[key].length === 0)) {
          delete params[key];
        }
      });

      // Handle languages array - send as comma-separated string
      if (filters.languages && filters.languages.length > 0) {
        params.languages = filters.languages.join(',');
      }

      const response = await creatorsAPI.getCreators(params);
      setCreators(response.data.creators || []);
      setPagination(prev => ({
        ...prev,
        total_pages: response.data.pages,
        total: response.data.total
      }));
    } catch (error) {
      console.error('Error fetching creators:', error);
      // Don't show error toast - empty state handles this gracefully
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
    // Real-time filtering happens automatically via useEffect watching filters
  };

  const handleSearch = (e) => {
    if (e) e.preventDefault();
    // Search is already triggered by useEffect, but this can be used for manual submit
  };

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, current_page: newPage }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-light">
      <SEO
        title="Browse Creators"
        description="Discover talented African content creators for your brand campaigns. Filter by category, location, and platform to find the perfect match."
        keywords="browse creators, find influencers, content creators, African talent"
      />
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

        {/* Search and Filters */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
          {/* Search Bar */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search creators by name, bio, or category..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>

          {/* Filter Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Category Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
              <select
                value={filters.category}
                onChange={(e) => handleFilterChange('category', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="">All Categories</option>
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Platform Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Platform</label>
              <select
                value={filters.platform}
                onChange={(e) => handleFilterChange('platform', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="">All Platforms</option>
                <option value="Instagram">Instagram</option>
                <option value="TikTok">TikTok</option>
                <option value="YouTube">YouTube</option>
                <option value="Facebook">Facebook</option>
              </select>
            </div>

            {/* Followers Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Followers</label>
              <select
                value={filters.follower_range}
                onChange={(e) => handleFilterChange('follower_range', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="">Any</option>
                <option value="0-1K">0-1K</option>
                <option value="1K-10K">1K-10K</option>
                <option value="10K-50K">10K-50K</option>
                <option value="50K-100K">50K-100K</option>
                <option value="100K-500K">100K-500K</option>
                <option value="500K+">500K+</option>
              </select>
            </div>

            {/* Language Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Language</label>
              <select
                value={filters.languages[0] || ''}
                onChange={(e) => handleFilterChange('languages', e.target.value ? [e.target.value] : [])}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="">All Languages</option>
                <option value="English">English</option>
                <option value="Shona">Shona</option>
              </select>
            </div>

            {/* Price Range Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Price Range</label>
              <select
                value={filters.price_range}
                onChange={(e) => handleFilterChange('price_range', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="">Any Price</option>
                <option value="$0-$50">$0-$50</option>
                <option value="$50-$100">$50-$100</option>
                <option value="$100-$250">$100-$250</option>
                <option value="$250-$500">$250-$500</option>
                <option value="$500-$1000">$500-$1000</option>
                <option value="$1000+">$1000+</option>
              </select>
            </div>

            {/* Rating Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Minimum Rating</label>
              <select
                value={filters.min_rating}
                onChange={(e) => handleFilterChange('min_rating', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="">Any Rating</option>
                <option value="4">4+ Stars</option>
                <option value="3">3+ Stars</option>
                <option value="2">2+ Stars</option>
              </select>
            </div>
          </div>

          {/* Clear Filters Button */}
          {(filters.search || filters.category || filters.platform || filters.follower_range || filters.languages.length > 0 || filters.price_range || filters.min_rating) && (
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => {
                  setFilters({
                    category: '',
                    location: '',
                    min_followers: '',
                    search: '',
                    platform: '',
                    languages: [],
                    follower_range: '',
                    min_rating: '',
                    price_range: ''
                  });
                  setPagination(prev => ({ ...prev, current_page: 1 }));
                }}
                className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <X size={16} />
                Clear Filters
              </button>
            </div>
          )}
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {creators.map((creator) => (
                <div
                  key={creator.id}
                  className="bg-primary p-4 rounded-3xl shadow-sm hover:shadow-md transition-shadow"
                >
                  {/* White Inner Container */}
                  <div className="bg-white rounded-2xl overflow-hidden mb-4">
                    {/* Image */}
                    <div className="aspect-square overflow-hidden bg-gray-100">
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
                    </div>
                  </div>

                  {/* Name and Followers - On Primary Background */}
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-semibold text-gray-900">
                      {creator.display_name || creator.username || creator.user?.email?.split('@')[0] || 'Creator'}
                    </h3>
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

                  {/* Social Icon and Category - On Primary Background */}
                  <div className="flex justify-between items-center mb-4">
                    <svg className="w-5 h-5 text-gray-700" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                    </svg>
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

export default BrowseCreators;
