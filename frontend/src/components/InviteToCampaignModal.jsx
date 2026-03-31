import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { campaignsAPI, packagesAPI } from '../services/api';
import toast from 'react-hot-toast';
import { X } from 'lucide-react';

const InviteToCampaignModal = ({ creatorId, creatorName, isOpen, onClose }) => {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState([]);
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [step, setStep] = useState(1); // 1: Select Campaign, 2: Select Package

  useEffect(() => {
    if (isOpen) {
      fetchBrandCampaigns();
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedCampaign) {
      fetchCreatorPackages();
    }
  }, [selectedCampaign]);

  const fetchBrandCampaigns = async () => {
    try {
      setLoading(true);
      const response = await campaignsAPI.getCampaigns({ per_page: 100 });
      // Only show active campaigns (drafts should prompt user to activate first)
      const activeCampaigns = response.data.campaigns.filter(c => c.status === 'active');
      setCampaigns(activeCampaigns);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      toast.error('Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  };

  const fetchCreatorPackages = async () => {
    try {
      setLoading(true);
      const response = await packagesAPI.getPackages({ creator_id: creatorId, per_page: 100 });
      setPackages(response.data.packages.filter(pkg => pkg.is_active));
    } catch (error) {
      console.error('Error fetching creator packages:', error);
      toast.error('Failed to load creator packages');
    } finally {
      setLoading(false);
    }
  };

  const handleCampaignSelect = (campaign) => {
    setSelectedCampaign(campaign);
    setStep(2);
  };

  const handlePackageSelect = async (pkg) => {
    setSelectedPackage(pkg);

    // Proceed to payment
    try {
      setLoading(true);

      // Add package to campaign (creates booking on backend)
      const response = await campaignsAPI.addPackageToCampaign(selectedCampaign.id, pkg.id);

      if (response.data.booking_id) {
        // Store payment context
        localStorage.setItem('payment_context', JSON.stringify({
          package_id: pkg.id,
          campaign_id: selectedCampaign.id,
          booking_id: response.data.booking_id,
          creator_id: creatorId,
          type: 'campaign_package',
          amount: pkg.price,
          payment_category: 'package',
          booking_type: 'campaign_invitation'
        }));

        // Navigate to payment page
        toast.success('Proceeding to payment...');
        navigate(`/brand/campaigns/payment/${response.data.booking_id}`);
        onClose();
      } else {
        toast.error('Failed to create invitation booking');
      }
    } catch (error) {
      console.error('Error creating invitation:', error);
      toast.error(error.response?.data?.error || 'Failed to create invitation');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (step === 2) {
      setStep(1);
      setSelectedCampaign(null);
      setSelectedPackage(null);
    } else {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      ></div>

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-3xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden transform transition-all">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Invite {creatorName} to Campaign
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {step === 1 ? 'Step 1: Select a campaign' : 'Step 2: Select a package'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(80vh - 140px)' }}>
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
            ) : step === 1 ? (
              /* Step 1: Campaign Selection */
              <div>
                {campaigns.length === 0 ? (
                  <div className="text-center py-12">
                    <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No active campaigns available</h3>
                    <p className="text-gray-600 mb-6">
                      You need to create and activate a campaign before inviting creators.
                    </p>
                    <button
                      onClick={() => {
                        navigate('/brand/campaigns/create');
                        onClose();
                      }}
                      className="px-6 py-3 bg-primary text-white rounded-xl hover:bg-primary-dark transition-colors font-medium"
                    >
                      Create Campaign
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {campaigns.map((campaign) => (
                      <button
                        key={campaign.id}
                        onClick={() => handleCampaignSelect(campaign)}
                        className="w-full text-left p-4 border-2 border-gray-200 rounded-xl hover:border-primary transition-all"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 mb-1">{campaign.title}</h3>
                            <p className="text-sm text-gray-600 line-clamp-2 mb-2">{campaign.description}</p>
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                {new Date(campaign.start_date).toLocaleDateString()} - {new Date(campaign.end_date).toLocaleDateString()}
                              </span>
                              <span className="flex items-center gap-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                ${campaign.budget}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <span className="inline-block px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
                              Active
                            </span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* Step 2: Package Selection */
              <div>
                {packages.length === 0 ? (
                  <div className="text-center py-12">
                    <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No packages available</h3>
                    <p className="text-gray-600 mb-6">
                      {creatorName} doesn't have any active packages. You can message them to request a custom package.
                    </p>
                    <button
                      onClick={handleBack}
                      className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors font-medium"
                    >
                      Back to Campaigns
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                      <p className="text-sm text-blue-900">
                        <strong>Selected Campaign:</strong> {selectedCampaign.title}
                      </p>
                    </div>
                    <div className="space-y-3">
                      {packages.map((pkg) => (
                        <button
                          key={pkg.id}
                          onClick={() => handlePackageSelect(pkg)}
                          disabled={loading}
                          className="w-full text-left p-4 border-2 border-gray-200 rounded-xl hover:border-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="font-semibold text-gray-900 mb-1">{pkg.title}</h3>
                              <p className="text-sm text-gray-600 line-clamp-2 mb-2">{pkg.description}</p>
                              <div className="flex items-center gap-4 text-xs text-gray-500">
                                {pkg.platform_type && (
                                  <span className="flex items-center gap-1">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                                    </svg>
                                    {pkg.platform_type}
                                  </span>
                                )}
                                <span className="flex items-center gap-1">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  {pkg.duration_days} days
                                </span>
                              </div>
                            </div>
                            <div className="ml-4 text-right">
                              <p className="text-2xl font-bold text-primary">${pkg.price}</p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <button
                onClick={handleBack}
                className="px-6 py-2 text-gray-600 hover:text-gray-900 font-medium transition-colors"
              >
                {step === 1 ? 'Cancel' : 'Back'}
              </button>
              <div className="text-sm text-gray-500">
                {step === 1 && campaigns.length > 0 && `${campaigns.length} active ${campaigns.length === 1 ? 'campaign' : 'campaigns'}`}
                {step === 2 && packages.length > 0 && `${packages.length} ${packages.length === 1 ? 'package' : 'packages'} available`}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InviteToCampaignModal;
