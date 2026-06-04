import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { workspacesAPI } from '../services/api';
import { useWorkspace } from '../contexts/WorkspaceContext';
import toast from 'react-hot-toast';
import SmilePayPaymentModal from '../components/SmilePayPaymentModal';
import {
  ArrowDownTrayIcon,
  BuildingOffice2Icon,
  ChartBarIcon,
  CheckCircleIcon,
  ClockIcon,
  CurrencyDollarIcon,
  PrinterIcon,
} from '@heroicons/react/24/outline';

const money = (value) => `$${Number(value || 0).toFixed(2)}`;

const StatCard = ({ label, value, icon: Icon }) => (
  <div className="bg-white rounded-3xl p-6 shadow-sm">
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm text-gray-600">{label}</p>
        <p className="mt-2 text-3xl font-bold text-dark">{value}</p>
      </div>
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15">
        <Icon className="h-6 w-6 text-dark" />
      </div>
    </div>
  </div>
);

const AgencyDashboard = () => {
  const { selectWorkspace, refreshWorkspaces, workspaceMeta } = useWorkspace() || {};
  const [clients, setClients] = useState([]);
  const [totals, setTotals] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [exporting, setExporting] = useState('');
  const [pendingAddon, setPendingAddon] = useState(null);
  const [pendingWorkspace, setPendingWorkspace] = useState(null);
  const [proofFile, setProofFile] = useState(null);
  const [addonPaymentMethod, setAddonPaymentMethod] = useState('smilepay');
  const [showSmilePayModal, setShowSmilePayModal] = useState(false);
  const [payingAddon, setPayingAddon] = useState(false);
  const [showEmailReport, setShowEmailReport] = useState(false);
  const [sendingReport, setSendingReport] = useState(false);
  const [emailReportForm, setEmailReportForm] = useState({
    recipients: '',
    subject: '',
    message: '',
  });
  const [filters, setFilters] = useState({
    start_date: '',
    end_date: '',
  });
  const [form, setForm] = useState({
    name: '',
    industry: '',
    billing_email: '',
    website: '',
  });
  const language = workspaceMeta?.language || {
    dashboard_title: 'Agency Dashboard',
    dashboard_subtitle: 'All clients at a glance',
    workspace_singular: 'client',
    workspace_plural: 'clients',
    add_label: 'Add Client',
    empty_state: "You haven't added any clients yet. Add your first client.",
  };
  const pendingAddonAwaitingVerification = pendingAddon?.payment_status === 'pending_verification';

  const fetchDashboard = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await workspacesAPI.getMasterDashboard({
          start_date: filters.start_date || undefined,
          end_date: filters.end_date || undefined,
        });
        setClients(response.data.clients || []);
        setTotals(response.data.totals || {});
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load agency dashboard');
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    fetchDashboard();
  }, []);

  useEffect(() => {
    if (pendingAddon || !workspaceMeta?.pending_addons?.length) return;

    const [nextPendingAddon] = workspaceMeta.pending_addons;
    setPendingAddon(nextPendingAddon);
    setPendingWorkspace(nextPendingAddon.workspace || null);
    if (nextPendingAddon.payment_status === 'pending_verification') {
      setAddonPaymentMethod('bank_transfer');
    }
  }, [pendingAddon, workspaceMeta]);

  const handleClientSelect = async (workspaceId) => {
    selectWorkspace?.(workspaceId);
    await refreshWorkspaces?.();
  };

  const handleCreateWorkspace = async (event) => {
    event.preventDefault();
    if (!form.name.trim()) {
      toast.error('Client name is required');
      return;
    }

    try {
      setCreating(true);
      const response = await workspacesAPI.createWorkspace(form);
      toast.success(
        response.data.addon_required
          ? 'Client workspace created. Complete the extra workspace payment to activate it.'
          : 'Client workspace created'
      );
      if (response.data.addon_required) {
        setPendingAddon(response.data.addon);
        setPendingWorkspace(response.data.workspace);
      }
      setForm({ name: '', industry: '', billing_email: '', website: '' });
      setShowCreateForm(false);
      await refreshWorkspaces?.();
      await fetchDashboard();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create workspace');
    } finally {
      setCreating(false);
    }
  };

  const handleAddonWalletPayment = async () => {
    if (!pendingAddon) return;
    try {
      setPayingAddon(true);
      await workspacesAPI.payAddonWithWallet(pendingAddon.id);
      toast.success('Extra workspace activated');
      setPendingAddon(null);
      setPendingWorkspace(null);
      await refreshWorkspaces?.();
      await fetchDashboard();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to pay with wallet');
    } finally {
      setPayingAddon(false);
    }
  };

  const handleAddonProofUpload = async () => {
    if (!pendingAddon || !proofFile) {
      toast.error('Please choose a proof of payment file');
      return;
    }
    try {
      setPayingAddon(true);
      const formData = new FormData();
      formData.append('file', proofFile);
      await workspacesAPI.uploadAddonProof(pendingAddon.id, formData);
      toast.success('Proof uploaded. The workspace will activate after admin verification.');
      setProofFile(null);
      setPendingAddon(null);
      setPendingWorkspace(null);
      await refreshWorkspaces?.();
      await fetchDashboard();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to upload proof');
    } finally {
      setPayingAddon(false);
    }
  };

  const handleSmilePaySuccess = async () => {
    toast.success('Extra workspace activated');
    setPendingAddon(null);
    setPendingWorkspace(null);
    setShowSmilePayModal(false);
    await refreshWorkspaces?.();
    await fetchDashboard();
  };

  const handleExport = async (format) => {
    try {
      setExporting(format);
      const response = await workspacesAPI.exportMasterDashboard({
        format,
        start_date: filters.start_date || undefined,
        end_date: filters.end_date || undefined,
      });
      const blob = new Blob([response.data], {
        type: format === 'html' ? 'text/html' : format === 'pdf' ? 'application/pdf' : 'text/csv',
      });
      const url = window.URL.createObjectURL(blob);
      if (format === 'html') {
        window.open(url, '_blank', 'noopener,noreferrer');
        setTimeout(() => window.URL.revokeObjectURL(url), 30000);
      } else {
        const link = document.createElement('a');
        link.href = url;
        link.download = `${language.workspace_plural}-report.${format}`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to export report');
    } finally {
      setExporting('');
    }
  };

  const handleEmailReport = async (event) => {
    event.preventDefault();
    const recipients = emailReportForm.recipients
      .split(',')
      .map((email) => email.trim())
      .filter(Boolean);
    if (recipients.length === 0) {
      toast.error('Add at least one recipient email');
      return;
    }

    try {
      setSendingReport(true);
      await workspacesAPI.emailMasterDashboardReport(
        {
          recipients,
          subject: emailReportForm.subject,
          message: emailReportForm.message,
        },
        {
          start_date: filters.start_date || undefined,
          end_date: filters.end_date || undefined,
        }
      );
      toast.success('Report email queued');
      setShowEmailReport(false);
      setEmailReportForm({ recipients: '', subject: '', message: '' });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to email report');
    } finally {
      setSendingReport(false);
    }
  };

  return (
    <div className="min-h-screen bg-light">
      <Navbar />

      <main className="px-6 py-10 lg:px-12 xl:px-20">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-dark">{language.dashboard_title}</h1>
              <p className="mt-2 text-gray-600">{language.dashboard_subtitle}, campaigns, approvals, and spend in one view.</p>
            </div>

            <div className="rounded-3xl bg-white p-4 shadow-sm">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto_auto_auto_auto_auto]">
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">From</span>
                  <input
                    type="date"
                    value={filters.start_date}
                    onChange={(event) => setFilters((current) => ({ ...current, start_date: event.target.value }))}
                    className="rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">To</span>
                  <input
                    type="date"
                    value={filters.end_date}
                    onChange={(event) => setFilters((current) => ({ ...current, end_date: event.target.value }))}
                    className="rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </label>
                <button
                  type="button"
                  onClick={fetchDashboard}
                  className="self-end rounded-xl bg-dark px-4 py-2 text-sm font-semibold text-white"
                >
                  Apply
                </button>
                <button
                  type="button"
                  onClick={() => handleExport('csv')}
                  disabled={exporting === 'csv'}
                  className="self-end inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-dark hover:border-primary disabled:opacity-60"
                  title="Download CSV"
                >
                  <ArrowDownTrayIcon className="h-4 w-4" />
                  CSV
                </button>
                <button
                  type="button"
                  onClick={() => handleExport('html')}
                  disabled={exporting === 'html'}
                  className="self-end inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-dark hover:border-primary disabled:opacity-60"
                  title="Open printable report"
                >
                  <PrinterIcon className="h-4 w-4" />
                  Report
                </button>
                <button
                  type="button"
                  onClick={() => handleExport('pdf')}
                  disabled={exporting === 'pdf'}
                  className="self-end inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-dark hover:border-primary disabled:opacity-60"
                  title="Download branded PDF"
                >
                  <ArrowDownTrayIcon className="h-4 w-4" />
                  PDF
                </button>
                <button
                  type="button"
                  onClick={() => setShowEmailReport((value) => !value)}
                  className="self-end inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-dark hover:bg-primary/90"
                  title="Email branded PDF"
                >
                  Email
                </button>
              </div>
            </div>
          </div>

          {showEmailReport && (
            <form onSubmit={handleEmailReport} className="rounded-3xl bg-white p-5 shadow-sm">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr]">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Recipient emails
                  </label>
                  <input
                    type="text"
                    value={emailReportForm.recipients}
                    onChange={(event) => setEmailReportForm((current) => ({ ...current, recipients: event.target.value }))}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="client@example.com, finance@example.com"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Subject
                  </label>
                  <input
                    type="text"
                    value={emailReportForm.subject}
                    onChange={(event) => setEmailReportForm((current) => ({ ...current, subject: event.target.value }))}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder={`${language.dashboard_title} Report`}
                  />
                </div>
              </div>
              <div className="mt-4">
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Message
                </label>
                <textarea
                  rows={3}
                  value={emailReportForm.message}
                  onChange={(event) => setEmailReportForm((current) => ({ ...current, message: event.target.value }))}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="Please find this month's client performance report attached."
                />
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  disabled={sendingReport}
                  className="rounded-full bg-dark px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {sendingReport ? 'Sending...' : 'Send PDF Report'}
                </button>
                <p className="text-sm text-gray-500">
                  Sent through BantuBuzz email for now, with your sender name, reply-to, logo, colors, and signature.
                </p>
              </div>
            </form>
          )}

          {loading && (
            <div className="rounded-3xl bg-white p-10 text-center text-gray-600 shadow-sm">
              Loading agency workspace data...
            </div>
          )}

          {error && (
            <div className="rounded-3xl border border-red-200 bg-red-50 p-5 text-red-700">
              {error}
            </div>
          )}

          {pendingAddon && (
            <section className="rounded-3xl border border-primary/40 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h2 className="text-xl font-bold text-dark">Activate Extra Workspace</h2>
                  <p className="mt-2 text-sm text-gray-600">
                    {pendingWorkspace?.name || 'This workspace'} is above your included workspace allowance. Pay {money(pendingAddon.amount)} {pendingAddon.billing_cycle === 'yearly' ? 'per year' : 'per month'} to activate it.
                  </p>
                </div>
                <div className="rounded-full bg-primary/15 px-4 py-2 text-sm font-semibold text-dark">
                  {pendingAddonAwaitingVerification ? 'Awaiting admin verification' : 'Pending activation'}
                </div>
              </div>

              {pendingAddonAwaitingVerification ? (
                <div className="mt-5 rounded-3xl border border-blue-200 bg-blue-50 p-5 text-sm text-blue-900">
                  Your bank transfer proof has been submitted. This workspace will become available in the selector and dashboard once admin verifies the payment.
                </div>
              ) : (
                <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
                  {[
                    ['smilepay', 'Smile&Pay', 'Ecocash, Innbucks, SmileCash, Omari, Visa, Mastercard'],
                    ['wallet', 'Wallet', 'Use your brand wallet balance'],
                    ['bank_transfer', 'Bank Transfer', 'Upload proof for admin verification'],
                  ].map(([value, label, description]) => (
                    <label
                      key={value}
                      className={`cursor-pointer rounded-3xl border-2 p-4 transition-colors ${addonPaymentMethod === value ? 'border-primary bg-primary/10' : 'border-gray-200 bg-white hover:border-primary'}`}
                    >
                      <input
                        type="radio"
                        name="addonPaymentMethod"
                        value={value}
                        checked={addonPaymentMethod === value}
                        onChange={(event) => setAddonPaymentMethod(event.target.value)}
                        className="sr-only"
                      />
                      <span className="block font-semibold text-dark">{label}</span>
                      <span className="mt-1 block text-sm text-gray-600">{description}</span>
                    </label>
                  ))}
                </div>
              )}

              {!pendingAddonAwaitingVerification && addonPaymentMethod === 'bank_transfer' && (
                <div className="mt-5 rounded-3xl border border-blue-200 bg-blue-50 p-5">
                  <h3 className="font-bold text-blue-900">Bank Transfer Instructions</h3>
                  <div className="mt-3 space-y-1 text-sm text-blue-900">
                    <p><strong>Bank Name:</strong> Example Bank</p>
                    <p><strong>Account Name:</strong> BantuBuzz Platform</p>
                    <p><strong>Account Number:</strong> 1234567890</p>
                    <p><strong>Reference:</strong> WORKSPACE-{pendingAddon.id}</p>
                    <p><strong>Amount:</strong> {money(pendingAddon.amount)}</p>
                  </div>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(event) => setProofFile(event.target.files?.[0] || null)}
                    className="mt-4 block w-full rounded-full border border-blue-300 bg-white px-4 py-2 text-sm"
                  />
                </div>
              )}

              {!pendingAddonAwaitingVerification && (
              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={payingAddon || (addonPaymentMethod === 'bank_transfer' && !proofFile)}
                  onClick={
                    addonPaymentMethod === 'wallet'
                      ? handleAddonWalletPayment
                      : addonPaymentMethod === 'bank_transfer'
                        ? handleAddonProofUpload
                        : () => setShowSmilePayModal(true)
                  }
                  className="rounded-full bg-dark px-6 py-3 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {payingAddon
                    ? 'Processing...'
                    : addonPaymentMethod === 'wallet'
                      ? 'Pay with Wallet'
                      : addonPaymentMethod === 'bank_transfer'
                        ? 'Submit Proof'
                        : 'Continue to Smile&Pay'}
                </button>
              </div>
              )}
            </section>
          )}

          {!loading && !error && (
            <>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <StatCard label={language.workspace_plural[0].toUpperCase() + language.workspace_plural.slice(1)} value={totals?.clients || 0} icon={BuildingOffice2Icon} />
                <StatCard label="Campaigns" value={totals?.campaigns || 0} icon={ChartBarIcon} />
                <StatCard label="Active Collaborations" value={totals?.active_collaborations || 0} icon={CheckCircleIcon} />
                <StatCard label="Total Spend" value={money(totals?.spend)} icon={CurrencyDollarIcon} />
              </div>

              <section className="rounded-3xl bg-white p-6 shadow-sm">
                <div className="mb-5 flex items-center justify-between">
                  <h2 className="text-xl font-bold text-dark">{language.workspace_plural[0].toUpperCase() + language.workspace_plural.slice(1)} Workspaces</h2>
                  <button
                    type="button"
                    onClick={() => setShowCreateForm((value) => !value)}
                    className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-dark hover:bg-primary/90"
                  >
                    {language.add_label}
                  </button>
                </div>

                {showCreateForm && (
                  <form onSubmit={handleCreateWorkspace} className="mb-6 grid grid-cols-1 gap-3 rounded-2xl bg-light p-4 md:grid-cols-4">
                    <input
                      value={form.name}
                      onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                      placeholder={`${language.workspace_singular[0].toUpperCase() + language.workspace_singular.slice(1)} name`}
                      className="rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    <input
                      value={form.industry}
                      onChange={(event) => setForm((current) => ({ ...current, industry: event.target.value }))}
                      placeholder="Industry"
                      className="rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    <input
                      value={form.billing_email}
                      onChange={(event) => setForm((current) => ({ ...current, billing_email: event.target.value }))}
                      placeholder="Billing email"
                      className="rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    <div className="flex gap-2">
                      <input
                        value={form.website}
                        onChange={(event) => setForm((current) => ({ ...current, website: event.target.value }))}
                        placeholder="Website"
                        className="min-w-0 flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                      <button
                        type="submit"
                        disabled={creating}
                        className="rounded-xl bg-dark px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                      >
                        {creating ? 'Adding' : 'Save'}
                      </button>
                    </div>
                  </form>
                )}

                {clients.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-gray-200 py-10 text-center">
                    <BuildingOffice2Icon className="mx-auto mb-3 h-10 w-10 text-gray-300" />
                    <p className="text-sm text-gray-500">{language.empty_state}</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-100">
                      <thead>
                        <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                          <th className="pb-3 pr-4">{language.workspace_singular[0].toUpperCase() + language.workspace_singular.slice(1)}</th>
                          <th className="pb-3 pr-4">Campaigns</th>
                          <th className="pb-3 pr-4">Active Collabs</th>
                          <th className="pb-3 pr-4">Pending Approvals</th>
                          <th className="pb-3 pr-4 text-right">Spend</th>
                          <th className="pb-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {clients.map((client) => (
                          <tr key={client.id} className="text-sm">
                            <td className="py-4 pr-4">
                              <p className="font-semibold text-dark">{client.name}</p>
                              <p className="text-xs text-gray-500">{client.industry || 'No industry set'}</p>
                            </td>
                            <td className="py-4 pr-4 text-gray-700">{client.campaigns_count}</td>
                            <td className="py-4 pr-4 text-gray-700">{client.active_collaborations_count}</td>
                            <td className="py-4 pr-4">
                              <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-800">
                                <ClockIcon className="h-4 w-4" />
                                {client.pending_approvals_count}
                              </span>
                            </td>
                            <td className="py-4 pr-4 text-right font-semibold text-dark">{money(client.total_spend)}</td>
                            <td className="py-4 text-right">
                              <div className="flex justify-end gap-2">
                                <Link
                                  to={`/brand/workspaces/${client.id}`}
                                  className="rounded-full border border-gray-200 px-4 py-2 text-xs font-semibold text-dark hover:border-primary"
                                >
                                  Manage
                                </Link>
                                <button
                                  type="button"
                                  onClick={() => handleClientSelect(client.id)}
                                  className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-dark hover:bg-primary/90"
                                >
                                  Work In {language.workspace_singular[0].toUpperCase() + language.workspace_singular.slice(1)}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </main>

      {pendingAddon && (
        <SmilePayPaymentModal
          isOpen={showSmilePayModal}
          onClose={() => setShowSmilePayModal(false)}
          amount={Number(pendingAddon.amount || 0)}
          currency="USD"
          paymentType="workspace_addon"
          paymentId={pendingAddon.id}
          itemName="Extra Workspace Add-on"
          itemDescription={`Activate ${pendingWorkspace?.name || 'extra workspace'}`}
          onSuccess={handleSmilePaySuccess}
          returnUrl={`${window.location.origin}/brand/agency`}
          resultUrl={`${window.location.origin}/api/payments/smilepay/webhook/callback`}
        />
      )}
    </div>
  );
};

export default AgencyDashboard;
