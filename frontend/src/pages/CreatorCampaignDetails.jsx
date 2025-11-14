import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { campaignsAPI } from '../services/api';
import Navbar from '../components/Navbar';
import toast from 'react-hot-toast';

const CreatorCampaignDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState(null);
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [applicationMessage, setApplicationMessage] = useState('');
  const [proposedPrice, setProposedPrice] = useState('');
  const [deliverables, setDeliverables] = useState(['']);
  const [hasApplied, setHasApplied] = useState(false);

  useEffect(() => {
    fetchCampaignData();
  }, [id]);

  const fetchCampaignData = async () => {
    try {
      setLoading(true);
      const [campaignRes, packagesRes] = await Promise.all([
        campaignsAPI.getCampaign(id),
        campaignsAPI.getCampaignPackages(id)
      ]);

      setCampaign(campaignRes.data);
      setPackages(packagesRes.data.packages || []);
      setHasApplied(campaignRes.data.has_applied || false);
    } catch (error) {
      console.error('Error fetching campaign data:', error);
      toast.error('Failed to load campaign details');
    } finally {
      setLoading(false);
    }
  };

  const handleAddDeliverable = () => {
    setDeliverables([...deliverables, '']);
  };

  const handleRemoveDeliverable = (index) => {
    setDeliverables(deliverables.filter((_, i) => i !== index));
  };

  const handleDeliverableChange = (index, value) => {
    const newDeliverables = [...deliverables];
    newDeliverables[index] = value;
    setDeliverables(newDeliverables);
  };

  const handleApply = async () => {
    // Validation
    if (!proposedPrice || proposedPrice <= 0) {
      toast.error('Please enter a valid proposed price');
      return;
    }

    const validDeliverables = deliverables.filter(d => d.trim() !== '');
    if (validDeliverables.length === 0) {
      toast.error('Please add at least one deliverable');
      return;
    }

    try {
      setApplying(true);
      await campaignsAPI.applyToCampaign(id, {
        message: applicationMessage,
        proposed_price: parseFloat(proposedPrice),
        deliverables: validDeliverables
      });
      toast.success('Application submitted successfully!');
      setShowApplyModal(false);
      setHasApplied(true);
      // Reset form
      setApplicationMessage('');
      setProposedPrice('');
      setDeliverables(['']);
    } catch (error) {
      console.error('Error applying to campaign:', error);
      toast.error(error.response?.data?.error || 'Failed to submit application');
    } finally {
      setApplying(false);
    }
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
          <Link to="/creator/campaigns" className="text-primary hover:text-primary-dark">
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
            to="/creator/campaigns"
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
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                  Active
                </span>
              </div>
              <p className="text-gray-600">{campaign.category}</p>
            </div>

            {!hasApplied && campaign.status === 'active' && (
              <button
                onClick={() => setShowApplyModal(true)}
                className="px-6 py-3 bg-primary hover:bg-primary-dark text-white font-medium rounded-lg transition-colors"
              >
                Apply Now
              </button>
            )}

            {hasApplied && (
              <div className="px-6 py-3 bg-blue-100 text-blue-800 font-medium rounded-lg">
                Application Submitted
              </div>
            )}
          </div>
        </div>

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

            {/* Packages */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Campaign Packages ({packages.length})</h2>

              {packages.length === 0 ? (
                <p className="text-gray-600">No packages added yet.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {packages.map((pkg) => (
                    <div key={pkg.id} className="border border-gray-200 rounded-lg p-4">
                      <h3 className="font-bold text-gray-900 mb-2">{pkg.title}</h3>
                      <p className="text-gray-600 text-sm mb-3 line-clamp-2">{pkg.description}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-xl font-bold text-primary">${pkg.price}</span>
                        <Link
                          to={`/packages/${pkg.id}`}
                          className="text-sm text-primary hover:text-primary-dark font-medium"
                        >
                          View Details →
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Stats Card */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Campaign Details</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600">Budget</p>
                  <p className="text-2xl font-bold text-gray-900">${campaign.budget}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Start Date</p>
                  <p className="text-gray-900">{new Date(campaign.start_date).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">End Date</p>
                  <p className="text-gray-900">{new Date(campaign.end_date).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Duration</p>
                  <p className="text-gray-900">
                    {Math.ceil((new Date(campaign.end_date) - new Date(campaign.start_date)) / (1000 * 60 * 60 * 24))} days
                  </p>
                </div>
              </div>
            </div>

            {/* Brand Info */}
            {campaign.brand && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Brand</h3>
                <p className="text-gray-900 font-medium mb-2">{campaign.brand.company_name}</p>
                {campaign.brand.description && (
                  <p className="text-sm text-gray-600 mb-3">{campaign.brand.description}</p>
                )}
                {campaign.brand.location && (
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Location:</span> {campaign.brand.location}
                  </p>
                )}
                {campaign.brand.industry && (
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Industry:</span> {campaign.brand.industry}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Apply Modal */}
      {showApplyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6 my-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Apply to Campaign</h2>

            {/* Proposed Price */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Proposed Price <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="number"
                  value={proposedPrice}
                  onChange={(e) => setProposedPrice(e.target.value)}
                  step="0.01"
                  min="0"
                  className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="0.00"
                />
              </div>
              <p className="text-sm text-gray-500 mt-1">Campaign budget: ${campaign.budget}</p>
            </div>

            {/* Deliverables */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Deliverables <span className="text-red-500">*</span>
              </label>
              <div className="space-y-3">
                {deliverables.map((deliverable, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={deliverable}
                      onChange={(e) => handleDeliverableChange(index, e.target.value)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="e.g., 2 Instagram posts, 1 TikTok video"
                    />
                    {deliverables.length > 1 && (
                      <button
                        onClick={() => handleRemoveDeliverable(index)}
                        className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                onClick={handleAddDeliverable}
                className="mt-3 text-sm text-primary hover:text-primary-dark font-medium flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Another Deliverable
              </button>
            </div>

            {/* Application Message */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Application Message (Optional)
              </label>
              <textarea
                value={applicationMessage}
                onChange={(e) => setApplicationMessage(e.target.value)}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Tell the brand why you're a great fit for this campaign..."
              />
            </div>

            {/* Actions */}
            <div className="flex gap-4">
              <button
                onClick={handleApply}
                disabled={applying}
                className="flex-1 px-6 py-3 bg-primary hover:bg-primary-dark text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {applying ? 'Submitting...' : 'Submit Application'}
              </button>
              <button
                onClick={() => {
                  setShowApplyModal(false);
                  setApplicationMessage('');
                  setProposedPrice('');
                  setDeliverables(['']);
                }}
                disabled={applying}
                className="px-6 py-3 border-2 border-gray-300 hover:border-gray-400 text-gray-700 font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreatorCampaignDetails;
