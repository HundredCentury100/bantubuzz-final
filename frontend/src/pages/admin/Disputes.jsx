import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout';
import api from '../../services/api';
import toast from 'react-hot-toast';

const ISSUE_TYPES = [
  { key: '', label: 'All Types' },
  { key: 'non_delivery', label: 'Non-Delivery' },
  { key: 'quality', label: 'Quality Issue' },
  { key: 'payment', label: 'Payment' },
  { key: 'behaviour', label: 'Behaviour' },
  { key: 'other', label: 'Other' },
];

const STATUSES = [
  { key: '', label: 'All Statuses' },
  { key: 'open', label: 'Open' },
  { key: 'under_review', label: 'Under Review' },
  { key: 'resolved', label: 'Resolved' },
  { key: 'closed', label: 'Closed' },
];

const STATUS_COLORS = {
  open: 'bg-red-100 text-red-700',
  under_review: 'bg-yellow-100 text-yellow-700',
  resolved: 'bg-green-100 text-green-700',
  closed: 'bg-gray-100 text-gray-600',
};

const ISSUE_COLORS = {
  non_delivery: 'bg-red-100 text-red-700',
  quality: 'bg-orange-100 text-orange-700',
  payment: 'bg-yellow-100 text-yellow-700',
  behaviour: 'bg-purple-100 text-purple-700',
  other: 'bg-gray-100 text-gray-600',
};

const StatCard = ({ title, value, color }) => (
  <div className={`p-5 rounded-xl border ${color} bg-white`}>
    <p className="text-sm font-medium text-gray-500">{title}</p>
    <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
  </div>
);

