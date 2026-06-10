import { useEffect, useState } from 'react';
import {
  CalendarDays,
  Copy,
  Download,
  Link as LinkIcon,
  Mail,
  Pause,
  Play,
  Trash2,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { campaignsAPI } from '../services/api';

const initialSchedule = {
  frequency: 'weekly',
  recipients: '',
  subject: '',
  date_range_mode: 'last_30_days',
};

export default function CampaignReportTools({
  campaignId,
  capabilities,
  rangeParams,
  onClose,
}) {
  const [tab, setTab] = useState('export');
  const [busy, setBusy] = useState('');
  const [schedules, setSchedules] = useState([]);
  const [shares, setShares] = useState([]);
  const [scheduleForm, setScheduleForm] = useState(initialSchedule);
  const [shareForm, setShareForm] = useState({
    label: '',
    expires_in_days: 30,
    start_date: rangeParams.start_date || '',
    end_date: rangeParams.end_date || '',
  });

  useEffect(() => {
    if (tab === 'schedule') loadSchedules();
    if (tab === 'share') loadShares();
  }, [tab]);

  const download = async (format) => {
    try {
      setBusy(format);
      const response = await campaignsAPI.downloadCampaignReport(campaignId, format, rangeParams);
      const type = format === 'pdf' ? 'application/pdf' : 'text/csv';
      const url = URL.createObjectURL(new Blob([response.data], { type }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `campaign-${campaignId}-report.${format}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(error.response?.data?.error || `Failed to export ${format.toUpperCase()}`);
    } finally {
      setBusy('');
    }
  };

  const loadSchedules = async () => {
    try {
      const response = await campaignsAPI.getReportSchedules(campaignId);
      setSchedules(response.data.schedules || []);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to load report schedules');
    }
  };

  const createSchedule = async (event) => {
    event.preventDefault();
    try {
      setBusy('schedule');
      await campaignsAPI.createReportSchedule(campaignId, {
        ...scheduleForm,
        recipients: scheduleForm.recipients.split(',').map((item) => item.trim()).filter(Boolean),
      });
      toast.success('Report schedule created');
      setScheduleForm(initialSchedule);
      await loadSchedules();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to create report schedule');
    } finally {
      setBusy('');
    }
  };

  const toggleSchedule = async (schedule) => {
    await campaignsAPI.updateReportSchedule(schedule.id, { is_active: !schedule.is_active });
    await loadSchedules();
  };

  const deleteSchedule = async (id) => {
    await campaignsAPI.deleteReportSchedule(id);
    toast.success('Report schedule deleted');
    await loadSchedules();
  };

  const loadShares = async () => {
    try {
      const response = await campaignsAPI.getReportShares(campaignId);
      setShares(response.data.shares || []);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to load report links');
    }
  };

  const createShare = async (event) => {
    event.preventDefault();
    try {
      setBusy('share');
      const response = await campaignsAPI.createReportShare(campaignId, shareForm);
      await navigator.clipboard.writeText(response.data.share.url);
      toast.success('View-only report link created and copied');
      setShareForm((current) => ({ ...current, label: '' }));
      await loadShares();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to create report link');
    } finally {
      setBusy('');
    }
  };

  const copyShare = async (token) => {
    await navigator.clipboard.writeText(`${window.location.origin}/reports/${token}`);
    toast.success('Report link copied');
  };

  const revokeShare = async (id) => {
    await campaignsAPI.revokeReportShare(id);
    toast.success('Report link revoked');
    await loadShares();
  };

  const tabs = [
    { id: 'export', label: 'Export', icon: Download },
    { id: 'schedule', label: 'Schedule', icon: Mail },
    ...(capabilities.shareable_links ? [{ id: 'share', label: 'Share Link', icon: LinkIcon }] : []),
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-4">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto bg-white shadow-xl sm:rounded-lg">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Campaign Reports</h2>
            <p className="text-sm text-gray-500">Export, email automatically, or share a view-only report.</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 text-gray-500 hover:text-gray-900" title="Close">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="border-b border-gray-200 px-5 pt-3">
          <div className="flex gap-5">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`flex items-center gap-2 border-b-2 px-1 py-3 text-sm font-medium ${
                  tab === id ? 'border-primary text-gray-900' : 'border-transparent text-gray-500'
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-5">
          {tab === 'export' && (
            <div className="space-y-4">
              <div className="border border-gray-200 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900">Stakeholder PDF</h3>
                <p className="mt-1 text-sm text-gray-600">
                  {capabilities.white_label
                    ? 'Uses your report logo, colors, and signature with the required Powered by BantuBuzz footer.'
                    : 'Uses BantuBuzz branding and includes campaign ROI and performance.'}
                </p>
                <button
                  type="button"
                  onClick={() => download('pdf')}
                  disabled={busy === 'pdf'}
                  className="mt-4 inline-flex items-center gap-2 bg-primary px-4 py-2 text-sm font-semibold text-gray-900 rounded-lg disabled:opacity-60"
                >
                  <Download className="h-4 w-4" />
                  {busy === 'pdf' ? 'Preparing...' : 'Download PDF'}
                </button>
              </div>
              <div className="border border-gray-200 p-4 rounded-lg">
                <h3 className="font-semibold text-gray-900">Raw campaign data</h3>
                <p className="mt-1 text-sm text-gray-600">One CSV row per submitted creator post, ready for spreadsheet analysis.</p>
                <button
                  type="button"
                  onClick={() => download('csv')}
                  disabled={busy === 'csv'}
                  className="mt-4 inline-flex items-center gap-2 border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-900 rounded-lg disabled:opacity-60"
                >
                  <Download className="h-4 w-4" />
                  {busy === 'csv' ? 'Preparing...' : 'Download CSV'}
                </button>
              </div>
            </div>
          )}

          {tab === 'schedule' && (
            <div className="space-y-6">
              <form onSubmit={createSchedule} className="grid gap-4 border-b border-gray-200 pb-6 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-gray-700">Frequency</span>
                  <select
                    value={scheduleForm.frequency}
                    onChange={(event) => setScheduleForm((current) => ({ ...current, frequency: event.target.value }))}
                    className="w-full border border-gray-300 px-3 py-2 rounded-lg"
                  >
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-gray-700">Report period</span>
                  <select
                    value={scheduleForm.date_range_mode}
                    onChange={(event) => setScheduleForm((current) => ({ ...current, date_range_mode: event.target.value }))}
                    className="w-full border border-gray-300 px-3 py-2 rounded-lg"
                  >
                    <option value="last_7_days">Last 7 days</option>
                    <option value="last_30_days">Last 30 days</option>
                    <option value="last_90_days">Last 90 days</option>
                  </select>
                </label>
                <label className="block sm:col-span-2">
                  <span className="mb-1 block text-sm font-medium text-gray-700">Recipients</span>
                  <input
                    required
                    value={scheduleForm.recipients}
                    onChange={(event) => setScheduleForm((current) => ({ ...current, recipients: event.target.value }))}
                    placeholder="leadership@example.com, finance@example.com"
                    className="w-full border border-gray-300 px-3 py-2 rounded-lg"
                  />
                </label>
                <label className="block sm:col-span-2">
                  <span className="mb-1 block text-sm font-medium text-gray-700">Email subject (optional)</span>
                  <input
                    value={scheduleForm.subject}
                    onChange={(event) => setScheduleForm((current) => ({ ...current, subject: event.target.value }))}
                    className="w-full border border-gray-300 px-3 py-2 rounded-lg"
                  />
                </label>
                <button
                  type="submit"
                  disabled={busy === 'schedule'}
                  className="inline-flex w-fit items-center gap-2 bg-primary px-4 py-2 text-sm font-semibold text-gray-900 rounded-lg disabled:opacity-60"
                >
                  <CalendarDays className="h-4 w-4" />
                  Create Schedule
                </button>
              </form>
              <div className="space-y-3">
                {schedules.length === 0 && <p className="text-sm text-gray-500">No automatic reports scheduled yet.</p>}
                {schedules.map((schedule) => (
                  <div key={schedule.id} className="flex items-center justify-between gap-3 border border-gray-200 p-3 rounded-lg">
                    <div>
                      <p className="font-medium capitalize text-gray-900">{schedule.frequency} report</p>
                      <p className="text-xs text-gray-500">
                        Next: {new Date(schedule.next_run_at).toLocaleString()} · {schedule.recipients.join(', ')}
                      </p>
                    </div>
                    <div className="flex">
                      <button type="button" onClick={() => toggleSchedule(schedule)} className="p-2 text-gray-600" title={schedule.is_active ? 'Pause' : 'Resume'}>
                        {schedule.is_active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      </button>
                      <button type="button" onClick={() => deleteSchedule(schedule.id)} className="p-2 text-red-600" title="Delete">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'share' && capabilities.shareable_links && (
            <div className="space-y-6">
              <form onSubmit={createShare} className="grid gap-4 border-b border-gray-200 pb-6 sm:grid-cols-2">
                <label className="block sm:col-span-2">
                  <span className="mb-1 block text-sm font-medium text-gray-700">Link label</span>
                  <input
                    value={shareForm.label}
                    onChange={(event) => setShareForm((current) => ({ ...current, label: event.target.value }))}
                    placeholder="June leadership report"
                    className="w-full border border-gray-300 px-3 py-2 rounded-lg"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-gray-700">From</span>
                  <input type="date" required value={shareForm.start_date} onChange={(event) => setShareForm((current) => ({ ...current, start_date: event.target.value }))} className="w-full border border-gray-300 px-3 py-2 rounded-lg" />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-gray-700">To</span>
                  <input type="date" required value={shareForm.end_date} onChange={(event) => setShareForm((current) => ({ ...current, end_date: event.target.value }))} className="w-full border border-gray-300 px-3 py-2 rounded-lg" />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-gray-700">Expires after</span>
                  <select value={shareForm.expires_in_days} onChange={(event) => setShareForm((current) => ({ ...current, expires_in_days: Number(event.target.value) }))} className="w-full border border-gray-300 px-3 py-2 rounded-lg">
                    <option value={7}>7 days</option>
                    <option value={30}>30 days</option>
                    <option value={90}>90 days</option>
                    <option value={365}>1 year</option>
                  </select>
                </label>
                <button type="submit" disabled={busy === 'share'} className="self-end inline-flex w-fit items-center gap-2 bg-primary px-4 py-2 text-sm font-semibold text-gray-900 rounded-lg disabled:opacity-60">
                  <LinkIcon className="h-4 w-4" />
                  Create Link
                </button>
              </form>
              <div className="space-y-3">
                {shares.length === 0 && <p className="text-sm text-gray-500">No stakeholder links created yet.</p>}
                {shares.map((share) => (
                  <div key={share.id} className="flex items-center justify-between gap-3 border border-gray-200 p-3 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{share.label || 'Campaign report'}</p>
                      <p className="text-xs text-gray-500">{share.view_count} views · expires {new Date(share.expires_at).toLocaleDateString()}</p>
                    </div>
                    <div className="flex">
                      {share.is_active && <button type="button" onClick={() => copyShare(share.token)} className="p-2 text-gray-600" title="Copy link"><Copy className="h-4 w-4" /></button>}
                      {share.is_active && <button type="button" onClick={() => revokeShare(share.id)} className="p-2 text-red-600" title="Revoke"><X className="h-4 w-4" /></button>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
