import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../services/api';
import toast from 'react-hot-toast';

const STATUS_CONFIG = {
  open: { label: 'Open', color: 'bg-red-100 text-red-700', step: 1 },
  under_review: { label: 'Under Review', color: 'bg-yellow-100 text-yellow-700', step: 2 },
  resolved: { label: 'Resolved', color: 'bg-green-100 text-green-700', step: 3 },
  closed: { label: 'Closed', color: 'bg-gray-100 text-gray-600', step: 3 },
};

const ISSUE_LABELS = {
  non_delivery: 'Non-Delivery',
  quality: 'Quality Issue',
  payment: 'Payment Issue',
  behaviour: 'Behaviour',
  other: 'Other',
};

const RESOLUTION_LABELS = {
  release_funds: 'Funds Released to Creator',
  partial_release: 'Partial Release',
  refund: 'Refund to Brand',
  warning: 'Warning Issued',
  suspension: 'Account Suspended',
  no_action: 'No Action Required',
};

const StatusBadge = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || { label: status, color: 'bg-gray-100 text-gray-600' };
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${cfg.color}`}>
      {cfg.label}
    </span>
  );
};

// ── Timeline ─────────────────────────────────────────────────────────────────
const Timeline = ({ status }) => {
  const step = STATUS_CONFIG[status]?.step || 1;
  const steps = ['Raised', 'Under Review', 'Resolved'];

  return (
    <div className="flex items-center gap-2 my-4">
      {steps.map((s, i) => (
        <div key={s} className="flex items-center gap-2 flex-1">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
            i + 1 <= step ? 'bg-gray-900 text-white' : 'bg-gray-200 text-gray-500'
          }`}>
            {i + 1 <= step ? '✓' : i + 1}
          </div>
          <span className={`text-xs font-medium ${i + 1 <= step ? 'text-gray-900' : 'text-gray-400'}`}>{s}</span>
          {i < steps.length - 1 && (
            <div className={`flex-1 h-0.5 ${i + 1 < step ? 'bg-gray-900' : 'bg-gray-200'}`} />
          )}
        </div>
      ))}
    </div>
  );
};

// ── Dispute Card ─────────────────────────────────────────────────────────────
const DisputeCard = ({ dispute, onClick }) => (
  <div
    onClick={() => onClick(dispute)}
    className="bg-white border border-gray-200 rounded-xl p-5 cursor-pointer hover:border-gray-400 transition-colors"
  >
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <span className="font-mono font-bold text-gray-900">{dispute.reference}</span>
          <StatusBadge status={dispute.status} />
          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
            {ISSUE_LABELS[dispute.issue_type] || dispute.issue_type}
          </span>
        </div>
        {dispute.collaboration && (
          <p className="text-sm text-gray-600 truncate">
            Re: <strong>{dispute.collaboration.title}</strong>
            {dispute.collaboration.amount && ` — $${dispute.collaboration.amount.toLocaleString()}`}
          </p>
        )}
        <p className="text-xs text-gray-400 mt-1">
          Raised {new Date(dispute.created_at).toLocaleDateString()}
          {dispute.resolved_at && ` · Resolved ${new Date(dispute.resolved_at).toLocaleDateString()}`}
        </p>
      </div>
      <span className="text-gray-400 flex-shrink-0">›</span>
    </div>
  </div>
);

// ── Detail Modal ─────────────────────────────────────────────────────────────
const DisputeDetailModal = ({ dispute, onClose }) => {
  if (!dispute) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-100 flex items-start justify-between">
          <div>
            <p className="text-xs text-gray-500">Reference</p>
            <h2 className="text-xl font-bold text-gray-900">{dispute.reference}</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">✕</button>
        </div>

        <div className="p-6 space-y-5">
          <div className="flex gap-2 flex-wrap">
            <StatusBadge status={dispute.status} />
            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full capitalize">
              {ISSUE_LABELS[dispute.issue_type] || dispute.issue_type}
            </span>
          </div>

          {/* Timeline */}
          <Timeline status={dispute.status} />

          {/* Collaboration */}
          {dispute.collaboration && (
            <div className="p-3 bg-blue-50 rounded-xl text-sm">
              <p className="text-xs font-semibold text-blue-600 mb-1">COLLABORATION</p>
              <p className="font-medium">{dispute.collaboration.title}</p>
              {dispute.collaboration.amount && (
                <p className="text-gray-600">Amount: ${dispute.collaboration.amount.toLocaleString()}</p>
              )}
            </div>
          )}

          {/* Description */}
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">Your Description</p>
            <p className="text-sm text-gray-600 bg-gray-50 rounded-xl p-3">{dispute.description}</p>
          </div>

          {/* Resolution */}
          {dispute.resolution && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
              <p className="text-sm font-semibold text-green-800 mb-1">
                Decision: {RESOLUTION_LABELS[dispute.resolution] || dispute.resolution}
              </p>
              {dispute.payout_percentage && (
                <p className="text-sm text-green-700">Creator payout: {dispute.payout_percentage}%</p>
              )}
              {dispute.resolution_notes && (
                <p className="text-sm text-gray-700 mt-2">{dispute.resolution_notes}</p>
              )}
            </div>
          )}

          {/* Still open notice */}
          {dispute.status === 'open' && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <p className="text-sm text-amber-800">
                Your dispute is being reviewed. Our team will contact you within 48 hours.
                If you need to follow up, email <a href="mailto:support@bantubuzz.com" className="underline">support@bantubuzz.com</a> with reference <strong>{dispute.reference}</strong>.
              </p>
            </div>
          )}

          <p className="text-xs text-gray-400">Raised: {new Date(dispute.created_at).toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function DisputeStatus() {
  const navigate = useNavigate();
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    api.get('/disputes')
      .then(res => {
        if (res.data.success) setDisputes(res.data.data);
      })
      .catch(err => {
        if (err.response?.status === 401) navigate('/login');
        else toast.error('Failed to load disputes');
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-10">

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-dark">My Disputes</h1>
            <p className="text-gray-500 mt-1">Track the status of your open and resolved disputes.</p>
          </div>
          <Link
            to="/disputes/raise"
            className="px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700"
          >
            + Raise Dispute
          </Link>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
          </div>
        ) : disputes.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-5xl mb-4">⚖️</p>
            <p className="font-medium text-gray-600">No disputes yet</p>
            <p className="text-sm mt-1">If you have an issue with a collaboration, you can raise a dispute here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {disputes.map(d => (
              <DisputeCard key={d.id} dispute={d} onClick={setSelected} />
            ))}
          </div>
        )}
      </div>

      {selected && (
        <DisputeDetailModal
          dispute={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
