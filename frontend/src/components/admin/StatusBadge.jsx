import { getStatusClasses, getStatusLabel } from '../../config/statusColors';

/**
 * StatusBadge Component
 *
 * Displays a colored badge for various status values across the platform.
 * Now uses centralized status color configuration for consistency.
 *
 * @param {Object} props
 * @param {string} props.status - Status value (e.g., 'pending', 'approved', 'in_progress')
 * @param {string} props.type - Badge type (not currently used, kept for backward compatibility)
 * @param {string} props.icon - Optional icon to display (overrides default)
 * @param {boolean} props.showIcon - Whether to show icon (default: true)
 *
 * @example
 * <StatusBadge status="pending" />
 * <StatusBadge status="approved" icon="✅" />
 * <StatusBadge status="in_progress" showIcon={false} />
 */
const StatusBadge = ({ status, type = 'default', icon, showIcon = true }) => {
  // Default icons for common statuses
  const defaultIcons = {
    // Success states
    verified: '✓',
    active: '●',
    approved: '✓',
    completed: '✓',
    paid: '$',
    confirmed: '✓',
    accepted: '✓',
    released: '✓',

    // Pending/Warning states
    unverified: '⚠',
    pending: '⏱',
    escrow: '$',
    under_review: '👁',
    reviewing: '👁',
    verifying: '🔍',

    // In Progress states (Brand color)
    in_progress: '●',
    processing: '⚙',

    // Failure states
    inactive: '●',
    rejected: '✗',
    cancelled: '✗',
    failed: '✗',
    declined: '✗',

    // Revision states
    revision_requested: '↩',

    // Draft states
    draft: '📝',
  };

  // Normalize status for lookup
  const normalizedStatus = status?.toLowerCase()?.replace(/\s+/g, '_');

  // Get label (either custom or auto-generated from status)
  const label = getStatusLabel(status);

  // Get icon (custom, default, or none)
  const displayIcon = icon || (showIcon ? defaultIcons[normalizedStatus] : null);

  // Get Tailwind classes from config
  const classes = getStatusClasses(status, ['badge', 'text', 'border']);

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${classes}`}
    >
      {displayIcon && <span className="mr-1">{displayIcon}</span>}
      {label}
    </span>
  );
};

export default StatusBadge;
