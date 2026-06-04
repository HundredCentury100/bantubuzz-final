import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import InviteCreatorsModal from '../components/InviteCreatorsModal';
import { campaignsAPI } from '../services/api';
import toast from 'react-hot-toast';
import { ArrowRight, Megaphone, PackagePlus, Send, Users } from 'lucide-react';

const CampaignSourcing = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);

  useEffect(() => {
    fetchCampaign();
  }, [id]);

  const fetchCampaign = async () => {
    try {
      setLoading(true);
      const response = await campaignsAPI.getCampaign(id);
      setCampaign(response.data);
    } catch (error) {
      console.error('Error loading campaign:', error);
      toast.error('Failed to load campaign');
    } finally {
      setLoading(false);
    }
  };

  const publishForApplications = async () => {
    if (!campaign?.allows_applications) {
      toast.error('This campaign is not set up to receive applications');
      return;
    }

    try {
      setPublishing(true);
      await campaignsAPI.updateCampaign(id, { status: 'active' });
      toast.success('Campaign published for applications');
      navigate(`/brand/campaigns/${id}?tab=applications`);
    } catch (error) {
      console.error('Error publishing campaign:', error);
      toast.error(error.response?.data?.error || 'Failed to publish campaign');
    } finally {
      setPublishing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50">
        <Navbar />
        <div className="flex h-96 items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50">
      <Navbar />

      <main className="mx-auto max-w-6xl px-4 py-8">
        <Link to={`/brand/campaigns/${id}`} className="mb-5 inline-block text-primary hover:underline">
          Back to Campaign
        </Link>

        <div className="mb-8">
          <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-primary-dark">
            Creator sourcing
          </p>
          <h1 className="text-3xl font-bold text-gray-900">Add creators to your campaign</h1>
          <p className="mt-2 max-w-2xl text-gray-600">
            Choose how you want to source creators for {campaign?.title || 'this campaign'}.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          <button
            type="button"
            onClick={() => setShowInviteModal(true)}
            className="flex min-h-64 flex-col rounded-3xl border-2 border-transparent bg-white p-6 text-left shadow-lg transition hover:border-primary hover:shadow-xl"
          >
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/20 text-dark">
              <Send className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Invite Creators</h2>
            <p className="mt-3 flex-1 text-sm leading-6 text-gray-600">
              Search for specific creators and invite them to apply, or invite them to join directly with an offer.
            </p>
            <span className="mt-6 inline-flex items-center gap-2 font-semibold text-primary-dark">
              Open invite screen <ArrowRight className="h-4 w-4" />
            </span>
          </button>

          <button
            type="button"
            onClick={() => navigate(`/brand/campaigns/${id}/browse-packages`)}
            className="flex min-h-64 flex-col rounded-3xl border-2 border-transparent bg-white p-6 text-left shadow-lg transition hover:border-primary hover:shadow-xl"
          >
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/20 text-dark">
              <PackagePlus className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Browse and Add Packages</h2>
            <p className="mt-3 flex-1 text-sm leading-6 text-gray-600">
              Browse creator profiles and packages, then add selected packages to your campaign cart.
            </p>
            <span className="mt-6 inline-flex items-center gap-2 font-semibold text-primary-dark">
              Browse packages <ArrowRight className="h-4 w-4" />
            </span>
          </button>

          <button
            type="button"
            onClick={publishForApplications}
            disabled={publishing || !campaign?.allows_applications || campaign?.status === 'active'}
            className="flex min-h-64 flex-col rounded-3xl border-2 border-transparent bg-white p-6 text-left shadow-lg transition hover:border-primary hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
          >
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/20 text-dark">
              {campaign?.status === 'active' ? <Users className="h-6 w-6" /> : <Megaphone className="h-6 w-6" />}
            </div>
            <h2 className="text-xl font-bold text-gray-900">Publish for Applications</h2>
            <p className="mt-3 flex-1 text-sm leading-6 text-gray-600">
              Make the campaign visible so creators can discover it and submit applications.
            </p>
            <span className="mt-6 inline-flex items-center gap-2 font-semibold text-primary-dark">
              {campaign?.status === 'active'
                ? 'Already published'
                : publishing
                  ? 'Publishing...'
                  : campaign?.allows_applications
                    ? 'Publish campaign'
                    : 'Applications not enabled'}
              <ArrowRight className="h-4 w-4" />
            </span>
          </button>
        </div>

        <div className="mt-8 rounded-3xl bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-800">
            You can always do all of these from inside your campaign.
          </p>
        </div>
      </main>

      <InviteCreatorsModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        campaign={campaign}
      />
    </div>
  );
};

export default CampaignSourcing;
