import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { bookingsAPI } from '../services/api';
import Navbar from '../components/Navbar';
import toast from 'react-hot-toast';

const Bookings = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, pending, accepted, completed, cancelled
  const isCreator = user?.user_type === 'creator';

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const response = await bookingsAPI.getBookings();
      console.log('Bookings:', response.data);
      setBookings(response.data.bookings || []);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      toast.error('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    return 'bg-primary/20 text-primary-dark';
  };

  const getPaymentStatusColor = (status) => {
    return 'bg-primary/20 text-primary-dark';
  };

  const filteredBookings = bookings.filter(booking => {
    if (filter === 'all') return true;
    return booking.status === filter;
  });

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

  return (
    <div className="min-h-screen bg-light">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {isCreator ? 'Booking Requests' : 'My Bookings'}
              </h1>
              <p className="text-gray-600 mt-1">
                {isCreator
                  ? 'Manage booking requests from brands'
                  : 'View and manage your bookings'}
              </p>
            </div>
            <Link
              to={`/${user?.user_type}/dashboard`}
              className="text-gray-600 hover:text-gray-900 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Dashboard
            </Link>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2 border-b border-gray-200 overflow-x-auto scrollbar-hide">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
                filter === 'all'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              All ({bookings.length})
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`px-4 py-2 font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
                filter === 'pending'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Pending ({bookings.filter(b => b.status === 'pending').length})
            </button>
            <button
              onClick={() => setFilter('accepted')}
              className={`px-4 py-2 font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
                filter === 'accepted'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Accepted ({bookings.filter(b => b.status === 'accepted').length})
            </button>
            <button
              onClick={() => setFilter('completed')}
              className={`px-4 py-2 font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
                filter === 'completed'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Completed ({bookings.filter(b => b.status === 'completed').length})
            </button>
          </div>
        </div>

        {/* Bookings List */}
        {filteredBookings.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-xl font-medium text-gray-900 mb-2">No bookings found</h3>
            <p className="text-gray-600 mb-6">
              {isCreator
                ? filter === 'all'
                  ? "You haven't received any booking requests yet."
                  : `No ${filter} booking requests at the moment.`
                : filter === 'all'
                ? "You haven't made any bookings yet."
                : `No ${filter} bookings at the moment.`}
            </p>
            {!isCreator && (
              <Link
                to="/browse/packages"
                className="inline-block px-6 py-3 bg-primary hover:bg-primary-dark text-white font-medium rounded-lg transition-colors"
              >
                Browse Packages
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredBookings.map((booking) => (
              <div key={booking.id} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  {/* Booking Info */}
                  <div className="flex-1">
                    <div className="flex items-start gap-4">
                      {/* Package/Creator Avatar */}
                      <div className="w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                        <span className="text-primary font-semibold text-xl">
                          {booking.package?.title?.charAt(0).toUpperCase() || 'P'}
                        </span>
                      </div>

                      {/* Details */}
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold text-gray-900 mb-1">
                          {booking.package?.title || 'Package'}
                        </h3>
                        <p className="text-gray-600 mb-3">
                          {isCreator
                            ? `Brand: ${booking.brand?.company_name || booking.brand?.display_name || 'Unknown'}`
                            : `Creator: ${booking.creator?.display_name || booking.creator?.username || 'Unknown'}`}
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                          <div className="flex flex-col gap-1">
                            <span className="text-gray-600">Booking Date</span>
                            <span className="font-medium text-gray-900">
                              {new Date(booking.booking_date).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="text-gray-600">Amount</span>
                            <span className="font-medium text-gray-900">
                              ${booking.amount?.toFixed(2) || '0.00'}
                            </span>
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="text-gray-600">Status</span>
                            <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium w-fit ${getStatusColor(booking.status)}`}>
                              {booking.status}
                            </span>
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="text-gray-600">Payment</span>
                            <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium w-fit ${getPaymentStatusColor(booking.payment_status)}`}>
                              {booking.payment_status}
                            </span>
                          </div>
                        </div>

                        {booking.notes && (
                          <div className="mt-3 text-sm text-gray-600">
                            <span className="font-medium">Notes:</span> {booking.notes}
                          </div>
                        )}

                        {booking.payment_reference && (
                          <div className="mt-2 text-sm text-gray-600">
                            <span className="font-medium">Payment Ref:</span>
                            <span className="ml-2 font-mono text-xs">{booking.payment_reference}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:ml-4 w-full sm:w-auto">
                    {isCreator ? (
                      // Creator Actions
                      <>
                        {booking.status === 'pending' && (
                          <>
                            <Link
                              to={`/bookings/${booking.id}`}
                              className="px-4 py-2 bg-primary hover:bg-primary-dark text-white text-sm font-medium rounded-lg transition-colors text-center"
                            >
                              Accept / Decline
                            </Link>
                          </>
                        )}
                        {booking.status === 'accepted' && (
                          <Link
                            to={`/${user?.user_type}/collaborations`}
                            className="px-4 py-2 bg-primary hover:bg-primary-dark text-dark text-sm font-medium rounded-lg transition-colors text-center"
                          >
                            View Collaboration
                          </Link>
                        )}
                        <Link
                          to={`/bookings/${booking.id}`}
                          className="px-4 py-2 border-2 border-gray-300 hover:border-gray-400 text-gray-700 text-sm font-medium rounded-lg transition-colors text-center"
                        >
                          View Details
                        </Link>
                      </>
                    ) : (
                      // Brand Actions
                      <>
                        {booking.payment_status === 'pending' && booking.status === 'pending' && (
                          <Link
                            to={`/bookings/${booking.id}/payment`}
                            className="px-4 py-2 bg-primary hover:bg-primary-dark text-white text-sm font-medium rounded-lg transition-colors text-center"
                          >
                            Complete Payment
                          </Link>
                        )}
                        {booking.status === 'accepted' && (
                          <Link
                            to={`/${user?.user_type}/collaborations`}
                            className="px-4 py-2 bg-primary hover:bg-primary-dark text-dark text-sm font-medium rounded-lg transition-colors text-center"
                          >
                            View Collaboration
                          </Link>
                        )}
                        <Link
                          to={`/bookings/${booking.id}`}
                          className="px-4 py-2 border-2 border-gray-300 hover:border-gray-400 text-gray-700 text-sm font-medium rounded-lg transition-colors text-center"
                        >
                          View Details
                        </Link>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Bookings;
