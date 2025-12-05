const StatCard = ({ title, value, subtitle, icon: Icon, color = 'blue', onClick, loading }) => {
  const colorClasses = {
    blue: 'text-blue-600 bg-blue-50',
    green: 'text-green-600 bg-green-50',
    yellow: 'text-yellow-600 bg-yellow-50',
    red: 'text-red-600 bg-red-50',
    purple: 'text-purple-600 bg-purple-50',
    primary: 'text-primary bg-primary/10',
  };

  const iconColorClasses = {
    blue: 'text-blue-600',
    green: 'text-green-600',
    yellow: 'text-yellow-600',
    red: 'text-red-600',
    purple: 'text-purple-600',
    primary: 'text-primary',
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
