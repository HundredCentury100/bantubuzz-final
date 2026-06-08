import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { campaignsAPI, analyticsAPI, brandWalletAPI, spotlightBoostsAPI } from '../services/api';
import Navbar from '../components/Navbar';
import AudienceCharts from '../components/AudienceCharts';
import CreatorPackageCard from '../components/CreatorPackageCard';
import InviteCreatorsModal from '../components/InviteCreatorsModal';
import CampaignPerformanceTab from '../components/CampaignPerformanceTab';
import CampaignPaymentModal from '../components/CampaignPaymentModal';
import CampaignChatPanel from '../components/CampaignChatPanel';
import CampaignChatWindow from '../components/CampaignChatWindow';
import CampaignCart from '../components/CampaignCart';
import toast from 'react-hot-toast';
import { Bolt, Megaphone, PackagePlus, Send } from 'lucide-react';

const CampaignDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [campaign, setCampaign] = useState(null);
  const [proposals, setProposals] = useState([]);
  const [pendingProposalCount, setPendingProposalCount] = useState(0);
  const [packages, setPackages] = useState([]);
  const [audienceData, setAudienceData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [audienceLoading, setAudienceLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectNotes, setRejectNotes] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedCollaborations, setSelectedCollaborations] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [cartPendingCount, setCartPendingCount] = useState(0);
  const [walletBalance, setWalletBalance] = useState(null);
  const [boostLoading, setBoostLoading] = useState(null);

  useEffect(() => {
    fetchCampaignDetails();
    // Get current user from localStorage
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    setCurrentUser(user);
    fetchWalletBalance();

    // Check for tab parameter in URL
    const searchParams = new URLSearchParams(location.search);
    const tabParam = searchParams.get('tab');
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [id, location.search]);

  useEffect(() => {
    if (activeTab === 'applications') {
      fetchProposals();
    } else if (activeTab === 'packages') {
      fetchPackages();
    } else if (activeTab === 'audience') {
      fetchAudienceData();
    } else if (activeTab === 'cart') {
      fetchCartPendingCount();
    }
  }, [activeTab]);

  const fetchCampaignDetails = async () => {
    try {
      setLoading(true);
      const response = await campaignsAPI.getCampaign(id);
      setCampaign(response.data);
    } catch (error) {
      console.error('Error fetching campaign:', error);
      toast.error('Failed to load campaign details');
    } finally {
      setLoading(false);
    }
  };

  const fetchWalletBalance = async () => {
    try {
      const response = await brandWalletAPI.getBalance();
      setWalletBalance(response.data.wallet);
    } catch (error) {
      setWalletBalance(null);
    }
  };

  const handleBoostPurchase = async (durationDays) => {
    try {
      setBoostLoading(durationDays);
      const response = await spotlightBoostsAPI.purchase({
        target_type: 'campaign',
        target_id: Number(id),
        duration_days: durationDays,
        payment_method: 'wallet',
      });

      toast.success(response.data.message || 'Spotlight Boost is active');
      setCampaign((current) => current ? {
        ...current,
        active_spotlight_boost: response.data.boost,
      } : current);
      setWalletBalance((current) => current ? {
        ...current,
        available_balance: response.data.wallet_balance,
      } : current);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to purchase boost');
    } finally {
      setBoostLoading(null);
    }
  };

  const fetchProposals = async () => {
    try {
      const response = await campaignsAPI.getCampaignProposals(id);
      setProposals(response.data.proposals || []);
      setPendingProposalCount(response.data.pending_count ?? (response.data.proposals || []).filter((proposal) => proposal.status === 'pending').length);
    } catch (error) {
      console.error('Error fetching proposals:', error);
      toast.error('Failed to load applications');
    }
  };

  const fetchPackages = async () => {
    try {
      const response = await campaignsAPI.getCampaignPackages(id);
      setPackages(response.data.packages || []);
    } catch (error) {
      console.error('Error fetching packages:', error);
      toast.error('Failed to load packages');
    }
  };

  const fetchAudienceData = async () => {
    try {
      setAudienceLoading(true);
      const response = await analyticsAPI.getCampaignAudience(id);
      setAudienceData(response.data);
    } catch (error) {
      console.error('Error fetching audience data:', error);
      // Don't show toast error - just show "no data" in component
      setAudienceData(null);
    } finally {
      setAudienceLoading(false);
    }
  };

  const fetchCartPendingCount = async () => {
    try {
      const response = await campaignsAPI.getCart(id, { payment_status: 'pending' });
      setCartPendingCount(response.data.pending_count || 0);
    } catch (error) {
      console.error('Error fetching cart count:', error);
      // Don't show toast error for cart count
      setCartPendingCount(0);
    }
  };

  const handleAcceptProposal = async (proposalId) => {
    try {
      // Add application to cart instead of immediate payment
      await campaignsAPI.addApplicationToCart(id, {
        proposal_id: proposalId
      });

      toast.success('Application added to cart! Go to Cart tab to complete payment.');
      fetchProposals(); // Refresh proposals list
      fetchCartPendingCount(); // Update cart count badge
    } catch (error) {
      console.error('Error accepting proposal:', error);
      toast.error(error.response?.data?.error || 'Failed to add application to cart');
    }
  };

  const handleRejectProposal = async () => {
    if (!rejectModal) return;

    try {
      await campaignsAPI.rejectProposal(rejectModal, { brand_notes: rejectNotes });
      toast.success('Application rejected');
      setRejectModal(null);
      setRejectNotes('');
      fetchProposals();
    } catch (error) {
      console.error('Error rejecting proposal:', error);
      toast.error('Failed to reject application');
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      await campaignsAPI.updateCampaign(id, { status: newStatus });
      toast.success(`Campaign ${newStatus === 'active' ? 'published' : newStatus}`);
      fetchCampaignDetails();
    } catch (error) {
      console.error('Error updating campaign:', error);
      toast.error('Failed to update campaign status');
    }
  };

  const visibleProposals = proposals.filter((proposal) => proposal.status !== 'rejected');

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-700';
      case 'active':
        return 'bg-green-100 text-green-700';
      case 'paused':
        return 'bg-yellow-100 text-yellow-700';
      case 'completed':
        return 'bg-blue-100 text-blue-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getProposalStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-700';
      case 'accepted':
        return 'bg-green-100 text-green-700';
      case 'rejected':
        return 'bg-red-100 text-red-700';
      case 'awaiting_payment':
        return 'bg-blue-100 text-blue-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50">
        <Navbar />
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="bg-white rounded-3xl shadow-lg p-12 text-center">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Campaign not found</h3>
            <Link to="/brand/campaigns" className="text-primary hover:underline">
              Back to Campaigns
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <Link
            to="/brand/campaigns"
            className="text-primary hover:underline mb-4 inline-block"
          >
            ← Back to Campaigns
          </Link>
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-gray-900">{campaign.title}</h1>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadgeClass(
                    campaign.status
                  )}`}
                >
                  {campaign.status}
                </span>
              </div>
              <p className="text-gray-600">{campaign.description}</p>
            </div>
            <div className="flex gap-2">
              {campaign.status !== 'completed' && (
                <button
                  onClick={() => setShowInviteModal(true)}
                  className="px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary-dark transition-colors font-medium"
                >
                  Invite Creators
                </button>
              )}
              {campaign.status === 'draft' && (
                <button
                  onClick={() => handleStatusChange('active')}
                  className="px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors"
                >
                  Publish
                </button>
              )}
              {campaign.status === 'active' && (
                <button
                  onClick={() => handleStatusChange('paused')}
                  className="px-4 py-2 bg-yellow-600 text-white rounded-xl hover:bg-yellow-700 transition-colors"
                >
                  Pause
                </button>
              )}
              {campaign.status === 'paused' && (
                <button
                  onClick={() => handleStatusChange('active')}
                  className="px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors"
                >
                  Resume
                </button>
              )}
              <Link
                to={`/brand/campaigns/${id}/edit`}
                className="px-4 py-2 bg-gray-600 text-white rounded-xl hover:bg-gray-700 transition-colors"
              >
                Edit
              </Link>
            </div>
          </div>
        </div>

        <div className="mb-6 rounded-3xl bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary-dark">
                <Bolt className="h-4 w-4" />
                Spotlight Boost
              </div>
              <h2 className="text-lg font-bold text-dark">Boost campaign visibility</h2>
              <p className="text-sm text-gray-600">
                {campaign.active_spotlight_boost
                  ? `Active until ${new Date(campaign.active_spotlight_boost.ends_at).toLocaleDateString()}`
                  : 'Promote this campaign immediately with wallet balance.'}
              </p>
              {walletBalance && (
                <p className="mt-1 text-xs text-gray-500">
                  Wallet balance: ${Number(walletBalance.available_balance || 0).toFixed(2)}
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { durationDays: 3, label: '3-Day', price: 3 },
                { durationDays: 7, label: '7-Day', price: 6 },
                { durationDays: 30, label: '30-Day', price: 18 },
              ].map((option) => (
                <button
                  key={option.durationDays}
                  type="button"
                  onClick={() => handleBoostPurchase(option.durationDays)}
                  disabled={boostLoading === option.durationDays || (walletBalance && Number(walletBalance.available_balance || 0) < option.price)}
                  className="inline-flex items-center gap-2 rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold text-dark transition-colors hover:border-primary hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Bolt className="h-4 w-4 text-primary" />
                  {boostLoading === option.durationDays ? 'Processing...' : `${option.label} $${option.price}`}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Creator Sourcing Actions */}
        {campaign.status !== 'completed' && (
          <div className="mb-6 rounded-3xl bg-white p-5 shadow-lg">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Creator Sourcing</h2>
                <p className="text-sm text-gray-600">Invite creators, add packages, or publish for applications at any time.</p>
              </div>
              <Link
                to={`/brand/campaigns/${id}/source-creators`}
                className="text-sm font-semibold text-primary-dark hover:underline"
              >
                Open sourcing screen
              </Link>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <button
                type="button"
                onClick={() => setShowInviteModal(true)}
                className="flex items-start gap-3 rounded-2xl border border-gray-200 p-4 text-left transition hover:border-primary hover:bg-primary/5"
              >
                <Send className="mt-1 h-5 w-5 flex-shrink-0 text-primary" />
                <div>
                  <p className="font-semibold text-gray-900">Invite Creators</p>
                  <p className="mt-1 text-sm text-gray-600">Invite creators to apply or join directly.</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => navigate(`/brand/campaigns/${id}/browse-packages`)}
                className="flex items-start gap-3 rounded-2xl border border-gray-200 p-4 text-left transition hover:border-primary hover:bg-primary/5"
              >
                <PackagePlus className="mt-1 h-5 w-5 flex-shrink-0 text-primary" />
                <div>
                  <p className="font-semibold text-gray-900">Browse and Add Packages</p>
                  <p className="mt-1 text-sm text-gray-600">Add selected packages to the campaign cart.</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => navigate(`/brand/campaigns/${id}/publish`)}
                disabled={campaign.status === 'active' || !campaign.allows_applications}
                className="flex items-start gap-3 rounded-2xl border border-gray-200 p-4 text-left transition hover:border-primary hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Megaphone className="mt-1 h-5 w-5 flex-shrink-0 text-primary" />
                <div>
                  <p className="font-semibold text-gray-900">Publish for Applications</p>
                  <p className="mt-1 text-sm text-gray-600">
                    {campaign.status === 'active'
                      ? 'Already visible to creators.'
                      : campaign.allows_applications
                        ? 'Make this campaign visible to creators.'
                        : 'Applications are not enabled for this campaign.'}
                  </p>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-200 overflow-x-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-6 py-3 font-medium transition-colors whitespace-nowrap ${
              activeTab === 'overview'
                ? 'border-b-2 border-primary text-primary'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Overview
          </button>
          {campaign.allows_applications && (
            <button
              onClick={() => setActiveTab('applications')}
              className={`px-6 py-3 font-medium transition-colors whitespace-nowrap ${
                activeTab === 'applications'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Applications ({pendingProposalCount || 0})
            </button>
          )}
          {campaign.allows_packages && (
            <button
              onClick={() => setActiveTab('packages')}
              className={`px-6 py-3 font-medium transition-colors whitespace-nowrap ${
                activeTab === 'packages'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Packages ({campaign.packages_count || 0})
            </button>
          )}
          <button
            onClick={() => setActiveTab('performance')}
            className={`px-6 py-3 font-medium transition-colors whitespace-nowrap ${
              activeTab === 'performance'
                ? 'border-b-2 border-primary text-primary'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Performance
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className={`px-6 py-3 font-medium transition-colors whitespace-nowrap ${
              activeTab === 'chat'
                ? 'border-b-2 border-primary text-primary'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Chat
          </button>
          <button
            onClick={() => setActiveTab('cart')}
            className={`px-6 py-3 font-medium transition-colors whitespace-nowrap ${
              activeTab === 'cart'
                ? 'border-b-2 border-primary text-primary'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Cart {cartPendingCount > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-primary text-white rounded-full text-xs">
                {cartPendingCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('audience')}
            className={`px-6 py-3 font-medium transition-colors whitespace-nowrap ${
              activeTab === 'audience'
                ? 'border-b-2 border-primary text-primary'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Audience Demographics
          </button>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Campaign Info */}
            <div className="bg-white rounded-3xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Campaign Information</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Budget</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {/* CRITICAL: Display budget without rounding */}
                    {campaign.participation_mode === 'proposals' || campaign.participation_mode === 'both'
                      ? `$${campaign.budget_min} - $${campaign.budget_max}`
                      : `$${campaign.budget}`}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Participation Mode</p>
                  <p className="text-lg font-semibold text-gray-900 capitalize">
                    {campaign.participation_mode}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Timeline</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {new Date(campaign.start_date).toLocaleDateString()} -{' '}
                    {new Date(campaign.end_date).toLocaleDateString()}
                  </p>
                </div>
                {campaign.application_deadline && (
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Application Deadline</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {new Date(campaign.application_deadline).toLocaleDateString()}
                    </p>
                  </div>
                )}
                {campaign.category && (
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Category</p>
                    <p className="text-lg font-semibold text-gray-900">{campaign.category}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Campaign Brief */}
            {(campaign.campaign_objective || campaign.target_audience || campaign.content_guidelines) && (
              <div className="bg-white rounded-3xl shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Campaign Brief</h2>
                {campaign.campaign_objective && (
                  <div className="mb-4">
                    <p className="text-sm text-gray-500 mb-1">Objective</p>
                    <p className="text-gray-900">{campaign.campaign_objective}</p>
                  </div>
                )}
                {campaign.target_audience && (
                  <div className="mb-4">
                    <p className="text-sm text-gray-500 mb-1">Target Audience</p>
                    <p className="text-gray-900">{campaign.target_audience}</p>
                  </div>
                )}
                {campaign.content_guidelines && (
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Content Guidelines</p>
                    <p className="text-gray-900">{campaign.content_guidelines}</p>
                  </div>
                )}
              </div>
            )}

            {/* Milestones */}
            {campaign.milestones && campaign.milestones.length > 0 && (
              <div className="bg-white rounded-3xl shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Milestones</h2>
                <div className="space-y-4">
                  {campaign.milestones.map((milestone) => (
                    <div key={milestone.id} className="border border-gray-200 rounded-xl p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold text-gray-900">
                          {milestone.milestone_number}. {milestone.name}
                        </h3>
                        {milestone.budget_allocation && (
                          <span className="text-primary font-semibold">
                            {/* CRITICAL: NO toFixed() */}
                            ${milestone.budget_allocation}
                          </span>
                        )}
                      </div>
                      {milestone.description && (
                        <p className="text-gray-600 text-sm mb-2">{milestone.description}</p>
                      )}
                      {milestone.deliverables && milestone.deliverables.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs text-gray-500 mb-1">Deliverables:</p>
                          <div className="flex flex-wrap gap-2">
                            {milestone.deliverables.map((deliverable, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
                              >
                                {deliverable.quantity}x {deliverable.content_type} on{' '}
                                {deliverable.platform}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {milestone.duration_days && (
                        <p className="text-xs text-gray-500 mt-2">
                          Duration: {milestone.duration_days} days
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Targeting */}
            {(campaign.target_categories?.length > 0 || campaign.target_locations?.length > 0 || campaign.target_min_followers) && (
              <div className="bg-white rounded-3xl shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Targeting</h2>
                {campaign.target_categories?.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm text-gray-500 mb-2">Target Categories</p>
                    <div className="flex flex-wrap gap-2">
                      {campaign.target_categories.map((category, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1 bg-primary bg-opacity-10 text-primary rounded-full text-sm"
                        >
                          {category}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {campaign.target_locations?.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm text-gray-500 mb-2">Target Locations</p>
                    <div className="flex flex-wrap gap-2">
                      {campaign.target_locations.map((location, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                        >
                          {location}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {(campaign.target_min_followers || campaign.target_max_followers) && (
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Follower Range</p>
                    <p className="text-gray-900">
                      {campaign.target_min_followers?.toLocaleString() || '0'} -{' '}
                      {campaign.target_max_followers?.toLocaleString() || 'Unlimited'}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Applications Tab */}
        {activeTab === 'applications' && (
          <div className="bg-white rounded-3xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Applications</h2>
            {visibleProposals.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 text-6xl mb-4">📝</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No applications yet</h3>
                <p className="text-gray-600">
                  Creators will see your campaign and can apply to work with you
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {visibleProposals.map((proposal) => (
                  <div
                    key={proposal.id}
                    className="border border-gray-200 rounded-xl p-6 hover:border-primary transition-colors"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-start gap-4">
                        {proposal.creator?.profile_picture && (
                          <img
                            src={proposal.creator.profile_picture}
                            alt={proposal.creator.stage_name}
                            className="w-16 h-16 rounded-full object-cover"
                          />
                        )}
                        <div>
                          <h3 className="font-semibold text-gray-900 text-lg">
                            {proposal.creator?.display_name || proposal.creator?.username || 'Creator'}
                          </h3>
                          {proposal.creator?.categories?.length > 0 && (
                            <p className="text-sm text-gray-600">{proposal.creator.categories.join(', ')}</p>
                          )}
                          {(proposal.creator?.follower_count || proposal.creator?.total_followers) && (
                            <p className="text-sm text-gray-500">
                              {(proposal.creator.follower_count || proposal.creator.total_followers).toLocaleString()} followers
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium ${getProposalStatusBadge(
                            proposal.status
                          )}`}
                        >
                          {proposal.status.replace('_', ' ')}
                        </span>
                        <p className="text-xl font-bold text-primary mt-2">
                          {/* CRITICAL: NO toFixed() */}
                          ${proposal.proposed_price}
                        </p>
                        {proposal.delivery_timeline_days && (
                          <p className="text-sm text-gray-500">
                            {proposal.delivery_timeline_days} days delivery
                          </p>
                        )}
                      </div>
                    </div>

                    {proposal.proposal_message && (
                      <div className="mb-4">
                        <p className="text-sm text-gray-500 mb-1">Proposal Message:</p>
                        <p className="text-gray-900">{proposal.proposal_message}</p>
                      </div>
                    )}

                    {proposal.deliverables && (
                      <div className="mb-4">
                        <p className="text-sm text-gray-500 mb-1">Deliverables:</p>
                        <p className="text-gray-900">{proposal.deliverables}</p>
                      </div>
                    )}

                    {proposal.status === 'pending' && (
                      <div className="flex gap-2 justify-end">
                        <Link
                          to={proposal.creator?.username ? `/${proposal.creator.username}` : `/creator-profile/${proposal.creator_id}`}
                          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors"
                        >
                          View Creator Profile
                        </Link>
                        <button
                          onClick={() => setRejectModal(proposal.id)}
                          className="px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => handleAcceptProposal(proposal.id)}
                          className="px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary-dark transition-colors flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                          Add to Cart
                        </button>
                      </div>
                    )}

                    {proposal.status === 'awaiting_payment' && (
                      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mt-4">
                        <p className="text-blue-800 font-medium">
                          Payment pending - Complete payment to start collaboration
                        </p>
                        {proposal.booking_id && (
                          <Link
                            to={`/bookings/${proposal.booking_id}/payment`}
                            className="text-blue-600 hover:underline text-sm mt-2 inline-block"
                          >
                            Go to payment →
                          </Link>
                        )}
                      </div>
                    )}

                    {proposal.brand_notes && (
                      <div className="mt-4 bg-gray-50 rounded-xl p-4">
                        <p className="text-sm text-gray-500 mb-1">Your Notes:</p>
                        <p className="text-gray-900">{proposal.brand_notes}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Packages Tab */}
        {activeTab === 'packages' && (
          <div className="bg-white rounded-3xl shadow-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Added Packages</h2>
              <Link
                to={`/brand/campaigns/${campaign.id}/browse-packages`}
                className="px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary-dark transition-colors"
              >
                Browse Packages
              </Link>
            </div>
            {packages.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 text-6xl mb-4">📦</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No packages added yet</h3>
                <p className="text-gray-600 mb-6">
                  Browse and add pre-made creator packages to your campaign
                </p>
                <Link
                  to={`/brand/campaigns/${campaign.id}/browse-packages`}
                  className="inline-block px-6 py-3 bg-primary text-white rounded-xl hover:bg-primary-dark transition-colors"
                >
                  Browse Packages
                </Link>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-6">
                {packages.map((pkg) => (
                  <CreatorPackageCard
                    key={pkg.id}
                    package={pkg}
                    onRemove={null} // Can add remove functionality later if needed
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Performance Tab */}
        {activeTab === 'performance' && (
          <div>
            <CampaignPerformanceTab campaignId={campaign.id} />
          </div>
        )}

        {/* Chat Tab */}
        {activeTab === 'chat' && (
          <div className="grid lg:grid-cols-3 gap-6 h-[700px]">
            {/* Chat List Panel */}
            <div className="lg:col-span-1">
              <CampaignChatPanel
                campaign={campaign}
                userType={currentUser?.user_type}
                onChatSelect={setSelectedChat}
                selectedChatId={selectedChat?.id}
              />
            </div>

            {/* Chat Window */}
            <div className="lg:col-span-2">
              <CampaignChatWindow
                chat={selectedChat}
                currentUserId={currentUser?.id}
                onChatUpdate={() => {
                  // Refresh chat list when chat is updated
                  setSelectedChat({ ...selectedChat });
                }}
                onClose={() => setSelectedChat(null)}
              />
            </div>
          </div>
        )}

        {/* Cart Tab */}
        {activeTab === 'cart' && (
          <CampaignCart
            campaignId={campaign.id}
            onPaymentComplete={() => {
              fetchCampaignDetails();
              fetchCartPendingCount();
              setActiveTab('overview');
              toast.success('Payment completed! Collaborations created.');
            }}
          />
        )}

        {/* Audience Demographics Tab */}
        {activeTab === 'audience' && (
          <div>
            <div className="bg-white rounded-3xl shadow-lg p-6 mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-2">Campaign Audience Demographics</h2>
              <p className="text-gray-600 text-sm">
                View aggregated audience data from all creators collaborating on this campaign.
                This data is sourced from their connected social media platforms.
              </p>
            </div>
            <AudienceCharts audienceData={audienceData} loading={audienceLoading} />
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Reject Application?</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to reject this application? You can optionally provide a reason.
            </p>
            <textarea
              value={rejectNotes}
              onChange={(e) => setRejectNotes(e.target.value)}
              placeholder="Reason for rejection (optional)"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl mb-4"
              rows="3"
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setRejectModal(null);
                  setRejectNotes('');
                }}
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectProposal}
                className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invite Creators Modal */}
      <InviteCreatorsModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        campaign={campaign}
      />

      {/* Payment Modal */}
      <CampaignPaymentModal
        isOpen={showPaymentModal}
        onClose={() => {
          setShowPaymentModal(false);
          setSelectedCollaborations([]);
        }}
        campaign={campaign}
        selectedCollaborations={selectedCollaborations}
        onPaymentSuccess={() => {
          setShowPaymentModal(false);
          setSelectedCollaborations([]);
          fetchCampaignDetails();
          toast.success('Payment processed successfully!');
        }}
      />
    </div>
  );
};

export default CampaignDetails;
