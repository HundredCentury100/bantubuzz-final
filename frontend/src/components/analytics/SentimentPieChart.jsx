import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

const SentimentPieChart = ({ sentiment }) => {
  // Prepare data for pie chart
  const data = [
    { name: 'Positive', value: sentiment.positive, color: '#10b981' },
    { name: 'Neutral', value: sentiment.neutral, color: '#6b7280' },
    { name: 'Negative', value: sentiment.negative, color: '#f59e0b' },
    { name: 'Critical', value: sentiment.critical, color: '#ef4444' }
  ].filter(item => item.value > 0); // Only show non-zero values

  // If no sentiment data, show message
  if (data.length === 0 || sentiment.total_comments === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500 text-sm">No sentiment data available</p>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      const percentage = ((data.value / sentiment.total_comments) * 100).toFixed(1);
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
          <p className="text-sm font-semibold text-dark">{data.name}</p>
          <p className="text-sm text-gray-600">
            {data.value} comments ({percentage}%)
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
      </PieChart>
    </ResponsiveContainer>
  );
};

export default SentimentPieChart;
