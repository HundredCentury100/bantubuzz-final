import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout';
import api from '../../services/api';

// ─── Category config ────────────────────────────────────────────────────────
const CATEGORIES = [
  { key: 'all', label: 'All Activity' },
  { key: 'bookings', label: 'Bookings' },
  { key: 'collaborations', label: 'Collaborations' },
  { key: 'payments', label: 'Payments' },
  { key: 'users', label: 'Users' },
  { key: 'campaigns', label: 'Campaigns' },
  { key: 'reviews', label: 'Reviews' },
];

const DATE_RANGES = [
  { key: 1, label: 'Today' },
  { key: 7, label: 'Last 7 days' },
  { key: 30, label: 'Last 30 days' },
  { key: 90, label: 'Last 90 days' },
];

// ─── Event type → visual config ─────────────────────────────────────────────
const EVENT_CONFIG = {
  user_registered: { icon: '👤', color: 'bg-blue-100 text-blue-700', label: 'New User' },
  booking_created: { icon: '📦', color: 'bg-indigo-100 text-indigo-700', label: 'Booking' },
  booking_completed: { icon: '✅', color: 'bg-green-100 text-green-700', label: 'Completed' },
  booking_cancelled: { icon: '❌', color: 'bg-red-100 text-red-700', label: 'Cancelled' },
  collaboration_started: { icon: '🤝', color: 'bg-purple-100 text-purple-700', label: 'Collaboration' },
  collaboration_completed: { icon: '🏆', color: 'bg-green-100 text-green-700', label: 'Completed' },
  collaboration_cancelled: { icon: '🚫', color: 'bg-red-100 text-red-700', label: 'Cancelled' },
  payment_made: { icon: '💳', color: 'bg-yellow-100 text-yellow-700', label: 'Payment' },
  cashout_requested: { icon: '💸', color: 'bg-orange-100 text-orange-700', label: 'Cashout' },
  campaign_launched: { icon: '📢', color: 'bg-pink-100 text-pink-700', label: 'Campaign' },
  review_posted: { icon: '⭐', color: 'bg-amber-100 text-amber-700', label: 'Review' },
};

// ─── Status badge ─────────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const map = {
    completed: 'bg-green-100 text-green-700',
    active: 'bg-green-100 text-green-700',
    published: 'bg-green-100 text-green-700',
    in_progress: 'bg-blue-100 text-blue-700',
    pending: 'bg-yellow-100 text-yellow-700',
    confirmed: 'bg-blue-100 text-blue-700',
    cancelled: 'bg-red-100 text-red-700',
    failed: 'bg-red-100 text-red-700',
    approved: 'bg-green-100 text-green-700',
    verified: 'bg-green-100 text-green-700',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${map[status] || 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  );
};

// ─── Relative time ─────────────────────────────────────────────────────────────
const timeAgo = (iso) => {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
};

