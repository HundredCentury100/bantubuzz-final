import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { CalendarClock, Check, Search, Send, Users, X } from 'lucide-react';
import Navbar from '../components/Navbar';
import Avatar from '../components/Avatar';
import { BASE_URL, briefsAPI, creatorsAPI } from '../services/api';

const defaultTemplate = `Hi {creator_name},

We think your audience could be a strong fit for this brief. You currently have about {follower_count} followers and your work in {category} aligns with what we are looking for.

Please review the brief and send a proposal if you are interested.`;

const formatNumber = (value) => Number(value || 0).toLocaleString();

const BulkBriefSend = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [brief, setBrief] = useState(null);
  const [bulkSends, setBulkSends] = useState([]);
  const [creators, setCreators] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [accessError, setAccessError] = useState(null);
  const [form, setForm] = useState({
    subject: '',
    message_template: defaultTemplate,
    schedule_mode: 'now',
    scheduled_start_at: '',
    spread_hours: 0,
  });

  useEffect(() => {
    loadBrief();
    loadCreators();
  }, [id]);

  useEffect(() => {
    const timer = setTimeout(loadCreators, 350);
    return () => clearTimeout(timer);
  }, [search]);

  const loadBrief = async () => {
    try {
      const response = await briefsAPI.getBrief(id);
      setBrief(response.data);
      setForm((current) => ({
        ...current,
        subject: current.subject || `Brief invitation: ${response.data.title}`,
      }));
      try {
        const sends = await briefsAPI.getBulkSends(id);
        setBulkSends(sends.data.bulk_sends || []);
      } catch (err) {
        if (err.response?.status === 403) setAccessError(err.response.data);
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to load brief');
      navigate('/brand/briefs');
    } finally {
      setLoading(false);
    }
  };

  const loadCreators = async () => {
    try {
      const response = await creatorsAPI.getCreators({
        search,
        per_page: 24,
        category: brief?.target_categories?.[0] || '',
      });
      setCreators(response.data.creators || []);
    } catch (error) {
      setCreators([]);
    }
  };

  const selectedCreators = useMemo(
    () => creators.filter((creator) => selectedIds.has(creator.id)),
    [creators, selectedIds],
  );

  const toggleCreator = (creatorId) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(creatorId)) {
        next.delete(creatorId);
      } else if (next.size >= 50) {
        toast.error('You can select up to 50 creators');
      } else {
        next.add(creatorId);
      }
      return next;
    });
  };

  const previewText = () => {
    const creator = selectedCreators[0] || creators[0];
    if (!creator) return form.message_template;
    return form.message_template
      .replaceAll('{creator_name}', creator.username || creator.display_name || 'Creator')
      .replaceAll('{username}', creator.username || 'Creator')
      .replaceAll('{follower_count}', formatNumber(creator.total_followers || creator.follower_count))
      .replaceAll('{category}', (creator.categories || []).join(', ') || 'your niche')
      .replaceAll('{location}', creator.location || 'your market')
      .replaceAll('{top_platform}', creator.platform_stats?.[0]?.platform || 'your top platform');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (selectedIds.size === 0) {
      toast.error('Select at least one creator');
      return;
    }
    try {
      setSubmitting(true);
      const response = await briefsAPI.createBulkSend(id, {
        ...form,
        creator_ids: Array.from(selectedIds),
        spread_hours: Number(form.spread_hours || 0),
      });
      toast.success(response.data.message || 'Bulk brief scheduled');
      setSelectedIds(new Set());
      await loadBrief();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to send bulk brief');
      if (error.response?.status === 403) setAccessError(error.response.data);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-light">
        <Navbar />
        <div className="container-custom section-padding">Loading bulk brief tools...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-light">
      <Navbar />
      <div className="container-custom section-padding">
        <Link to="/brand/briefs" className="mb-6 inline-flex text-sm font-medium text-gray-600 hover:text-dark">
          Back to briefs
        </Link>

        <div className="mb-6 rounded-3xl bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase text-primary-dark">Premium / Agency</p>
              <h1 className="text-3xl font-bold text-dark">Bulk Brief Sending</h1>
              <p className="mt-2 text-gray-600">{brief?.title}</p>
            </div>
            <div className="rounded-full bg-primary/10 px-4 py-2 text-sm font-semibold text-primary-dark">
              {selectedIds.size}/50 selected
            </div>
          </div>
        </div>

        {accessError && (
          <div className="mb-6 rounded-3xl border border-amber-200 bg-amber-50 p-6">
            <h2 className="font-bold text-amber-900">Upgrade required</h2>
            <p className="mt-1 text-sm text-amber-800">{accessError.error}</p>
            <Link to="/pricing" className="mt-4 inline-flex rounded-full bg-dark px-5 py-2 text-sm font-semibold text-white">
              View plans
            </Link>
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <div className="rounded-3xl bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <Search className="h-5 w-5 text-primary-dark" />
                <h2 className="text-xl font-bold text-dark">Select creators</h2>
              </div>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search creators by name, niche, platform..."
                className="mb-4 w-full rounded-full border border-gray-300 px-4 py-3 focus:border-primary focus:outline-none"
              />
              <div className="grid gap-3 sm:grid-cols-2">
                {creators.map((creator) => {
                  const selected = selectedIds.has(creator.id);
                  return (
                    <button
                      key={creator.id}
                      type="button"
                      onClick={() => toggleCreator(creator.id)}
                      className={`flex items-center gap-3 rounded-2xl border p-3 text-left transition ${
                        selected ? 'border-primary bg-primary/10' : 'border-gray-200 hover:border-primary'
                      }`}
                    >
                      {creator.profile_picture ? (
                        <img src={`${BASE_URL}${creator.profile_picture}`} alt={creator.username} className="h-12 w-12 rounded-full object-cover" />
                      ) : (
                        <Avatar name={creator.username || creator.display_name || 'Creator'} size="md" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-dark">{creator.username || creator.display_name}</p>
                        <p className="truncate text-xs text-gray-500">
                          {formatNumber(creator.total_followers || creator.follower_count)} followers
                        </p>
                      </div>
                      {selected ? <Check className="h-5 w-5 text-primary-dark" /> : <Users className="h-5 w-5 text-gray-400" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <Send className="h-5 w-5 text-primary-dark" />
                <h2 className="text-xl font-bold text-dark">Message</h2>
              </div>
              <label className="block">
                <span className="text-sm font-semibold text-dark">Subject</span>
                <input
                  value={form.subject}
                  onChange={(event) => setForm({ ...form, subject: event.target.value })}
                  className="mt-1 w-full rounded-2xl border border-gray-300 px-4 py-3"
                />
              </label>
              <label className="mt-4 block">
                <span className="text-sm font-semibold text-dark">Template</span>
                <textarea
                  value={form.message_template}
                  onChange={(event) => setForm({ ...form, message_template: event.target.value })}
                  rows={8}
                  className="mt-1 w-full rounded-2xl border border-gray-300 px-4 py-3"
                />
              </label>
              <p className="mt-2 text-xs text-gray-500">
                Tags: {'{creator_name}'}, {'{follower_count}'}, {'{category}'}, {'{location}'}, {'{top_platform}'}.
              </p>
              <div className="mt-4 rounded-2xl bg-gray-50 p-4">
                <p className="mb-2 text-xs font-bold uppercase text-gray-500">Preview</p>
                <p className="whitespace-pre-line text-sm text-gray-700">{previewText()}</p>
              </div>
            </div>

            <div className="rounded-3xl bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <CalendarClock className="h-5 w-5 text-primary-dark" />
                <h2 className="text-xl font-bold text-dark">Schedule</h2>
              </div>
              <div className="grid gap-3">
                <label className="flex items-center gap-2">
                  <input type="radio" checked={form.schedule_mode === 'now'} onChange={() => setForm({ ...form, schedule_mode: 'now' })} />
                  Send now
                </label>
                <label className="flex items-center gap-2">
                  <input type="radio" checked={form.schedule_mode === 'scheduled'} onChange={() => setForm({ ...form, schedule_mode: 'scheduled' })} />
                  Schedule start time
                </label>
              </div>
              {form.schedule_mode === 'scheduled' && (
                <input
                  type="datetime-local"
                  value={form.scheduled_start_at}
                  onChange={(event) => setForm({ ...form, scheduled_start_at: event.target.value })}
                  className="mt-3 w-full rounded-2xl border border-gray-300 px-4 py-3"
                />
              )}
              <label className="mt-4 block">
                <span className="text-sm font-semibold text-dark">Spread sends over hours</span>
                <input
                  type="number"
                  min="0"
                  max="168"
                  value={form.spread_hours}
                  onChange={(event) => setForm({ ...form, spread_hours: event.target.value })}
                  className="mt-1 w-full rounded-2xl border border-gray-300 px-4 py-3"
                />
              </label>
              <button
                type="submit"
                disabled={submitting || !!accessError}
                className="mt-5 w-full rounded-full bg-primary px-6 py-3 font-semibold text-dark transition hover:bg-primary/90 disabled:opacity-50"
              >
                {submitting ? 'Scheduling...' : `Send to ${selectedIds.size} creator${selectedIds.size === 1 ? '' : 's'}`}
              </button>
            </div>
          </div>
        </form>

        <div className="mt-8 rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-bold text-dark">Tracking</h2>
          {bulkSends.length === 0 ? (
            <p className="text-gray-600">No bulk sends yet.</p>
          ) : (
            <div className="space-y-4">
              {bulkSends.map((send) => (
                <div key={send.id} className="rounded-2xl border border-gray-200 p-4">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="font-semibold text-dark">{send.subject}</p>
                      <p className="text-sm text-gray-500">{send.recipient_count} recipients · {send.status}</p>
                    </div>
                    <div className="flex gap-2 text-sm">
                      <span className="rounded-full bg-primary/10 px-3 py-1 text-primary-dark">{send.open_rate}% open</span>
                      <span className="rounded-full bg-gray-100 px-3 py-1 text-gray-700">{send.response_rate}% response</span>
                    </div>
                  </div>
                  <div className="mt-3 grid gap-2 md:grid-cols-2">
                    {(send.recipients || []).map((recipient) => (
                      <div key={recipient.id} className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2 text-sm">
                        <span className="truncate">{recipient.creator?.username || 'Creator'}</span>
                        <span className="ml-2 text-xs text-gray-500">
                          {recipient.responded_at ? 'Responded' : recipient.opened_at ? 'Opened' : recipient.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BulkBriefSend;
