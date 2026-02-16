import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { creatorsAPI, packagesAPI, brandsAPI, reviewsAPI, BASE_URL } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { useCart } from '../contexts/CartContext';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import ReviewCard from '../components/ReviewCard';
import CreatorBadge from '../components/CreatorBadge';
import CustomPackageRequestModal from '../components/CustomPackageRequestModal';
import SEO from '../components/SEO';
import toast from 'react-hot-toast';

const CreatorProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToCart } = useCart();
  const [creator, setCreator] = useState(null);
  const [packages, setPackages] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [reviewsStats, setReviewsStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [showCustomRequestModal, setShowCustomRequestModal] = useState(false);

  useEffect(() => {
    fetchCreatorData();
    fetchReviews();
  }, [id]);

  const fetchCreatorData = async () => {
    try {
      setLoading(true);

      // Fetch creator profile
      const creatorResponse = await creatorsAPI.getCreator(id);
      const creatorData = creatorResponse.data;

      // Handle both old (array of strings) and new (array of objects) gallery formats
      if (creatorData.gallery_images && Array.isArray(creatorData.gallery_images)) {
        // Convert new format to displayable paths
        const galleryPaths = creatorData.gallery_images.map(item =>
          typeof item === 'string' ? item : item.medium || item.large || item.thumbnail
        );
        creatorData.gallery = galleryPaths;
      } else if (!creatorData.gallery) {
        creatorData.gallery = [];
      }

      setCreator(creatorData);

      // Fetch creator's packages
      const packagesResponse = await packagesAPI.getPackages({ creator_id: id });
      setPackages(packagesResponse.data.packages || []);

      // Check if creator is saved (for brands only)
      if (user?.user_type === 'brand') {
        const savedResponse = await brandsAPI.getSavedCreators();
        const savedCreators = savedResponse.data.creators || [];
        setIsSaved(savedCreators.some(c => c.id === parseInt(id)));
      }
    } catch (error) {
      console.error('Error fetching creator data:', error);
      toast.error('Failed to load creator profile');
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async () => {
    try {
      setReviewsLoading(true);
      const response = await reviewsAPI.getCreatorReviews(id, { per_page: 10 });
      setReviews(response.data.reviews || []);
      setReviewsStats(response.data.average_ratings || null);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setReviewsLoading(false);
    }
  };

  const handleSaveCreator = async () => {
    if (user?.user_type !== 'brand') {
      toast.error('Only brands can save creators');
      return;
    }

    try {
      if (isSaved) {
        await brandsAPI.unsaveCreator(id);
        setIsSaved(false);
        toast.success('Creator removed from saved');
      } else {
        await brandsAPI.saveCreator(id);
        setIsSaved(true);
        toast.success('Creator saved successfully');
      }
    } catch (error) {
      console.error('Error saving creator:', error);
      toast.error('Failed to save creator');
    }
  };

  const handleAddResponse = async (reviewId, response) => {
    try {
      await reviewsAPI.addCreatorResponse(reviewId, response);
      toast.success('Response added successfully');
      fetchReviews(); // Refresh reviews
    } catch (error) {
      console.error('Error adding response:', error);
      toast.error('Failed to add response');
      throw error;
    }
  };

  const handleAddToCart = (pkg) => {
    addToCart({
      package_id: pkg.id,
      creator_id: creator.id,
      creator_name: creator.display_name || creator.username,
      title: pkg.title,
      description: pkg.description,
      price: pkg.price,
      deliverables: pkg.deliverables || []
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-light">
        <Navbar />
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!creator) {
    return (
      <div className="min-h-screen bg-light">
        <Navbar />
        <div className="container-custom section-padding text-center">
          <h1 className="text-2xl font-bold mb-4">Creator not found</h1>
          <Link to="/browse/creators" className="btn btn-primary">
            Back to Creators
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-light">
      <SEO
        title={creator ? `${creator.display_name || creator.username || 'Creator'} - Creator Profile` : 'Creator Profile'}
        description={creator?.bio || `View this creator's profile, packages, and reviews on BantuBuzz.`}
        keywords={creator?.categories ? creator.categories.join(', ') + ', creator profile' : 'creator profile, influencer'}
      />
      <Navbar />

      <div className="container-custom section-padding">
        {/* Navigation */}
        <div className="mb-6 flex items-center gap-4">
          <Link
            to="/browse/creators"
            className="text-gray-600 hover:text-gray-900 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Creators
          </Link>
          {user?.user_type === 'brand' && (
            <>
              <span className="text-gray-300">|</span>
              <Link to="/brand/dashboard" className="text-gray-600 hover:text-gray-900">
                Back to Dashboard
              </Link>
            </>
          )}
        </div>

        {/* Creator Header */}
        <div className="card mb-8">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Avatar */}
            <div className="flex-shrink-0">
              {creator.profile_picture ? (
                <img
                  src={`${BASE_URL}${creator.profile_picture}`}
                  alt={creator.display_name || creator.username || 'Creator'}
                  className="w-32 h-32 rounded-full object-cover border-4 border-primary/20"
                />
              ) : (
                <div className="w-32 h-32 bg-primary/10 rounded-full flex items-center justify-center">
                  <svg className="w-16 h-16 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              )}
            </div>

            {/* Creator Info */}
            <div className="flex-1">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
                <div className="flex-1">
                  <h1 className="text-3xl font-bold text-dark mb-2">
                    {creator.display_name || creator.username || 'Creator'}
                  </h1>

                  {/* Badges */}
                  {creator.badges && creator.badges.length > 0 && (
                    <div className="mb-3">
                      <div className="flex flex-wrap gap-2 mb-2">
                        {creator.badges.map((badge, idx) => (
                          <CreatorBadge key={idx} badge={badge} size="md" />
                        ))}
                      </div>

                      {/* Badge Explanations - Mobile Responsive */}
                      <div className="mt-2 space-y-2">
                        {creator.badges.includes('top_creator') && (
                          <div className="flex items-start gap-2 text-xs sm:text-sm text-gray-600">
                            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            <span className="leading-snug"><strong className="font-semibold">Top Creator:</strong> 5+ collaborations in last 30 days with high ratings</span>
                          </div>
                        )}
                        {creator.badges.includes('responds_fast') && (
                          <div className="flex items-start gap-2 text-xs sm:text-sm text-gray-600">
                            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            <span className="leading-snug"><strong className="font-semibold">Responds Fast:</strong> Typically replies within 2 hours</span>
                          </div>
                        )}
                        {creator.badges.includes('verified_creator') && (
                          <div className="flex items-start gap-2 text-xs sm:text-sm text-gray-600">
                            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            <span className="leading-snug"><strong className="font-semibold">Verified Creator:</strong> Identity verified by BantuBuzz</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <p className="text-gray-600 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {creator.location || 'Location not set'}
                  </p>
                </div>

                {/* Actions - Desktop: Side by side on right, Mobile: Stacked below badges */}
                {user?.user_type === 'brand' && (
                  <div className="flex flex-col gap-3 w-full md:w-auto md:flex-row md:gap-2 md:flex-shrink-0">
                    <Link
                      to="/messages"
                      state={{ startConversationWith: { id: creator.user_id, email: creator.user?.email } }}
                      className="px-6 py-3 rounded-full border border-primary bg-primary text-white hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 whitespace-nowrap font-medium w-full md:w-auto"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      Send Message
                    </Link>
                    <button
                      onClick={handleSaveCreator}
                      className={`px-6 py-3 rounded-full border transition-colors flex items-center justify-center gap-2 whitespace-nowrap font-medium w-full md:w-auto ${
                        isSaved
                          ? 'bg-primary text-white border-primary'
                          : 'bg-white text-gray-600 border-gray-300 hover:border-primary hover:text-primary'
                      }`}
                    >
                      <svg className="w-5 h-5" fill={isSaved ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                      </svg>
                      {isSaved ? 'Saved' : 'Save Creator'}
                    </button>
                  </div>
                )}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="text-center p-3 bg-light rounded-lg">
                  <p className="text-2xl font-bold text-dark">
                    {creator.follower_count >= 1000
                      ? `${(creator.follower_count / 1000).toFixed(1)}K`
                      : creator.follower_count || 0}
                  </p>
                  <p className="text-sm text-gray-600">Followers</p>
                </div>
                <div className="text-center p-3 bg-light rounded-lg">
                  <p className="text-2xl font-bold text-dark">{packages.length}</p>
                  <p className="text-sm text-gray-600">Packages</p>
                </div>
                <div className="text-center p-3 bg-light rounded-lg">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <svg className="w-5 h-5 text-primary-dark fill-current" viewBox="0 0 24 24">
                      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                    </svg>
                    <p className="text-2xl font-bold text-dark">
                      {reviewsStats?.overall || 0}
                    </p>
                  </div>
                  <p className="text-sm text-gray-600">
                    {reviews.length} {reviews.length === 1 ? 'Review' : 'Reviews'}
                  </p>
                </div>
                <div className="text-center p-3 bg-light rounded-lg flex items-center justify-center">
                  <span className="text-xs px-3 py-1 border border-gray-300 rounded-full text-gray-700 capitalize">
                    {creator.availability_status || 'unavailable'}
                  </span>
                </div>
              </div>

              {/* Bio */}
              {creator.bio && (
                <p className="text-gray-700 mb-4">{creator.bio}</p>
              )}

              {/* Categories */}
              {creator.categories && creator.categories.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Categories</h3>
                  <div className="flex flex-wrap gap-2">
                    {creator.categories.map((category, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm"
                      >
                        {category}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Languages */}
              {creator.languages && creator.languages.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Languages</h3>
                  <div className="flex flex-wrap gap-2">
                    {creator.languages.map((language, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                      >
                        {language}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Social Links */}
              {creator.social_links && Object.keys(creator.social_links).some(key => creator.social_links[key]) && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Social Media</h3>
                  <div className="flex gap-3">
                    {creator.social_links.instagram && (
                      <a
                        href={`https://www.instagram.com/${creator.social_links.instagram.replace('@', '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="transition-colors hover:opacity-80"
                        title={`@${creator.social_links.instagram.replace('@', '')} on Instagram`}
                      >
                        <svg className="w-7 h-7" viewBox="0 0 24 24" fill="url(#instagram-gradient)">
                          <defs>
                            <linearGradient id="instagram-gradient" x1="0%" y1="100%" x2="100%" y2="0%">
                              <stop offset="0%" style={{stopColor: '#f09433', stopOpacity: 1}} />
                              <stop offset="25%" style={{stopColor: '#e6683c', stopOpacity: 1}} />
                              <stop offset="50%" style={{stopColor: '#dc2743', stopOpacity: 1}} />
                              <stop offset="75%" style={{stopColor: '#cc2366', stopOpacity: 1}} />
                              <stop offset="100%" style={{stopColor: '#bc1888', stopOpacity: 1}} />
                            </linearGradient>
                          </defs>
                          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                        </svg>
                      </a>
                    )}
                    {creator.social_links.tiktok && (
                      <a
                        href={`https://www.tiktok.com/@${creator.social_links.tiktok.replace('@', '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="transition-colors hover:opacity-80"
                        title={`@${creator.social_links.tiktok.replace('@', '')} on TikTok`}
                      >
                        <svg className="w-7 h-7" viewBox="0 0 24 24" fill="#000000">
                          <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
                        </svg>
                      </a>
                    )}
                    {creator.social_links.youtube && (
                      <a
                        href={`https://www.youtube.com/@${creator.social_links.youtube.replace('@', '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="transition-colors hover:opacity-80"
                        title={`@${creator.social_links.youtube.replace('@', '')} on YouTube`}
                      >
                        <svg className="w-7 h-7" viewBox="0 0 24 24" fill="#FF0000">
                          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                        </svg>
                      </a>
                    )}
                    {creator.social_links.twitter && (
                      <a
                        href={`https://twitter.com/${creator.social_links.twitter.replace('@', '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="transition-colors hover:opacity-80"
                        title={`@${creator.social_links.twitter.replace('@', '')} on Twitter`}
                      >
                        <svg className="w-7 h-7" viewBox="0 0 24 24" fill="#1DA1F2">
                          <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                        </svg>
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Packages Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-dark mb-6">Available Packages</h2>

          {packages.length === 0 ? (
            <div className="card text-center py-12">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <h3 className="text-lg font-medium text-gray-700 mb-2">No packages available</h3>
              <p className="text-gray-500">This creator hasn't created any packages yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {packages.filter(pkg => pkg.is_active).map((pkg) => (
                <div key={pkg.id} className="card hover:shadow-lg transition-shadow">
                  <h3 className="font-bold text-lg text-dark mb-2">{pkg.title}</h3>
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">{pkg.description}</p>

                  <div className="mb-4">
                    <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded">
                      {pkg.category}
                    </span>
                  </div>

                  <div className="flex items-baseline gap-2 mb-4">
                    <span className="text-2xl font-bold text-primary">${pkg.price}</span>
                    <span className="text-sm text-gray-500">/ {pkg.duration_days} days</span>
                  </div>

                  {pkg.deliverables && pkg.deliverables.length > 0 && (
                    <div className="mb-4">
                      <p className="text-sm font-medium text-gray-700 mb-2">Includes:</p>
                      <ul className="text-sm text-gray-600 space-y-1">
                        {pkg.deliverables.slice(0, 3).map((item, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <svg className="w-4 h-4 text-primary-dark mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span className="line-clamp-1">{item}</span>
                          </li>
                        ))}
                        {pkg.deliverables.length > 3 && (
                          <li className="text-primary text-xs">+{pkg.deliverables.length - 3} more</li>
                        )}
                      </ul>
                    </div>
                  )}

                  <div className="flex gap-2">
                    {(!user || user?.user_type === 'brand') && (
                      <button
                        onClick={() => handleAddToCart(pkg)}
                        className="flex-1 px-4 py-2 rounded-lg border border-primary bg-white text-primary hover:bg-primary hover:text-white transition-colors flex items-center justify-center gap-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        Add to Cart
                      </button>
                    )}
                    <Link
                      to={`/packages/${pkg.id}`}
                      className={`btn btn-primary text-center ${(!user || user?.user_type === 'brand') ? 'flex-1' : 'w-full'}`}
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Custom Package Request Option */}
          {user?.user_type === 'brand' && (
            <div className="mt-8 p-6 border-2 border-dashed border-primary rounded-lg text-center bg-primary/5">
              <div className="max-w-2xl mx-auto">
                <svg className="w-12 h-12 text-primary mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <h3 className="text-xl font-bold text-dark mb-2">
                  Need a Custom Package?
                </h3>
                <p className="text-gray-600 mb-4">
                  Don't see what you're looking for? Tell {creator.display_name || creator.username} what you need, and they'll create a custom offer tailored just for you.
                </p>
                <button
                  onClick={() => setShowCustomRequestModal(true)}
                  className="btn btn-primary inline-flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                  Request Custom Package
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Gallery Section */}
        {creator.gallery && creator.gallery.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-dark mb-6">Portfolio Gallery</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {creator.gallery.map((imagePath, index) => (
                <div
                  key={index}
                  className="aspect-square cursor-pointer overflow-hidden rounded-lg shadow-md hover:shadow-lg transition-shadow"
                  onClick={() => setSelectedImage(imagePath)}
                >
                  <img
                    src={`${BASE_URL}${imagePath}`}
                    alt={`Gallery ${index + 1}`}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Image Modal */}
        {selectedImage && (
          <div
            className="fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedImage(null)}
          >
            <div className="relative max-w-4xl max-h-full">
              <button
                onClick={() => setSelectedImage(null)}
                className="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors"
              >
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <img
                src={`${BASE_URL}${selectedImage}`}
                alt="Gallery full view"
                className="max-w-full max-h-[80vh] object-contain rounded-lg"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
        )}

        {/* Reviews Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-dark">Reviews & Ratings</h2>
          </div>

          {reviewsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : reviews.length === 0 ? (
            <div className="card text-center py-12">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-700 mb-2">No reviews yet</h3>
              <p className="text-gray-500">This creator hasn't received any reviews yet</p>
            </div>
          ) : (
            <>
              {/* Reviews Summary */}
              {reviewsStats && (
                <div className="card mb-6">
                  <div className="flex flex-col md:flex-row gap-8">
                    {/* Overall Rating */}
                    <div className="flex flex-col items-center justify-center p-6 bg-light rounded-lg">
                      <div className="text-5xl font-bold text-dark mb-2">
                        {reviewsStats.overall}
                      </div>
                      <div className="flex gap-1 mb-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <svg
                            key={star}
                            className={`w-6 h-6 ${
                              star <= Math.round(reviewsStats.overall)
                                ? 'text-primary-dark fill-current'
                                : 'text-gray-300'
                            }`}
                            viewBox="0 0 24 24"
                          >
                            <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                          </svg>
                        ))}
                      </div>
                      <p className="text-sm text-gray-600">
                        Based on {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}
                      </p>
                    </div>

                    {/* Detailed Ratings */}
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900 mb-4">Rating Breakdown</h3>
                      <div className="space-y-3">
                        {reviewsStats.communication !== null && (
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-medium text-gray-700 w-32">Communication</span>
                            <div className="flex-1 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-primary rounded-full h-2"
                                style={{ width: `${(reviewsStats.communication / 5) * 100}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-medium text-gray-900 w-8">
                              {reviewsStats.communication}
                            </span>
                          </div>
                        )}
                        {reviewsStats.quality !== null && (
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-medium text-gray-700 w-32">Quality</span>
                            <div className="flex-1 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-primary rounded-full h-2"
                                style={{ width: `${(reviewsStats.quality / 5) * 100}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-medium text-gray-900 w-8">
                              {reviewsStats.quality}
                            </span>
                          </div>
                        )}
                        {reviewsStats.professionalism !== null && (
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-medium text-gray-700 w-32">Professionalism</span>
                            <div className="flex-1 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-primary rounded-full h-2"
                                style={{ width: `${(reviewsStats.professionalism / 5) * 100}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-medium text-gray-900 w-8">
                              {reviewsStats.professionalism}
                            </span>
                          </div>
                        )}
                        {reviewsStats.timeliness !== null && (
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-medium text-gray-700 w-32">Timeliness</span>
                            <div className="flex-1 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-primary rounded-full h-2"
                                style={{ width: `${(reviewsStats.timeliness / 5) * 100}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-medium text-gray-900 w-8">
                              {reviewsStats.timeliness}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Individual Reviews */}
              <div className="space-y-4">
                {reviews.map((review) => (
                  <ReviewCard
                    key={review.id}
                    review={review}
                    onResponseSubmit={handleAddResponse}
                    canRespond={user?.user_type === 'creator' && user?.id === creator?.user_id}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Success Stories */}
        {creator.success_stories && (
          <div className="card">
            <h2 className="text-2xl font-bold text-dark mb-4">Success Stories</h2>
            <p className="text-gray-700 whitespace-pre-line">{creator.success_stories}</p>
          </div>
        )}
      </div>

      <Footer />

      {/* Custom Package Request Modal */}
      {showCustomRequestModal && (
        <CustomPackageRequestModal
          creatorId={creator.id}
          creatorName={creator.display_name || creator.username}
          onClose={() => setShowCustomRequestModal(false)}
          onSuccess={() => {
            toast.success('Your custom package request has been sent! Check your notifications for the creator\'s response.');
          }}
        />
      )}
    </div>
  );
};

export default CreatorProfile;
