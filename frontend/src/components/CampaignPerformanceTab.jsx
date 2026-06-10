import { useEffect, useMemo, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import {
  Activity,
  CalendarRange,
  Eye,
  Heart,
  MessageCircle,
  MousePointerClick,
  RefreshCw,
  Target,
  Users,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { campaignsAPI } from '../services/api';
import CampaignReportTools from './CampaignReportTools';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
);

const RANGE_OPTIONS = [7, 30, 90];

const CampaignPerformanceTab = ({ campaignId }) => {
  const [rangeDays, setRangeDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [performance, setPerformance] = useState(null);
  const [accessError, setAccessError] = useState(null);
  const [capabilities, setCapabilities] = useState(null);
  const [showReportTools, setShowReportTools] = useState(false);
  const [customRange, setCustomRange] = useState({ start_date: '', end_date: '' });
  const [useCustomRange, setUseCustomRange] = useState(false);

  useEffect(() => {
    if (!useCustomRange || (customRange.start_date && customRange.end_date)) {
      fetchPerformance();
    }
  }, [campaignId, rangeDays, useCustomRange]);

  useEffect(() => {
    campaignsAPI.getReportCapabilities(campaignId)
      .then((response) => setCapabilities(response.data))
      .catch(() => setCapabilities(null));
  }, [campaignId]);

  const fetchPerformance = async () => {
    try {
      setLoading(true);
      setAccessError(null);
      const params = useCustomRange
        ? customRange
        : { days: rangeDays };
      const response = useCustomRange
        ? await campaignsAPI.getReportData(campaignId, params)
        : await campaignsAPI.getPerformance(campaignId, params);
      setPerformance(response.data);
    } catch (error) {
      if (error.response?.status === 403) {
        setAccessError(error.response.data);
        setPerformance(null);
      } else {
        toast.error('Failed to load campaign analytics');
      }
    } finally {
      setLoading(false);
    }
  };

  const applyCustomRange = () => {
    if (!customRange.start_date || !customRange.end_date) {
      toast.error('Choose both a start and end date');
      return;
    }
    setUseCustomRange(true);
    fetchPerformance();
  };

  const formatNumber = (value) => {
    const number = Number(value || 0);
    if (number >= 1000000) return `${(number / 1000000).toFixed(1)}M`;
    if (number >= 1000) return `${(number / 1000).toFixed(1)}K`;
    return number.toLocaleString();
  };

  const formatDate = (value) => {
    if (!value) return 'Not synced yet';
    return new Date(value).toLocaleString();
  };

  const trendData = useMemo(() => {
    const timeline = performance?.timeline || [];
    return {
      labels: timeline.map((item) => new Date(item.date).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      })),
      datasets: [
        {
          label: 'Reach',
          data: timeline.map((item) => item.reach || 0),
          borderColor: '#2563eb',
          backgroundColor: '#2563eb',
          tension: 0.25,
          pointRadius: timeline.length > 30 ? 0 : 2,
        },
        {
          label: 'Impressions',
          data: timeline.map((item) => item.impressions || 0),
          borderColor: '#7c3aed',
          backgroundColor: '#7c3aed',
          tension: 0.25,
          pointRadius: timeline.length > 30 ? 0 : 2,
        },
        {
          label: 'Engagement',
          data: timeline.map((item) => item.engagements || 0),
          borderColor: '#65a30d',
          backgroundColor: '#65a30d',
          tension: 0.25,
          pointRadius: timeline.length > 30 ? 0 : 2,
        },
      ],
    };
  }, [performance]);

  const creatorData = useMemo(() => {
    const creators = (performance?.by_creator || []).slice(0, 10);
    return {
      labels: creators.map((creator) => creator.creator_name || 'Creator'),
      datasets: [
        {
          label: 'Reach',
          data: creators.map((creator) => creator.reach || 0),
          backgroundColor: '#2563eb',
          borderRadius: 4,
        },
        {
          label: 'Engagement',
          data: creators.map((creator) => creator.engagements || 0),
          backgroundColor: '#a3e635',
          borderRadius: 4,
        },
      ],
    };
  }, [performance]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: {
        position: 'bottom',
        labels: { usePointStyle: true, boxWidth: 8 },
      },
    },
    scales: {
      x: { grid: { display: false } },
      y: {
        beginAtZero: true,
        ticks: { callback: (value) => formatNumber(value) },
      },
    },
  };

  if (loading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (accessError) {
    return (
      <div className="border border-gray-200 bg-white p-8 text-center rounded-lg">
        <Activity className="mx-auto mb-4 h-10 w-10 text-gray-400" />
        <h3 className="text-xl font-semibold text-gray-900">Live analytics is a Pro+ feature</h3>
        <p className="mx-auto mt-2 max-w-xl text-sm text-gray-600">
          Upgrade your brand plan to unlock live campaign metrics, creator comparisons, trends, and sentiment reporting.
        </p>
      </div>
    );
  }

  if (!performance?.overview) {
    return (
      <div className="border border-gray-200 bg-white p-8 text-center rounded-lg">
        <Activity className="mx-auto mb-4 h-10 w-10 text-gray-400" />
        <h3 className="text-lg font-semibold text-gray-900">No analytics available yet</h3>
        <p className="mt-2 text-sm text-gray-600">
          Metrics appear after creators submit live post URLs and ThunziAI completes its sync.
        </p>
      </div>
    );
  }

  const overview = performance.overview;
  const sentiment = performance.sentiment || {};
  const percentages = sentiment.percentages || {};
  const topComments = sentiment.top_comments || [];
  const fullSentiment = performance.access?.full_sentiment;

  const metrics = [
    { label: 'Reach', value: overview.total_reach, icon: Users, color: 'text-blue-600' },
    { label: 'Impressions', value: overview.total_impressions, icon: Eye, color: 'text-violet-600' },
    { label: 'Engagement', value: overview.total_engagements, icon: Heart, color: 'text-lime-700' },
    { label: 'Clicks', value: overview.total_clicks, icon: MousePointerClick, color: 'text-cyan-700' },
    { label: 'Conversions', value: overview.total_conversions, icon: Target, color: 'text-emerald-700' },
    { label: 'Comments', value: overview.total_comments, icon: MessageCircle, color: 'text-rose-600' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 border-b border-gray-200 pb-5 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Live Campaign Analytics</h2>
          <p className="mt-1 text-sm text-gray-500">
            Last synced {formatDate(performance.last_synced_at)}. Automatic refresh runs every four hours.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-lg border border-gray-300 bg-white p-1">
            {RANGE_OPTIONS.map((days) => (
              <button
                key={days}
                type="button"
                onClick={() => setRangeDays(days)}
                className={`min-w-16 rounded-md px-3 py-2 text-sm font-medium ${
                  rangeDays === days
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {days}D
              </button>
            ))}
          </div>
          {capabilities?.custom_date_range && (
            <button
              type="button"
              onClick={() => setUseCustomRange((value) => !value)}
              className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium ${
                useCustomRange
                  ? 'border-gray-900 bg-gray-900 text-white'
                  : 'border-gray-300 bg-white text-gray-800'
              }`}
            >
              <CalendarRange className="h-4 w-4" />
              Custom
            </button>
          )}
          <button
            type="button"
            onClick={fetchPerformance}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
            title="Refresh cached analytics"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          {capabilities?.pdf_export && (
            <button
              type="button"
              onClick={() => setShowReportTools(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-primary/90"
            >
              Reports
            </button>
          )}
        </div>
      </div>

      {capabilities?.custom_date_range && useCustomRange && (
        <div className="flex flex-col gap-3 border border-gray-200 bg-white p-4 rounded-lg sm:flex-row sm:items-end">
          <label className="block">
            <span className="mb-1 block text-xs font-medium uppercase text-gray-500">From</span>
            <input
              type="date"
              value={customRange.start_date}
              onChange={(event) => setCustomRange((current) => ({ ...current, start_date: event.target.value }))}
              className="border border-gray-300 px-3 py-2 rounded-lg"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium uppercase text-gray-500">To</span>
            <input
              type="date"
              value={customRange.end_date}
              onChange={(event) => setCustomRange((current) => ({ ...current, end_date: event.target.value }))}
              className="border border-gray-300 px-3 py-2 rounded-lg"
            />
          </label>
          <button type="button" onClick={applyCustomRange} className="bg-gray-900 px-4 py-2 text-sm font-semibold text-white rounded-lg">
            Apply Range
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        {metrics.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="border border-gray-200 bg-white p-4 rounded-lg">
            <div className="flex h-8 items-center justify-between">
              <span className="text-xs font-medium uppercase text-gray-500">{label}</span>
              <Icon className={`h-4 w-4 ${color}`} />
            </div>
            <p className="mt-2 text-2xl font-semibold text-gray-900">{formatNumber(value)}</p>
          </div>
        ))}
      </div>

      {showReportTools && capabilities && (
        <CampaignReportTools
          campaignId={campaignId}
          capabilities={capabilities}
          rangeParams={useCustomRange ? customRange : { days: rangeDays }}
          onClose={() => setShowReportTools(false)}
        />
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(340px,1fr)]">
        <section className="border border-gray-200 bg-white p-5 rounded-lg">
          <div className="mb-4">
            <h3 className="font-semibold text-gray-900">Performance trend</h3>
            <p className="text-sm text-gray-500">Reach, impressions, and engagement comparison</p>
          </div>
          <div className="h-[340px]">
            <Line data={trendData} options={chartOptions} />
          </div>
        </section>

        <section className="border border-gray-200 bg-white p-5 rounded-lg">
          <h3 className="font-semibold text-gray-900">Audience sentiment</h3>
          <p className="mt-1 text-sm text-gray-500">
            {formatNumber(sentiment.total_analyzed)} comments analysed
          </p>
          <div className="mt-6 space-y-5">
            {[
              ['Positive', percentages.positive || 0, 'bg-green-500'],
              ['Neutral', percentages.neutral || 0, 'bg-gray-400'],
              ['Negative', percentages.negative || 0, 'bg-red-500'],
            ].map(([label, value, color]) => (
              <div key={label}>
                <div className="mb-2 flex justify-between text-sm">
                  <span className="font-medium text-gray-700">{label}</span>
                  <span className="text-gray-600">{Number(value).toFixed(1)}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                  <div className={`h-full ${color}`} style={{ width: `${Math.min(Number(value), 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
          {!fullSentiment && (
            <p className="mt-6 border-t border-gray-100 pt-4 text-sm text-gray-500">
              Premium unlocks sentiment drivers, top comments, language breakdown, and PDF export.
            </p>
          )}
        </section>
      </div>

      <section className="border border-gray-200 bg-white p-5 rounded-lg">
        <div className="mb-4">
          <h3 className="font-semibold text-gray-900">Creator comparison</h3>
          <p className="text-sm text-gray-500">Top creators by reach and engagement</p>
        </div>
        <div className="h-[360px]">
          <Bar data={creatorData} options={chartOptions} />
        </div>
      </section>

      {fullSentiment && (
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="border border-gray-200 bg-white p-5 rounded-lg">
            <h3 className="font-semibold text-gray-900">Sentiment drivers</h3>
            <div className="mt-5 grid grid-cols-2 gap-5">
              {['positive', 'negative'].map((type) => (
                <div key={type}>
                  <p className={`text-sm font-semibold ${type === 'positive' ? 'text-green-700' : 'text-red-700'}`}>
                    {type === 'positive' ? 'Positive themes' : 'Negative themes'}
                  </p>
                  <div className="mt-3 space-y-2">
                    {(sentiment.drivers?.[type] || []).length === 0 && (
                      <p className="text-sm text-gray-500">No recurring themes yet.</p>
                    )}
                    {(sentiment.drivers?.[type] || []).map((driver) => (
                      <div key={driver.theme} className="flex justify-between border-b border-gray-100 pb-2 text-sm">
                        <span className="capitalize text-gray-700">{driver.theme.replace(/_/g, ' ')}</span>
                        <span className="font-medium text-gray-900">{driver.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="border border-gray-200 bg-white p-5 rounded-lg">
            <h3 className="font-semibold text-gray-900">Languages detected</h3>
            <div className="mt-5 space-y-3">
              {Object.keys(sentiment.languages || {}).length === 0 && (
                <p className="text-sm text-gray-500">Language data will appear after comment sync.</p>
              )}
              {Object.entries(sentiment.languages || {}).map(([language, count]) => (
                <div key={language} className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <span className="capitalize text-sm text-gray-700">{language}</span>
                  <span className="text-sm font-semibold text-gray-900">{formatNumber(count)}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {fullSentiment && topComments.length > 0 && (
        <section className="border border-gray-200 bg-white rounded-lg">
          <div className="border-b border-gray-200 px-5 py-4">
            <h3 className="font-semibold text-gray-900">Top comments by sentiment</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {topComments.map((comment) => (
              <div key={`${comment.post_metrics_id}-${comment.external_id}`} className="px-5 py-4">
                <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
                  <span className={`rounded-full px-2 py-1 font-semibold ${
                    comment.sentiment === 'positive'
                      ? 'bg-green-100 text-green-700'
                      : comment.sentiment === 'negative'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-gray-100 text-gray-700'
                  }`}>
                    {comment.sentiment}
                  </span>
                  <span className="capitalize text-gray-500">{comment.language}</span>
                  <span className="text-gray-500">{formatNumber(comment.likes)} likes</span>
                </div>
                <p className="text-sm leading-6 text-gray-800">{comment.content}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {(performance.by_creator || []).length > 0 && (
        <section className="overflow-hidden border border-gray-200 bg-white rounded-lg">
          <div className="border-b border-gray-200 px-5 py-4">
            <h3 className="font-semibold text-gray-900">Per-creator performance</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-5 py-3">Creator</th>
                  <th className="px-4 py-3 text-right">Reach</th>
                  <th className="px-4 py-3 text-right">Impressions</th>
                  <th className="px-4 py-3 text-right">Engagement</th>
                  <th className="px-4 py-3 text-right">Clicks</th>
                  <th className="px-4 py-3 text-right">Conversions</th>
                  <th className="px-5 py-3 text-right">Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {performance.by_creator.map((creator) => (
                  <tr key={creator.creator_id}>
                    <td className="px-5 py-4 font-medium text-gray-900">{creator.creator_name}</td>
                    <td className="px-4 py-4 text-right">{formatNumber(creator.reach)}</td>
                    <td className="px-4 py-4 text-right">{formatNumber(creator.impressions)}</td>
                    <td className="px-4 py-4 text-right">{formatNumber(creator.engagements)}</td>
                    <td className="px-4 py-4 text-right">{formatNumber(creator.clicks)}</td>
                    <td className="px-4 py-4 text-right">{formatNumber(creator.conversions)}</td>
                    <td className="px-5 py-4 text-right font-medium">{Number(creator.engagement_rate || 0).toFixed(2)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
};

export default CampaignPerformanceTab;
