import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { packagesAPI, bookingsAPI } from '../services/api';
import { toast } from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';

const PackageDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [pkg, setPkg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false);

  useEffect(() => {
    fetchPackage();
  }, [id]);

  const fetchPackage = async () => {
    try {
      setLoading(true);
      const response = await packagesAPI.getPackage(id);
      setPkg(response.data);
    } catch (error) {
      console.error('Error fetching package:', error);
      toast.error('Failed to load package details');
    } finally {
      setLoading(false);
    }
  };

  const handleBookPackage = async () => {
    if (!user) {
      toast.error('Please login to book a package');
      navigate('/login');
      return;
    }

    if (user.user_type !== 'brand') {
      toast.error('Only brands can book packages');
      return;
    }

    try {
      setBookingLoading(true);
      const response = await bookingsAPI.createBooking({
        package_id: pkg.id,
        message: '' // Optional message
      });

      console.log('Booking response:', response.data); // Debug log

      // Store payment data and booking ID in localStorage for the payment page
      const bookingId = response.data.booking.id;

      if (response.data.payment) {
        localStorage.setItem(
          `payment_${bookingId}`,
          JSON.stringify(response.data.payment)
        );
      }

      // Store the booking ID for the payment return page
      localStorage.setItem('lastBookingId', bookingId.toString());

      toast.success('Booking created! Redirecting to payment...');

      // Redirect to payment page (you'll implement Paynow integration here)
      setTimeout(() => {
        navigate(`/bookings/${bookingId}/payment`);
      }, 1000);
    } catch (error) {
      console.error('Error creating booking:', error);
      toast.error(error.response?.data?.error || 'Failed to create booking');
    } finally {
      setBookingLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!pkg) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Package not found</h2>
          <Link to="/browse/packages" className="text-primary hover:text-primary-dark">
            Browse other packages
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Navigation */}
        <div className="mb-6 flex items-center gap-4">
          <Link
            to="/browse/packages"
            className="text-gray-600 hover:text-gray-900 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Browse
          </Link>
          <span className="text-gray-300">|</span>
          <Link
            to={user?.user_type === 'brand' ? '/brand/dashboard' : '/creator/dashboard'}
            className="text-gray-600 hover:text-gray-900"
          >
            Back to Dashboard
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow p-8">
              {/* Category Badge */}
              <span className="inline-block px-3 py-1 bg-primary/10 text-primary text-xs font-semibold rounded-full mb-4">
                {pkg.category}
              </span>

              {/* Title */}
              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                {pkg.title}
              </h1>

              {/* Creator Info */}
              {pkg.creator && (
                <div className="flex items-center gap-3 mb-6 pb-6 border-b border-gray-200">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                    <span className="text-primary font-semibold text-lg">
                      {pkg.creator.user?.email?.charAt(0).toUpperCase() || 'C'}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {pkg.creator.user?.email?.split('@')[0] || 'Creator'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {pkg.creator.location || 'Location not specified'}
                    </p>
                  </div>
                </div>
              )}

              {/* Description */}
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-3">Description</h2>
                <p className="text-gray-600 whitespace-pre-wrap">{pkg.description}</p>
              </div>

              {/* Deliverables */}
              {pkg.deliverables && pkg.deliverables.length > 0 && (
                <div className="mb-8">
                  <h2 className="text-xl font-semibold text-gray-900 mb-3">What's Included</h2>
                  <ul className="space-y-2">
                    {pkg.deliverables.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <svg
                          className="w-5 h-5 text-green-500 mt-0.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        <span className="text-gray-700">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Duration */}
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-3">Delivery Time</h2>
                <div className="flex items-center gap-2 text-gray-700">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{pkg.duration_days} days</span>
                </div>
              </div>

              {/* Creator's Other Info */}
              {pkg.creator && (
                <div className="mb-8 bg-gray-50 rounded-lg p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-3">About the Creator</h2>
                  <p className="text-gray-600 mb-4">
                    {pkg.creator.bio || 'No bio available'}
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Followers</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {pkg.creator.follower_count?.toLocaleString() || '0'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Engagement Rate</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {pkg.creator.engagement_rate || '0'}%
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar - Booking Card */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6 sticky top-8">
              <div className="mb-6">
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-4xl font-bold text-gray-900">${pkg.price}</span>
                </div>
                <p className="text-sm text-gray-500">One-time payment</p>
              </div>

              <button
                onClick={handleBookPackage}
                disabled={bookingLoading || user?.user_type === 'creator'}
                className="w-full bg-primary text-white py-3 rounded-lg font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-4"
              >
                {bookingLoading ? 'Processing...' : 'Book Now'}
              </button>

              {user?.user_type === 'creator' && (
                <p className="text-sm text-amber-600 text-center">
                  Only brands can book packages
                </p>
              )}

              <div className="border-t border-gray-200 pt-4 mt-4 space-y-3">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{pkg.duration_days} days delivery</span>
                </div>

                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Secure payment via Paynow</span>
                </div>

                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span>Direct communication with creator</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PackageDetails;
