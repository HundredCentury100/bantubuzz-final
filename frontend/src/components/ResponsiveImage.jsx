import React, { useState } from 'react';
import { BASE_URL } from '../services/api';

/**
 * ResponsiveImage Component
 *
 * Automatically loads the optimal image size based on viewport and container size.
 * Uses <picture> element for responsive images with WebP support and fallbacks.
 *
 * Features:
 * - Lazy loading by default (can be disabled for above-the-fold images)
 * - Automatic srcset generation for different screen sizes
 * - Loading states with skeleton/spinner
 * - Error handling with fallback UI
 * - Supports both new multi-size format and legacy single image format
 *
 * @param {Object} props - Component props
 * @param {Object|string} props.sizes - Image sizes object with thumbnail, medium, large OR single image path
 * @param {string} props.alt - Alt text for accessibility
 * @param {string} props.className - CSS classes to apply to the image
 * @param {boolean} props.eager - Disable lazy loading (for above-the-fold images)
 * @param {boolean} props.showLoading - Show loading skeleton while image loads
 * @param {string} props.objectFit - CSS object-fit value (cover, contain, etc.)
 * @param {Function} props.onClick - Click handler
 */
export default function ResponsiveImage({
  sizes,
  alt = 'Image',
  className = '',
  eager = false,
  showLoading = false,
  objectFit = 'cover',
  onClick
}) {
  const [isLoading, setIsLoading] = useState(showLoading);
  const [hasError, setHasError] = useState(false);

  // Handle legacy format (single image path string)
  const isLegacyFormat = typeof sizes === 'string';

  // If sizes is null/undefined or error, show placeholder
  if (!sizes || hasError) {
    return (
      <div
        className={`bg-gray-200 flex items-center justify-center ${className}`}
        style={{ minHeight: '100px' }}
      >
        <svg
          className="w-12 h-12 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </div>
    );
  }

  // Legacy format: just render a simple img tag
  if (isLegacyFormat) {
    // Prepend BASE_URL if path is relative
    const imageSrc = sizes.startsWith('http') ? sizes : `${BASE_URL}${sizes}`;
    return (
      <img
        src={imageSrc}
        alt={alt}
        className={className}
        loading={eager ? 'eager' : 'lazy'}
        style={{ objectFit }}
        onClick={onClick}
        onError={() => setHasError(true)}
      />
    );
  }

  // New multi-size format
  const { thumbnail, medium, large } = sizes;

  // Fallback if no sizes available
  if (!thumbnail && !medium && !large) {
    return (
      <div className={`bg-gray-200 flex items-center justify-center ${className}`}>
        <span className="text-gray-500 text-sm">No image</span>
      </div>
    );
  }

  // Helper function to build full URL
  const getFullUrl = (path) => {
    if (!path) return null;
    return path.startsWith('http') ? path : `${BASE_URL}${path}`;
  };

  // Use best available size as fallback
  const fallbackSrc = getFullUrl(large || medium || thumbnail);

  const handleLoad = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  return (
    <div className={`relative ${className}`}>
      {/* Loading skeleton */}
      {isLoading && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}

      {/* Responsive image with picture element */}
      <picture onClick={onClick} className={onClick ? 'cursor-pointer' : ''}>
        {/* Desktop: Large (1024px+) */}
        {large && (
          <source
            srcSet={getFullUrl(large)}
            media="(min-width: 1024px)"
            type="image/webp"
          />
        )}

        {/* Tablet: Medium (640px - 1023px) */}
        {medium && (
          <source
            srcSet={getFullUrl(medium)}
            media="(min-width: 640px)"
            type="image/webp"
          />
        )}

        {/* Mobile: Thumbnail (<640px) */}
        {thumbnail && (
          <source
            srcSet={getFullUrl(thumbnail)}
            type="image/webp"
          />
        )}

        {/* Fallback img tag */}
        <img
          src={fallbackSrc}
          alt={alt}
          className={`w-full h-full ${className}`}
          style={{ objectFit }}
          loading={eager ? 'eager' : 'lazy'}
          onLoad={handleLoad}
          onError={handleError}
        />
      </picture>
    </div>
  );
}

/**
 * Usage Examples:
 *
 * // With multi-size format (recommended)
 * <ResponsiveImage
 *   sizes={creator.profile_picture_sizes}
 *   alt={creator.username}
 *   className="w-32 h-32 rounded-full"
 * />
 *
 * // With loading state
 * <ResponsiveImage
 *   sizes={brand.logo_sizes}
 *   alt={brand.company_name}
 *   className="w-full h-64"
 *   showLoading={true}
 * />
 *
 * // Above the fold (no lazy loading)
 * <ResponsiveImage
 *   sizes={hero.image_sizes}
 *   alt="Hero image"
 *   className="w-full h-screen"
 *   eager={true}
 * />
 *
 * // With click handler (for lightbox, etc.)
 * <ResponsiveImage
 *   sizes={galleryItem}
 *   alt="Gallery item"
 *   className="w-full h-48"
 *   onClick={() => openLightbox(galleryItem.large)}
 * />
 *
 * // Legacy format (backward compatible)
 * <ResponsiveImage
 *   sizes="/uploads/profiles/old-image.jpg"
 *   alt="Legacy image"
 *   className="w-24 h-24 rounded"
 * />
 */
