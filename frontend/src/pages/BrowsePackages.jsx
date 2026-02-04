import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { packagesAPI } from '../services/api';
import { toast } from 'react-hot-toast';
import Avatar from '../components/Avatar';
import Navbar from '../components/Navbar';
import SEO from '../components/SEO';
import { Search, X } from 'lucide-react';

const CATEGORIES = [
  'Fashion & Beauty',
  'Tech & Gaming',
  'Food & Beverage',
  'Travel & Lifestyle',
  'Fitness & Health',
  'Entertainment',
  'Education',
  'Other'
];

const BrowsePackages = () => {
  const navigate = useNavigate();
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    category: '',
    min_price: '',
    max_price: '',
    search: '',
    platform: '',
    languages: [],
    follower_range: '',
    min_rating: '',
    price_range: ''
  });
  const [pagination, setPagination] = useState({
    current_page: 1,
    total: 0,
    pages: 0
  });

  useEffect(() => {
    fetchPackages();
  }, [filters, pagination.current_page]);

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
    setPagination(prev => ({ ...prev, current_page: 1 })); // Reset to page 1 when filtering
  };

  const clearFilters = () => {
    setFilters({
      category: '',
      min_price: '',
      max_price: '',
      search: '',
      platform: '',
      languages: [],
      follower_range: '',
      min_rating: '',
      price_range: ''
    });
  };

  const handleSearch = () => {
    // Trigger search by setting page to 1, which will trigger fetchPackages
    setPagination(prev => ({ ...prev, current_page: 1 }));
  };

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, current_page: newPage }));
    window.scrollTo(0, 0);
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
          <h1 className="text-4xl font-bold text-dark mb-2">Browse Packages</h1>
          <p className="text-gray-600">
            Discover and book collaboration packages from talented creators
          </p>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
          {/* Search Bar */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search packages by title or description..."
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
          </div>

          {/* Clear Filters Button */}
          {(filters.search || filters.category || filters.platform || filters.price_range) && (
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
        <div className="mb-4 text-sm text-gray-600">
          Showing {packages.length} of {pagination.total} packages
        </div>

        {/* Packages Grid */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : packages.length === 0 ? (
          <div className="text-center py-12">
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {packages.map((pkg) => (
              <div
                key={pkg.id}
                className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => navigate(`/packages/${pkg.id}`)}
              >
                <div className="p-6">
                  {/* Category Badge */}
                  <span className="inline-block px-3 py-1 bg-primary/10 text-primary text-xs font-semibold rounded-full mb-3">
                    {pkg.category}
                  </span>

                  {/* Title */}
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {pkg.title}
                  </h3>

                  {/* Creator Info */}
                  {pkg.creator && (
                    <div className="flex items-center gap-2 mb-3">
                      <Avatar
                        src={pkg.creator.profile_picture}
                        alt={pkg.creator.user?.email?.split('@')[0] || 'Creator'}
                        size="sm"
                        type="user"
                      />
                      <p className="text-sm text-gray-600">
                        by {pkg.creator.user?.email?.split('@')[0] || 'Creator'}
                      </p>
                    </div>
                  )}

                  {/* Description */}
                  <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                    {pkg.description}
                  </p>

                  {/* Duration */}
                  <div className="flex items-center text-sm text-gray-500 mb-4">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {pkg.duration_days} days delivery
                  </div>

                  {/* Deliverables */}
                  {pkg.deliverables && pkg.deliverables.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs text-gray-500 mb-1">Includes:</p>
                      <div className="flex flex-wrap gap-1">
                        {pkg.deliverables.slice(0, 3).map((item, idx) => (
                          <span key={idx} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                            {item}
                          </span>
                        ))}
                        {pkg.deliverables.length > 3 && (
                          <span className="text-xs text-gray-500">
                            +{pkg.deliverables.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Price & CTA */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    <div>
                      <span className="text-2xl font-bold text-gray-900">
                        ${pkg.price}
                      </span>
                    </div>
                    <button className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark transition-colors">
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {!loading && pagination.pages > 1 && (
          <div className="mt-8 flex justify-center gap-2">
            <button
              onClick={() => handlePageChange(pagination.current_page - 1)}
              disabled={pagination.current_page === 1}
              className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Previous
            </button>

            {Array.from({ length: pagination.pages }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                onClick={() => handlePageChange(page)}
                className={`px-4 py-2 rounded-lg ${
                  page === pagination.current_page
                    ? 'bg-primary text-white'
                    : 'border border-gray-300 hover:bg-gray-50'
                }`}
              >
                {page}
              </button>
            ))}

            <button
              onClick={() => handlePageChange(pagination.current_page + 1)}
              disabled={pagination.current_page === pagination.pages}
              className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default BrowsePackages;
