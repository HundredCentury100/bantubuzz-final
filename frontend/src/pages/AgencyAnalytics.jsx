import { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import { workspacesAPI } from '../services/api';
import toast from 'react-hot-toast';
import {
  ArrowDownTrayIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  EnvelopeIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';

const money = (value) => `$${Number(value || 0).toFixed(2)}`;

const AgencyAnalytics = () => {
  const [data, setData] = useState(null);
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState('');
  const [showEmail, setShowEmail] = useState(false);
  const [sending, setSending] = useState(false);
  const [filters, setFilters] = useState({ start_date: '', end_date: '', workspace_id: '' });
  const [email, setEmail] = useState({ recipients: '', subject: '', message: '' });

  const params = () => ({
    start_date: filters.start_date || undefined,
    end_date: filters.end_date || undefined,
    workspace_id: filters.workspace_id || undefined,
  });

  const load = async () => {
    try {
      setLoading(true);
      const [dashboard, workspaceResponse] = await Promise.all([
        workspacesAPI.getMasterDashboard(params()),
        workspacesAPI.getWorkspaces(),
      ]);
      setData(dashboard.data);
      setWorkspaces(workspaceResponse.data.workspaces || []);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to load agency analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const download = async (format) => {
    try {
      setExporting(format);
      const response = await workspacesAPI.exportMasterDashboard({ ...params(), format });
      const type = format === 'pdf' ? 'application/pdf' : 'text/csv';
      const url = window.URL.createObjectURL(new Blob([response.data], { type }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `agency-${format === 'pdf' ? 'report.pdf' : 'analytics.csv'}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to export report');
    } finally {
      setExporting('');
    }
  };

  const sendReport = async (event) => {
    event.preventDefault();
    const recipients = email.recipients.split(',').map((item) => item.trim()).filter(Boolean);
    if (!recipients.length) {
      toast.error('Add at least one recipient email');
      return;
    }
    try {
      setSending(true);
      await workspacesAPI.emailMasterDashboardReport({ recipients, subject: email.subject, message: email.message }, params());
      setEmail({ recipients: '', subject: '', message: '' });
      setShowEmail(false);
      toast.success('Report email queued');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to email report');
    } finally {
      setSending(false);
    }
  };

  const totals = data?.totals || {};
  const clientLabel = data?.language?.workspace_singular || 'client';

  return (
    <div className="min-h-screen bg-light">
      <Navbar />
      <main className="px-4 py-8 md:px-8 lg:px-12">
        <div className="mx-auto max-w-7xl space-y-6">
          <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Agency intelligence</p>
              <h1 className="mt-2 text-3xl font-bold text-dark">Analytics and reporting</h1>
              <p className="mt-2 text-gray-600">Review performance across client brands or focus on one client workspace.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => download('csv')} disabled={exporting === 'csv'} className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-dark disabled:opacity-60">
                <ArrowDownTrayIcon className="h-4 w-4" /> CSV
              </button>
              <button type="button" onClick={() => download('pdf')} disabled={exporting === 'pdf'} className="inline-flex items-center gap-2 rounded-xl bg-dark px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
                <ArrowDownTrayIcon className="h-4 w-4" /> PDF
              </button>
              <button type="button" onClick={() => setShowEmail((value) => !value)} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-dark">
                <EnvelopeIcon className="h-4 w-4" /> Email report
              </button>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-3 rounded-2xl bg-white p-4 shadow-sm md:grid-cols-4">
            <label className="text-sm font-medium text-gray-700">Client
              <select value={filters.workspace_id} onChange={(event) => setFilters((current) => ({ ...current, workspace_id: event.target.value }))} className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm">
                <option value="">All clients</option>
                {workspaces.map((workspace) => <option key={workspace.id} value={workspace.id}>{workspace.name}</option>)}
              </select>
            </label>
            <label className="text-sm font-medium text-gray-700">From
              <input type="date" value={filters.start_date} onChange={(event) => setFilters((current) => ({ ...current, start_date: event.target.value }))} className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm" />
            </label>
            <label className="text-sm font-medium text-gray-700">To
              <input type="date" value={filters.end_date} onChange={(event) => setFilters((current) => ({ ...current, end_date: event.target.value }))} className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm" />
            </label>
            <button type="button" onClick={load} className="self-end rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-dark">Apply filters</button>
          </section>

          {showEmail && <form onSubmit={sendReport} className="grid grid-cols-1 gap-3 rounded-2xl bg-white p-4 shadow-sm md:grid-cols-2">
            <input value={email.recipients} onChange={(event) => setEmail((current) => ({ ...current, recipients: event.target.value }))} placeholder="client@example.com, leadership@example.com" className="rounded-xl border border-gray-200 px-3 py-2 text-sm" />
            <input value={email.subject} onChange={(event) => setEmail((current) => ({ ...current, subject: event.target.value }))} placeholder="Report subject" className="rounded-xl border border-gray-200 px-3 py-2 text-sm" />
            <textarea value={email.message} onChange={(event) => setEmail((current) => ({ ...current, message: event.target.value }))} placeholder="Optional message" rows={3} className="rounded-xl border border-gray-200 px-3 py-2 text-sm md:col-span-2" />
            <button type="submit" disabled={sending} className="w-fit rounded-xl bg-dark px-5 py-2 text-sm font-semibold text-white disabled:opacity-60">{sending ? 'Sending...' : 'Send PDF report'}</button>
          </form>}

          {loading ? <div className="rounded-2xl bg-white p-10 text-center text-gray-500 shadow-sm">Loading agency analytics...</div> : <>
            <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <Metric icon={UserGroupIcon} label="Client brands" value={totals.clients || 0} />
              <Metric icon={ChartBarIcon} label="Campaigns" value={totals.campaigns || 0} />
              <Metric icon={ChartBarIcon} label="Active collaborations" value={totals.active_collaborations || 0} />
              <Metric icon={CurrencyDollarIcon} label="Spend" value={money(totals.spend)} />
            </section>
            <section className="overflow-x-auto rounded-2xl bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-xl font-bold text-dark">{clientLabel[0].toUpperCase() + clientLabel.slice(1)} performance</h2>
              <table className="min-w-full text-left text-sm"><thead className="border-b text-xs uppercase tracking-wide text-gray-500"><tr><th className="pb-3 pr-4">Client</th><th className="pb-3 pr-4">Campaigns</th><th className="pb-3 pr-4">Active collabs</th><th className="pb-3 pr-4">Approvals</th><th className="pb-3 text-right">Spend</th></tr></thead><tbody className="divide-y divide-gray-100">{(data?.clients || []).map((client) => <tr key={client.id}><td className="py-3 pr-4 font-semibold text-dark">{client.name}</td><td className="py-3 pr-4">{client.campaigns_count}</td><td className="py-3 pr-4">{client.active_collaborations_count}</td><td className="py-3 pr-4">{client.pending_approvals_count}</td><td className="py-3 text-right font-semibold">{money(client.total_spend)}</td></tr>)}</tbody></table>
            </section>
          </>}
        </div>
      </main>
    </div>
  );
};

const Metric = ({ icon: Icon, label, value }) => <div className="rounded-2xl bg-white p-5 shadow-sm"><div className="flex items-start justify-between"><div><p className="text-sm text-gray-500">{label}</p><p className="mt-2 text-2xl font-bold text-dark">{value}</p></div><Icon className="h-6 w-6 text-primary" /></div></div>;

export default AgencyAnalytics;
