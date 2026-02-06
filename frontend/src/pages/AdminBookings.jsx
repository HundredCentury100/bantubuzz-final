import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import api, { bookingsAPI, BASE_URL } from '../services/api';
import AdminLayout from '../components/admin/AdminLayout';
import StatusBadge from '../components/admin/StatusBadge';

export default function AdminBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchBookings();
  }, [filter]);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/admin/bookings${filter !== 'all' ? `?status=${filter}` : ''}`);
      setBookings(response.data.bookings || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleDownloadPOP = async (bookingId) => {
    try {
      const response = await bookingsAPI.downloadProofOfPayment(bookingId);

      // Get the original filename from Content-Disposition header
      const contentDisposition = response.headers['content-disposition'];
      let filename = `POP-Booking-${bookingId}`;

      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1].replace(/['"]/g, '');
        }
      }

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Proof of payment downloaded successfully');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to download proof of payment');
    }
  };

  const handleVerifyPayment = async (bookingId) => {
    if (!window.confirm('Are you sure you want to verify this bank transfer payment? This will mark the payment as verified and notify the brand and creator.')) {
      return;
    }

    try {
      await bookingsAPI.verifyPayment(bookingId);
      toast.success('Payment verified successfully!');
      // Refresh bookings to show updated status
      fetchBookings();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to verify payment');
    }
  };

  const getPaymentStatusBadge = (paymentStatus) => {
    const statusConfig = {
      'pending': { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pending' },
      'paid': { bg: 'bg-green-100', text: 'text-green-800', label: 'Paid' },
      'verified': { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Verified' },
      'failed': { bg: 'bg-red-100', text: 'text-red-800', label: 'Failed' },
      'refunded': { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Refunded' }
    };

    const config = statusConfig[paymentStatus] || statusConfig['pending'];
    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 leading-tight">Booking Management</h1>
          <p className="text-gray-600 leading-relaxed mt-2">Monitor all package bookings</p>
        </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex gap-2">
          {['all', 'pending', 'confirmed', 'in_progress', 'completed', 'cancelled'].map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-4 py-2 rounded-lg capitalize transition ${
                filter === tab
                  ? 'bg-primary text-dark'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {tab.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Package</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Brand</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Creator</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment Method</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {bookings.length === 0 ? (
                <tr>
                  <td colSpan="11" className="px-6 py-8 text-center text-gray-500">
                    No bookings found
                  </td>
                </tr>
              ) : (
                bookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">#{booking.id}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{booking.package?.title || booking.package_title || `Package ${booking.package_id}`}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {booking.brand?.logo ? (
                          <img
                            src={`${BASE_URL}${booking.brand.logo}`}
                            alt={booking.brand.company_name}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-primary-light flex items-center justify-center text-primary-dark font-semibold">
                            {booking.brand?.company_name?.charAt(0) || 'B'}
                          </div>
                        )}
                        <div>
                          <div className="text-sm font-medium text-gray-900">{booking.brand?.company_name || `Brand ${booking.brand_id}`}</div>
                          <div className="text-xs text-gray-500">{booking.brand?.user?.email || 'N/A'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {booking.creator?.profile_picture ? (
                          <img
                            src={`${BASE_URL}${booking.creator.profile_picture}`}
                            alt={booking.creator.display_name || booking.creator.username}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-primary-light flex items-center justify-center text-primary-dark font-semibold">
                            {(booking.creator?.display_name || booking.creator?.username || 'C').charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className="text-sm font-medium text-gray-900">{booking.creator?.display_name || booking.creator?.username || `Creator ${booking.creator_id}`}</div>
                          <div className="text-xs text-gray-500">{booking.creator?.user?.email || 'N/A'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">{formatCurrency(booking.total_price)}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-indigo-100 text-indigo-800 capitalize">
                        {booking.payment_category || booking.booking_type || 'package'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <span className="capitalize">{booking.payment_method === 'bank_transfer' ? 'Bank Transfer' : 'Paynow'}</span>
                    </td>
                    <td className="px-6 py-4">
                      {getPaymentStatusBadge(booking.payment_status)}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={booking.status} />
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{formatDate(booking.created_at)}</td>
                    <td className="px-6 py-4 text-sm">
                      {booking.payment_method === 'bank_transfer' && booking.proof_of_payment && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleDownloadPOP(booking.id)}
                            className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition"
                          >
                            Download POP
                          </button>
                          {booking.payment_status === 'pending' && (
                            <button
                              onClick={() => handleVerifyPayment(booking.id)}
                              className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition"
                            >
                              Verify
                            </button>
                          )}
                        </div>
                      )}
                      {booking.payment_method === 'bank_transfer' && !booking.proof_of_payment && (
                        <span className="text-gray-400 text-xs">No POP uploaded</span>
                      )}
                      {booking.payment_method === 'paynow' && (
                        <span className="text-gray-400 text-xs">N/A</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-md p-4">
          <p className="text-sm text-gray-600">Total Bookings</p>
          <p className="text-2xl font-bold text-primary-dark">{bookings.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-4">
          <p className="text-sm text-gray-600">Pending</p>
          <p className="text-2xl font-bold text-yellow-600">
            {bookings.filter(b => b.status === 'pending').length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-4">
          <p className="text-sm text-gray-600">In Progress</p>
          <p className="text-2xl font-bold text-primary-dark">
            {bookings.filter(b => b.status === 'in_progress').length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-4">
          <p className="text-sm text-gray-600">Completed</p>
          <p className="text-2xl font-bold text-green-600">
            {bookings.filter(b => b.status === 'completed').length}
          </p>
        </div>
      </div>
      </div>
    </AdminLayout>
  );
}
