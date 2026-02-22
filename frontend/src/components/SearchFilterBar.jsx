import React, { useState } from 'react';
import { MagnifyingGlassIcon, FunnelIcon, XMarkIcon } from '@heroicons/react/24/outline';

// 16 Official Languages of Zimbabwe
const LANGUAGES = [
  'English', 'Shona', 'Ndebele', 'Chewa', 'Chibarwe', 'Kalanga',
  'Koisan', 'Nambya', 'Ndau', 'Shangani', 'Sign Language',
  'Sotho', 'Tonga', 'Tswana', 'Venda', 'Xhosa'
];

const PLATFORMS = [
  'Instagram', 'TikTok', 'YouTube', 'Facebook', 'Twitter/X',
  'LinkedIn', 'Threads', 'Twitch'
];

const FOLLOWER_RANGES = [
  { label: 'Any', min: null, max: null },
  { label: '0-1K', min: 0, max: 1000 },
  { label: '1K-10K', min: 1000, max: 10000 },
  { label: '10K-50K', min: 10000, max: 50000 },
  { label: '50K-100K', min: 50000, max: 100000 },
  { label: '100K-500K', min: 100000, max: 500000 },
  { label: '500K+', min: 500000, max: null }
];

const REVIEW_FILTERS = [
  { label: 'Any Rating', value: '' },
  { label: '4+ Stars', value: '4' },
  { label: '3+ Stars', value: '3' },
  { label: '2+ Stars', value: '2' },
  { label: '1+ Stars', value: '1' }
];

const PRICE_RANGES = [
  { label: 'Any Price', min: null, max: null },
  { label: '$0-$50', min: 0, max: 50 },
  { label: '$50-$100', min: 50, max: 100 },
  { label: '$100-$250', min: 100, max: 250 },
  { label: '$250-$500', min: 250, max: 500 },
  { label: '$500-$1000', min: 500, max: 1000 },
  { label: '$1000+', min: 1000, max: null }
];

