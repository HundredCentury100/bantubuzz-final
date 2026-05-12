import { Pie, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
} from 'chart.js';

// Register ChartJS components
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

// Country code to name mapping
const countryNames = {
  'ZW': 'Zimbabwe', 'ZA': 'South Africa', 'DZ': 'Algeria', 'MU': 'Mauritius',
  'RW': 'Rwanda', 'KE': 'Kenya', 'NG': 'Nigeria', 'GH': 'Ghana', 'UG': 'Uganda',
  'TZ': 'Tanzania', 'ZM': 'Zambia', 'BW': 'Botswana', 'MW': 'Malawi', 'MZ': 'Mozambique',
  'US': 'United States', 'GB': 'United Kingdom', 'CA': 'Canada', 'AU': 'Australia',
  'IN': 'India', 'CN': 'China', 'JP': 'Japan', 'BR': 'Brazil', 'DE': 'Germany',
  'FR': 'France', 'IT': 'Italy', 'ES': 'Spain', 'MX': 'Mexico', 'AR': 'Argentina',
  'EG': 'Egypt', 'MA': 'Morocco', 'ET': 'Ethiopia', 'AO': 'Angola', 'SD': 'Sudan',
  'TN': 'Tunisia', 'LY': 'Libya', 'SN': 'Senegal', 'CI': 'Ivory Coast', 'CM': 'Cameroon'
};

const getCountryName = (code) => countryNames[code] || code;

