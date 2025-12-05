import { useState, useEffect } from 'react';
import api from '../services/api';
import AdminLayout from '../components/admin/AdminLayout';

export default function AdminReviews() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/reviews');
      setReviews(response.data.reviews || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const renderStars = (rating) => {
    return (
      <div className="flex">
        {[...Array(5)].map((_, i) => (
          <svg
            key={i}
            className={`w-5 h-5 ${i < rating ? 'text-yellow-400' : 'text-gray-300'}`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Review Management</h1>
          <p className="mt-2 text-gray-600">Monitor all reviews and ratings</p>
        </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6">
        {reviews.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center text-gray-500">
            No reviews found
          </div>
        ) : (
          reviews.map((review) => (
            <div key={review.id} className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-2">
                    {renderStars(review.rating)}
                    <span className="text-sm text-gray-500">{formatDate(review.created_at)}</span>
                  </div>
                  {review.title && (
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{review.title}</h3>
                  )}
                  <p className="text-gray-700 mb-3">{review.comment}</p>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4 mt-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Brand</p>
                    <p className="font-medium">{review.brand_name || `Brand ${review.brand_id}`}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Creator</p>
                    <p className="font-medium">{review.creator_name || `Creator ${review.creator_id}`}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Communication</p>
                    <p className="font-medium">{review.communication_rating || 'N/A'}/5</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Quality</p>
                    <p className="font-medium">{review.quality_rating || 'N/A'}/5</p>
                  </div>
                </div>

                {review.creator_response && (
                  <div className="mt-4 bg-gray-50 rounded-lg p-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">Creator Response:</p>
                    <p className="text-sm text-gray-600">{review.creator_response}</p>
                    <p className="text-xs text-gray-500 mt-2">{formatDate(review.creator_response_date)}</p>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow-md p-4">
          <p className="text-sm text-gray-600">Total Reviews</p>
          <p className="text-2xl font-bold text-purple-600">{reviews.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-4">
          <p className="text-sm text-gray-600">Average Rating</p>
          <p className="text-2xl font-bold text-yellow-600">
            {reviews.length > 0
              ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
              : '0.0'}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-4">
          <p className="text-sm text-gray-600">With Response</p>
          <p className="text-2xl font-bold text-green-600">
            {reviews.filter(r => r.creator_response).length}
          </p>
        </div>
      </div>
      </div>
    </AdminLayout>
  );
}
