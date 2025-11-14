import { BASE_URL } from '../services/api';

const Avatar = ({
  src,
  alt = 'Avatar',
  size = 'md',
  type = 'user',
  className = '',
  objectFit = 'cover', // 'cover', 'contain', 'fill', 'scale-down'
  objectPosition = 'center' // 'center', 'top', 'bottom', 'left', 'right'
}) => {
  const sizeClasses = {
    xs: 'w-8 h-8',
    sm: 'w-10 h-10',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24',
    '2xl': 'w-32 h-32'
  };

  const iconSizes = {
    xs: 'w-4 h-4',
    sm: 'w-5 h-5',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12',
    '2xl': 'w-16 h-16'
  };

  const objectFitClass = {
    cover: 'object-cover',
    contain: 'object-contain',
    fill: 'object-fill',
    'scale-down': 'object-scale-down'
  }[objectFit] || 'object-cover';

  const objectPositionClass = {
    center: 'object-center',
    top: 'object-top',
    bottom: 'object-bottom',
    left: 'object-left',
    right: 'object-right'
  }[objectPosition] || 'object-center';

  const shapeClass = type === 'brand' ? 'rounded-lg' : 'rounded-full';

  if (src) {
    return (
      <img
        src={`${BASE_URL}${src}`}
        alt={alt}
        className={`${sizeClasses[size]} ${shapeClass} ${objectFitClass} ${objectPositionClass} ${className}`}
      />
    );
  }

  // Default avatar if no image
  return (
    <div className={`${sizeClasses[size]} ${shapeClass} bg-gray-200 flex items-center justify-center ${className}`}>
      {type === 'brand' ? (
        <svg className={`${iconSizes[size]} text-gray-400`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ) : (
        <svg className={`${iconSizes[size]} text-gray-400`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      )}
    </div>
  );
};

export default Avatar;
