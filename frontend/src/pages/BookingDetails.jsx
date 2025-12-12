import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { bookingsAPI } from '../services/api';
import toast from 'react-hot-toast';
import {
  CalendarIcon,
  CurrencyDollarIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  DocumentTextIcon,
  UserIcon,
  BuildingOfficeIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline';

const BookingDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchBooking();
  }, [id]);

  const fetchBooking = async () => {
    try {
      setLoading(true);
      const response = await bookingsAPI.getBooking(id);
      setBooking(response.data);
    } catch (error) {
      console.error('Error fetching booking:', error);
      toast.error('Failed to load booking details');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (newStatus) => {
    try {
      setUpdating(true);
      await bookingsAPI.updateBookingStatus(id, newStatus);
      toast.success(`Booking ${newStatus}`);
      fetchBooking();
    } catch (error) {
      console.error('Error updating booking:', error);
      toast.error('Failed to update booking status');
    } finally {
      setUpdating(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-primary text-primary-dark',
      accepted: 'bg-primary text-primary-dark',
      declined: 'bg-red-100 text-red-800',
      completed: 'bg-primary text-primary-dark',
      cancelled: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getPaymentStatusColor = (status) => {
    const colors = {
      pending: 'bg-primary text-primary-dark',
      paid: 'bg-primary text-primary-dark',
      failed: 'bg-red-100 text-red-800',
      refunded: 'bg-primary text-primary-dark',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-light">
        <Navbar />
        <div className="container-custom py-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-light">
        <Navbar />
        <div className="container-custom py-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">Booking not found</h2>
            <Link to={`/${user?.user_type}/dashboard`} className="btn btn-primary mt-4">
              Back to Dashboard
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const isCreator = user?.user_type === 'creator';
  const canAccept = isCreator && booking.status === 'pending';
  const canDecline = isCreator && booking.status === 'pending';
  const canComplete = isCreator && booking.status === 'accepted';
  const canPay = !isCreator && booking.status === 'pending' && booking.payment_status === 'pending';

  return (
    <div className="min-h-screen bg-light">
      <Navbar />
      <div className="container-custom py-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeftIcon className="h-5 w-5 mr-2" />
            Back
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Booking Details</h1>
              <p className="text-gray-600 mt-1">Booking ID: #{booking.id}</p>
            </div>
            <div className="flex items-center space-x-2">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(booking.status)}`}>
                {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
              </span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPaymentStatusColor(booking.payment_status)}`}>
                Payment: {booking.payment_status}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Package Details */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Package Details</h2>
              {booking.package && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{booking.package.title}</h3>
                  <p className="text-gray-600 mt-2">{booking.package.description}</p>

                  <div className="mt-4 grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Price</p>
                      <p className="text-lg font-semibold text-gray-900">${booking.amount}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Duration</p>
                      <p className="text-lg font-semibold text-gray-900">{booking.package.duration_days} days</p>
                    </div>
                  </div>

                  {booking.package.deliverables && booking.package.deliverables.length > 0 && (
                    <div className="mt-4">
                      <p className="text-sm font-medium text-gray-700 mb-2">Deliverables:</p>
                      <ul className="list-disc list-inside space-y-1">
                        {booking.package.deliverables.map((item, index) => (
                          <li key={index} className="text-gray-600">{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Participants */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Participants</h2>
              <div className="space-y-4">
                {/* Creator */}
                {booking.creator && (
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <UserIcon className="h-10 w-10 text-gray-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-700">Creator</p>
                      <p className="text-lg font-semibold text-gray-900">{booking.creator.username || booking.creator.user?.email}</p>
                      {booking.creator.bio && (
                        <p className="text-sm text-gray-600 mt-1">{booking.creator.bio}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Brand */}
                {booking.brand && (
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <BuildingOfficeIcon className="h-10 w-10 text-gray-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-700">Brand</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {booking.brand.username || booking.brand.company_name || booking.brand.user?.email}
                      </p>
                      {booking.brand.description && (
                        <p className="text-sm text-gray-600 mt-1">{booking.brand.description}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Notes */}
            {booking.notes && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                  <DocumentTextIcon className="h-5 w-5 mr-2" />
                  Notes
                </h2>
                <p className="text-gray-600">{booking.notes}</p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Booking Info */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Booking Information</h2>
              <div className="space-y-3">
                <div className="flex items-center text-sm">
                  <CalendarIcon className="h-5 w-5 text-gray-400 mr-2" />
                  <div>
                    <p className="text-gray-500">Booking Date</p>
                    <p className="font-medium text-gray-900">
                      {new Date(booking.booking_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {booking.completion_date && (
                  <div className="flex items-center text-sm">
                    <CheckCircleIcon className="h-5 w-5 text-primary-dark mr-2" />
                    <div>
                      <p className="text-gray-500">Completed On</p>
                      <p className="font-medium text-gray-900">
                        {new Date(booking.completion_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-center text-sm">
                  <CurrencyDollarIcon className="h-5 w-5 text-gray-400 mr-2" />
                  <div>
                    <p className="text-gray-500">Amount</p>
                    <p className="font-medium text-gray-900">${booking.amount}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            {(canAccept || canDecline || canComplete || canPay) && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Actions</h2>
                <div className="space-y-3">
                  {canAccept && (
                    <button
                      onClick={() => handleStatusUpdate('accepted')}
                      disabled={updating}
                      className="w-full btn btn-primary flex items-center justify-center"
                    >
                      <CheckCircleIcon className="h-5 w-5 mr-2" />
                      Accept Booking
                    </button>
                  )}

                  {canDecline && (
                    <button
                      onClick={() => handleStatusUpdate('declined')}
                      disabled={updating}
                      className="w-full btn btn-outline flex items-center justify-center"
                    >
                      <XCircleIcon className="h-5 w-5 mr-2" />
                      Decline Booking
                    </button>
                  )}

                  {canComplete && (
                    <button
                      onClick={() => handleStatusUpdate('completed')}
                      disabled={updating}
                      className="w-full btn btn-primary flex items-center justify-center"
                    >
                      <CheckCircleIcon className="h-5 w-5 mr-2" />
                      Mark as Completed
                    </button>
                  )}

                  {canPay && (
                    <Link
                      to={`/bookings/${booking.id}/payment`}
                      className="w-full btn btn-primary flex items-center justify-center"
                    >
                      <CurrencyDollarIcon className="h-5 w-5 mr-2" />
                      Proceed to Payment
                    </Link>
                  )}
                </div>
              </div>
            )}

            {/* Related Collaboration */}
            {booking.status === 'accepted' && (
              <div className="bg-primary/10 border border-primary rounded-xl p-4">
                <p className="text-sm text-primary-dark mb-2">
                  This booking has been accepted and a collaboration has been created.
                </p>
                <Link
                  to={`/${user?.user_type}/collaborations`}
                  className="text-sm font-medium text-primary hover:text-primary-dark"
                >
                  View in Collaborations →
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default BookingDetails;
