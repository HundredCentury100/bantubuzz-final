import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { reviewsAPI, collaborationsAPI } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import Navbar from '../components/Navbar';
import Avatar from '../components/Avatar';
import toast from 'react-hot-toast';

const ReviewForm = () => {
  const { id } = useParams(); // collaboration ID
  const navigate = useNavigate();
  const { user } = useAuth();
  const [collaboration, setCollaboration] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [communicationRating, setCommunicationRating] = useState(0);
  const [qualityRating, setQualityRating] = useState(0);
  const [professionalismRating, setProfessionalismRating] = useState(0);
  const [timelinessRating, setTimelinessRating] = useState(0);
  const [wouldRecommend, setWouldRecommend] = useState(true);

  const isBrand = user?.user_type === 'brand';

  useEffect(() => {
    fetchCollaboration();
  }, [id]);

  const fetchCollaboration = async () => {
    try {
      setLoading(true);
      const response = await collaborationsAPI.getCollaboration(id);
      setCollaboration(response.data);

      // Check if collaboration is completed
      if (response.data.status !== 'completed') {
        toast.error('You can only review completed collaborations');
        navigate(`/${isBrand ? 'brand' : 'creator'}/collaborations/${id}`);
      }

      // Check if user is a brand
      if (!isBrand) {
        toast.error('Only brands can leave reviews');
        navigate(`/${isBrand ? 'brand' : 'creator'}/collaborations/${id}`);
      }
    } catch (error) {
      console.error('Error fetching collaboration:', error);
      toast.error('Failed to load collaboration details');
      navigate(`/${isBrand ? 'brand' : 'creator'}/collaborations`);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (rating === 0) {
      toast.error('Please select an overall rating');
      return;
    }

    if (!comment.trim()) {
      toast.error('Please write a comment');
      return;
    }

    try {
      setSubmitting(true);

      const reviewData = {
        collaboration_id: parseInt(id),
        rating,
        title,
        comment,
        communication_rating: communicationRating || null,
        quality_rating: qualityRating || null,
        professionalism_rating: professionalismRating || null,
        timeliness_rating: timelinessRating || null,
        would_recommend: wouldRecommend
      };

      await reviewsAPI.createReview(reviewData);
      toast.success('Review submitted successfully!');
      navigate(`/${isBrand ? 'brand' : 'creator'}/collaborations/${id}`);
    } catch (error) {
      console.error('Error submitting review:', error);
      const errorMessage = error.response?.data?.error || 'Failed to submit review';
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const StarRating = ({ value, onChange, hover, onHover, label, optional = false }) => {
    return (
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label} {!optional && <span className="text-red-500">*</span>}
        </label>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => onChange(star)}
              onMouseEnter={() => onHover && onHover(star)}
              onMouseLeave={() => onHover && onHover(0)}
              className="focus:outline-none transition-transform hover:scale-110"
            >
              <svg
                className={`w-10 h-10 ${
                  star <= (hover || value)
                    ? 'text-primary-dark fill-current'
                    : 'text-gray-300'
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
            </button>
          ))}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!collaboration) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Collaboration not found</h2>
          <Link to="/brand/collaborations" className="text-primary hover:text-primary-dark">
            Back to Collaborations
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            to={`/brand/collaborations/${id}`}
            className="text-gray-600 hover:text-gray-900 flex items-center gap-2 mb-4"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Collaboration
          </Link>

          <h1 className="text-3xl font-bold text-gray-900 mb-2">Leave a Review</h1>
          <p className="text-gray-600">Share your experience working with this creator</p>
        </div>

        {/* Creator Info */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center gap-4">
            <Avatar
              src={collaboration.creator?.profile_picture}
              alt={collaboration.creator?.user?.email?.split('@')[0]}
              size="lg"
              type="user"
            />
            <div>
              <h3 className="text-lg font-bold text-gray-900">
                {collaboration.creator?.user?.email?.split('@')[0]}
              </h3>
              <p className="text-gray-600">{collaboration.title}</p>
            </div>
          </div>
        </div>

        {/* Review Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
          {/* Overall Rating */}
          <StarRating
            value={rating}
            onChange={setRating}
            hover={hoverRating}
            onHover={setHoverRating}
            label="Overall Rating"
          />

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Review Title (Optional)
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="Summarize your experience..."
              maxLength={100}
            />
          </div>

          {/* Comment */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Your Review <span className="text-red-500">*</span>
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={6}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="Share your experience working with this creator..."
              required
            />
          </div>

          {/* Detailed Ratings */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Detailed Ratings (Optional)</h3>

            <StarRating
              value={communicationRating}
              onChange={setCommunicationRating}
              label="Communication"
              optional
            />

            <StarRating
              value={qualityRating}
              onChange={setQualityRating}
              label="Quality of Work"
              optional
            />

            <StarRating
              value={professionalismRating}
              onChange={setProfessionalismRating}
              label="Professionalism"
              optional
            />

            <StarRating
              value={timelinessRating}
              onChange={setTimelinessRating}
              label="Timeliness"
              optional
            />
          </div>

          {/* Would Recommend */}
          <div className="border-t pt-6">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={wouldRecommend}
                onChange={(e) => setWouldRecommend(e.target.checked)}
                className="w-5 h-5 text-primary border-gray-300 rounded focus:ring-2 focus:ring-primary"
              />
              <span className="text-gray-700">I would recommend this creator to others</span>
            </label>
          </div>

          {/* Submit Button */}
          <div className="flex gap-3 pt-6">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-6 py-3 bg-primary hover:bg-primary-dark text-white font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Submit Review'}
            </button>
            <Link
              to={`/brand/collaborations/${id}`}
              className="px-6 py-3 border-2 border-gray-300 hover:border-gray-400 text-gray-700 font-medium rounded-lg transition-colors text-center"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReviewForm;
