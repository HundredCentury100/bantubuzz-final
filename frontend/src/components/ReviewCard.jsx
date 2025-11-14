import { useState } from 'react';
import Avatar from './Avatar';

const ReviewCard = ({ review, onResponseSubmit, canRespond = false }) => {
  const [showResponseForm, setShowResponseForm] = useState(false);
  const [response, setResponse] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmitResponse = async (e) => {
    e.preventDefault();
    if (!response.trim()) return;

    setSubmitting(true);
    try {
      await onResponseSubmit(review.id, response);
      setShowResponseForm(false);
      setResponse('');
    } catch (error) {
      console.error('Error submitting response:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = (rating) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <svg
            key={star}
            className={`w-5 h-5 ${
              star <= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
            />
          </svg>
        ))}
      </div>
    );
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 border border-gray-100">
      {/* Reviewer Info */}
      <div className="flex items-start gap-4 mb-4">
        <Avatar
          src={review.brand?.logo}
          alt={review.brand?.company_name}
          size="md"
          type="brand"
        />
        <div className="flex-1">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h4 className="font-bold text-gray-900">
                {review.brand?.company_name || 'Anonymous Brand'}
              </h4>
              <p className="text-sm text-gray-500">{formatDate(review.created_at)}</p>
            </div>
            <div className="flex items-center gap-2">
              {renderStars(review.rating)}
              <span className="text-sm font-medium text-gray-700">
                {review.rating}.0
              </span>
            </div>
          </div>

          {/* Recommendation Badge */}
          {review.would_recommend && (
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm text-green-700 font-medium">
                Would recommend working with this creator
              </span>
            </div>
          )}

          {/* Review Title */}
          {review.title && (
            <h5 className="font-semibold text-gray-900 mb-2">{review.title}</h5>
          )}

          {/* Review Comment */}
          <p className="text-gray-700 mb-4">{review.comment}</p>

          {/* Detailed Ratings */}
          {(review.communication_rating || review.quality_rating ||
            review.professionalism_rating || review.timeliness_rating) && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 p-4 bg-gray-50 rounded-lg">
              {review.communication_rating && (
                <div>
                  <p className="text-xs text-gray-600 mb-1">Communication</p>
                  <div className="flex items-center gap-1">
                    {renderStars(review.communication_rating)}
                  </div>
                </div>
              )}
              {review.quality_rating && (
                <div>
                  <p className="text-xs text-gray-600 mb-1">Quality</p>
                  <div className="flex items-center gap-1">
                    {renderStars(review.quality_rating)}
                  </div>
                </div>
              )}
              {review.professionalism_rating && (
                <div>
                  <p className="text-xs text-gray-600 mb-1">Professionalism</p>
                  <div className="flex items-center gap-1">
                    {renderStars(review.professionalism_rating)}
                  </div>
                </div>
              )}
              {review.timeliness_rating && (
                <div>
                  <p className="text-xs text-gray-600 mb-1">Timeliness</p>
                  <div className="flex items-center gap-1">
                    {renderStars(review.timeliness_rating)}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Creator Response */}
          {review.creator_response && (
            <div className="mt-4 p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-blue-600 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                </svg>
                <div className="flex-1">
                  <p className="font-medium text-blue-900 mb-1">Creator's Response</p>
                  <p className="text-blue-800 text-sm mb-1">{review.creator_response}</p>
                  <p className="text-xs text-blue-600">
                    {formatDate(review.creator_response_date)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Response Form */}
          {canRespond && !review.creator_response && (
            <div className="mt-4">
              {!showResponseForm ? (
                <button
                  onClick={() => setShowResponseForm(true)}
                  className="text-sm text-primary hover:text-primary-dark font-medium"
                >
                  Respond to this review
                </button>
              ) : (
                <form onSubmit={handleSubmitResponse} className="space-y-3">
                  <textarea
                    value={response}
                    onChange={(e) => setResponse(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Write your response..."
                    required
                  />
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg text-sm font-medium disabled:opacity-50"
                    >
                      {submitting ? 'Submitting...' : 'Submit Response'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowResponseForm(false);
                        setResponse('');
                      }}
                      className="px-4 py-2 border border-gray-300 hover:border-gray-400 text-gray-700 rounded-lg text-sm font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReviewCard;
