import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { campaignsAPI, packagesAPI } from '../services/api';
import Navbar from '../components/Navbar';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import Avatar from '../components/Avatar';

const CampaignDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [campaign, setCampaign] = useState(null);
  const [packages, setPackages] = useState([]);
  const [applications, setApplications] = useState([]);
  const [availablePackages, setAvailablePackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [showAddPackageModal, setShowAddPackageModal] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const isBrand = user?.user_type === 'brand';

  useEffect(() => {
    fetchCampaignData();
  }, [id]);

  const fetchCampaignData = async () => {
    try {
      setLoading(true);
      const [campaignRes, packagesRes, applicationsRes] = await Promise.all([
        campaignsAPI.getCampaign(id),
        campaignsAPI.getCampaignPackages(id),
        isBrand ? campaignsAPI.getCampaignApplications(id) : Promise.resolve({ data: { applications: [] } })
      ]);

      setCampaign(campaignRes.data);
      setPackages(packagesRes.data.packages || []);
      setApplications(applicationsRes.data.applications || []);

      // Fetch available packages for adding
      if (isBrand) {
        const allPackagesRes = await packagesAPI.getPackages({ per_page: 100 });
        const campaignPackageIds = (packagesRes.data.packages || []).map(p => p.id);
        setAvailablePackages(
          (allPackagesRes.data.packages || []).filter(
            pkg => !campaignPackageIds.includes(pkg.id)
          )
        );
      }
    } catch (error) {
      console.error('Error fetching campaign data:', error);
      toast.error('Failed to load campaign details');
    } finally {
      setLoading(false);
    }
  };

  // Filter packages based on search and category
  const filteredPackages = availablePackages.filter(pkg => {
    const matchesSearch = pkg.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         pkg.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || pkg.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Get unique categories from available packages
  const categories = ['all', ...new Set(availablePackages.map(pkg => pkg.category).filter(Boolean))];

  const handleAddPackage = async (packageId) => {
    try {
      await campaignsAPI.addPackageToCampaign(id, packageId);
      toast.success('Package added to campaign');
      setShowAddPackageModal(false);
      setSelectedPackage('');
      setSearchQuery('');
      setCategoryFilter('all');
      fetchCampaignData();
    } catch (error) {
      console.error('Error adding package:', error);
      toast.error(error.response?.data?.error || 'Failed to add package');
    }
  };

  const handleRemovePackage = async (packageId) => {
    if (!window.confirm('Remove this package from the campaign?')) {
      return;
    }

    try {
      await campaignsAPI.removePackageFromCampaign(id, packageId);
      toast.success('Package removed from campaign');
      fetchCampaignData();
    } catch (error) {
      console.error('Error removing package:', error);
      toast.error('Failed to remove package');
    }
  };

  const handleUpdateApplication = async (applicationId, status, application) => {
    if (status === 'accepted') {
      // Redirect to payment page for acceptance
      const app = applications.find(a => a.id === applicationId) || application;
      localStorage.setItem('payment_context', JSON.stringify({
        application_id: applicationId,
        campaign_id: id,
        creator_id: app.creator_id,
        type: 'campaign_application',
        amount: app.proposed_price,
        payment_category: 'campaign',
        booking_type: 'campaign_application'
      }));
      navigate(`/brand/payment/campaign-application/${id}`);
      return;
    }

    // For rejection, proceed normally
    try {
      await campaignsAPI.updateApplicationStatus(id, applicationId, status);
      toast.success(`Application ${status}`);
      fetchCampaignData();
    } catch (error) {
      console.error('Error updating application:', error);
      toast.error('Failed to update application');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      draft: 'bg-gray-100 text-gray-800',
      active: 'bg-primary text-primary-dark',
      paused: 'bg-primary text-primary-dark',
      completed: 'bg-primary text-primary-dark',
      pending: 'bg-primary text-primary-dark',
      accepted: 'bg-primary text-primary-dark',
      rejected: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Campaign not found</h2>
          <Link to="/brand/campaigns" className="text-primary hover:text-primary-dark">
            Back to Campaigns
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            to={isBrand ? "/brand/campaigns" : "/creator/campaigns"}
            className="text-gray-600 hover:text-gray-900 flex items-center gap-2 mb-4"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Campaigns
          </Link>

          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-gray-900">{campaign.title}</h1>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(campaign.status)}`}>
                  {campaign.status}
                </span>
              </div>
              <p className="text-gray-600">{campaign.category}</p>
            </div>

            {isBrand && (
              <Link
                to={`/brand/campaigns/${id}/edit`}
                className="px-6 py-3 bg-primary hover:bg-primary-dark text-white font-medium rounded-lg transition-colors"
              >
                Edit Campaign
              </Link>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === 'overview'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('packages')}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === 'packages'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Packages ({packages.length})
            </button>
            {isBrand && (
              <button
                onClick={() => setActiveTab('applications')}
                className={`px-4 py-2 font-medium transition-colors ${
                  activeTab === 'applications'
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Applications ({applications.length})
              </button>
            )}
          </div>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Description */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Description</h2>
                <p className="text-gray-700 whitespace-pre-wrap">{campaign.description}</p>
              </div>

              {/* Objectives */}
              {campaign.objectives && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Objectives</h2>
                  <p className="text-gray-700 whitespace-pre-wrap">{campaign.objectives}</p>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Stats Card */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Campaign Stats</h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600">Budget</p>
                    <p className="text-2xl font-bold text-gray-900">${campaign.budget}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Duration</p>
                    <p className="text-gray-900">
                      {new Date(campaign.start_date).toLocaleDateString()} - {new Date(campaign.end_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Packages</p>
                    <p className="text-xl font-bold text-gray-900">{packages.length}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Applications</p>
                    <p className="text-xl font-bold text-gray-900">{applications.length}</p>
                  </div>
                </div>
              </div>

              {/* Brand Info */}
              {campaign.brand && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Brand</h3>
                  <p className="text-gray-900 font-medium">{campaign.brand.company_name}</p>
                  {campaign.brand.location && (
                    <p className="text-sm text-gray-600 mt-1">{campaign.brand.location}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Packages Tab */}
        {activeTab === 'packages' && (
          <div>
            {isBrand && (
              <div className="mb-6">
                <button
                  onClick={() => setShowAddPackageModal(true)}
                  className="px-6 py-3 bg-primary hover:bg-primary-dark text-white font-medium rounded-lg transition-colors flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Package
                </button>
              </div>
            )}

            {packages.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <p className="text-gray-600">No packages added to this campaign yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {packages.map((pkg) => (
                  <div key={pkg.id} className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-2">{pkg.title}</h3>
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">{pkg.description}</p>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-2xl font-bold text-primary">${pkg.price}</span>
                      <span className="text-sm text-gray-600">{pkg.duration_days} days</span>
                    </div>
                    <div className="flex gap-2">
                      <Link
                        to={`/packages/${pkg.id}`}
                        className="flex-1 px-4 py-2 border-2 border-gray-300 hover:border-gray-400 text-gray-700 text-sm font-medium rounded-lg transition-colors text-center"
                      >
                        View Details
                      </Link>
                      {isBrand && (
                        <button
                          onClick={() => handleRemovePackage(pkg.id)}
                          className="px-4 py-2 border-2 border-red-300 hover:border-red-400 text-red-600 text-sm font-medium rounded-lg transition-colors"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Applications Tab (Brand only) */}
        {activeTab === 'applications' && isBrand && (
          <div>
            {applications.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <p className="text-gray-600">No applications received yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {applications.map((app) => (
                  <div key={app.id} className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-start gap-6">
                      {/* Creator Info Section */}
                      <div className="flex-shrink-0">
                        <Link to={`/creators/${app.creator_id}`} className="block">
                          <Avatar
                            src={app.creator?.profile_picture}
                            alt={app.creator?.user?.email?.split('@')[0] || 'Creator'}
                            size="lg"
                            type="user"
                          />
                        </Link>
                      </div>

                      {/* Application Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <Link
                              to={`/creators/${app.creator_id}`}
                              className="text-lg font-bold text-gray-900 hover:text-primary"
                            >
                              {app.creator?.user?.email?.split('@')[0] || 'Creator'}
                            </Link>
                            <div className="flex items-center gap-3 mt-1">
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(app.status)}`}>
                                {app.status}
                              </span>
                              {app.creator?.follower_count && (
                                <span className="text-sm text-gray-600">
                                  {app.creator.follower_count.toLocaleString()} followers
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                          {/* Proposed Price */}
                          <div className="bg-gray-50 rounded-lg p-4">
                            <p className="text-sm font-medium text-gray-700 mb-1">Proposed Price</p>
                            <p className="text-2xl font-bold text-primary">${app.proposed_price}</p>
                          </div>

                          {/* Applied Date */}
                          <div className="bg-gray-50 rounded-lg p-4">
                            <p className="text-sm font-medium text-gray-700 mb-1">Applied</p>
                            <p className="text-lg font-semibold text-gray-900">
                              {new Date(app.applied_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>

                        {/* Deliverables */}
                        {app.deliverables && app.deliverables.length > 0 && (
                          <div className="mb-4">
                            <p className="text-sm font-medium text-gray-700 mb-2">Proposed Deliverables:</p>
                            <ul className="space-y-1">
                              {app.deliverables.map((deliverable, idx) => (
                                <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                                  <svg className="w-5 h-5 text-primary-dark flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                  <span>{deliverable}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Application Message */}
                        {app.application_message && (
                          <div className="mb-4">
                            <p className="text-sm font-medium text-gray-700 mb-2">Message:</p>
                            <p className="text-gray-600 bg-gray-50 rounded-lg p-3">{app.application_message}</p>
                          </div>
                        )}

                        {/* Actions */}
                        {app.status === 'pending' && (
                          <div className="flex gap-3 pt-4 border-t border-gray-200">
                            <button
                              onClick={() => handleUpdateApplication(app.id, 'accepted', app)}
                              className="flex-1 px-6 py-3 bg-primary hover:bg-primary text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Accept Application
                            </button>
                            <button
                              onClick={() => handleUpdateApplication(app.id, 'rejected')}
                              className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                              Reject Application
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Package Modal - Gallery Style */}
      {showAddPackageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-900">Add Package to Campaign</h2>
                <button
                  onClick={() => {
                    setShowAddPackageModal(false);
                    setSelectedPackage('');
                    setSearchQuery('');
                    setCategoryFilter('all');
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Search and Filters */}
              <div className="flex flex-col sm:flex-row gap-4">
                {/* Search Bar */}
                <div className="flex-1 relative">
                  <svg className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search packages..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>

                {/* Category Filter */}
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>
                      {cat === 'all' ? 'All Categories' : cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Results Count */}
              <p className="text-sm text-gray-600 mt-3">
                {filteredPackages.length} {filteredPackages.length === 1 ? 'package' : 'packages'} available
              </p>
            </div>

            {/* Package Gallery - Scrollable */}
            <div className="flex-1 overflow-y-auto p-6">
              {filteredPackages.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-700 mb-2">No packages found</h3>
                  <p className="text-gray-500">
                    {availablePackages.length === 0
                      ? 'All available packages have been added to this campaign.'
                      : 'Try adjusting your search or filters.'
                    }
                  </p>
                  {availablePackages.length === 0 && (
                    <Link
                      to="/browse/packages"
                      className="inline-block mt-4 text-primary hover:text-primary-dark font-medium"
                    >
                      Browse more packages
                    </Link>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredPackages.map((pkg) => (
                    <div
                      key={pkg.id}
                      className={`bg-white border-2 rounded-lg p-4 transition-all cursor-pointer hover:shadow-lg ${
                        selectedPackage === pkg.id
                          ? 'border-primary bg-primary/5'
                          : 'border-gray-200 hover:border-primary/50'
                      }`}
                      onClick={() => setSelectedPackage(pkg.id)}
                    >
                      {/* Package Visual Header */}
                      <div className="mb-4">
                        <div className="w-full h-32 bg-gradient-to-br from-primary/20 to-primary/5 rounded-lg flex items-center justify-center mb-3">
                          <svg className="w-12 h-12 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                          </svg>
                        </div>

                        {/* Category Badge */}
                        {pkg.category && (
                          <span className="inline-block px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded">
                            {pkg.category}
                          </span>
                        )}
                      </div>

                      {/* Package Info */}
                      <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-1">
                        {pkg.title}
                      </h3>
                      <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                        {pkg.description}
                      </p>

                      {/* Creator Info */}
                      {pkg.creator && (
                        <div className="flex items-center gap-2 mb-4">
                          <Avatar
                            src={pkg.creator.profile_picture}
                            alt={pkg.creator.user?.email?.split('@')[0] || 'Creator'}
                            size="xs"
                            type="user"
                          />
                          <div>
                            <p className="text-xs font-medium text-gray-700">
                              {pkg.creator.user?.email?.split('@')[0] || 'Creator'}
                            </p>
                            <p className="text-xs text-gray-500">
                              {pkg.creator.follower_count?.toLocaleString() || 0} followers
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Package Stats */}
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <p className="text-2xl font-bold text-primary">${pkg.price}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-600">{pkg.duration_days} days</p>
                        </div>
                      </div>

                      {/* Deliverables Preview */}
                      {pkg.deliverables && (
                        <div className="mb-4">
                          <p className="text-xs font-medium text-gray-700 mb-1">Deliverables:</p>
                          <p className="text-xs text-gray-600 line-clamp-2">{pkg.deliverables}</p>
                        </div>
                      )}

                      {/* Action Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddPackage(pkg.id);
                        }}
                        className="w-full px-4 py-2 bg-primary hover:bg-primary-dark text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Add to Campaign
                      </button>

                      {/* View Details Link */}
                      <Link
                        to={`/packages/${pkg.id}`}
                        target="_blank"
                        onClick={(e) => e.stopPropagation()}
                        className="block text-center text-sm text-primary hover:text-primary-dark mt-2"
                      >
                        View full details
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Click on a package card to select it, then click "Add to Campaign"
                </p>
                <button
                  onClick={() => {
                    setShowAddPackageModal(false);
                    setSelectedPackage('');
                    setSearchQuery('');
                    setCategoryFilter('all');
                  }}
                  className="px-6 py-2 border-2 border-gray-300 hover:border-gray-400 text-gray-700 font-medium rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CampaignDetails;
