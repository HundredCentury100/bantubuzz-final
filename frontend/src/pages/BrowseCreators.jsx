import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { creatorsAPI, brandsAPI, BASE_URL } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import Navbar from '../components/Navbar';
import CreatorBadge from '../components/CreatorBadge';
import toast from 'react-hot-toast';
import Avatar from '../components/Avatar';
import SEO from '../components/SEO';
import { Search, Filter, X } from 'lucide-react';
import { ZIMBABWE_LANGUAGES } from '../constants/options';

const BrowseCreators = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [creators, setCreators] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savedCreatorIds, setSavedCreatorIds] = useState(new Set());
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [filters, setFilters] = useState({
    category: '',
    location: '',
    min_followers: '',
    max_followers: '',
    min_price: '',
    max_price: '',
    search: '',
    platform: '',
    languages: [],
    min_rating: '',
    sort_by: ''
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
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchCreators();
    if (user?.user_type === 'brand') {
      fetchSavedCreators();
    }
  }, [pagination.current_page, filters]);

  const fetchCategories = async () => {
    try {
      const response = await creatorsAPI.getCategories();
      setCategories(response.data.categories || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
      // Fallback to empty array if fetch fails
      setCategories([]);
    }
  };

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
        <div className="bg-white rounded-3xl shadow-sm p-6 mb-8">
          {/* Search Bar */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search creators by name, bio, or category..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-full focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>

          {/* Filters - Responsive Layout */}
          <div className="space-y-4">
            {/* Desktop: All filters in one line */}
            <div className="hidden lg:flex lg:flex-wrap lg:gap-4">
              {/* Category Filter */}
              <div className="flex-1 min-w-[150px]">
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <select
                  value={filters.category}
                  onChange={(e) => handleFilterChange('category', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="">All Categories</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Platform Filter */}
              <div className="flex-1 min-w-[150px]">
                <label className="block text-sm font-medium text-gray-700 mb-2">Platform</label>
                <select
                  value={filters.platform}
                  onChange={(e) => handleFilterChange('platform', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="">All Platforms</option>
                  <option value="Instagram">Instagram</option>
                  <option value="TikTok">TikTok</option>
                  <option value="YouTube">YouTube</option>
                  <option value="Facebook">Facebook</option>
                </select>
              </div>

              {/* Followers Filter - Min/Max */}
              <div className="flex-1 min-w-[150px]">
                <label className="block text-sm font-medium text-gray-700 mb-2">Followers</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    value={filters.min_followers}
                    onChange={(e) => handleFilterChange('min_followers', e.target.value)}
                    className="w-1/2 px-2 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    value={filters.max_followers}
                    onChange={(e) => handleFilterChange('max_followers', e.target.value)}
                    className="w-1/2 px-2 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                  />
                </div>
              </div>

              {/* Language Filter */}
              <div className="flex-1 min-w-[150px]">
                <label className="block text-sm font-medium text-gray-700 mb-2">Language</label>
                <select
                  value={filters.languages[0] || ''}
                  onChange={(e) => handleFilterChange('languages', e.target.value ? [e.target.value] : [])}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="">All Languages</option>
                  {ZIMBABWE_LANGUAGES.map((language) => (
                    <option key={language} value={language}>{language}</option>
                  ))}
                </select>
              </div>

              {/* Price Range Filter - Min/Max */}
              <div className="flex-1 min-w-[150px]">
                <label className="block text-sm font-medium text-gray-700 mb-2">Price Range ($)</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    value={filters.min_price}
                    onChange={(e) => handleFilterChange('min_price', e.target.value)}
                    className="w-1/2 px-2 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    value={filters.max_price}
                    onChange={(e) => handleFilterChange('max_price', e.target.value)}
                    className="w-1/2 px-2 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                  />
                </div>
              </div>

              {/* Rating Filter */}
              <div className="flex-1 min-w-[150px]">
                <label className="block text-sm font-medium text-gray-700 mb-2">Rating</label>
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

              {/* Sort By */}
              <div className="flex-1 min-w-[150px]">
                <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
                <select
                  value={filters.sort_by}
                  onChange={(e) => handleFilterChange('sort_by', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="">Relevance</option>
                  <option value="followers_desc">Followers: High to Low</option>
                  <option value="followers_asc">Followers: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="rating_desc">Rating: High to Low</option>
                  <option value="newest">Newest First</option>
                </select>
              </div>
            </div>

            {/* Mobile: First filter visible, rest behind "More" button */}
            <div className="lg:hidden">
              {/* Always visible - Category Filter */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <select
                  value={filters.category}
                  onChange={(e) => handleFilterChange('category', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="">All Categories</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* More Filters Toggle Button */}
              <button
                onClick={() => setShowMoreFilters(!showMoreFilters)}
                className="flex items-center justify-center gap-2 w-full px-4 py-2 mb-4 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Filter size={18} />
                {showMoreFilters ? 'Hide' : 'More'} Filters
                <svg
                  className={`w-4 h-4 transition-transform ${showMoreFilters ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Additional Filters - Collapsed on mobile */}
              {showMoreFilters && (
                <div className="space-y-4">
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

                  {/* Followers Filter - Min/Max */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Followers</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        placeholder="Min"
                        value={filters.min_followers}
                        onChange={(e) => handleFilterChange('min_followers', e.target.value)}
                        className="w-1/2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                      <input
                        type="number"
                        placeholder="Max"
                        value={filters.max_followers}
                        onChange={(e) => handleFilterChange('max_followers', e.target.value)}
                        className="w-1/2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                    </div>
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
                      {ZIMBABWE_LANGUAGES.map((language) => (
                        <option key={language} value={language}>{language}</option>
                      ))}
                    </select>
                  </div>

                  {/* Price Range Filter - Min/Max */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Price Range ($)</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        placeholder="Min"
                        value={filters.min_price}
                        onChange={(e) => handleFilterChange('min_price', e.target.value)}
                        className="w-1/2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                      <input
                        type="number"
                        placeholder="Max"
                        value={filters.max_price}
                        onChange={(e) => handleFilterChange('max_price', e.target.value)}
                        className="w-1/2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                    </div>
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

                  {/* Sort By */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
                    <select
                      value={filters.sort_by}
                      onChange={(e) => handleFilterChange('sort_by', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                      <option value="">Relevance</option>
                      <option value="followers_desc">Followers: High to Low</option>
                      <option value="followers_asc">Followers: Low to High</option>
                      <option value="price_desc">Price: High to Low</option>
                      <option value="price_asc">Price: Low to High</option>
                      <option value="rating_desc">Rating: High to Low</option>
                      <option value="newest">Newest First</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Clear Filters Button */}
          {(filters.search || filters.category || filters.platform || filters.min_followers || filters.max_followers || filters.languages.length > 0 || filters.min_price || filters.max_price || filters.min_rating || filters.sort_by) && (
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => {
                  setFilters({
                    category: '',
                    location: '',
                    min_followers: '',
                    max_followers: '',
                    min_price: '',
                    max_price: '',
                    search: '',
                    platform: '',
                    languages: [],
                    min_rating: '',
                    sort_by: ''
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
                          {creator.badges.map((badge, idx) => (
                            <CreatorBadge key={idx} badge={badge} size="sm" variant="overlay" />
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
                      {/* Checkmark Icons next to name */}
                      {creator.badges && creator.badges.length > 0 && (
                        <>
                          {creator.badges.map((badge, idx) => (
                            <CreatorBadge key={idx} badge={badge} size="sm" variant="icon" />
                          ))}
                        </>
                      )}
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
