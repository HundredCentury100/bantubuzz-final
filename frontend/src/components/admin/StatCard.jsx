/**
 * StatCard Component
 *
 * Displays a statistic card with optional icon.
 * Uses brand-compliant colors: 'primary' for active/info states, other colors for status.
 *
 * @param {Object} props
 * @param {string} props.title - Card title
 * @param {string|number} props.value - Main value to display
 * @param {string} props.subtitle - Optional subtitle
 * @param {Component} props.icon - Icon component
 * @param {string} props.color - Color variant ('primary', 'green', 'yellow', 'red', 'purple')
 * @param {Function} props.onClick - Optional click handler
 * @param {boolean} props.loading - Loading state
 */
const StatCard = ({ title, value, subtitle, icon: Icon, color = 'primary', onClick, loading }) => {
  // Color classes for card background and text
  // Note: 'primary' (brand color) replaces 'blue' for info/active states
  const colorClasses = {
    primary: 'text-primary-dark bg-primary/10',  // Brand color for info/active
    green: 'text-green-600 bg-green-50',         // Success states
    yellow: 'text-yellow-600 bg-yellow-50',      // Warning/pending states
    red: 'text-red-600 bg-red-50',               // Error/failure states
    purple: 'text-purple-600 bg-purple-50',      // Alternative states
  };

  const iconColorClasses = {
    primary: 'text-primary-dark',
    green: 'text-green-600',
    yellow: 'text-yellow-600',
    red: 'text-red-600',
    purple: 'text-purple-600',
  };

  return (
    <div
      className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 transition-all ${
        onClick ? 'cursor-pointer hover:shadow-md hover:border-gray-300' : ''
      } ${loading ? 'animate-pulse' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          {loading ? (
            <div className="h-8 w-20 bg-gray-200 rounded animate-pulse" />
          ) : (
            <p className="text-3xl font-bold text-gray-900">{value}</p>
          )}
          {subtitle && !loading && (
            <p className="text-xs text-gray-500 mt-2">{subtitle}</p>
          )}
        </div>
        {Icon && (
          <div className={`${colorClasses[color]} p-3 rounded-lg`}>
            <Icon className={`h-6 w-6 ${iconColorClasses[color]}`} />
          </div>
        )}
      </div>
    </div>
  );
};

export default StatCard;