const SearchFilterBar = ({
  onSearch,
  filters = {},
  onFilterChange,
  showAdvancedFilters = false,
  placeholder = "Search by name, bio, or category..."
}) => {
  const [showFilters, setShowFilters] = useState(showAdvancedFilters);
  const [localFilters, setLocalFilters] = useState({
    search: filters.search || '',
    platform: filters.platform || '',
    category: filters.category || '',
    languages: filters.languages || [],
    follower_range: filters.follower_range || '',
    min_rating: filters.min_rating || '',
    price_range: filters.price_range || '',
    ...filters
  });

  const handleSearchChange = (value) => {
    setLocalFilters(prev => ({ ...prev, search: value }));
    // Real-time search as user types
    if (onFilterChange) {
      onFilterChange({ ...localFilters, search: value });
    }
  };

  const handleFilterUpdate = (key, value) => {
    const updated = { ...localFilters, [key]: value };
    setLocalFilters(updated);
    if (onFilterChange) {
      onFilterChange(updated);
    }
  };

  const toggleLanguage = (language) => {
    const currentLanguages = localFilters.languages || [];
    const updated = currentLanguages.includes(language)
      ? currentLanguages.filter(l => l !== language)
      : [...currentLanguages, language];
    handleFilterUpdate('languages', updated);
  };

  const clearFilters = () => {
    const cleared = {
      search: '',
      platform: '',
      category: '',
      languages: [],
      follower_range: '',
      min_rating: '',
      price_range: ''
    };
    setLocalFilters(cleared);
    if (onFilterChange) {
      onFilterChange(cleared);
    }
  };

  const hasActiveFilters =
    localFilters.platform ||
    localFilters.category ||
    (localFilters.languages && localFilters.languages.length > 0) ||
    localFilters.follower_range ||
    localFilters.min_rating ||
    localFilters.price_range;

  return (
    <div className="w-full">
      {/* Main Search Bar - Rounded Pill Design like Home page */}
      <form onSubmit={(e) => { e.preventDefault(); onSearch && onSearch(localFilters); }}>
        <div className="bg-white rounded-full shadow-lg flex items-center p-2 pl-8">
          {/* Platform Selector */}
          <div className="flex-1 flex items-center border-r border-gray-200 pr-4">
            <div className="w-full">
              <label className="block text-left text-sm font-semibold text-gray-900">
                Platform
              </label>
              <select
                value={localFilters.platform}
                onChange={(e) => handleFilterUpdate('platform', e.target.value)}
                className="w-full text-gray-700 text-sm bg-transparent border-none focus:outline-none cursor-pointer"
              >
                <option value="">Choose a platform</option>
                {PLATFORMS.map(platform => (
                  <option key={platform} value={platform}>{platform}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Category/Search Input */}
          <div className="flex-1 flex items-center pl-4">
            <div className="w-full">
              <label className="block text-left text-sm font-semibold text-gray-900">
                Category
              </label>
              <input
                type="text"
                value={localFilters.category}
                onChange={(e) => handleFilterUpdate('category', e.target.value)}
                placeholder="Enter keywords, niches or categories"
                className="w-full text-gray-700 text-sm bg-transparent border-none focus:outline-none placeholder-gray-500"
              />
            </div>
          </div>

          {/* Search Button */}
          <button
            type="submit"
            className="bg-primary hover:bg-primary/90 text-dark p-4 rounded-full transition-colors ml-2"
          >
            <MagnifyingGlassIcon className="w-6 h-6" />
          </button>

          {/* Advanced Filters Toggle */}
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={`p-4 rounded-full transition-colors ml-2 ${
              showFilters || hasActiveFilters
                ? 'bg-primary text-dark'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            title="Advanced Filters"
          >
            <FunnelIcon className="w-6 h-6" />
          </button>
        </div>
      </form>

      {/* Advanced Filters Panel */}
      {showFilters && (
        <div className="bg-white rounded-2xl shadow-lg p-6 mt-4">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Advanced Filters</h3>
            <div className="flex items-center gap-3">
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-sm text-primary hover:text-primary-dark font-medium"
                >
                  Clear all
                </button>
              )}
              <button
                onClick={() => setShowFilters(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Languages Filter */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-3">
                Languages ({localFilters.languages?.length || 0} selected)
              </label>
              <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3">
                <div className="grid grid-cols-2 gap-2">
                  {LANGUAGES.map(language => (
                    <label
                      key={language}
                      className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
                    >
                      <input
                        type="checkbox"
                        checked={localFilters.languages?.includes(language) || false}
                        onChange={() => toggleLanguage(language)}
                        className="rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <span className="text-sm text-gray-700">{language}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Follower Range Filter */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-3">
                Follower Range
              </label>
              <div className="space-y-2">
                {FOLLOWER_RANGES.map(range => (
                  <label
                    key={range.label}
                    className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
                  >
                    <input
                      type="radio"
                      name="follower_range"
                      value={range.label}
                      checked={localFilters.follower_range === range.label}
                      onChange={(e) => handleFilterUpdate('follower_range', e.target.value)}
                      className="border-gray-300 text-primary focus:ring-primary"
                    />
                    <span className="text-sm text-gray-700">{range.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Rating Filter */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-3">
                Minimum Rating
              </label>
              <select
                value={localFilters.min_rating}
                onChange={(e) => handleFilterUpdate('min_rating', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                {REVIEW_FILTERS.map(filter => (
                  <option key={filter.value} value={filter.value}>
                    {filter.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Price Range Filter */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-3">
                Price Range
              </label>
              <div className="space-y-2">
                {PRICE_RANGES.map(range => (
                  <label
                    key={range.label}
                    className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
                  >
                    <input
                      type="radio"
                      name="price_range"
                      value={range.label}
                      checked={localFilters.price_range === range.label}
                      onChange={(e) => handleFilterUpdate('price_range', e.target.value)}
                      className="border-gray-300 text-primary focus:ring-primary"
                    />
                    <span className="text-sm text-gray-700">{range.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Apply Filters Button */}
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowFilters(false)}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => {
                onSearch && onSearch(localFilters);
                setShowFilters(false);
              }}
              className="px-6 py-2 bg-primary text-dark rounded-lg hover:bg-primary/90 transition-colors font-medium"
            >
              Apply Filters
            </button>
          </div>
        </div>
      )}

      {/* Active Filters Display */}
      {hasActiveFilters && !showFilters && (
        <div className="flex flex-wrap items-center gap-2 mt-4">
          <span className="text-sm font-medium text-gray-700">Active filters:</span>

          {localFilters.platform && (
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-primary/20 text-dark rounded-full text-sm">
              Platform: {localFilters.platform}
              <button
                onClick={() => handleFilterUpdate('platform', '')}
                className="hover:text-gray-900"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </span>
          )}

          {localFilters.category && (
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-primary/20 text-dark rounded-full text-sm">
              Category: {localFilters.category}
              <button
                onClick={() => handleFilterUpdate('category', '')}
                className="hover:text-gray-900"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </span>
          )}

          {localFilters.languages && localFilters.languages.length > 0 && (
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-primary/20 text-dark rounded-full text-sm">
              {localFilters.languages.length} language(s)
              <button
                onClick={() => handleFilterUpdate('languages', [])}
                className="hover:text-gray-900"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </span>
          )}

          {localFilters.follower_range && (
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-primary/20 text-dark rounded-full text-sm">
              Followers: {localFilters.follower_range}
              <button
                onClick={() => handleFilterUpdate('follower_range', '')}
                className="hover:text-gray-900"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </span>
          )}

          {localFilters.min_rating && (
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-primary/20 text-dark rounded-full text-sm">
              Rating: {REVIEW_FILTERS.find(r => r.value === localFilters.min_rating)?.label}
              <button
                onClick={() => handleFilterUpdate('min_rating', '')}
                className="hover:text-gray-900"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </span>
          )}

          {localFilters.price_range && (
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-primary/20 text-dark rounded-full text-sm">
              Price: {localFilters.price_range}
              <button
                onClick={() => handleFilterUpdate('price_range', '')}
                className="hover:text-gray-900"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </span>
          )}

          <button
            onClick={clearFilters}
            className="text-sm text-primary hover:text-primary-dark font-medium"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
};

export default SearchFilterBar;