const AudienceCharts = ({ audienceData, loading = false }) => {
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white rounded-3xl shadow-lg p-6 animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-64 bg-gray-100 rounded"></div>
          </div>
          <div className="bg-white rounded-3xl shadow-lg p-6 animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-64 bg-gray-100 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  // Check if audience data is empty (all arrays have no data)
  const hasData = audienceData && (
    (audienceData.age && audienceData.age.length > 0) ||
    (audienceData.gender && audienceData.gender.length > 0) ||
    (audienceData.countries && audienceData.countries.length > 0) ||
    (audienceData.cities && audienceData.cities.length > 0)
  );

  if (!audienceData || !hasData) {
    return (
      <div className="bg-white rounded-3xl shadow-lg p-8 text-center">
        <svg
          className="mx-auto h-16 w-16 text-gray-400 mb-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">📊 Audience insights are being updated</h3>
        <p className="text-gray-600 mb-2">
          This creator's audience data is still being aggregated.
        </p>
        <p className="text-gray-500 text-sm">
          Detailed insights will be available shortly.
        </p>
      </div>
    );
  }

  // Prepare Age Chart Data
  const ageChartData = {
    labels: audienceData.age?.map(d => `${d.breakdown} (${d.percentage.toFixed(1)}%)`) || [],
    datasets: [{
      label: 'Age Distribution',
      data: audienceData.age?.map(d => d.percentage) || [],
      backgroundColor: [
        '#C4D82E', // Bright lime green
        '#8FA632', // Medium olive green
        '#6B7A2F', // Dark olive
        '#D4B95A', // Golden yellow
        '#E6E8D3', // Light beige
        '#A8B86E', // Soft green
      ],
      borderWidth: 2,
      borderColor: '#fff'
    }]
  };

  // Prepare Gender Chart Data
  const genderLabels = {
    'F': 'Female',
    'M': 'Male',
    'U': 'Unknown'
  };

  const genderChartData = {
    labels: audienceData.gender?.map(d => {
      const label = genderLabels[d.breakdown] || d.breakdown;
      return `${label} (${d.percentage.toFixed(1)}%)`;
    }) || [],
    datasets: [{
      label: 'Gender Distribution',
      data: audienceData.gender?.map(d => d.percentage) || [],
      backgroundColor: [
        '#C4D82E', // Bright lime green (Male)
        '#E89A6B', // Coral/peach (Female)
        '#E6E8D3'  // Light beige (Unknown)
      ],
      borderWidth: 2,
      borderColor: '#fff'
    }]
  };

  // Top 5 Countries
  const topCountries = audienceData.countries?.slice(0, 5) || [];
  const countryChartData = {
    labels: topCountries.map(d => getCountryName(d.breakdown)),
    datasets: [{
      label: 'Audience %',
      data: topCountries.map(d => d.percentage),
      backgroundColor: [
        '#8FA632', // Dark olive green
        '#D4B95A', // Golden yellow
        '#E89A6B', // Coral
        '#A8B86E', // Soft green
        '#C4D82E', // Bright lime
      ],
      borderColor: '#fff',
      borderWidth: 1
    }]
  };

  // Top 10 Cities
  const topCities = audienceData.cities?.slice(0, 10) || [];
  const cityChartData = {
    labels: topCities.map(d => d.breakdown.split(',')[0]), // City name only
    datasets: [{
      label: 'Audience %',
      data: topCities.map(d => d.percentage),
      backgroundColor: [
        '#8FA632', // Dark olive green
        '#C4D82E', // Bright lime
        '#D4B95A', // Golden yellow
        '#6B7A2F', // Dark olive
        '#E89A6B', // Coral
        '#A8B86E', // Soft green
        '#E6E8D3', // Light beige
        '#8FA632', // Repeat for more cities
        '#C4D82E',
        '#D4B95A',
      ],
      borderColor: '#fff',
      borderWidth: 1
    }]
  };

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: {
        left: 10,
        right: 0,
        top: 5,
        bottom: 5
      }
    },
    plugins: {
      legend: {
        position: 'right',
        align: 'center',
        labels: {
          padding: 8,
          font: {
            size: 11
          },
          boxWidth: 12,
          boxHeight: 12,
          usePointStyle: false,
          generateLabels: function(chart) {
            const data = chart.data;
            if (data.labels.length && data.datasets.length) {
              return data.labels.map((label, i) => {
                const dataset = data.datasets[0];
                return {
                  text: label,
                  fillStyle: dataset.backgroundColor[i],
                  hidden: false,
                  index: i
                };
              });
            }
            return [];
          }
        }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return `${context.label}: ${context.parsed.toFixed(1)}%`;
          }
        }
      }
    }
  };

  const barOptions = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return `${context.parsed.x.toFixed(1)}% of audience`;
          }
        }
      }
    },
    scales: {
      x: {
        beginAtZero: true,
        ticks: {
          callback: function(value) {
            return value + '%';
          }
        }
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      {audienceData.totalPlatforms && (
        <div className="bg-gradient-to-r from-primary to-primary-dark rounded-3xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">Aggregated Audience Data</p>
              <p className="text-3xl font-bold mt-1">
                {audienceData.totalPlatforms} Platform{audienceData.totalPlatforms !== 1 ? 's' : ''}
              </p>
            </div>
            <svg className="h-16 w-16 opacity-50" fill="currentColor" viewBox="0 0 20 20">
              <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
            </svg>
          </div>
        </div>
      )}

      {/* Age & Gender Row - Pie charts with legend on right */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl shadow-md p-6">
          <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center">
            <svg className="h-4 w-4 text-primary mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Age Distribution
          </h3>
          <div style={{ height: '200px', width: '100%' }}>
            <Pie data={ageChartData} options={pieOptions} />
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-md p-6">
          <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center">
            <svg className="h-4 w-4 text-primary mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Gender Distribution
          </h3>
          <div style={{ height: '200px', width: '100%' }}>
            <Pie data={genderChartData} options={pieOptions} />
          </div>
        </div>
      </div>

      {/* Countries & Cities Row - Smaller 50% size */}
      <div className="grid md:grid-cols-2 gap-4">
        {topCountries.length > 0 && (
          <div className="bg-white rounded-2xl shadow-md p-4">
            <h3 className="text-sm font-bold text-gray-900 mb-2 flex items-center">
              <svg className="h-4 w-4 text-primary mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Top Countries
            </h3>
            <div style={{ height: '150px' }}>
              <Bar data={countryChartData} options={barOptions} />
            </div>
          </div>
        )}

        {topCities.length > 0 && (
          <div className="bg-white rounded-2xl shadow-md p-4">
            <h3 className="text-sm font-bold text-gray-900 mb-2 flex items-center">
              <svg className="h-4 w-4 text-primary mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Top Cities
            </h3>
            <div style={{ height: '200px' }}>
              <Bar data={cityChartData} options={barOptions} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AudienceCharts;
