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
      // Reset form
      setApplicationMessage('');
      setProposedPrice('');
      setDeliverables(['']);
      // Refetch campaign data to get updated has_applied status
      await fetchCampaignData();
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
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-primary/10 text-primary-dark">
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
              <div className="px-6 py-3 bg-primary/10 text-primary-dark font-medium rounded-lg">
                Application Submitted
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            <div className="bg-white rounded-3xl shadow-sm hover:shadow-md p-6 transition-shadow">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Campaign Overview</h2>
              <p className="text-gray-700 whitespace-pre-wrap">{campaign.description}</p>
            </div>

            {/* Campaign Objective */}
            {campaign.objective && (
              <div className="bg-white rounded-3xl shadow-sm hover:shadow-md p-6 transition-shadow">
                <h2 className="text-xl font-bold text-gray-900 mb-2">Campaign Objective</h2>
                <p className="text-lg text-primary font-semibold">{campaign.objective}</p>
                {campaign.additional_notes && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-sm font-medium text-gray-700 mb-2">Brand Guidelines:</p>
                    <p className="text-gray-600">{campaign.additional_notes}</p>
                  </div>
                )}
              </div>
            )}

            {/* Milestones & Deliverables - What You'll Create */}
            {campaign.milestones && Array.isArray(campaign.milestones) && campaign.milestones.length > 0 && (
              <div className="bg-white rounded-3xl shadow-sm hover:shadow-md p-6 transition-shadow">
                <h2 className="text-xl font-bold text-gray-900 mb-2">What You'll Create</h2>
                <p className="text-sm text-gray-600 mb-4">Here's the breakdown of deliverables and payment schedule</p>
                <div className="space-y-4">
                  {campaign.milestones.map((milestone, idx) => (
                    <div key={idx} className="bg-primary/10 rounded-2xl p-4 border-2 border-primary/20">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                            <span className="bg-primary text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">
                              {idx + 1}
                            </span>
                            {milestone.name}
                          </h3>
                          {milestone.due_date && (
                            <p className="text-sm text-gray-600 ml-8 mt-1">
                              Due: {new Date(milestone.due_date).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        {milestone.budget_allocation && (
                          <div className="text-right bg-white rounded-xl px-3 py-2">
                            <p className="text-xs text-gray-600">You'll Earn</p>
                            <p className="text-lg font-bold text-primary">${milestone.budget_allocation}</p>
                          </div>
                        )}
                      </div>

                      {/* Structured Deliverables */}
                      {milestone.deliverables && milestone.deliverables.length > 0 && (
                        <div className="ml-8 space-y-2">
                          <p className="text-xs font-medium text-gray-700 uppercase">Your Deliverables:</p>
                          {milestone.deliverables.map((deliverable, delIdx) => (
                            <div key={delIdx} className="flex items-center gap-2 text-sm text-gray-700 bg-white rounded-lg p-2">
                              <svg className="w-4 h-4 text-primary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span>
                                Create <strong>{deliverable.quantity}×</strong> {deliverable.platform} {deliverable.content_type}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Total Earnings Summary */}
                {campaign.milestones.some(m => m.budget_allocation) && (
                  <div className="mt-4 bg-primary rounded-2xl p-4">
                    <div className="flex items-center justify-between text-white">
                      <span className="font-medium">Total Potential Earnings:</span>
                      <span className="text-2xl font-bold">
                        ${campaign.milestones.reduce((sum, m) => sum + (parseFloat(m.budget_allocation) || 0), 0)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Target Audience */}
            {campaign.target_audience && typeof campaign.target_audience === 'string' && campaign.target_audience.trim() !== '' && (
              <div className="bg-white rounded-3xl shadow-sm hover:shadow-md p-6 transition-shadow">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Target Audience</h2>
                <p className="text-gray-700">{campaign.target_audience}</p>
              </div>
            )}

            {/* Packages */}
            {packages.length > 0 && (
              <div className="bg-white rounded-3xl shadow-sm hover:shadow-md p-6 transition-shadow">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Available Packages ({packages.length})</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {packages.map((pkg) => (
                    <div key={pkg.id} className="border-2 border-gray-200 rounded-2xl p-4 hover:border-primary transition-colors">
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
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Campaign Details Card */}
            <div className="bg-white rounded-3xl shadow-sm hover:shadow-md p-6 transition-shadow">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Campaign Details</h3>
              <div className="space-y-4">
                <div className="bg-primary/10 rounded-xl p-3">
                  <p className="text-xs text-gray-600 mb-1">Total Budget</p>
                  <p className="text-2xl font-bold text-primary">${campaign.budget}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-1">Campaign Period</p>
                  <p className="text-sm text-gray-900 font-medium">
                    {new Date(campaign.start_date).toLocaleDateString()}
                  </p>
                  <p className="text-xs text-gray-500">to</p>
                  <p className="text-sm text-gray-900 font-medium">
                    {new Date(campaign.end_date).toLocaleDateString()}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    ({Math.ceil((new Date(campaign.end_date) - new Date(campaign.start_date)) / (1000 * 60 * 60 * 24))} days)
                  </p>
                </div>
                {campaign.application_deadline && (
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Application Deadline</p>
                    <p className="text-sm text-gray-900 font-medium">
                      {new Date(campaign.application_deadline).toLocaleDateString()}
                    </p>
                  </div>
                )}
                <div className="pt-3 border-t border-gray-200">
                  <div className="text-center p-2 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-600">Milestones</p>
                    <p className="text-xl font-bold text-gray-900">{campaign.milestones?.length || 0}</p>
                  </div>
                </div>
                {campaign.participation_type && (
                  <div className="pt-3 border-t border-gray-200">
                    <p className="text-xs text-gray-600 mb-2">How to Join</p>
                    <span className="inline-block px-3 py-1 bg-primary/20 text-primary-dark text-xs font-medium rounded-full">
                      {campaign.participation_type === 'packages' && 'Select Fixed Package'}
                      {campaign.participation_type === 'proposals' && 'Submit Custom Proposal'}
                      {campaign.participation_type === 'both' && 'Package or Proposal'}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Brand Info */}
            {campaign.brand && (
              <div className="bg-white rounded-3xl shadow-sm hover:shadow-md p-6 transition-shadow">
                <h3 className="text-lg font-bold text-gray-900 mb-4">About the Brand</h3>
                <div className="mb-4">
                  <p className="text-lg text-gray-900 font-bold mb-1">{campaign.brand.company_name}</p>
                  {campaign.brand.industry && (
                    <p className="text-xs text-gray-600 mb-2">{campaign.brand.industry}</p>
                  )}
                  {campaign.brand.description && (
                    <p className="text-sm text-gray-700 mt-3">{campaign.brand.description}</p>
                  )}
                </div>
                {campaign.brand.location && (
                  <div className="pt-3 border-t border-gray-200">
                    <p className="text-xs text-gray-600">Location</p>
                    <p className="text-sm text-gray-900 font-medium">{campaign.brand.location}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Apply Modal */}
      {showApplyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 md:p-8 my-8 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Apply to Campaign</h2>
              <button
                onClick={() => {
                  setShowApplyModal(false);
                  setApplicationMessage('');
                  setProposedPrice('');
                  setDeliverables(['']);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Campaign Deliverables Reference */}
            {campaign.milestones && campaign.milestones.length > 0 && (
              <div className="mb-6 bg-primary/10 rounded-2xl p-4 border border-primary/20">
                <p className="text-sm font-medium text-gray-900 mb-2">Campaign Requirements:</p>
                <div className="space-y-1">
                  {campaign.milestones.map((milestone, idx) =>
                    milestone.deliverables && milestone.deliverables.length > 0 && (
                      <div key={idx} className="text-sm text-gray-700">
                        • {milestone.deliverables.map(d => `${d.quantity}× ${d.platform} ${d.content_type}`).join(', ')}
                      </div>
                    )
                  )}
                </div>
              </div>
            )}

            {/* Proposed Price */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Proposed Price <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">$</span>
                <input
                  type="number"
                  value={proposedPrice}
                  onChange={(e) => setProposedPrice(e.target.value)}
                  step="0.01"
                  min="0"
                  className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                  placeholder="0.00"
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">Campaign budget: <span className="font-semibold text-primary">${campaign.budget}</span></p>
            </div>

            {/* Deliverables */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Proposed Deliverables <span className="text-red-500">*</span>
              </label>
              <p className="text-xs text-gray-500 mb-3">Describe what you'll deliver based on the campaign requirements above</p>
              <div className="space-y-3">
                {deliverables.map((deliverable, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={deliverable}
                      onChange={(e) => handleDeliverableChange(index, e.target.value)}
                      className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                      placeholder="e.g., 2 Instagram Reels + 1 TikTok Video"
                    />
                    {deliverables.length > 1 && (
                      <button
                        onClick={() => handleRemoveDeliverable(index)}
                        className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-xl transition-colors"
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
                className="mt-3 text-sm text-primary hover:text-primary-dark font-medium flex items-center gap-1 transition-colors"
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
                Why You're Perfect for This Campaign (Optional)
              </label>
              <textarea
                value={applicationMessage}
                onChange={(e) => setApplicationMessage(e.target.value)}
                rows={4}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary transition-all resize-none"
                placeholder="Share your relevant experience, past campaign results, or why this brand aligns with your content style..."
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleApply}
                disabled={applying}
                className="flex-1 px-6 py-4 bg-primary hover:bg-primary-dark text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
              >
                {applying ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Submitting...
                  </span>
                ) : (
                  'Submit Application'
                )}
              </button>
              <button
                onClick={() => {
                  setShowApplyModal(false);
                  setApplicationMessage('');
                  setProposedPrice('');
                  setDeliverables(['']);
                }}
                disabled={applying}
                className="px-6 py-4 border-2 border-gray-300 hover:border-gray-400 text-gray-700 font-medium rounded-xl transition-all disabled:opacity-50"
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