const Badge = ({ value, colorMap, fallback = 'bg-gray-100 text-gray-600' }) => (
  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${colorMap[value] || fallback}`}>
    {value?.replace('_', ' ')}
  </span>
);

// ── Resolve Modal ─────────────────────────────────────────────────────────────
const ResolveModal = ({ dispute, onClose, onResolved }) => {
  const [resolution, setResolution] = useState('');
  const [notes, setNotes] = useState('');
  const [payout, setPayout] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!resolution) { toast.error('Select a resolution'); return; }
    setLoading(true);
    try {
      await api.put(`/admin/disputes/${dispute.id}/resolve`, {
        resolution,
        resolution_notes: notes,
        payout_percentage: payout ? parseFloat(payout) : null,
      });
      toast.success(`Dispute ${dispute.reference} resolved`);
      onResolved();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to resolve');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg p-6 space-y-5">
        <h2 className="text-lg font-bold text-gray-900">Resolve {dispute.reference}</h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Decision *</label>
          <select
            value={resolution}
            onChange={e => setResolution(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">Select resolution...</option>
            <option value="release_funds">Release Funds to Creator</option>
            <option value="partial_release">Partial Release</option>
            <option value="refund">Refund to Brand</option>
            <option value="warning">Issue Warning</option>
            <option value="suspension">Suspend Account</option>
            <option value="no_action">No Action Required</option>
          </select>
        </div>

        {resolution === 'partial_release' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Creator Payout % *</label>
            <input
              type="number" min="0" max="100"
              value={payout}
              onChange={e => setPayout(e.target.value)}
              placeholder="e.g. 60"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Resolution Notes</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={4}
            placeholder="Explain the decision. This will be sent to both parties."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none"
          />
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium disabled:opacity-50"
          >
            {loading ? 'Resolving...' : 'Confirm Resolution'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Detail Panel ──────────────────────────────────────────────────────────────
const DetailPanel = ({ dispute, onClose, onAssign, onResolve }) => {
  if (!dispute) return null;

  const collab = dispute.collaboration_detail || dispute.collaboration;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-end z-40 p-4">
      <div className="bg-white w-full max-w-2xl h-full rounded-2xl overflow-y-auto shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex items-start justify-between">
          <div>
            <p className="text-xs text-gray-500 font-medium">Dispute Reference</p>
            <h2 className="text-xl font-bold text-gray-900">{dispute.reference}</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">✕</button>
        </div>

        <div className="p-6 space-y-6 flex-1">
          {/* Status + type */}
          <div className="flex gap-3 flex-wrap">
            <Badge value={dispute.status} colorMap={STATUS_COLORS} />
            <Badge value={dispute.issue_type} colorMap={ISSUE_COLORS} />
          </div>

          {/* Parties */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-blue-50 rounded-xl">
              <p className="text-xs text-blue-600 font-semibold mb-1">RAISED BY</p>
              <p className="font-medium text-gray-900">{dispute.raised_by?.email || `User #${dispute.raised_by_user_id}`}</p>
              <p className="text-xs text-gray-500 capitalize">{dispute.raised_by?.user_type}</p>
              {dispute.history && (
                <p className="text-xs text-orange-600 mt-1">
                  {dispute.history.raised_by_total_disputes} prior dispute(s)
                </p>
              )}
            </div>
            <div className="p-4 bg-red-50 rounded-xl">
              <p className="text-xs text-red-600 font-semibold mb-1">AGAINST</p>
              <p className="font-medium text-gray-900">{dispute.against_user?.email || `User #${dispute.against_user_id}`}</p>
              <p className="text-xs text-gray-500 capitalize">{dispute.against_user?.user_type}</p>
              {dispute.history && (
                <p className="text-xs text-orange-600 mt-1">
                  {dispute.history.against_user_total_disputes} prior dispute(s)
                </p>
              )}
            </div>
          </div>

          {/* Description */}
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">Description</p>
            <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">{dispute.description}</p>
          </div>

          {/* Collaboration context */}
          {collab && (
            <div className="border border-gray-200 rounded-xl p-4 space-y-2">
              <p className="text-sm font-semibold text-gray-700">Collaboration Context</p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-gray-500">Title: </span><span className="font-medium">{collab.title}</span></div>
                <div><span className="text-gray-500">Amount: </span><span className="font-medium">${collab.amount?.toLocaleString()}</span></div>
                <div><span className="text-gray-500">Status: </span><Badge value={collab.status} colorMap={STATUS_COLORS} /></div>
                <div><span className="text-gray-500">Progress: </span><span className="font-medium">{collab.progress_percentage}%</span></div>
                {collab.expected_completion_date && (
                  <div className="col-span-2">
                    <span className="text-gray-500">Expected completion: </span>
                    <span className="font-medium">{new Date(collab.expected_completion_date).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Evidence */}
          {dispute.evidence_urls?.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">Evidence ({dispute.evidence_urls.length} file(s))</p>
              <div className="flex flex-wrap gap-2">
                {dispute.evidence_urls.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noreferrer"
                    className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-100">
                    File {i + 1} ↗
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Resolution (if resolved) */}
          {dispute.resolution && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
              <p className="text-sm font-semibold text-green-800 mb-1">Resolution: {dispute.resolution.replace('_', ' ').toUpperCase()}</p>
              {dispute.payout_percentage && (
                <p className="text-sm text-green-700">Creator payout: {dispute.payout_percentage}%</p>
              )}
              {dispute.resolution_notes && (
                <p className="text-sm text-gray-600 mt-1">{dispute.resolution_notes}</p>
              )}
            </div>
          )}

          {/* Timestamps */}
          <div className="text-xs text-gray-400 space-y-1">
            <p>Raised: {new Date(dispute.created_at).toLocaleString()}</p>
            {dispute.resolved_at && <p>Resolved: {new Date(dispute.resolved_at).toLocaleString()}</p>}
          </div>
        </div>

        {/* Actions */}
        {dispute.status === 'open' && (
          <div className="p-6 border-t border-gray-100 flex gap-3">
            <button onClick={() => onAssign(dispute)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50">
              Assign to Me
            </button>
            <button onClick={() => onResolve(dispute)} className="flex-1 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium">
              Resolve
            </button>
          </div>
        )}
        {dispute.status === 'under_review' && (
          <div className="p-6 border-t border-gray-100">
            <button onClick={() => onResolve(dispute)} className="w-full px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium">
              Resolve Dispute
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Disputes() {
  const [disputes, setDisputes] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });

  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [page, setPage] = useState(1);

  const [selected, setSelected] = useState(null);
  const [resolveTarget, setResolveTarget] = useState(null);

  const fetchDisputes = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, per_page: 25 });
      if (filterStatus) params.append('status', filterStatus);
      if (filterType) params.append('issue_type', filterType);

      const [listRes, statsRes] = await Promise.all([
        api.get(`/admin/disputes?${params}`),
        api.get('/admin/disputes/stats'),
      ]);

      if (listRes.data.success) {
        setDisputes(listRes.data.data.disputes);
        setPagination(listRes.data.data.pagination);
      }
      if (statsRes.data.success) {
        setStats(statsRes.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, filterStatus, filterType]);

  useEffect(() => { fetchDisputes(); }, [fetchDisputes]);

  const handleAssign = async (dispute) => {
    try {
      await api.put(`/admin/disputes/${dispute.id}/assign`);
      toast.success('Dispute assigned to you — status: Under Review');
      setSelected(null);
      fetchDisputes();
    } catch (err) {
      toast.error('Failed to assign');
    }
  };

  const handleResolved = () => {
    setResolveTarget(null);
    setSelected(null);
    fetchDisputes();
  };

  return (
    <AdminLayout>
      <div className="p-6 max-w-7xl mx-auto">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Disputes</h1>
          <p className="text-gray-500 mt-1">Manage all platform disputes between brands and creators.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard title="Open Disputes" value={stats.open || 0} color="border-red-200" />
          <StatCard title="Under Review" value={stats.under_review || 0} color="border-yellow-200" />
          <StatCard title="Resolved This Month" value={stats.resolved_this_month || 0} color="border-green-200" />
          <StatCard title="Avg Resolution Time" value={`${stats.avg_resolution_days || 0}d`} color="border-blue-200" />
        </div>

        {/* Filters */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 mb-5 flex flex-wrap gap-3">
          <select
            value={filterStatus}
            onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
          >
            {STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
          <select
            value={filterType}
            onChange={e => { setFilterType(e.target.value); setPage(1); }}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
          >
            {ISSUE_TYPES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
          </select>
          <span className="ml-auto text-sm text-gray-500 self-center">
            {pagination.total} total
          </span>
        </div>

        {/* Table */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900" />
            </div>
          ) : disputes.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <p className="text-4xl mb-3">⚖️</p>
              <p className="font-medium">No disputes found.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Reference</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Type</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Raised By</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Against</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {disputes.map(d => (
                  <tr key={d.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono font-semibold text-gray-900">{d.reference}</td>
                    <td className="px-4 py-3"><Badge value={d.issue_type} colorMap={ISSUE_COLORS} /></td>
                    <td className="px-4 py-3 text-gray-700 truncate max-w-[140px]">{d.raised_by?.email || `#${d.raised_by_user_id}`}</td>
                    <td className="px-4 py-3 text-gray-700 truncate max-w-[140px]">{d.against_user?.email || `#${d.against_user_id}`}</td>
                    <td className="px-4 py-3"><Badge value={d.status} colorMap={STATUS_COLORS} /></td>
                    <td className="px-4 py-3 text-gray-500">{new Date(d.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setSelected(d)}
                        className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-medium"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex justify-center gap-2 mt-4">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
              className="px-4 py-2 bg-gray-100 rounded-lg text-sm disabled:opacity-40">← Prev</button>
            <span className="px-4 py-2 text-sm text-gray-600">Page {page} / {pagination.pages}</span>
            <button disabled={page >= pagination.pages} onClick={() => setPage(p => p + 1)}
              className="px-4 py-2 bg-gray-100 rounded-lg text-sm disabled:opacity-40">Next →</button>
          </div>
        )}
      </div>

      {/* Detail panel */}
      {selected && (
        <DetailPanel
          dispute={selected}
          onClose={() => setSelected(null)}
          onAssign={handleAssign}
          onResolve={(d) => { setResolveTarget(d); setSelected(null); }}
        />
      )}

      {/* Resolve modal */}
      {resolveTarget && (
        <ResolveModal
          dispute={resolveTarget}
          onClose={() => setResolveTarget(null)}
          onResolved={handleResolved}
        />
      )}
    </AdminLayout>
  );
}
