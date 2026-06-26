import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { creatorsAPI, packagesAPI, bookingsAPI, opportunitiesAPI, collaborationsAPI } from '../services/api';
import api from '../services/api';
import Navbar from '../components/Navbar';
import CollaborationResponseModal from '../components/CollaborationResponseModal';
import CreatorBadge from '../components/CreatorBadge';
import toast from 'react-hot-toast';
import { SparklesIcon, RocketLaunchIcon, BuildingOfficeIcon, ArrowUpIcon } from '@heroicons/react/24/outline';

const CreatorDashboard = () => {
  const location = useLocation();
  const authUser = JSON.parse(localStorage.getItem('user') || '{}');
  const [profile, setProfile] = useState(null);
  const [packages, setPackages] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [applications, setApplications] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [verificationStatus, setVerificationStatus] = useState(null);
  const [verificationSubscription, setVerificationSubscription] = useState(null);
  const [connectedPlatforms, setConnectedPlatforms] = useState([]);
  const [pendingCollaborations, setPendingCollaborations] = useState([]);
  const [selectedCollaboration, setSelectedCollaboration] = useState(null);
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [stats, setStats] = useState({
    totalPackages: 0,
    activePackages: 0,
    totalBookings: 0,
    pendingBookings: 0,
    totalEarnings: 0
  });
  const [loading, setLoading] = useState(true);
  const [verificationBannerDismissed, setVerificationBannerDismissed] = useState(
    localStorage.getItem('verificationBannerDismissed') === 'true'
  );
  const [featuredBannerDismissed, setFeaturedBannerDismissed] = useState(
    localStorage.getItem('featuredBannerDismissed') === 'true'
  );
  const [leaderboardPrefs, setLeaderboardPrefs] = useState({
    show_score: false,
    selected_badges: [],
  });
  const [savingLeaderboardPrefs, setSavingLeaderboardPrefs] = useState(false);

  useEffect(() => {
    fetchDashboardData();

    // Show success message if redirected from profile update
    if (location.state?.profileUpdated) {
      toast.success('Profile updated successfully!');
      // Clear the state
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  const handleDismissVerificationBanner = () => {
    localStorage.setItem('verificationBannerDismissed', 'true');
    setVerificationBannerDismissed(true);
  };

  const handleDismissFeaturedBanner = () => {
    localStorage.setItem('featuredBannerDismissed', 'true');
    setFeaturedBannerDismissed(true);
  };

  const handleRespondToCollaboration = (collaboration) => {
    setSelectedCollaboration(collaboration);
    setShowResponseModal(true);
  };

  const handleResponseSuccess = (updatedCollaboration) => {
    // Remove the collaboration from pending list
    setPendingCollaborations(prev => prev.filter(c => c.id !== updatedCollaboration.id));
    setShowResponseModal(false);
    setSelectedCollaboration(null);

    // Refresh dashboard data to update stats
    fetchDashboardData();
  };

  const handleLeaderboardBadgeToggle = (badge) => {
    setLeaderboardPrefs((current) => {
      const selected = current.selected_badges || [];
      if (selected.includes(badge)) {
        return {
          ...current,
          selected_badges: selected.filter((item) => item !== badge),
        };
      }
      if (selected.length >= 3) {
        toast.error('You can display up to 3 badges on the leaderboard.');
        return current;
      }
      return {
        ...current,
        selected_badges: [...selected, badge],
      };
    });
  };

  const saveLeaderboardPreferences = async () => {
    try {
      setSavingLeaderboardPrefs(true);
      const response = await creatorsAPI.updateLeaderboardPreferences(leaderboardPrefs);
      const preferences = response.data.leaderboard_preferences;
      setProfile((current) => ({
        ...current,
        creator_score: {
          ...(current?.creator_score || {}),
          leaderboard_preferences: preferences,
        },
      }));
      setLeaderboardPrefs({
        show_score: Boolean(preferences?.show_score),
        selected_badges: preferences?.selected_badges || [],
      });
      toast.success('Leaderboard display updated.');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update leaderboard display.');
    } finally {
      setSavingLeaderboardPrefs(false);
    }
  };

  const fetchDashboardData = async () => {
    try {
      // Fetch all data in parallel for faster loading
      const [
        profileRes,
        packagesRes,
        bookingsRes,
        applicationsRes,
        subsRes,
        verRes,
        verSubRes,
        platformsRes,
        pendingCollabsRes
      ] = await Promise.allSettled([
        creatorsAPI.getOwnProfile(),
        packagesAPI.getMyPackages(),
        bookingsAPI.getMyBookings(),
        opportunitiesAPI.getMyApplications({ limit: 5 }),
        api.get('/subscriptions/my-subscription'),
        api.get('/creator/verification/status'),
        api.get('/creator/subscriptions/my-subscription'),
        api.get('/creator/platforms'),
        collaborationsAPI.getPendingCollaborations()
      ]);

      // Handle profile
      if (profileRes.status === 'fulfilled') {
        const nextProfile = profileRes.value.data;
        setProfile(nextProfile);
        setLeaderboardPrefs({
          show_score: Boolean(nextProfile.creator_score?.leaderboard_preferences?.show_score),
          selected_badges: nextProfile.creator_score?.leaderboard_preferences?.selected_badges || [],
        });
      }

      // Handle packages - Keep FULL array for stats, slice for display
      const pkgs = packagesRes.status === 'fulfilled' ? (packagesRes.value.data.packages || []) : [];
      setPackages(pkgs.slice(0, 3)); // Show only 3 recent in UI

      // Handle bookings - Keep FULL array for stats, slice for display
      const bks = bookingsRes.status === 'fulfilled' ? (bookingsRes.value.data.bookings || []) : [];
      setBookings(bks.slice(0, 5)); // Show only 5 recent in UI

      // Handle applications
      const apps = applicationsRes.status === 'fulfilled' ? (applicationsRes.value.data.applications || []) : [];
      setApplications(apps);

      // Handle subscription
      if (subsRes.status === 'fulfilled') {
        setSubscription(subsRes.value.data.data);
      }

      // Handle verification status
      if (verRes.status === 'fulfilled') {
        setVerificationStatus(verRes.value.data);
      }

      // Handle verification subscription
      if (verSubRes.status === 'fulfilled' && verSubRes.value.data.success && verSubRes.value.data.data.has_subscription) {
        setVerificationSubscription(verSubRes.value.data.data.subscription);
      }

      // Handle connected platforms
      if (platformsRes.status === 'fulfilled' && platformsRes.value.data.success) {
        setConnectedPlatforms(platformsRes.value.data.platforms || []);
      }

      // Handle pending collaborations
      if (pendingCollabsRes.status === 'fulfilled' && pendingCollabsRes.value.data.success) {
        setPendingCollaborations(pendingCollabsRes.value.data.collaborations || []);
      }

      // Calculate stats from FULL arrays (before slicing)
      const activePackages = pkgs.filter(p => p.is_active).length;
      const pendingBookings = bks.filter(b => b.status === 'pending').length;
      const totalEarnings = bks
        .filter(b => b.status === 'completed')
        .reduce((sum, b) => sum + (b.amount || 0), 0);

      setStats({
        totalPackages: pkgs.length,  // Use full array length
        activePackages,
        totalBookings: bks.length,  // Use full array length
        pendingBookings,
        totalEarnings
      });

    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-light">
        <Navbar />
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  // Profile is complete if bio and at least one category is set
  const profileComplete = profile?.bio && profile?.categories?.length > 0;
  const creatorScore = profile?.creator_score || {};
  const scoreValue = typeof creatorScore.score === 'number' ? creatorScore.score : null;
  const biqTier = creatorScore.tier || { label: scoreValue === null ? 'New' : 'Developing' };
  const scoreTone = biqTier.key === 'excellent'
    ? 'text-green-700 bg-green-50 border-green-200'
    : biqTier.key === 'strong'
      ? 'text-primary-dark bg-primary/10 border-primary/30'
      : biqTier.key === 'developing'
        ? 'text-amber-700 bg-amber-50 border-amber-200'
        : 'text-gray-700 bg-gray-50 border-gray-200';
  const scoreSections = [
    ['Public performance', creatorScore.dimensions?.public_performance, 'Engagement, reach, followers, and sentiment'],
    ['Reliability', creatorScore.dimensions?.marketplace_reliability, 'Completion, response, and on-time delivery'],
    ['Reviews', creatorScore.dimensions?.reviews, 'Verified brand reviews after completed work'],
    ['Profile trust', creatorScore.dimensions?.profile_trust, 'Profile completeness and booking readiness'],
    ['Activity', creatorScore.dimensions?.activity, 'Recent BantuBuzz sessions'],
  ];
  const scoreHistory = creatorScore.history || [];
  const scoreHistoryValues = scoreHistory.map((point) => Number(point.score || 0));
  const historyMin = scoreHistoryValues.length ? Math.min(...scoreHistoryValues) : 0;
  const historyMax = scoreHistoryValues.length ? Math.max(...scoreHistoryValues) : 100;
  const historyRange = Math.max(1, historyMax - historyMin);
  const availableLeaderboardBadges = creatorScore.badges || [];
  const selectedLeaderboardBadges = leaderboardPrefs.selected_badges || [];

  return (
    <div className="min-h-screen bg-light">
      <Navbar />

      <div className="container-custom section-padding">
        {/* Verification Subscription Payment Verified Banner - Highest Priority */}
        {verificationSubscription && verificationSubscription.payment_verified &&
         verificationSubscription.status === 'active' &&
         (!verificationStatus || !verificationStatus.has_pending_application) &&
         (!verificationStatus || !verificationStatus.is_verified) && (
          <div className="mb-6 sm:mb-8 p-4 sm:p-6 bg-green-50 border-2 border-green-500 rounded-2xl sm:rounded-3xl relative animate-pulse-slow">
            <div className="flex flex-col sm:flex-row items-start gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1 w-full">
                <h3 className="font-bold text-green-900 text-lg sm:text-xl mb-2">Payment Verified! Complete Your Verification Application</h3>
                <p className="text-sm sm:text-base text-green-800 mb-4 leading-relaxed">
                  Great news! Your verification subscription payment has been confirmed. You can now proceed to fill out your verification application form and upload your identity documents.
                </p>
                <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3">
                  <Link
                    to="/creator/verification/apply"
                    className="inline-flex items-center justify-center px-4 sm:px-6 py-2 sm:py-3 bg-green-600 text-white rounded-full hover:bg-green-700 transition-colors text-sm sm:text-base font-semibold shadow-lg hover:shadow-xl"
                  >
                    Complete Application Form →
                  </Link>
                  <Link
                    to="/creator/verification/pending"
                    className="inline-flex items-center justify-center px-4 sm:px-6 py-2 sm:py-3 bg-white text-green-700 border-2 border-green-600 rounded-full hover:bg-green-50 transition-colors text-sm sm:text-base font-semibold"
                  >
                    View Details
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Verification Banner - Priority 1: Show if not verified */}
        {(!verificationStatus || !verificationStatus.is_verified) && !verificationBannerDismissed && (
          <div className="mb-6 sm:mb-8 p-4 sm:p-6 bg-primary border border-primary rounded-2xl sm:rounded-3xl relative">
            <button
              onClick={handleDismissVerificationBanner}
              className="absolute top-3 right-3 sm:top-4 sm:right-4 text-primary-dark hover:text-dark transition-colors z-10"
              aria-label="Dismiss banner"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="flex flex-col sm:flex-row items-start gap-3 pr-8 sm:pr-10">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-primary-dark mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <div className="flex-1 w-full">
                <h3 className="font-bold text-primary-dark text-base sm:text-lg mb-2">Get Verified - Build Trust with Brands</h3>
                <p className="text-sm text-primary-dark mb-3 sm:mb-4 leading-relaxed">
                  Earn the verified badge on your profile. Stand out from the crowd, increase trust, and get more bookings from top brands.
                </p>
                <div className="flex flex-wrap gap-2 sm:gap-3 mb-3 sm:mb-4">
                  <span className="text-xs px-2 sm:px-3 py-1 bg-white/50 text-primary-dark rounded-full font-medium">✓ Verified Badge</span>
                  <span className="text-xs px-2 sm:px-3 py-1 bg-white/50 text-primary-dark rounded-full font-medium">✓ Increased Trust</span>
                  <span className="text-xs px-2 sm:px-3 py-1 bg-white/50 text-primary-dark rounded-full font-medium">✓ Priority in Search</span>
                  <span className="text-xs px-2 sm:px-3 py-1 bg-white/50 text-primary-dark rounded-full font-medium">$5/month</span>
                </div>
                <Link
                  to="/creator/subscriptions"
                  className="inline-block px-4 sm:px-6 py-2 bg-dark text-white rounded-full hover:bg-gray-800 transition-colors text-xs sm:text-sm font-semibold"
                >
                  Subscribe to Verification →
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Featured Banner - Priority 2: Show after verified */}
        {verificationStatus && verificationStatus.is_verified && !featuredBannerDismissed && (
          <div className="mb-6 sm:mb-8 p-4 sm:p-6 bg-primary border border-primary rounded-2xl sm:rounded-3xl relative">
            <button
              onClick={handleDismissFeaturedBanner}
              className="absolute top-3 right-3 sm:top-4 sm:right-4 text-primary-dark hover:text-dark transition-colors z-10"
              aria-label="Dismiss banner"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="flex flex-col sm:flex-row items-start gap-3 pr-8 sm:pr-10">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-primary-dark mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <div className="flex-1 w-full">
                <h3 className="font-bold text-primary-dark text-base sm:text-lg mb-2">Get Featured - Boost Your Visibility</h3>
                <p className="text-sm text-primary-dark mb-3 sm:mb-4 leading-relaxed">
                  Get priority placement in search results and homepage featured sections. Available for General, Facebook, Instagram, and TikTok categories.
                </p>
                <div className="flex flex-wrap gap-2 sm:gap-3 mb-3 sm:mb-4">
                  <span className="text-xs px-2 sm:px-3 py-1 bg-white/50 text-primary-dark rounded-full font-medium">✓ Featured Badge</span>
                  <span className="text-xs px-2 sm:px-3 py-1 bg-white/50 text-primary-dark rounded-full font-medium">✓ Priority Placement</span>
                  <span className="text-xs px-2 sm:px-3 py-1 bg-white/50 text-primary-dark rounded-full font-medium">✓ 7 Days Visibility</span>
                  <span className="text-xs px-2 sm:px-3 py-1 bg-white/50 text-primary-dark rounded-full font-medium">$5-$10/week</span>
                </div>
                <Link
                  to="/creator/subscriptions"
                  className="inline-block px-4 sm:px-6 py-2 bg-dark text-white rounded-full hover:bg-gray-800 transition-colors text-xs sm:text-sm font-semibold"
                >
                  Browse Featured Plans →
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-dark leading-tight mb-2">Creator Dashboard</h1>
          <p className="text-sm sm:text-base text-gray-600 leading-relaxed">Welcome back! Here's your overview.</p>
        </div>

        {/* Onboarding Journey Guide */}
        {(!profileComplete || connectedPlatforms.length === 0 || stats.totalPackages === 0) && (
          <div className="mb-6 sm:mb-8 bg-white border-2 border-primary/20 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm">
            <div className="flex items-start gap-2 sm:gap-3 mb-4 sm:mb-6">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-primary mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-dark mb-1">Your Creator Journey</h3>
                <p className="text-xs sm:text-sm text-gray-600">Complete these steps to maximize your success on BantuBuzz</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Step 1: Complete Profile */}
              <div className={`flex items-start gap-4 p-4 rounded-xl transition-all ${
                profileComplete
                  ? 'bg-green-50 border border-green-200'
                  : 'bg-blue-50 border border-blue-200'
              }`}>
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                  profileComplete ? 'bg-green-500' : 'bg-blue-500'
                }`}>
                  {profileComplete ? (
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <span className="text-white font-bold text-sm">1</span>
                  )}
                </div>
                <div className="flex-1">
                  <h4 className={`font-semibold mb-1 ${profileComplete ? 'text-green-900' : 'text-blue-900'}`}>
                    Complete Your Profile
                  </h4>
                  <p className={`text-sm mb-2 ${profileComplete ? 'text-green-700' : 'text-blue-700'}`}>
                    {profileComplete
                      ? 'Great! Your profile is complete and ready to attract brands.'
                      : 'Add your bio and select your categories to make your profile stand out.'}
                  </p>
                  {!profileComplete && (
                    <Link
                      to="/creator/profile/edit"
                      className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800"
                    >
                      Complete Profile →
                    </Link>
                  )}
                </div>
              </div>

              {/* Step 2: Connect Social Media */}
              <div className={`flex items-start gap-4 p-4 rounded-xl transition-all ${
                connectedPlatforms.length > 0
                  ? 'bg-green-50 border border-green-200'
                  : 'bg-blue-50 border border-blue-200'
              }`}>
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                  connectedPlatforms.length > 0 ? 'bg-green-500' : 'bg-blue-500'
                }`}>
                  {connectedPlatforms.length > 0 ? (
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <span className="text-white font-bold text-sm">2</span>
                  )}
                </div>
                <div className="flex-1">
                  <h4 className={`font-semibold mb-1 ${connectedPlatforms.length > 0 ? 'text-green-900' : 'text-blue-900'}`}>
                    Connect Your Social Media
                  </h4>
                  <p className={`text-sm mb-2 ${connectedPlatforms.length > 0 ? 'text-green-700' : 'text-blue-700'}`}>
                    {connectedPlatforms.length > 0
                      ? `Perfect! You've connected ${connectedPlatforms.length} platform(s). Brands can now see your reach.`
                      : 'Link your Instagram, TikTok, YouTube, Facebook, and X accounts to showcase your audience.'}
                  </p>
                  {connectedPlatforms.length === 0 && (
                    <Link
                      to="/creator/platforms"
                      className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800"
                    >
                      Connect Platforms →
                    </Link>
                  )}
                </div>
              </div>

              {/* Step 3: Create Packages */}
              <div className={`flex items-start gap-4 p-4 rounded-xl transition-all ${
                stats.totalPackages > 0
                  ? 'bg-green-50 border border-green-200'
                  : 'bg-blue-50 border border-blue-200'
              }`}>
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                  stats.totalPackages > 0 ? 'bg-green-500' : 'bg-blue-500'
                }`}>
                  {stats.totalPackages > 0 ? (
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <span className="text-white font-bold text-sm">3</span>
                  )}
                </div>
                <div className="flex-1">
                  <h4 className={`font-semibold mb-1 ${stats.totalPackages > 0 ? 'text-green-900' : 'text-blue-900'}`}>
                    Create Your Packages
                  </h4>
                  <p className={`text-sm mb-2 ${stats.totalPackages > 0 ? 'text-green-700' : 'text-blue-700'}`}>
                    {stats.totalPackages > 0
                      ? `Excellent! You have ${stats.totalPackages} package(s). You're ready to receive bookings.`
                      : 'Create at least one package to appear in search results and start earning.'}
                  </p>
                  {stats.totalPackages === 0 && (
                    <Link
                      to="/creator/packages"
                      className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800"
                    >
                      Create Package →
                    </Link>
                  )}
                </div>
              </div>

              {/* Step 4: Success State */}
              {profileComplete && connectedPlatforms.length > 0 && stats.totalPackages > 0 && (
                <div className="flex items-start gap-4 p-4 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/30">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-primary-dark mb-1">
                      You're All Set!
                    </h4>
                    <p className="text-sm text-primary-dark mb-3">
                      Your profile is now live in search results. Brands can discover you, view your packages, and book you for collaborations. Check out briefs and campaigns to find more opportunities!
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Link
                        to="/creator/campaigns"
                        className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors text-sm font-medium"
                      >
                        Browse Opportunities
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Suspension Banner */}
        {authUser.is_active === false && (
          <div className="mb-6 p-4 bg-red-50 border border-red-400 rounded-lg">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div>
                <h3 className="font-semibold text-red-800">Your account has been suspended</h3>
                <p className="text-sm text-red-700 mt-1">
                  Your account is currently inactive. You may not receive new bookings or appear in search results.
                  Please contact <a href="mailto:support@bantubuzz.com" className="underline font-medium">support@bantubuzz.com</a> if you believe this is an error.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Pending Collaboration Requests */}
        {pendingCollaborations.length > 0 && (
          <div className="mb-6 sm:mb-8 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl sm:rounded-3xl p-4 sm:p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg sm:text-xl font-bold text-blue-900 mb-1">
                  Pending Collaboration Requests ({pendingCollaborations.length})
                </h3>
                <p className="text-sm text-blue-700">
                  You have collaboration requests waiting for your response. Review and accept or decline them below.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {pendingCollaborations.map((collaboration) => (
                <div
                  key={collaboration.id}
                  className="bg-white border-2 border-blue-100 rounded-xl p-4 hover:border-blue-300 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-start gap-3 mb-2">
                        {/* Brand Logo */}
                        {collaboration.brand?.logo ? (
                          <img
                            src={collaboration.brand.logo}
                            alt={collaboration.brand?.company_name || 'Brand'}
                            className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary-dark rounded-lg flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                            {collaboration.brand?.company_name?.charAt(0) || 'B'}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-dark text-lg mb-1">
                            {collaboration.booking?.package?.title || collaboration.title || 'Package Booking'}
                          </h4>
                          <p className="text-sm text-gray-600 mb-2">
                            From <span className="font-semibold text-dark">{collaboration.brand?.company_name || 'Brand'}</span>
                          </p>
                          <div className="flex flex-wrap items-center gap-3 text-sm">
                            <span className="flex items-center gap-1 text-primary font-bold text-lg">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              ${parseFloat(collaboration.amount || 0).toFixed(2)}
                            </span>
                            <span className="flex items-center gap-1 text-gray-600">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              {collaboration.booking?.package?.duration_days || collaboration.booking?.package?.delivery_time_days || 'N/A'} days
                            </span>
                            <span className="flex items-center gap-1 text-gray-600">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                              {collaboration.booking?.package?.revisions_allowed || 0} revisions
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 sm:ml-4">
                      <button
                        onClick={() => handleRespondToCollaboration(collaboration)}
                        className="btn btn-primary whitespace-nowrap px-6"
                      >
                        Review Request
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-5 sm:mb-6">
          {/* Total Packages */}
          <div className="bg-white rounded-xl shadow-md p-3 sm:p-5 transition-all duration-200 hover:shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-600 mb-1">Total Packages</p>
                <p className="text-xl sm:text-3xl font-bold text-dark">{stats.totalPackages}</p>
              </div>
              <div className="w-8 h-8 sm:w-12 sm:h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 sm:w-6 sm:h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">{stats.activePackages} active</p>
          </div>

          {/* Total Bookings */}
          <div className="bg-white rounded-xl shadow-md p-3 sm:p-5 transition-all duration-200 hover:shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-600 mb-1">Total Bookings</p>
                <p className="text-xl sm:text-3xl font-bold text-dark">{stats.totalBookings}</p>
              </div>
              <div className="w-8 h-8 sm:w-12 sm:h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 sm:w-6 sm:h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">{stats.pendingBookings} pending</p>
          </div>

          {/* Total Earnings */}
          <div className="bg-white rounded-xl shadow-md p-3 sm:p-5 transition-all duration-200 hover:shadow-lg">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1 pr-2">
                <p className="text-xs sm:text-sm text-gray-600 mb-1">Total Earnings</p>
                <p className="text-lg sm:text-2xl lg:text-3xl font-bold text-dark truncate">${(Number(stats.totalEarnings) || 0).toFixed(2)}</p>
              </div>
              <div className="w-8 h-8 sm:w-12 sm:h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 sm:w-6 sm:h-6 text-primary-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">From completed bookings</p>
          </div>

          {/* Followers */}
          <div className="bg-white rounded-xl shadow-md p-3 sm:p-5 transition-all duration-200 hover:shadow-lg">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1 pr-2">
                <p className="text-xs sm:text-sm text-gray-600 mb-1">Followers</p>
                <p className="text-xl sm:text-3xl font-bold text-dark truncate">{profile?.follower_count?.toLocaleString() || 0}</p>
              </div>
              <div className="w-8 h-8 sm:w-12 sm:h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 sm:w-6 sm:h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">{profile?.engagement_rate || 0}% engagement</p>
          </div>

          {/* Profile Status */}
          <div className="bg-white rounded-xl shadow-md p-3 sm:p-5 transition-all duration-200 hover:shadow-lg col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-600 mb-1">Profile Status</p>
                <p className="text-base sm:text-lg font-bold text-dark capitalize">{profile?.availability_status || 'Available'}</p>
                {profile?.rank?.position && (
                  <p className="mt-1 text-xs font-semibold text-primary-dark">
                    Overall rank #{profile.rank.position}
                  </p>
                )}
              </div>
              <div className={`w-8 h-8 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                profile?.availability_status === 'available' ? 'bg-primary/10' :
                profile?.availability_status === 'busy' ? 'bg-primary' : 'bg-red-100'
              }`}>
                <div className={`w-3 h-3 rounded-full ${
                  profile?.availability_status === 'available' ? 'bg-primary/10' :
                  profile?.availability_status === 'busy' ? 'bg-primary' : 'bg-red-600'
                }`}></div>
              </div>
            </div>
            <Link to="/creator/profile/edit" className="text-xs text-primary hover:underline mt-2 inline-block">
              Update status
            </Link>
          </div>
        </div>

        <div className="mb-6 sm:mb-8 rounded-2xl border border-primary/30 bg-white p-4 sm:p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-dark">Looking for your next collaboration?</h2>
              <p className="text-sm text-gray-600 mt-1">Browse open opportunities and apply to campaigns that match your niche.</p>
            </div>
            <Link
              to="/creator/campaigns"
              className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-dark hover:bg-primary/90 transition-colors"
            >
              Browse open opportunities
            </Link>
          </div>
        </div>

        <div className="mb-6 sm:mb-8 border border-gray-200 bg-white p-4 sm:p-6 shadow-sm">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-4">
              <div className={`flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-xl border ${scoreTone}`}>
                <span className="text-xl font-bold">{scoreValue === null ? '--' : Math.round(scoreValue)}</span>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">BIQ Creator Intelligence</p>
                <h2 className="mt-1 text-xl font-bold text-dark">Your BantuBuzz Intelligence Quotient</h2>
                <p className="mt-1 max-w-2xl text-sm text-gray-600">
                  BIQ is your 0-100 creator quality signal. It powers rankings, discovery, badges, and future intelligence tools.
                </p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                  <span className={`rounded-full px-3 py-1 ${scoreTone}`}>
                    {biqTier.label}
                  </span>
                  {creatorScore.benchmark?.label && (
                    <span className="rounded-full bg-dark px-3 py-1 text-white">
                      {creatorScore.benchmark.label}
                    </span>
                  )}
                  {creatorScore.rank?.position && (
                    <span className="rounded-full bg-primary/10 px-3 py-1 text-primary-dark">
                      Overall rank #{creatorScore.rank.position}
                    </span>
                  )}
                  {creatorScore.formula_version && (
                    <span className="rounded-full bg-gray-100 px-3 py-1 text-gray-700">
                      Formula v{creatorScore.formula_version}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <Link
              to="/creator/platforms"
              className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-dark px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-800"
            >
              Improve my BIQ
            </Link>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-5">
            {scoreSections.map(([label, value, description]) => (
              <div key={label} className="border border-gray-200 bg-gray-50 p-3">
                <p className="text-xs font-semibold text-gray-500">{label}</p>
                <p className="mt-1 text-lg font-bold text-dark">
                  {typeof value === 'number' ? value.toFixed(value % 1 ? 1 : 0) : '--'}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-gray-500">{description}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="border border-gray-200 bg-gray-50 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-dark">BIQ history</h3>
                  <p className="text-xs text-gray-500">Last 12 months of score snapshots</p>
                </div>
                {scoreHistory.length > 0 && (
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-gray-600">
                    {scoreHistory.length} point{scoreHistory.length === 1 ? '' : 's'}
                  </span>
                )}
              </div>
              {scoreHistory.length > 0 ? (
                <div className="flex h-24 items-end gap-2">
                  {scoreHistory.map((point) => {
                    const value = Number(point.score || 0);
                    const height = 18 + ((value - historyMin) / historyRange) * 70;
                    return (
                      <div key={point.month} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                        <div
                          className="w-full rounded-t bg-primary"
                          style={{ height: `${height}%` }}
                          title={`${point.month}: ${value}`}
                        />
                        <span className="w-full truncate text-center text-[10px] text-gray-500">{point.month.slice(5)}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-600">History appears after multiple BIQ snapshots are calculated.</p>
              )}
            </div>

            <div className="border border-gray-200 bg-gray-50 p-4">
              <h3 className="text-sm font-bold text-dark">What changed</h3>
              <div className="mt-3 space-y-2">
                {(creatorScore.change_explanations || []).map((explanation) => (
                  <div key={explanation} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-primary" />
                    <span>{explanation}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-5 border-t border-gray-100 pt-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h3 className="text-sm font-bold text-dark">Leaderboard display</h3>
                <p className="mt-1 max-w-2xl text-sm text-gray-600">
                  Your rank and badges can appear publicly. Your BIQ stays hidden unless you choose to show it.
                </p>
              </div>
              <label className="inline-flex min-h-[44px] cursor-pointer items-center gap-3 rounded-full border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-700">
                <input
                  type="checkbox"
                  checked={leaderboardPrefs.show_score}
                  onChange={(event) => setLeaderboardPrefs((current) => ({
                    ...current,
                    show_score: event.target.checked,
                  }))}
                  className="h-4 w-4 accent-primary"
                />
                Show my BIQ on leaderboard
              </label>
            </div>

            {availableLeaderboardBadges.length > 0 && (
              <div className="mt-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Choose up to 3 badges to show
                </p>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {availableLeaderboardBadges.map((badge) => {
                    const selected = selectedLeaderboardBadges.includes(badge);
                    return (
                      <button
                        key={badge}
                        type="button"
                        onClick={() => handleLeaderboardBadgeToggle(badge)}
                        className={`flex min-h-[48px] items-center justify-between gap-3 border px-3 py-2 text-left transition-colors ${
                          selected
                            ? 'border-primary bg-primary/10'
                            : 'border-gray-200 bg-white hover:border-primary/60'
                        }`}
                      >
                        <CreatorBadge badge={badge} size="sm" />
                        <span className={`h-4 w-4 rounded-full border ${selected ? 'border-primary bg-primary' : 'border-gray-300'}`} />
                      </button>
                    );
                  })}
                </div>
                {availableLeaderboardBadges.length <= 3 && (
                  <p className="mt-2 text-xs text-gray-500">
                    You have three or fewer badges, so all can display automatically.
                  </p>
                )}
              </div>
            )}

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-2">
                {(creatorScore.leaderboard_preferences?.display_badges || availableLeaderboardBadges.slice(0, 3)).map((badge) => (
                  <CreatorBadge key={badge} badge={badge} size="sm" />
                ))}
              </div>
              <button
                type="button"
                onClick={saveLeaderboardPreferences}
                disabled={savingLeaderboardPrefs}
                className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-dark hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingLeaderboardPrefs ? 'Saving...' : 'Save leaderboard display'}
              </button>
            </div>
          </div>

          {creatorScore.improvement_tips?.length > 0 && (
            <div className="mt-5 border-t border-gray-100 pt-4">
              <h3 className="text-sm font-bold text-dark">What to improve next</h3>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {creatorScore.improvement_tips.map((tip) => (
                  <div key={tip} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-primary" />
                    <span>{tip}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {creatorScore.recovery_roadmap?.length > 0 && (
            <div className="mt-5 border-t border-gray-100 pt-4">
              <h3 className="text-sm font-bold text-dark">Recovery roadmap</h3>
              <p className="mt-1 text-sm text-gray-600">
                Focus here first if your BIQ drops or you want to move into the next tier.
              </p>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {creatorScore.recovery_roadmap.map((item) => (
                  <div key={item.dimension} className="border border-gray-200 bg-gray-50 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-dark">{item.title}</p>
                      <span className="rounded-full bg-white px-2 py-1 text-xs font-bold text-gray-700">
                        {Number(item.current_score || 0).toFixed(0)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-gray-600">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Packages & Bookings */}
          <div className="lg:col-span-2 space-y-8">
            {/* My Packages */}
            <div className="card">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-dark">My Packages</h2>
                <Link
                  to="/creator/packages"
                  className="btn btn-primary"
                >
                  Manage Packages
                </Link>
              </div>

              {packages.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-700 mb-2">No packages yet</h3>
                  <p className="text-gray-500 mb-4">Create your first package to start earning</p>
                  <Link to="/creator/packages" className="btn btn-primary inline-block">
                    Create Package
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {packages.map((pkg) => (
                    <div key={pkg.id} className="p-4 border border-gray-200 rounded-lg hover:border-primary transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-bold text-dark">{pkg.title}</h3>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              pkg.is_active ? 'bg-primary/10 text-primary-dark' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {pkg.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{pkg.description?.slice(0, 100)}...</p>
                          <div className="flex items-center gap-4 text-sm">
                            <span className="text-primary font-bold">${pkg.price}</span>
                            <span className="text-gray-500">{pkg.duration_days} days</span>
                            <span className="text-gray-500">{pkg.category}</span>
                          </div>
                        </div>
                        <Link
                          to={`/creator/packages/${pkg.id}/edit`}
                          className="text-primary hover:text-primary-dark"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Campaign Applications */}
            <div className="card">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-dark">Recent Campaign Applications</h2>
                <Link to="/creator/campaigns" className="text-primary hover:text-primary-dark text-sm font-medium">
                  View All
                </Link>
              </div>

              {applications.length === 0 ? (
                <div className="text-center py-8">
                  <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-700 mb-2">No applications yet</h3>
                  <p className="text-gray-500 mb-4">Browse campaigns and apply to get started</p>
                  <Link to="/creator/campaigns" className="btn btn-primary inline-block">
                    Browse Campaigns
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {applications.map((app) => (
                    <div key={app.id} className="p-4 border border-gray-200 rounded-lg hover:border-primary transition-colors">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="font-bold text-dark mb-1">{app.campaign?.title || 'Campaign'}</h3>
                          <p className="text-sm text-gray-600 mb-2">
                            {app.campaign?.brand?.company_name || app.campaign?.brand?.display_name || 'Brand'}
                          </p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ml-2 ${
                          app.status === 'pending' ? 'bg-primary text-white' :
                          app.status === 'accepted' ? 'bg-green-100 text-green-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {app.status === 'pending' ? 'Under Review' :
                           app.status === 'accepted' ? 'Accepted' : 'Not Selected'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-4 text-gray-600">
                          <span className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                            </svg>
                            ${app.proposed_price}
                          </span>
                          <span className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            {new Date(app.applied_at).toLocaleDateString()}
                          </span>
                        </div>
                        {app.campaign?.id && (
                          <Link
                            to={`/creator/campaigns/${app.campaign.id}`}
                            className="text-primary hover:text-primary-dark text-xs font-medium"
                          >
                            View Details →
                          </Link>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Quick Actions & Profile */}
          <div className="space-y-8">
            {/* Quick Actions */}
            <div className="card">
              <h2 className="text-xl font-bold text-dark mb-4">Quick Actions</h2>
              <div className="space-y-3">
                <Link
                  to="/creator/profile/edit"
                  className="block p-3 border border-gray-200 rounded-lg hover:border-primary hover:bg-primary/5 transition-colors"
                >
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-primary mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span className="font-medium text-dark">Edit Profile</span>
                  </div>
                </Link>

                <Link
                  to="/creator/subscriptions"
                  className="block p-3 border border-gray-200 rounded-lg hover:border-primary hover:bg-primary/5 transition-colors"
                >
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-primary mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                    <span className="font-medium text-dark">Manage Subscriptions</span>
                  </div>
                </Link>

                <Link
                  to="/creator/packages"
                  className="block p-3 border border-gray-200 rounded-lg hover:border-primary hover:bg-primary/5 transition-colors"
                >
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-primary mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span className="font-medium text-dark">Create Package</span>
                  </div>
                </Link>

                <Link
                  to="/creator/platforms"
                  className="block p-3 border border-gray-200 rounded-lg hover:border-primary hover:bg-primary/5 transition-colors"
                >
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-primary mr-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM4.332 8.027a6.012 6.012 0 011.912-2.706C6.512 5.73 6.974 6 7.5 6A1.5 1.5 0 019 7.5V8a2 2 0 004 0 2 2 0 011.523-1.943A5.977 5.977 0 0116 10c0 .34-.028.675-.083 1H15a2 2 0 00-2 2v2.197A5.973 5.973 0 0110 16v-2a2 2 0 00-2-2 2 2 0 01-2-2 2 2 0 00-1.668-1.973z" clipRule="evenodd" />
                    </svg>
                    <span className="font-medium text-dark">Connect Platforms</span>
                  </div>
                </Link>

                <Link
                  to="/creator/proposals"
                  className="block p-3 border border-gray-200 rounded-lg hover:border-primary hover:bg-primary/5 transition-colors"
                >
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-primary mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                    <span className="font-medium text-dark">My Proposals</span>
                  </div>
                </Link>

                <Link
                  to="/creator/campaigns"
                  className="block p-3 border border-gray-200 rounded-lg hover:border-primary hover:bg-primary/5 transition-colors"
                >
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-primary mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                    </svg>
                    <span className="font-medium text-dark">Browse Opportunities</span>
                  </div>
                </Link>

                <Link
                  to="/creator/bookings"
                  className="block p-3 border border-gray-200 rounded-lg hover:border-primary hover:bg-primary/5 transition-colors"
                >
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-primary mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <span className="font-medium text-dark">View Bookings</span>
                  </div>
                </Link>

                <Link
                  to="/messages"
                  className="block p-3 border border-gray-200 rounded-lg hover:border-primary hover:bg-primary/5 transition-colors"
                >
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-primary mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                    <span className="font-medium text-dark">Messages</span>
                  </div>
                </Link>
              </div>
            </div>

            {/* Profile Summary */}
            <div className="card">
              <h2 className="text-xl font-bold text-dark mb-4">Profile Summary</h2>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">Bio</p>
                  <p className="text-sm text-dark">
                    {profile?.bio ? profile.bio.slice(0, 100) + (profile.bio.length > 100 ? '...' : '') : 'Not set'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Location</p>
                  <p className="text-sm text-dark">
                    {profile?.city && profile?.country
                      ? `${profile.city}, ${profile.country}`
                      : profile?.location || profile?.city || profile?.country || 'Not set'}
                  </p>
                </div>                <div>
                  <p className="text-sm text-gray-600">Categories</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {profile?.categories?.length > 0 ? (
                      profile.categories.slice(0, 3).map((cat, i) => (
                        <span key={i} className="px-2 py-1 bg-primary/10 text-primary text-xs rounded">
                          {cat}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-gray-500">None selected</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Collaboration Response Modal */}
      {showResponseModal && selectedCollaboration && (
        <CollaborationResponseModal
          collaboration={selectedCollaboration}
          onClose={() => {
            setShowResponseModal(false);
            setSelectedCollaboration(null);
          }}
          onSuccess={handleResponseSuccess}
        />
      )}
    </div>
  );
};

export default CreatorDashboard;