// ─── Single Event Row ──────────────────────────────────────────────────────────
const EventRow = ({ event }) => {
  const cfg = EVENT_CONFIG[event.type] || { icon: '•', color: 'bg-gray-100 text-gray-600', label: event.type };
  const hasFlag = event.flags && event.flags.length > 0;

  return (
    <div className={`flex items-start gap-4 p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors ${hasFlag ? 'border-l-4 border-l-orange-400' : ''}`}>
      {/* Icon */}
      <div className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-lg ${cfg.color}`}>
        {cfg.icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.color}`}>
            {cfg.label}
          </span>
          <span className="font-medium text-gray-900 text-sm truncate">{event.title}</span>
          {hasFlag && event.flags.map(f => (
            <span key={f} className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">
              ⚠ {f.replace('_', ' ')}
            </span>
          ))}
        </div>
        <p className="text-sm text-gray-500 mt-0.5 truncate">{event.description}</p>
      </div>

      {/* Right side */}
      <div className="flex-shrink-0 text-right space-y-1">
        {event.amount != null && (
          <p className="text-sm font-semibold text-gray-800">
            ${Number(event.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        )}
        {event.status && <StatusBadge status={event.status} />}
        <p className="text-xs text-gray-400">{timeAgo(event.created_at)}</p>
      </div>
    </div>
  );
};

// ─── Anomaly Alert card ────────────────────────────────────────────────────────
const AnomalyCard = ({ label, count, color }) => (
  <div className={`flex items-center gap-3 p-4 rounded-lg border ${color}`}>
    <span className="text-2xl font-bold">{count}</span>
    <span className="text-sm font-medium">{label}</span>
  </div>
);

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function Activity() {
  const [events, setEvents] = useState([]);
  const [anomalies, setAnomalies] = useState({ overdue_collaborations: 0, stuck_bookings: 0 });
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);

  // Filters
  const [category, setCategory] = useState('all');
  const [days, setDays] = useState(7);
  const [highValue, setHighValue] = useState(false);
  const [page, setPage] = useState(1);

  const fetchFeed = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        category,
        days,
        high_value: highValue,
        page,
        per_page: 50,
      });
      const res = await api.get(`/admin/activity/feed?${params}`);
      if (res.data.success) {
        setEvents(res.data.data.events || []);
        setAnomalies(res.data.data.anomalies || {});
        setPagination(res.data.data.pagination || { page: 1, pages: 1, total: 0 });
      }
    } catch (err) {
      console.error('Failed to fetch activity feed', err);
    } finally {
      setLoading(false);
    }
  }, [category, days, highValue, page]);

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  // Reset to page 1 when filters change
  const handleCategoryChange = (val) => { setCategory(val); setPage(1); };
  const handleDaysChange = (val) => { setDays(val); setPage(1); };
  const handleHighValueChange = () => { setHighValue(v => !v); setPage(1); };

  const totalAnomalies = (anomalies.overdue_collaborations || 0) + (anomalies.stuck_bookings || 0);

  return (
    <AdminLayout>
      <div className="p-6 max-w-6xl mx-auto">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Activity Feed</h1>
          <p className="text-gray-500 mt-1">Live view of all platform activity — users, bookings, collaborations, payments and more.</p>
        </div>

        {/* Anomaly Alerts */}
        {totalAnomalies > 0 && (
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Anomalies Detected</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {anomalies.overdue_collaborations > 0 && (
                <AnomalyCard
                  label="Overdue Collaborations (past deadline)"
                  count={anomalies.overdue_collaborations}
                  color="border-orange-300 bg-orange-50 text-orange-800"
                />
              )}
              {anomalies.stuck_bookings > 0 && (
                <AnomalyCard
                  label="Bookings Stuck Pending > 7 days"
                  count={anomalies.stuck_bookings}
                  color="border-red-300 bg-red-50 text-red-800"
                />
              )}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6 space-y-4">

          {/* Category tabs */}
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(c => (
              <button
                key={c.key}
                onClick={() => handleCategoryChange(c.key)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  category === c.key
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          {/* Date range + high value */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex gap-2">
              {DATE_RANGES.map(d => (
                <button
                  key={d.key}
                  onClick={() => handleDaysChange(d.key)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                    days === d.key
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>

            <label className="flex items-center gap-2 cursor-pointer ml-auto">
              <input
                type="checkbox"
                checked={highValue}
                onChange={handleHighValueChange}
                className="rounded border-gray-300 text-indigo-600"
              />
              <span className="text-sm text-gray-600">High-value only ($100+)</span>
            </label>

            <button
              onClick={fetchFeed}
              className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 text-sm font-medium"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Results summary */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm text-gray-500">
            {loading ? 'Loading…' : `${pagination.total} events`}
          </p>
          {pagination.pages > 1 && (
            <div className="flex items-center gap-2 text-sm">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
                className="px-3 py-1 rounded bg-gray-100 disabled:opacity-40 hover:bg-gray-200"
              >
                ← Prev
              </button>
              <span className="text-gray-600">Page {page} / {pagination.pages}</span>
              <button
                disabled={page >= pagination.pages}
                onClick={() => setPage(p => p + 1)}
                className="px-3 py-1 rounded bg-gray-100 disabled:opacity-40 hover:bg-gray-200"
              >
                Next →
              </button>
            </div>
          )}
        </div>

        {/* Feed */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900" />
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <p className="text-4xl mb-3">📭</p>
              <p className="font-medium">No activity found for this filter.</p>
              <p className="text-sm mt-1">Try widening the date range or changing the category.</p>
            </div>
          ) : (
            events.map(event => <EventRow key={event.id} event={event} />)
          )}
        </div>

        {/* Bottom pagination */}
        {!loading && pagination.pages > 1 && (
          <div className="flex justify-center gap-2 mt-4">
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
              className="px-4 py-2 rounded-lg bg-gray-100 disabled:opacity-40 hover:bg-gray-200 text-sm font-medium"
            >
              ← Previous
            </button>
            <span className="px-4 py-2 text-sm text-gray-600">
              Page {page} of {pagination.pages}
            </span>
            <button
              disabled={page >= pagination.pages}
              onClick={() => setPage(p => p + 1)}
              className="px-4 py-2 rounded-lg bg-gray-100 disabled:opacity-40 hover:bg-gray-200 text-sm font-medium"
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
