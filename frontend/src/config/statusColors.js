/**
 * BantuBuzz Status Color Configuration
 *
 * Centralized status color system for consistent UI across the platform.
 * Used by StatusBadge, StatCard, and other components displaying status information.
 *
 * Color Philosophy:
 * - Primary brand color (olive-green #ccdb53) for "in_progress" - represents active work
 * - Green for success states (approved, completed, paid)
 * - Yellow for pending/waiting states
 * - Orange for revision/warning states
 * - Red for failure/cancelled/rejected states
 * - Purple for alternative active states
 *
 * @see docs/BantuBuzz-Color-Usage-Guideline.md
 */

/**
 * Status color definitions
 * Each status has multiple variants for different UI contexts:
 * - bg: Background color for sections/cards
 * - text: Text color
 * - border: Border color
 * - badge: Background color for small status badges
 * - button: Button background color (for action buttons)
 */
export const statusColors = {
  // Pending/Waiting States
  pending: {
    bg: 'bg-yellow-50',
    text: 'text-yellow-800',
    border: 'border-yellow-200',
    badge: 'bg-yellow-100',
    button: 'bg-yellow-600',
  },

  // Active/In Progress States (Uses Brand Primary Color)
  in_progress: {
    bg: 'bg-primary/5',
    text: 'text-primary-dark',
    border: 'border-primary/20',
    badge: 'bg-primary/10',
    button: 'bg-primary',
  },

  active: {
    bg: 'bg-primary/5',
    text: 'text-primary-dark',
    border: 'border-primary/20',
    badge: 'bg-primary/10',
    button: 'bg-primary',
  },

  processing: {
    bg: 'bg-primary/5',
    text: 'text-primary-dark',
    border: 'border-primary/20',
    badge: 'bg-primary/10',
    button: 'bg-primary',
  },

  // Success/Completed States
  approved: {
    bg: 'bg-green-50',
    text: 'text-green-800',
    border: 'border-green-200',
    badge: 'bg-green-100',
    button: 'bg-green-600',
  },

  completed: {
    bg: 'bg-green-50',
    text: 'text-green-800',
    border: 'border-green-200',
    badge: 'bg-green-100',
    button: 'bg-green-600',
  },

  paid: {
    bg: 'bg-green-50',
    text: 'text-green-800',
    border: 'border-green-200',
    badge: 'bg-green-100',
    button: 'bg-green-600',
  },

  confirmed: {
    bg: 'bg-green-50',
    text: 'text-green-800',
    border: 'border-green-200',
    badge: 'bg-green-100',
    button: 'bg-green-600',
  },

  accepted: {
    bg: 'bg-green-50',
    text: 'text-green-800',
    border: 'border-green-200',
    badge: 'bg-green-100',
    button: 'bg-green-600',
  },

  // Failure/Cancelled/Rejected States
  rejected: {
    bg: 'bg-red-50',
    text: 'text-red-800',
    border: 'border-red-200',
    badge: 'bg-red-100',
    button: 'bg-red-600',
  },

  cancelled: {
    bg: 'bg-red-50',
    text: 'text-red-800',
    border: 'border-red-200',
    badge: 'bg-red-100',
    button: 'bg-red-600',
  },

  failed: {
    bg: 'bg-red-50',
    text: 'text-red-800',
    border: 'border-red-200',
    badge: 'bg-red-100',
    button: 'bg-red-600',
  },

  declined: {
    bg: 'bg-red-50',
    text: 'text-red-800',
    border: 'border-red-200',
    badge: 'bg-red-100',
    button: 'bg-red-600',
  },

  // Revision/Warning States
  revision_requested: {
    bg: 'bg-orange-50',
    text: 'text-orange-800',
    border: 'border-orange-200',
    badge: 'bg-orange-100',
    button: 'bg-orange-600',
  },

  under_review: {
    bg: 'bg-orange-50',
    text: 'text-orange-800',
    border: 'border-orange-200',
    badge: 'bg-orange-100',
    button: 'bg-orange-600',
  },

  // Draft/Inactive States
  draft: {
    bg: 'bg-gray-50',
    text: 'text-gray-800',
    border: 'border-gray-200',
    badge: 'bg-gray-100',
    button: 'bg-gray-600',
  },

  inactive: {
    bg: 'bg-gray-50',
    text: 'text-gray-700',
    border: 'border-gray-200',
    badge: 'bg-gray-100',
    button: 'bg-gray-600',
  },

  // Alternative Active States (for different workflows)
  reviewing: {
    bg: 'bg-purple-50',
    text: 'text-purple-800',
    border: 'border-purple-200',
    badge: 'bg-purple-100',
    button: 'bg-purple-600',
  },

  verifying: {
    bg: 'bg-purple-50',
    text: 'text-purple-800',
    border: 'border-purple-200',
    badge: 'bg-purple-100',
    button: 'bg-purple-600',
  },
};

