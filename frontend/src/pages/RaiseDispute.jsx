import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../services/api';
import toast from 'react-hot-toast';

const ISSUE_TYPES = [
  { value: 'non_delivery', label: 'Non-Delivery', desc: 'Work was not delivered or creator went silent' },
  { value: 'quality', label: 'Quality Issue', desc: 'Delivered work does not meet agreed standards' },
  { value: 'payment', label: 'Payment Issue', desc: 'Payment not received or incorrect amount' },
  { value: 'behaviour', label: 'Behaviour', desc: 'Unprofessional conduct or communication issues' },
  { value: 'other', label: 'Other', desc: 'Any other issue not covered above' },
];

export default function RaiseDispute() {
  const { collaborationId } = useParams();
  const navigate = useNavigate();

  const [collaboration, setCollaboration] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [issueType, setIssueType] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (collaborationId) {
      api.get(`/collaborations/${collaborationId}`)
        .then(res => {
          setCollaboration(res.data.collaboration || res.data);
        })
        .catch(() => toast.error('Could not load collaboration'))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [collaborationId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!issueType) { toast.error('Please select an issue type'); return; }
    if (description.trim().length < 20) { toast.error('Please provide more detail (min 20 characters)'); return; }

    setSubmitting(true);
    try {
      const payload = {
        issue_type: issueType,
        description: description.trim(),
        collaboration_id: collaborationId ? parseInt(collaborationId) : undefined,
      };
      const res = await api.post('/disputes', payload);
      if (res.data.success) {
        toast.success(res.data.message || 'Dispute raised successfully');
        navigate('/disputes');
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to raise dispute');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-10">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-dark">Raise a Dispute</h1>
          <p className="text-gray-500 mt-2">
            Our team will review your case within 48 hours. Please provide as much detail as possible.
          </p>
        </div>

        {/* Collaboration context */}
        {collaboration && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <p className="text-xs font-semibold text-blue-600 mb-1">COLLABORATION</p>
            <p className="font-semibold text-gray-900">{collaboration.title}</p>
            <div className="flex gap-4 mt-2 text-sm text-gray-600">
              <span>Amount: <strong>${collaboration.amount?.toLocaleString()}</strong></span>
              <span>Status: <strong className="capitalize">{collaboration.status}</strong></span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-2xl p-6 space-y-6">

          {/* Issue type */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              What is the issue? *
            </label>
            <div className="space-y-2">
              {ISSUE_TYPES.map(type => (
                <label
                  key={type.value}
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                    issueType === type.value
                      ? 'border-gray-900 bg-gray-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="issue_type"
                    value={type.value}
                    checked={issueType === type.value}
                    onChange={() => setIssueType(type.value)}
                    className="mt-0.5 accent-gray-900"
                  />
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{type.label}</p>
                    <p className="text-xs text-gray-500">{type.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Describe the issue in detail *
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={6}
              placeholder="Please describe exactly what happened, when it happened, and what you expected. The more detail you provide, the faster we can resolve this."
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:border-gray-900"
            />
            <p className={`text-xs mt-1 ${description.length < 20 ? 'text-gray-400' : 'text-green-600'}`}>
              {description.length} characters {description.length < 20 ? `(${20 - description.length} more needed)` : '✓'}
            </p>
          </div>

          {/* Info box */}
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <p className="text-sm font-semibold text-amber-800 mb-1">What happens next?</p>
            <ul className="text-xs text-amber-700 space-y-1 list-disc list-inside">
              <li>Your dispute will be reviewed by our team within 48 hours</li>
              <li>Both parties will be notified</li>
              <li>Our team may reach out for more information</li>
              <li>A resolution will be communicated to both parties</li>
            </ul>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Submit Dispute'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
