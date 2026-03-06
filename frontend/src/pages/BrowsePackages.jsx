import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { packagesAPI, categoriesAPI, BASE_URL } from '../services/api';
import { toast } from 'react-hot-toast';
import Avatar from '../components/Avatar';
import Navbar from '../components/Navbar';
import SEO from '../components/SEO';
import { Search, Filter, X } from 'lucide-react';
import { PLATFORM_CONFIGS, PACKAGE_TYPES as PLATFORM_TYPES } from '../constants/platformConfig';

// Default fallback values
const DEFAULT_CATEGORIES = [
  'Fashion & Beauty',
  'Tech & Gaming',
  'Food & Beverage',
  'Travel & Lifestyle',
  'Fitness & Health',
  'Entertainment',
  'Education',
  'Other'
];

const DEFAULT_COLLABORATION_TYPES = [
  'Sponsored Post',
  'Story Feature',
  'Video Content',
  'Product Review',
  'Brand Ambassador',
  'Giveaway/Contest',
  'Custom Package',
  'Other'
];

const DELIVERY_TIME_RANGES = [
  { label: '1-3 days', value: '1-3' },
  { label: '3-7 days', value: '3-7' },
  { label: '1-2 weeks', value: '7-14' },
  { label: '2-4 weeks', value: '14-30' },
  { label: '1+ month', value: '30+' }
];

const FOLLOWER_RANGES = [
  { label: '0-1K', value: '0-1000' },
  { label: '1K-10K', value: '1000-10000' },
  { label: '10K-50K', value: '10000-50000' },
  { label: '50K-100K', value: '50000-100000' },
  { label: '100K-500K', value: '100000-500000' },
  { label: '500K+', value: '500000+' }
];

