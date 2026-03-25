import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { campaignsAPI, packagesAPI, BASE_URL } from '../services/api';
import Navbar from '../components/Navbar';
import toast from 'react-hot-toast';
import { Search, Package, Check } from 'lucide-react';
import { PLATFORM_CONFIGS } from '../constants/platformConfig';

const CampaignPackageBrowser = () => {
  const { campaignId } = useParams();
  const navigate = useNavigate();

  const [campaign, setCampaign] = useState(null);
  const [packages, setPackages] = useState([]);
  const [selectedPackages, setSelectedPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    platform_type: '',
    price_range: '',
    sort_by: 'relevance'
  });

  useEffect(() => {
    fetchCampaignAndPackages();
  }, [campaignId, filters]);

  const fetchCampaignAndPackages = async () => {
    try {
      setLoading(true);

      // Fetch campaign details
      const campaignResponse = await campaignsAPI.getCampaign(campaignId);
      setCampaign(campaignResponse.data);

      // Fetch packages with filters
      const params = {
        per_page: 100,
        ...filters
      };

      // Apply campaign targeting if available
      if (campaignResponse.data.target_categories?.length > 0) {
        params.category = campaignResponse.data.target_categories[0];
      }

      // Remove empty filters
      Object.keys(params).forEach(key => {
        if (params[key] === '' || params[key] === null) {
          delete params[key];
        }
      });

      const packagesResponse = await packagesAPI.getPackages(params);
      setPackages(packagesResponse.data.packages || []);
    } catch (error) {
      console.error('Error fetching campaign/packages:', error);
      toast.error('Failed to load packages');
    } finally {
      setLoading(false);
    }
  };

  const handlePackageSelect = (pkg) => {
    setSelectedPackages(prev => {
      const exists = prev.find(p => p.id === pkg.id);
      if (exists) {
        return prev.filter(p => p.id !== pkg.id);
      } else {
        return [...prev, pkg];
      }
    });
  };

  const handleAddToCampaign = async () => {
    if (selectedPackages.length === 0) {
      toast.error('Please select at least one package');
      return;
    }

    try {
      setLoading(true);

      // Add each selected package to campaign
      for (const pkg of selectedPackages) {
        await campaignsAPI.addPackageToCampaign(campaignId, pkg.id);
      }

      toast.success(`Added ${selectedPackages.length} package(s) to campaign!`);
      navigate('/brand/campaigns');
    } catch (error) {
      console.error('Error adding packages to campaign:', error);
      toast.error(error.response?.data?.error || 'Failed to add packages to campaign');
    } finally {
      setLoading(false);
    }
  };

  const filteredPackages = packages.filter(pkg =>
    pkg.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    pkg.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    pkg.creator?.display_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalCost = selectedPackages.reduce((sum, pkg) => sum + parseFloat(pkg.price || 0), 0);

  if (loading && !campaign) {
    return (
      <div className="min-h-screen bg-light">
        <Navbar />
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-light">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            to="/brand/campaigns"
            className="text-gray-600 hover:text-gray-900 flex items-center gap-2 mb-4"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Campaigns
          </Link>

          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Browse Packages for Campaign
          </h1>
          {campaign && (
            <p className="text-gray-600">
              {campaign.title} • Budget: ${campaign.budget}
            </p>
          )}
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-3xl shadow-sm p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search packages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            {/* Platform Filter */}
            <select
              value={filters.platform_type}
              onChange={(e) => setFilters(prev => ({ ...prev, platform_type: e.target.value }))}
              className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="">All Platforms</option>
              <option value="Instagram">Instagram</option>
              <option value="TikTok">TikTok</option>
              <option value="YouTube">YouTube</option>
              <option value="Facebook">Facebook</option>
              <option value="Twitter">Twitter</option>
              <option value="LinkedIn">LinkedIn</option>
            </select>

            {/* Sort */}
            <select
              value={filters.sort_by}
              onChange={(e) => setFilters(prev => ({ ...prev, sort_by: e.target.value }))}
              className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="relevance">Relevance</option>
              <option value="price_low">Price: Low to High</option>
              <option value="price_high">Price: High to Low</option>
              <option value="newest">Newest</option>
            </select>
          </div>
        </div>

        {/* Selected Packages Summary */}
        {selectedPackages.length > 0 && (
          <div className="bg-primary/10 rounded-3xl p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-gray-900">Selected Packages</h3>
                <p className="text-sm text-gray-600">
                  {selectedPackages.length} package{selectedPackages.length !== 1 ? 's' : ''} selected
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Total Cost</p>
                <p className="text-2xl font-bold text-gray-900">${totalCost.toFixed(2)}</p>
                {campaign && totalCost > parseFloat(campaign.budget) && (
                  <p className="text-xs text-red-600 mt-1">⚠️ Exceeds campaign budget</p>
                )}
              </div>
            </div>

            <button
              onClick={handleAddToCampaign}
              disabled={loading || (campaign && totalCost > parseFloat(campaign.budget))}
              className="w-full bg-primary hover:bg-primary-dark text-white font-medium py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Adding to Campaign...' : `Add ${selectedPackages.length} Package(s) to Campaign`}
            </button>
          </div>
        )}

        {/* Packages Grid */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : filteredPackages.length === 0 ? (
          <div className="bg-white rounded-3xl shadow-sm text-center py-20">
            <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No packages found</h3>
            <p className="text-gray-600">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPackages.map((pkg) => {
              const isSelected = selectedPackages.find(p => p.id === pkg.id);

              return (
                <div
                  key={pkg.id}
                  onClick={() => handlePackageSelect(pkg)}
                  className={`bg-white rounded-3xl shadow-sm hover:shadow-md transition-all cursor-pointer border-2 ${
                    isSelected ? 'border-primary' : 'border-transparent'
                  }`}
                >
                  <div className="p-6">
                    {/* Selection Indicator */}
                    <div className="flex items-start justify-between mb-4">
                      {pkg.platform_type && PLATFORM_CONFIGS[pkg.platform_type] && (
                        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg ${PLATFORM_CONFIGS[pkg.platform_type].bgColor}`}>
                          <svg className={`w-4 h-4 ${PLATFORM_CONFIGS[pkg.platform_type].color}`} viewBox="0 0 24 24" fill="currentColor">
                            {PLATFORM_CONFIGS[pkg.platform_type].icon}
                          </svg>
                          <span className={`text-sm font-medium ${PLATFORM_CONFIGS[pkg.platform_type].color}`}>
                            {pkg.platform_type}
                          </span>
                        </div>
                      )}

                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                        isSelected ? 'bg-primary border-primary' : 'border-gray-300'
                      }`}>
                        {isSelected && <Check className="w-4 h-4 text-white" />}
                      </div>
                    </div>

                    {/* Creator Info */}
                    {pkg.creator && (
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-100">
                          {pkg.creator.profile_picture ? (
                            <img
                              src={`${BASE_URL}${pkg.creator.profile_picture}`}
                              alt={pkg.creator.display_name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">
                            {pkg.creator.display_name || pkg.creator.username}
                          </p>
                          {pkg.creator.total_followers && (
                            <p className="text-sm text-gray-600">
                              {pkg.creator.total_followers.toLocaleString()} followers
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Package Title */}
                    <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                      {pkg.title}
                    </h3>

                    {/* Package Description */}
                    {pkg.description && (
                      <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                        {pkg.description}
                      </p>
                    )}

                    {/* Delivery Time */}
                    <div className="flex items-center gap-2 mb-4 text-sm text-gray-600">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{pkg.duration_days} days delivery</span>
                    </div>

                    {/* Price */}
                    <div className="flex items-center justify-between pt-4 border-t">
                      <span className="text-2xl font-bold text-gray-900">
                        ${pkg.price}
                      </span>
                      <span className={`text-sm font-medium ${isSelected ? 'text-primary' : 'text-gray-500'}`}>
                        {isSelected ? 'Selected' : 'Click to select'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Bottom action bar for selected packages (sticky on mobile) */}
        {selectedPackages.length > 0 && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 md:hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">
                {selectedPackages.length} selected • ${totalCost.toFixed(2)}
              </span>
            </div>
            <button
              onClick={handleAddToCampaign}
              disabled={loading || (campaign && totalCost > parseFloat(campaign.budget))}
              className="w-full bg-primary hover:bg-primary-dark text-white font-medium py-3 rounded-xl transition-colors disabled:opacity-50"
            >
              Add to Campaign
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CampaignPackageBrowser;
