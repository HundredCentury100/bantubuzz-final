const StatusBadge = ({ status, type = 'default' }) => {
  const statusConfig = {
    // User statuses
    verified: { color: 'green', label: 'Verified', icon: '✓' },
    unverified: { color: 'yellow', label: 'Unverified', icon: '⚠' },
    active: { color: 'green', label: 'Active', icon: '●' },
    inactive: { color: 'red', label: 'Suspended', icon: '●' },

    // Cashout statuses
    pending: { color: 'yellow', label: 'Pending', icon: '⏱' },
    approved: { color: 'blue', label: 'Approved', icon: '✓' },
    rejected: { color: 'red', label: 'Rejected', icon: '✗' },
    completed: { color: 'green', label: 'Completed', icon: '✓' },

    // Collaboration statuses
    in_progress: { color: 'blue', label: 'In Progress', icon: '●' },
    cancelled: { color: 'red', label: 'Cancelled', icon: '✗' },

    // Payment statuses
    paid: { color: 'green', label: 'Paid', icon: '$' },
    released: { color: 'green', label: 'Released', icon: '✓' },
    escrow: { color: 'yellow', label: 'Escrow', icon: '$' },

    // Default
    default: { color: 'gray', label: status, icon: '' },
  };

  const config = statusConfig[status?.toLowerCase()] || statusConfig.default;

  const colorClasses = {
    green: 'bg-green-100 text-green-800 border-green-200',
    blue: 'bg-blue-100 text-blue-800 border-blue-200',
    yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    red: 'bg-red-100 text-red-800 border-red-200',
    gray: 'bg-gray-100 text-gray-800 border-gray-200',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
        colorClasses[config.color]
      }`}
    >
      {config.icon && <span className="mr-1">{config.icon}</span>}
      {config.label}
    </span>
  );
};

export default StatusBadge;
