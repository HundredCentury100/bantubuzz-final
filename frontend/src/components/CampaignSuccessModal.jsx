import { useNavigate } from 'react-router-dom';
import { X, CheckCircle, Package, LayoutDashboard } from 'lucide-react';

const CampaignSuccessModal = ({ isOpen, onClose, campaignId, campaignTitle }) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleBrowsePackages = () => {
    onClose();
    navigate(`/brand/campaigns/${campaignId}/browse-packages`);
  };

  const handleViewCampaigns = () => {
    onClose();
    navigate('/brand/campaigns');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      ></div>

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-3xl shadow-xl max-w-lg w-full p-8 transform transition-all">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>

          {/* Success icon */}
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
          </div>

          {/* Title and message */}
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              Campaign Created Successfully!
            </h2>
            <p className="text-gray-600 mb-2">
              <span className="font-semibold text-gray-900">{campaignTitle}</span> is now live
            </p>
            <p className="text-sm text-gray-500">
              Your campaign accepts both creator packages and custom proposals
            </p>
          </div>

          {/* Action buttons */}
          <div className="space-y-3">
            {/* Browse Packages - Primary action */}
            <button
              onClick={handleBrowsePackages}
              className="w-full bg-primary hover:bg-primary-dark text-gray-900 font-semibold py-4 px-6 rounded-xl transition-all flex items-center justify-center gap-3 shadow-sm hover:shadow-md"
            >
              <Package size={20} />
              <span>Browse Creator Packages Now</span>
            </button>

            {/* View Campaigns - Secondary action */}
            <button
              onClick={handleViewCampaigns}
              className="w-full bg-white hover:bg-gray-50 text-gray-700 font-medium py-4 px-6 rounded-xl border-2 border-gray-200 transition-all flex items-center justify-center gap-3"
            >
              <LayoutDashboard size={20} />
              <span>View Campaign Dashboard</span>
            </button>
          </div>

          {/* Info note */}
          <div className="mt-6 p-4 bg-primary/10 rounded-2xl">
            <p className="text-sm text-gray-700">
              <span className="font-semibold">What's next?</span>
              <br />
              Browse and add creator packages, or wait for creators to submit custom proposals.
              You'll be notified when creators apply.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CampaignSuccessModal;
