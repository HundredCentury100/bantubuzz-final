import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

const UsageBadge = ({ current, limit, label, resetDate = null, className = '' }) => {
  // Calculate percentage and determine status
  const isUnlimited = limit === -1 || limit === 'Unlimited';
  const percentage = isUnlimited ? 0 : (current / limit) * 100;

  // Determine color based on usage
  const getStatusColor = () => {
    if (isUnlimited) return 'text-purple-600 bg-purple-50 border-purple-200';
    if (percentage >= 100) return 'text-red-600 bg-red-50 border-red-200';
    if (percentage >= 80) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    if (percentage >= 60) return 'text-orange-600 bg-orange-50 border-orange-200';
    return 'text-green-600 bg-green-50 border-green-200';
  };

  const getProgressBarColor = () => {
    if (percentage >= 100) return 'bg-red-500';
    if (percentage >= 80) return 'bg-yellow-500';
    if (percentage >= 60) return 'bg-orange-500';
    return 'bg-green-500';
  };

  const formatResetDate = (dateString) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Resets today';
    if (diffDays === 1) return 'Resets tomorrow';
    if (diffDays < 7) return `Resets in ${diffDays} days`;
    return `Resets on ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  };

  return (
    <div className={`inline-flex flex-col gap-1 ${className}`}>
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border ${getStatusColor()} text-sm font-medium`}>
        {percentage >= 90 && !isUnlimited && (
          <ExclamationTriangleIcon className="h-4 w-4" />
        )}
        <span>
          {label}: {isUnlimited ? 'Unlimited' : `${current}/${limit}`}
        </span>
      </div>

      {!isUnlimited && (
        <>
          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${getProgressBarColor()}`}
              style={{ width: `${Math.min(percentage, 100)}%` }}
            />
          </div>

          {/* Reset Date */}
          {resetDate && (
            <span className="text-xs text-gray-500">
              {formatResetDate(resetDate)}
            </span>
          )}
        </>
      )}
    </div>
  );
};

export default UsageBadge;