const BrowsePackages = () => {
  const navigate = useNavigate();
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [collaborationTypes, setCollaborationTypes] = useState(DEFAULT_COLLABORATION_TYPES);
  const [filters, setFilters] = useState({
    category: '',
    min_price: '',
    max_price: '',
    search: '',
    platform_type: '',
    collaboration_type: '',
    languages: [],
    follower_range: '',
    min_rating: '',
    price_range: '',
    delivery_time: '',
    sort_by: 'relevance'
  });
  const [pagination, setPagination] = useState({
    current_page: 1,
    total: 0,
    pages: 0
  });

  // Fetch categories and collaboration types on mount
  useEffect(() => {
    fetchFiltersData();
  }, []);

  useEffect(() => {
    fetchPackages();
  }, [filters, pagination.current_page]);

  const fetchFiltersData = async () => {
    try {
      // Fetch categories from API
      const categoriesResponse = await categoriesAPI.getCategories();
      if (categoriesResponse.data && categoriesResponse.data.categories) {
        const categoryNames = categoriesResponse.data.categories.map(cat => cat.name);
        if (categoryNames.length > 0) {
          setCategories(categoryNames);
        }
      }

      // Fetch unique collaboration types from packages
      // Since there's no dedicated endpoint, we'll use the distinct category values from all packages
      const allPackagesResponse = await packagesAPI.getPackages({ per_page: 1000 });
      if (allPackagesResponse.data && allPackagesResponse.data.packages) {
        const uniqueCollabTypes = [...new Set(
          allPackagesResponse.data.packages
            .map(pkg => pkg.category)
            .filter(cat => cat && cat.trim() !== '')
        )].sort();

        if (uniqueCollabTypes.length > 0) {
          setCollaborationTypes(uniqueCollabTypes);
        }
      }
    } catch (error) {
      console.error('Error fetching filter data:', error);
      // Use defaults if API fails
    }
  };

  const fetchPackages = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.current_page,
        per_page: 12,
        ...filters
      };

      // Remove empty filters
      Object.keys(params).forEach(key => {
        if (params[key] === '' || params[key] === null || (Array.isArray(params[key]) && params[key].length === 0)) {
          delete params[key];
        }
      });

      // Handle languages array - send as comma-separated string
      if (filters.languages && filters.languages.length > 0) {
        params.languages = filters.languages.join(',');
      }

      const response = await packagesAPI.getPackages(params);
      setPackages(response.data.packages);
      setPagination({
        current_page: response.data.current_page,
        total: response.data.total,
        pages: response.data.pages
      });
    } catch (error) {
      console.error('Error fetching packages:', error);
      toast.error('Failed to load packages');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setPagination(prev => ({ ...prev, current_page: 1 }));
  };

  const handleSearch = (e) => {
    if (e) e.preventDefault();
    setFilters(prev => ({ ...prev, search: searchInput }));
    setPagination(prev => ({ ...prev, current_page: 1 }));
  };

  const clearFilters = () => {
    setSearchInput('');
    setFilters({
      category: '',
      min_price: '',
      max_price: '',
      search: '',
      platform_type: '',
      collaboration_type: '',
      languages: [],
      follower_range: '',
      min_rating: '',
      price_range: '',
      delivery_time: '',
      sort_by: 'relevance'
    });
    setPagination(prev => ({ ...prev, current_page: 1 }));
  };

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, current_page: newPage }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-light">
      <SEO
        title="Browse Packages"
        description="Discover and book collaboration packages from talented African creators. Find the perfect package for your brand needs."
        keywords="browse packages, creator packages, influencer services, brand collaborations"
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
          <h1 className="text-4xl font-bold text-dark mb-2">Discover Packages</h1>
          <p className="text-gray-600">Find the perfect collaboration package for your brand</p>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-3xl shadow-sm p-6 mb-8">
          {/* Search Bar */}
          <div className="mb-4">
            <form onSubmit={handleSearch} className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search packages by title or description..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-full focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <button
                type="submit"
                className="px-6 py-3 bg-primary hover:bg-primary-dark text-white font-medium rounded-full transition-colors flex items-center gap-2 whitespace-nowrap"
              >
                <Search size={18} />
                <span className="hidden sm:inline">Search</span>
              </button>
            </form>
          </div>

          {/* Filters - Responsive Layout */}
          <div className="space-y-4">
            {/* Desktop: All filters visible */}
            <div className="hidden lg:flex lg:flex-wrap lg:gap-4">
              {/* Sort By */}
              <div className="flex-1 min-w-[150px]">
                <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
                <select
                  value={filters.sort_by}
                  onChange={(e) => handleFilterChange('sort_by', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="relevance">Relevance</option>
                  <option value="price_low">Price: Low to High</option>
                  <option value="price_high">Price: High to Low</option>
                  <option value="newest">Newest First</option>
                  <option value="popular">Most Popular</option>
                </select>
              </div>

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

              {/* Collaboration Type Filter */}
              <div className="flex-1 min-w-[150px]">
                <label className="block text-sm font-medium text-gray-700 mb-2">Collaboration Type</label>
                <select
                  value={filters.collaboration_type}
                  onChange={(e) => handleFilterChange('collaboration_type', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="">All Types</option>
                  {collaborationTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              {/* Platform Type Filter */}
              <div className="flex-1 min-w-[150px]">
                <label className="block text-sm font-medium text-gray-700 mb-2">Platform</label>
                <select
                  value={filters.platform_type}
                  onChange={(e) => handleFilterChange('platform_type', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="">All Platforms</option>
                  {PLATFORM_TYPES.map(platform => (
                    <option key={platform.value} value={platform.value}>{platform.label}</option>
                  ))}
                </select>
              </div>

              {/* Price Range Filter */}
              <div className="flex-1 min-w-[150px]">
                <label className="block text-sm font-medium text-gray-700 mb-2">Price Range</label>
                <select
                  value={filters.price_range}
                  onChange={(e) => handleFilterChange('price_range', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="">All Prices</option>
                  <option value="$0-$50">$0-$50</option>
                  <option value="$50-$100">$50-$100</option>
                  <option value="$100-$250">$100-$250</option>
                  <option value="$250-$500">$250-$500</option>
                  <option value="$500-$1000">$500-$1000</option>
                  <option value="$1000+">$1000+</option>
                </select>
              </div>

              {/* Delivery Time Filter */}
              <div className="flex-1 min-w-[150px]">
                <label className="block text-sm font-medium text-gray-700 mb-2">Delivery Time</label>
                <select
                  value={filters.delivery_time}
                  onChange={(e) => handleFilterChange('delivery_time', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="">Any Delivery Time</option>
                  {DELIVERY_TIME_RANGES.map(range => (
                    <option key={range.value} value={range.value}>{range.label}</option>
                  ))}
                </select>
              </div>

              {/* Followers Filter */}
              <div className="flex-1 min-w-[150px]">
                <label className="block text-sm font-medium text-gray-700 mb-2">Creator Followers</label>
                <select
                  value={filters.follower_range}
                  onChange={(e) => handleFilterChange('follower_range', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="">Any Followers</option>
                  {FOLLOWER_RANGES.map(range => (
                    <option key={range.value} value={range.value}>{range.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Mobile: Category visible, rest behind "More" button */}
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
                  {/* Sort By */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
                    <select
                      value={filters.sort_by}
                      onChange={(e) => handleFilterChange('sort_by', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                      <option value="relevance">Relevance</option>
                      <option value="price_low">Price: Low to High</option>
                      <option value="price_high">Price: High to Low</option>
                      <option value="newest">Newest First</option>
                      <option value="popular">Most Popular</option>
                    </select>
                  </div>

                  {/* Collaboration Type Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Collaboration Type</label>
                    <select
                      value={filters.collaboration_type}
                      onChange={(e) => handleFilterChange('collaboration_type', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                      <option value="">All Types</option>
                      {collaborationTypes.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>

                  {/* Platform Type Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Platform</label>
                    <select
                      value={filters.platform_type}
                      onChange={(e) => handleFilterChange('platform_type', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                      <option value="">All Platforms</option>
                      {PLATFORM_TYPES.map(platform => (
                        <option key={platform.value} value={platform.value}>{platform.label}</option>
                      ))}
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
                      <option value="">All Prices</option>
                      <option value="$0-$50">$0-$50</option>
                      <option value="$50-$100">$50-$100</option>
                      <option value="$100-$250">$100-$250</option>
                      <option value="$250-$500">$250-$500</option>
                      <option value="$500-$1000">$500-$1000</option>
                      <option value="$1000+">$1000+</option>
                    </select>
                  </div>

                  {/* Delivery Time Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Delivery Time</label>
                    <select
                      value={filters.delivery_time}
                      onChange={(e) => handleFilterChange('delivery_time', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                      <option value="">Any Delivery Time</option>
                      {DELIVERY_TIME_RANGES.map(range => (
                        <option key={range.value} value={range.value}>{range.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Followers Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Creator Followers</label>
                    <select
                      value={filters.follower_range}
                      onChange={(e) => handleFilterChange('follower_range', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                      <option value="">Any Followers</option>
                      {FOLLOWER_RANGES.map(range => (
                        <option key={range.value} value={range.value}>{range.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Clear Filters Button */}
          {(searchInput || filters.search || filters.category || filters.platform_type || filters.price_range || filters.collaboration_type || filters.delivery_time || filters.follower_range || filters.sort_by !== 'relevance') && (
            <div className="mt-4 flex justify-end">
              <button
                onClick={clearFilters}
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
            Showing {packages.length} of {pagination.total} packages
          </p>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : packages.length === 0 ? (
          /* Empty State */
          <div className="card text-center py-20">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No packages found</h3>
            <p className="mt-1 text-sm text-gray-500">Try adjusting your filters</p>
          </div>
        ) : (
          <>
            {/* Packages Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {packages.map((pkg) => (
                <div
                  key={pkg.id}
                  className="bg-primary p-4 rounded-3xl shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => navigate(`/packages/${pkg.id}`)}
                >
                  {/* White Inner Container */}
                  <div className="bg-white rounded-2xl overflow-hidden mb-4">
                    {/* Image Placeholder or Creator Avatar */}
                    <div className="aspect-square overflow-hidden bg-gray-100 relative flex items-center justify-center">
                      {pkg.creator?.profile_picture ? (
                        <img
                          src={`${BASE_URL}${pkg.creator.profile_picture}`}
                          alt={pkg.creator.display_name || pkg.creator.username || 'Creator'}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <svg className="w-16 h-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                          </svg>
                        </div>
                      )}
                      {/* Category Badge on Image */}
                      <div className="absolute top-2 left-2">
                        <span className="inline-block px-3 py-1 bg-primary/90 text-white text-xs font-semibold rounded-full backdrop-blur-sm">
                          {pkg.category}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Platform Badge */}
                  {pkg.platform_type && PLATFORM_CONFIGS[pkg.platform_type] && (
                    <div className="mb-3">
                      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg ${PLATFORM_CONFIGS[pkg.platform_type].bgColor}`}>
                        <svg
                          className={`w-4 h-4 ${PLATFORM_CONFIGS[pkg.platform_type].color}`}
                          viewBox="0 0 24 24"
                          fill="currentColor"
                        >
                          {PLATFORM_CONFIGS[pkg.platform_type].icon}
                        </svg>
                        <span className={`text-sm font-medium ${PLATFORM_CONFIGS[pkg.platform_type].color}`}>
                          {pkg.platform_type}
                        </span>
                        {pkg.content_type && (
                          <span className="text-sm text-gray-600">• {pkg.content_type}</span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Package Title */}
                  <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                    {pkg.title}
                  </h3>

                  {/* Creator Name */}
                  {pkg.creator && (
                    <div className="flex items-center gap-1.5 mb-3 text-sm text-gray-600">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <span className="truncate">
                        {pkg.creator.display_name || pkg.creator.username || pkg.creator.user?.email?.split('@')[0] || 'Creator'}
                      </span>
                    </div>
                  )}

                  {/* Delivery Time */}
                  <div className="flex items-center gap-1.5 mb-4 text-xs text-gray-600">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{pkg.duration_days} days delivery</span>
                  </div>

                  {/* Price & CTA */}
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-2xl font-bold text-gray-900">
                        ${pkg.price}
                      </span>
                    </div>
                  </div>

                  {/* View Button */}
                  <button className="mt-4 block w-full bg-white text-dark text-center py-3 rounded-full font-medium hover:bg-gray-100 transition-colors">
                    View Details
                  </button>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="flex justify-center items-center gap-2">
                <button
                  onClick={() => handlePageChange(pagination.current_page - 1)}
                  disabled={pagination.current_page === 1}
                  className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Previous
                </button>

                <div className="flex gap-2">
                  {[...Array(pagination.pages)].map((_, idx) => {
                    const pageNum = idx + 1;
                    // Show first page, last page, current page, and pages around current
                    if (
                      pageNum === 1 ||
                      pageNum === pagination.pages ||
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
                  disabled={pagination.current_page === pagination.pages}
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

export default BrowsePackages;
