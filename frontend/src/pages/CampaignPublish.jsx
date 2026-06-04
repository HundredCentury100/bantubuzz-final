import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { campaignsAPI } from '../services/api';
import toast from 'react-hot-toast';
import { ArrowLeft, CalendarClock, CheckCircle2, MapPin, Megaphone, Tags, Users } from 'lucide-react';

const formatDate = (value) => {
  if (!value) return 'Not set';
  return new Date(value).toLocaleDateString();
};

const formatFollowers = (min, max) => {
  if (!min && !max) return 'Any follower count';
  const minLabel = min ? Number(min).toLocaleString() : '0';
  const maxLabel = max ? Number(max).toLocaleString() : 'Unlimited';
  return `${minLabel} - ${maxLabel}`;
};

const CampaignPublish = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);

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

  const handlePublish = async () => {
    if (!campaign?.allows_applications) {
      toast.error('This campaign is not set up to receive applications');
      return;
    }

    try {
      setPublishing(true);
      await campaignsAPI.publishCampaign(id);
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

  if (!campaign) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50">
        <Navbar />
        <main className="mx-auto max-w-4xl px-4 py-10">
          <div className="rounded-3xl bg-white p-10 text-center shadow-lg">
            <h1 className="text-2xl font-bold text-gray-900">Campaign not found</h1>
            <Link to="/brand/campaigns" className="mt-4 inline-block font-semibold text-primary-dark">
              Back to Campaigns
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const targetRows = [
    {
      icon: Tags,
      label: 'Target Categories',
      value: campaign.target_categories?.length ? campaign.target_categories.join(', ') : 'All categories'
    },
    {
      icon: MapPin,
      label: 'Target Locations',
      value: campaign.target_locations?.length ? campaign.target_locations.join(', ') : 'All locations'
    },
    {
      icon: Users,
      label: 'Follower Range',
      value: formatFollowers(campaign.target_min_followers, campaign.target_max_followers)
    },
    {
      icon: CalendarClock,
      label: 'Application Deadline',
      value: formatDate(campaign.application_deadline),
      danger: Boolean(campaign.application_deadline)
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50">
      <Navbar />

      <main className="mx-auto max-w-5xl px-4 py-8">
        <Link
          to={`/brand/campaigns/${id}/source-creators`}
          className="mb-6 inline-flex items-center gap-2 font-medium text-primary-dark hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to sourcing options
        </Link>

        <div className="rounded-3xl bg-white p-6 shadow-lg md:p-8">
          <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-primary-dark">
                Publish for applications
              </p>
              <h1 className="text-3xl font-bold text-gray-900">{campaign.title}</h1>
              <p className="mt-2 max-w-2xl text-gray-600">
                Confirm who can discover this campaign before it goes live in Explore Opportunities.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-2xl bg-primary/15 px-4 py-3 font-semibold text-dark">
              <Megaphone className="h-5 w-5" />
              {campaign.status === 'active' ? 'Already Active' : 'Ready to Publish'}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {targetRows.map((row) => {
              const Icon = row.icon;
              return (
                <div key={row.label} className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
                  <div className="mb-3 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20 text-dark">
                      <Icon className="h-5 w-5" />
                    </div>
                    <p className="font-semibold text-gray-900">{row.label}</p>
                  </div>
                  <p className={row.danger ? 'font-semibold text-red-600' : 'text-gray-700'}>
                    {row.value}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="mt-8 rounded-2xl border border-primary/20 bg-primary/10 p-5">
            <div className="flex gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary-dark" />
              <div>
                <p className="font-semibold text-gray-900">Creators who match these settings will be able to apply.</p>
                <p className="mt-1 text-sm text-gray-700">
                  The campaign status will change to Active and applications will appear in the campaign Applications tab.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Link
              to={`/brand/campaigns/${id}`}
              className="rounded-xl border border-gray-300 px-5 py-3 text-center font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </Link>
            <button
              type="button"
              onClick={handlePublish}
              disabled={publishing || campaign.status === 'active' || !campaign.allows_applications}
              className="rounded-xl bg-primary px-6 py-3 font-semibold text-white transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
            >
              {publishing ? 'Publishing...' : campaign.status === 'active' ? 'Campaign Active' : 'Confirm and Publish'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CampaignPublish;