/**
 * Get status color for a specific variant
 *
 * @param {string} status - The status key (e.g., 'pending', 'approved')
 * @param {string} variant - The color variant ('bg', 'text', 'border', 'badge', 'button')
 * @returns {string} Tailwind CSS class for the color
 *
 * @example
 * getStatusColor('pending', 'badge') // Returns: 'bg-yellow-100'
 * getStatusColor('approved', 'text') // Returns: 'text-green-800'
 */
export const getStatusColor = (status, variant = 'badge') => {
  const normalizedStatus = status?.toLowerCase()?.replace(/\s+/g, '_');
  const statusConfig = statusColors[normalizedStatus];

  if (!statusConfig) {
    console.warn(`Unknown status: "${status}". Using default gray color.`);
    return variant === 'badge' ? 'bg-gray-100' :
           variant === 'text' ? 'text-gray-800' :
           variant === 'border' ? 'border-gray-200' :
           variant === 'bg' ? 'bg-gray-50' :
           'bg-gray-600'; // button default
  }

  return statusConfig[variant] || statusConfig.badge;
};

/**
 * Get all color classes for a status as a string
 * Useful for applying multiple classes at once
 *
 * @param {string} status - The status key
 * @param {Array<string>} variants - Array of variants to include (default: ['badge', 'text'])
 * @returns {string} Space-separated Tailwind classes
 *
 * @example
 * getStatusClasses('pending') // Returns: 'bg-yellow-100 text-yellow-800'
 * getStatusClasses('approved', ['bg', 'text', 'border']) // Returns: 'bg-green-50 text-green-800 border-green-200'
 */
export const getStatusClasses = (status, variants = ['badge', 'text']) => {
  return variants.map(variant => getStatusColor(status, variant)).join(' ');
};

/**
 * Get human-readable status label
 * Converts status keys to display-friendly text
 *
 * @param {string} status - The status key
 * @returns {string} Formatted status label
 *
 * @example
 * getStatusLabel('in_progress') // Returns: 'In Progress'
 * getStatusLabel('revision_requested') // Returns: 'Revision Requested'
 */
export const getStatusLabel = (status) => {
  if (!status) return '';

  return status
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

/**
 * Check if a status represents a "success" state
 * @param {string} status - The status key
 * @returns {boolean}
 */
export const isSuccessStatus = (status) => {
  const successStatuses = ['approved', 'completed', 'paid', 'confirmed', 'accepted'];
  return successStatuses.includes(status?.toLowerCase()?.replace(/\s+/g, '_'));
};

/**
 * Check if a status represents a "failure" state
 * @param {string} status - The status key
 * @returns {boolean}
 */
export const isFailureStatus = (status) => {
  const failureStatuses = ['rejected', 'cancelled', 'failed', 'declined'];
  return failureStatuses.includes(status?.toLowerCase()?.replace(/\s+/g, '_'));
};

/**
 * Check if a status represents a "pending" state
 * @param {string} status - The status key
 * @returns {boolean}
 */
export const isPendingStatus = (status) => {
  const pendingStatuses = ['pending', 'under_review', 'reviewing', 'verifying'];
  return pendingStatuses.includes(status?.toLowerCase()?.replace(/\s+/g, '_'));
};

/**
 * Check if a status represents an "active" state
 * @param {string} status - The status key
 * @returns {boolean}
 */
export const isActiveStatus = (status) => {
  const activeStatuses = ['in_progress', 'active', 'processing'];
  return activeStatuses.includes(status?.toLowerCase()?.replace(/\s+/g, '_'));
};

// Default export for convenience
export default {
  statusColors,
  getStatusColor,
  getStatusClasses,
  getStatusLabel,
  isSuccessStatus,
  isFailureStatus,
  isPendingStatus,
  isActiveStatus,
};
