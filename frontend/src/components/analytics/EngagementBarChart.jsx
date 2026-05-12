import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const EngagementBarChart = ({ data }) => {
  // Transform data for bar chart
  const chartData = [
    { name: 'Likes', value: data.likes || 0, color: '#C4D82E' }, // Bright lime green
    { name: 'Comments', value: data.comments || 0, color: '#D4B95A' }, // Golden yellow
    { name: 'Shares', value: data.shares || 0, color: '#8FA632' }, // Medium olive green
    { name: 'Saves', value: data.saves || 0, color: '#E89A6B' } // Coral
  ];

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
          <p className="text-sm font-semibold text-dark">{payload[0].payload.name}</p>
          <p className="text-sm text-gray-600">{payload[0].value.toLocaleString()}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
        <XAxis
          dataKey="name"
          tick={{ fill: '#6b7280', fontSize: 12 }}
          axisLine={{ stroke: '#e5e7eb' }}
        />
        <YAxis
          tick={{ fill: '#6b7280', fontSize: 12 }}
          axisLine={{ stroke: '#e5e7eb' }}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(251, 191, 36, 0.1)' }} />
        <Bar dataKey="value" radius={[8, 8, 0, 0]}>
          {chartData.map((entry, index) => (
            <Bar key={`bar-${index}`} dataKey="value" fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

export default EngagementBarChart;
