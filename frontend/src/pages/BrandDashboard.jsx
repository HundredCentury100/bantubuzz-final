import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { brandsAPI, bookingsAPI, creatorsAPI } from '../services/api';
import api from '../services/api';
import Navbar from '../components/Navbar';
import toast from 'react-hot-toast';
import Avatar from '../components/Avatar';
import { SparklesIcon, RocketLaunchIcon, BuildingOfficeIcon, ArrowUpIcon } from '@heroicons/react/24/outline';

const BrandDashboard = () => {
  const location = useLocation();
  const authUser = JSON.parse(localStorage.getItem('user') || '{}');
  const [profile, setProfile] = useState(null);
  const [savedCreators, setSavedCreators] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [stats, setStats] = useState({
    totalBookings: 0,
    activeBookings: 0,
    completedBookings: 0,
    totalSpent: 0,
    savedCreators: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();

    // Show success message if redirected from profile update
    if (location.state?.profileUpdated) {
      toast.success('Profile updated successfully!');
      // Clear the state
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  const fetchDashboardData = async () => {
    try {
      // Fetch profile
      const profileRes = await brandsAPI.getOwnProfile();
      setProfile(profileRes.data);

      // Fetch subscription
      try {
        const subsRes = await api.get('/subscriptions/my-subscription');
        setSubscription(subsRes.data.data);
      } catch (error) {
        console.error('Error fetching subscription:', error);
        // Don't fail dashboard load if subscription fails
      }

      // Fetch saved creators
      const savedRes = await brandsAPI.getSavedCreators();
      const saved = savedRes.data.creators || [];
      setSavedCreators(saved.slice(0, 6));

      // Fetch bookings
      const bookingsRes = await bookingsAPI.getMyBookings();
      const bks = bookingsRes.data.bookings || [];
      setBookings(bks.slice(0, 5));

      // Calculate stats
      const activeBookings = bks.filter(b => b.status === 'accepted' || b.status === 'pending').length;
      const completedBookings = bks.filter(b => b.status === 'completed').length;
      const totalSpent = bks
        .filter(b => b.status === 'completed')
        .reduce((sum, b) => sum + (b.amount || 0), 0);

      setStats({
        totalBookings: bks.length,
        activeBookings,
        completedBookings,
        totalSpent,
        savedCreators: saved.length
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

  const profileComplete = profile?.company_name && profile?.industry && profile?.description;

  return (
    <div className="min-h-screen bg-light">
      <Navbar />

      <div className="container-custom section-padding">
        {/* Subscription Tier Banner */}
        {subscription && subscription.plan && (
          <div className={`mb-8 overflow-hidden rounded-3xl shadow-sm ${
            subscription.plan.slug === 'premium' || subscription.plan.slug === 'agency'
              ? 'bg-gradient-to-br from-purple-600 via-purple-700 to-pink-600'
              : subscription.plan.slug === 'pro'
              ? 'bg-gradient-to-br from-primary to-primary-dark'
              : 'bg-gradient-to-br from-gray-700 to-gray-900'
          }`}>
            <div className="relative p-8 md:p-10">
              {/* Decorative elements */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32"></div>
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full -ml-24 -mb-24"></div>

              <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center flex-shrink-0">
                      {subscription.plan.slug === 'free' && <SparklesIcon className="h-7 w-7 text-white" />}
                      {subscription.plan.slug === 'pro' && <RocketLaunchIcon className="h-7 w-7 text-white" />}
                      {subscription.plan.slug === 'premium' && <BuildingOfficeIcon className="h-7 w-7 text-white" />}
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                        {subscription.plan.name} Plan
                        {subscription.status === 'active' && (
                          <span className="text-xs px-3 py-1 bg-white/30 backdrop-blur-sm text-white rounded-full font-semibold">
                            Active
                          </span>
                        )}
                      </h3>
                      <p className="text-white/90 text-sm">
                        {subscription.plan.description || 'Your current subscription plan'}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-4 mt-4">
                    <div className="flex items-center gap-2 text-white/95">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm font-medium">
                        {subscription.plan.max_packages === -1 ? 'Unlimited' : subscription.plan.max_packages} Packages
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-white/95">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm font-medium">
                        {subscription.plan.max_bookings_per_month === -1 ? 'Unlimited' : subscription.plan.max_bookings_per_month} Bookings/month
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-white/95">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm font-medium">
                        {subscription.plan.platform_fee_percentage || 10}% Platform Fee
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex-shrink-0">
                  {subscription.plan.slug !== 'premium' && subscription.plan.slug !== 'agency' ? (
                    <Link
                      to="/subscription/manage"
                      className="flex items-center justify-center gap-2 px-8 py-3 bg-white text-dark rounded-full font-semibold hover:shadow-xl transform hover:scale-105 transition-all duration-200 whitespace-nowrap"
                    >
                      <ArrowUpIcon className="h-5 w-5" />
                      Upgrade Plan
                    </Link>
                  ) : (
                    <Link
                      to="/subscription/manage"
                      className="px-8 py-3 bg-white/20 backdrop-blur-sm text-white rounded-full font-semibold hover:bg-white/30 transition-all duration-200 whitespace-nowrap inline-block text-center"
                    >
                      Manage Plan
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-dark mb-2">Brand Dashboard</h1>
          <p className="text-gray-600">Welcome back, {profile?.company_name}!</p>
        </div>

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
                  Your account is currently inactive. You may not be able to create new bookings or access all platform features.
                  Please contact <a href="mailto:support@bantubuzz.com" className="underline font-medium">support@bantubuzz.com</a> if you believe this is an error.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Profile Completion Alert */}
        {!profileComplete && (
          <div className="mb-6 p-4 bg-primary/20 border border-primary rounded-lg">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-primary-dark mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div className="flex-1">
                <h3 className="font-medium text-primary-dark">Complete Your Brand Profile</h3>
                <p className="text-sm text-primary-dark mt-1">
                  Fill out your company information to start collaborating with creators!
                </p>
                <Link
                  to="/brand/profile/edit"
                  className="inline-block mt-3 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary transition-colors text-sm font-medium"
                >
                  Complete Profile
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          {/* Total Bookings */}
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Bookings</p>
                <p className="text-3xl font-bold text-dark">{stats.totalBookings}</p>
              </div>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">{stats.activeBookings} active</p>
          </div>

          {/* Completed */}
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Completed</p>
                <p className="text-3xl font-bold text-dark">{stats.completedBookings}</p>
              </div>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">Successful campaigns</p>
          </div>

          {/* Total Spent */}
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Spent</p>
                <p className="text-3xl font-bold text-dark">${stats.totalSpent.toFixed(2)}</p>
              </div>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">Investment in creators</p>
          </div>

          {/* Saved Creators */}
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Saved Creators</p>
                <p className="text-3xl font-bold text-dark">{stats.savedCreators}</p>
              </div>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
              </div>
            </div>
            <Link to="/creators" className="text-xs text-primary hover:underline mt-2 inline-block">
              Browse creators
            </Link>
          </div>

          {/* Industry */}
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Industry</p>
                <p className="text-lg font-bold text-dark">{profile?.industry || 'Not set'}</p>
              </div>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">{profile?.company_size || 'N/A'} employees</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Saved Creators & Bookings */}
          <div className="lg:col-span-2 space-y-8">
            {/* Saved Creators */}
            <div className="card">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-dark">Saved Creators</h2>
                <Link to="/browse/creators" className="btn btn-primary">
                  Browse Creators
                </Link>
              </div>

              {savedCreators.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-700 mb-2">No saved creators yet</h3>
                  <p className="text-gray-500 mb-4">Start browsing and save creators you like</p>
                  <Link to="/browse/creators" className="btn btn-primary inline-block">
                    Find Creators
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {savedCreators.map((creator) => (
                    <Link
                      key={creator.id}
                      to={`/creators/${creator.id}`}
                      className="p-4 border border-gray-200 rounded-lg hover:border-primary hover:shadow-md transition-all"
                    >
                      <div className="text-center">
                        <div className="mx-auto mb-3 flex items-center justify-center">
                          <Avatar
                            src={creator.profile_picture}
                            alt={creator.display_name || creator.username || 'Creator'}
                            size="lg"
                            type="user"
                          />
                        </div>
                        <p className="font-medium text-dark text-sm mb-1">{creator.display_name || creator.username || 'Creator'}</p>
                        <p className="text-xs text-gray-500">{creator.follower_count?.toLocaleString() || 0} followers</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Bookings */}
            <div className="card">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-dark">Recent Bookings</h2>
                <Link to="/brand/bookings" className="text-primary hover:text-primary-dark text-sm font-medium">
                  View All
                </Link>
              </div>

              {bookings.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No bookings yet</p>
                  <Link to="/browse/packages" className="text-primary hover:underline text-sm mt-2 inline-block">
                    Browse packages
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {bookings.map((booking) => (
                    <div key={booking.id} className="p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          booking.status === 'pending' ? 'bg-primary text-primary-dark' :
                          booking.status === 'accepted' ? 'bg-primary text-primary-dark' :
                          booking.status === 'completed' ? 'bg-primary text-primary-dark' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {booking.status}
                        </span>
                        <span className="text-sm font-bold text-dark">${booking.amount}</span>
                      </div>
                      <p className="text-sm text-gray-600">{booking.package?.title || 'Package'}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(booking.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Quick Actions & Company Info */}
          <div className="space-y-8">
            {/* Quick Actions */}
            <div className="card">
              <h2 className="text-xl font-bold text-dark mb-4">Quick Actions</h2>
              <div className="space-y-3">
                <Link
                  to="/brand/profile/edit"
                  className="block p-3 border border-gray-200 rounded-lg hover:border-primary hover:bg-primary/5 transition-colors"
                >
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-primary mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <span className="font-medium text-dark">Edit Profile</span>
                  </div>
                </Link>

                <Link
                  to="/subscription/manage"
                  className="block p-3 border border-gray-200 rounded-lg hover:border-primary hover:bg-primary/5 transition-colors"
                >
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-primary mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                    <span className="font-medium text-dark">Manage Subscription</span>
                  </div>
                </Link>

                <Link
                  to="/browse/creators"
                  className="block p-3 border border-gray-200 rounded-lg hover:border-primary hover:bg-primary/5 transition-colors"
                >
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-primary mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <span className="font-medium text-dark">Find Creators</span>
                  </div>
                </Link>

                <Link
                  to="/browse/packages"
                  className="block p-3 border border-gray-200 rounded-lg hover:border-primary hover:bg-primary/5 transition-colors"
                >
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-primary mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                    <span className="font-medium text-dark">Browse Packages</span>
                  </div>
                </Link>

                <Link
                  to="/brand/briefs"
                  className="block p-3 border border-gray-200 rounded-lg hover:border-primary hover:bg-primary/5 transition-colors"
                >
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-primary mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="font-medium text-dark">My Briefs</span>
                  </div>
                </Link>

                <Link
                  to="/brand/briefs/create"
                  className="block p-3 border border-gray-200 rounded-lg hover:border-primary hover:bg-primary/5 transition-colors"
                >
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-primary mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span className="font-medium text-dark">Create Brief</span>
                  </div>
                </Link>

                <Link
                  to="/brand/campaigns"
                  className="block p-3 border border-gray-200 rounded-lg hover:border-primary hover:bg-primary/5 transition-colors"
                >
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-primary mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                    </svg>
                    <span className="font-medium text-dark">My Campaigns</span>
                  </div>
                </Link>

                <Link
                  to="/brand/collaborations"
                  className="block p-3 border border-gray-200 rounded-lg hover:border-primary hover:bg-primary/5 transition-colors"
                >
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-primary mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="font-medium text-dark">Collaborations</span>
                  </div>
                </Link>

                <Link
                  to="/brand/bookings"
                  className="block p-3 border border-gray-200 rounded-lg hover:border-primary hover:bg-primary/5 transition-colors"
                >
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-primary mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <span className="font-medium text-dark">My Bookings</span>
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

            {/* Company Info */}
            <div className="card">
              <h2 className="text-xl font-bold text-dark mb-4">Company Information</h2>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">Company Name</p>
                  <p className="text-sm text-dark font-medium">{profile?.company_name || 'Not set'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Description</p>
                  <p className="text-sm text-dark">
                    {profile?.description ? profile.description.slice(0, 100) + (profile.description.length > 100 ? '...' : '') : 'Not set'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Website</p>
                  {profile?.website ? (
                    <a href={profile.website} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
                      {profile.website}
                    </a>
                  ) : (
                    <p className="text-sm text-gray-500">Not set</p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-gray-600">Location</p>
                  <p className="text-sm text-dark">{profile?.location || 'Not set'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BrandDashboard;
