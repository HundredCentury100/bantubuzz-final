import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { creatorsAPI, packagesAPI, bookingsAPI, campaignsAPI } from '../services/api';
import api from '../services/api';
import Navbar from '../components/Navbar';
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
  const [stats, setStats] = useState({
    totalPackages: 0,
    activePackages: 0,
    totalBookings: 0,
    pendingBookings: 0,
    totalEarnings: 0
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
      const profileRes = await creatorsAPI.getOwnProfile();
      setProfile(profileRes.data);

      // Fetch subscription
      try {
        const subsRes = await api.get('/api/subscriptions/my-subscription');
        setSubscription(subsRes.data.data);
      } catch (error) {
        console.error('Error fetching subscription:', error);
        // Don't fail dashboard load if subscription fails
      }

      // Fetch packages
      const packagesRes = await packagesAPI.getMyPackages();
      const pkgs = packagesRes.data.packages || [];
      setPackages(pkgs.slice(0, 3)); // Show only 3 recent

      // Fetch bookings
      const bookingsRes = await bookingsAPI.getMyBookings();
      const bks = bookingsRes.data.bookings || [];
      setBookings(bks.slice(0, 5)); // Show only 5 recent

      // Fetch campaign applications
      const applicationsRes = await campaignsAPI.getMyApplications({ limit: 5 });
      const apps = applicationsRes.data.applications || [];
      setApplications(apps);

      // Calculate stats
      const activePackages = pkgs.filter(p => p.is_active).length;
      const pendingBookings = bks.filter(b => b.status === 'pending').length;
      const totalEarnings = bks
        .filter(b => b.status === 'completed')
        .reduce((sum, b) => sum + (b.amount || 0), 0);

      setStats({
        totalPackages: pkgs.length,
        activePackages,
        totalBookings: bks.length,
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

  const profileComplete = profile?.bio && profile?.categories?.length > 0 && profile?.follower_count > 0;

  return (
    <div className="min-h-screen bg-light">
      <Navbar />

      <div className="container-custom section-padding">
        {/* Subscription Tier Badge */}
        {subscription && subscription.plan && (
          <div className={`mb-6 p-4 rounded-xl border-2 ${
            subscription.plan.slug === 'agency' ? 'bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200' :
            subscription.plan.slug === 'pro' ? 'bg-gradient-to-r from-yellow-50 to-primary/10 border-primary' :
            subscription.plan.slug === 'starter' ? 'bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200' :
            'bg-gray-50 border-gray-200'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                {subscription.plan.slug === 'starter' && <SparklesIcon className="h-6 w-6 text-blue-600 flex-shrink-0" />}
                {subscription.plan.slug === 'pro' && <RocketLaunchIcon className="h-6 w-6 text-primary-dark flex-shrink-0" />}
                {subscription.plan.slug === 'agency' && <BuildingOfficeIcon className="h-6 w-6 text-purple-600 flex-shrink-0" />}
                <div>
                  <h3 className="font-bold text-gray-900">
                    {subscription.plan.name} Plan
                    {subscription.status === 'active' && (
                      <span className="ml-2 text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full">Active</span>
                    )}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {subscription.plan.max_packages === -1 ? 'Unlimited' : subscription.plan.max_packages} packages • {' '}
                    {subscription.plan.max_bookings_per_month === -1 ? 'Unlimited' : subscription.plan.max_bookings_per_month} bookings/month
                  </p>
                </div>
              </div>
              {subscription.plan.slug !== 'agency' && (
                <Link
                  to="/subscription/manage"
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium whitespace-nowrap"
                >
                  <ArrowUpIcon className="h-4 w-4" />
                  Upgrade
                </Link>
              )}
              {subscription.plan.slug === 'agency' && (
                <Link
                  to="/subscription/manage"
                  className="px-4 py-2 text-center bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium whitespace-nowrap"
                >
                  Manage
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-dark leading-tight mb-2">Creator Dashboard</h1>
          <p className="text-gray-600 leading-relaxed">Welcome back! Here's your overview.</p>
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
                  Your account is currently inactive. You may not receive new bookings or appear in search results.
                  Please contact <a href="mailto:support@bantubuzz.com" className="underline font-medium">support@bantubuzz.com</a> if you believe this is an error.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Profile Completion Alert */}
        {!profileComplete && (
          <div className="mb-6 p-4 bg-primary border border-primary rounded-lg">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-primary-dark mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div className="flex-1">
                <h3 className="font-medium text-primary-dark leading-snug">Complete Your Profile</h3>
                <p className="text-sm text-primary-dark leading-relaxed mt-1">
                  Fill out your profile to attract more brands and start earning!
                </p>
                <Link
                  to="/creator/profile/edit"
                  className="inline-block mt-3 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary transition-colors text-sm font-medium"
                >
                  Complete Profile
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* No Packages Alert */}
        {stats.totalPackages === 0 && profileComplete && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-yellow-600 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 2a8 8 0 100 16 8 8 0 000-16zm0 14a6 6 0 110-12 6 6 0 010 12zm-1-9h2v5H9V7zm0 6h2v2H9v-2z"/>
              </svg>
              <div className="flex-1">
                <h3 className="font-medium text-yellow-900 leading-snug">Create Your First Package</h3>
                <p className="text-sm text-yellow-800 leading-relaxed mt-1">
                  You need at least one active package to appear in the browse creators page. Create a package to start receiving bookings from brands!
                </p>
                <Link
                  to="/creator/packages"
                  className="inline-block mt-3 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm font-medium"
                >
                  Create Package
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          {/* Total Packages */}
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Packages</p>
                <p className="text-3xl font-bold text-dark">{stats.totalPackages}</p>
              </div>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">{stats.activePackages} active</p>
          </div>

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
            <p className="text-xs text-gray-500 mt-2">{stats.pendingBookings} pending</p>
          </div>

          {/* Total Earnings */}
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Earnings</p>
                <p className="text-3xl font-bold text-dark">${stats.totalEarnings.toFixed(2)}</p>
              </div>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-primary-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">From completed bookings</p>
          </div>

          {/* Followers */}
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Followers</p>
                <p className="text-3xl font-bold text-dark">{profile?.follower_count?.toLocaleString() || 0}</p>
              </div>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">{profile?.engagement_rate || 0}% engagement</p>
          </div>

          {/* Profile Status */}
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Profile Status</p>
                <p className="text-lg font-bold text-dark capitalize">{profile?.availability_status || 'Available'}</p>
              </div>
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
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

            {/* Recent Bookings */}
            <div className="card">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-dark">Recent Bookings</h2>
                <Link to="/creator/bookings" className="text-primary hover:text-primary-dark text-sm font-medium">
                  View All
                </Link>
              </div>

              {bookings.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No bookings yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {bookings.map((booking) => (
                    <div key={booking.id} className="p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          booking.status === 'pending' ? 'bg-primary text-primary-dark' :
                          booking.status === 'accepted' ? 'bg-primary/10 text-primary' :
                          booking.status === 'completed' ? 'bg-primary/10 text-primary-dark' :
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
                  to="/creator/briefs"
                  className="block p-3 border border-gray-200 rounded-lg hover:border-primary hover:bg-primary/5 transition-colors"
                >
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-primary mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="font-medium text-dark">Browse Briefs</span>
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
                    <span className="font-medium text-dark">Browse Campaigns</span>
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
                  <p className="text-sm text-dark">{profile?.location || 'Not set'}</p>
                </div>
                <div>
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
    </div>
  );
};

export default CreatorDashboard;
