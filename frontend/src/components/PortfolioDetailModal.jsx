import { useState } from 'react';
import { BASE_URL } from '../services/api';

const PortfolioDetailModal = ({ item, onClose }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const formatNumber = (num) => {
    if (!num) return '0';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString();
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Combine main image with additional media
  const allImages = [
    item.image_url,
    ...(item.media_urls || [])
  ].filter(Boolean);

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % allImages.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + allImages.length) % allImages.length);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between rounded-t-3xl z-10">
          <h2 className="text-2xl font-bold text-gray-900">{item.title}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          {/* Image Gallery */}
          {allImages.length > 0 && (
            <div className="mb-6">
              <div className="relative aspect-video bg-gray-100 rounded-2xl overflow-hidden">
                <img
                  src={allImages[currentImageIndex].startsWith('http')
                    ? allImages[currentImageIndex]
                    : `${BASE_URL}${allImages[currentImageIndex]}`}
                  alt={`${item.title} - Image ${currentImageIndex + 1}`}
                  className="w-full h-full object-cover"
                />

                {/* Navigation arrows */}
                {allImages.length > 1 && (
                  <>
                    <button
                      onClick={prevImage}
                      className="absolute left-4 top-1/2 -translate-y-1/2 bg-white bg-opacity-90 hover:bg-opacity-100 p-2 rounded-full shadow-lg transition-all"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <button
                      onClick={nextImage}
                      className="absolute right-4 top-1/2 -translate-y-1/2 bg-white bg-opacity-90 hover:bg-opacity-100 p-2 rounded-full shadow-lg transition-all"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>

                    {/* Image counter */}
                    <div className="absolute bottom-4 right-4 bg-black bg-opacity-70 text-white px-3 py-1 rounded-full text-sm">
                      {currentImageIndex + 1} / {allImages.length}
                    </div>
                  </>
                )}
              </div>

              {/* Thumbnail navigation */}
              {allImages.length > 1 && (
                <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
                  {allImages.map((img, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentImageIndex(index)}
                      className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                        index === currentImageIndex ? 'border-primary' : 'border-transparent hover:border-gray-300'
                      }`}
                    >
                      <img
                        src={img.startsWith('http') ? img : `${BASE_URL}${img}`}
                        alt={`Thumbnail ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Project Info */}
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            {/* Left Column */}
            <div className="space-y-4">
              {item.brand_name && (
                <div>
                  <div className="text-sm text-gray-500 mb-1">Brand/Client</div>
                  <div className="font-semibold text-lg text-gray-900">{item.brand_name}</div>
                </div>
              )}

              {item.platform && (
                <div>
                  <div className="text-sm text-gray-500 mb-1">Platform</div>
                  <div className="font-medium text-gray-900 capitalize">{item.platform}</div>
                </div>
              )}

              {item.collaboration_type && (
                <div>
                  <div className="text-sm text-gray-500 mb-1">Collaboration Type</div>
                  <div className="font-medium text-gray-900">{item.collaboration_type}</div>
                </div>
              )}

              {item.campaign_objective && (
                <div>
                  <div className="text-sm text-gray-500 mb-1">Campaign Objective</div>
                  <div className="font-medium text-gray-900">{item.campaign_objective}</div>
                </div>
              )}
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              {item.project_date && (
                <div>
                  <div className="text-sm text-gray-500 mb-1">Project Date</div>
                  <div className="font-medium text-gray-900">{formatDate(item.project_date)}</div>
                </div>
              )}

              {item.post_url && (
                <div>
                  <div className="text-sm text-gray-500 mb-1">View Content</div>
                  <a
                    href={item.post_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-primary hover:text-primary-dark font-medium"
                  >
                    Open Post
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          {item.description && (
            <div className="mb-6">
              <div className="text-sm text-gray-500 mb-2">Description</div>
              <p className="text-gray-700 leading-relaxed">{item.description}</p>
            </div>
          )}

          {/* Performance Metrics */}
          {(item.views || item.likes || item.comments || item.shares || item.engagement_rate || item.reach) && (
            <div className="mb-6">
              <div className="text-sm text-gray-500 mb-3">Performance Metrics</div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {item.views !== null && item.views !== undefined && (
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl">
                    <div className="text-2xl font-bold text-blue-900">{formatNumber(item.views)}</div>
                    <div className="text-sm text-blue-700">Views</div>
                  </div>
                )}

                {item.likes !== null && item.likes !== undefined && (
                  <div className="bg-gradient-to-br from-pink-50 to-pink-100 p-4 rounded-xl">
                    <div className="text-2xl font-bold text-pink-900">{formatNumber(item.likes)}</div>
                    <div className="text-sm text-pink-700">Likes</div>
                  </div>
                )}

                {item.comments !== null && item.comments !== undefined && (
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl">
                    <div className="text-2xl font-bold text-purple-900">{formatNumber(item.comments)}</div>
                    <div className="text-sm text-purple-700">Comments</div>
                  </div>
                )}

                {item.shares !== null && item.shares !== undefined && (
                  <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl">
                    <div className="text-2xl font-bold text-green-900">{formatNumber(item.shares)}</div>
                    <div className="text-sm text-green-700">Shares</div>
                  </div>
                )}

                {item.engagement_rate !== null && item.engagement_rate !== undefined && (
                  <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-4 rounded-xl">
                    <div className="text-2xl font-bold text-yellow-900">{(item.engagement_rate * 100).toFixed(2)}%</div>
                    <div className="text-sm text-yellow-700">Engagement Rate</div>
                  </div>
                )}

                {item.reach !== null && item.reach !== undefined && (
                  <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-4 rounded-xl">
                    <div className="text-2xl font-bold text-indigo-900">{formatNumber(item.reach)}</div>
                    <div className="text-sm text-indigo-700">Reach</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Results */}
          {item.result_description && (
            <div className="mb-6 bg-green-50 border-l-4 border-green-500 p-4 rounded-r-xl">
              <div className="text-sm font-semibold text-green-900 mb-2 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Results & Impact
              </div>
              <p className="text-green-800 leading-relaxed">{item.result_description}</p>
            </div>
          )}

          {/* Client Testimonial */}
          {item.client_testimonial && (
            <div className="bg-gray-50 p-6 rounded-2xl border-l-4 border-primary">
              <div className="flex items-start gap-3">
                <svg className="w-8 h-8 text-primary flex-shrink-0 mt-1" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                </svg>
                <div className="flex-1">
                  <p className="text-gray-700 italic leading-relaxed mb-2">"{item.client_testimonial}"</p>
                  {item.brand_name && (
                    <p className="text-sm text-gray-600 font-medium">— {item.brand_name}</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-6 rounded-b-3xl">
          <button
            onClick={onClose}
            className="w-full py-3 px-6 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-full font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default PortfolioDetailModal;
