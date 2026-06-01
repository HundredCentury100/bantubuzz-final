import { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import { billingAPI } from '../services/api';
import { DocumentTextIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const money = (value) => `$${Number(value || 0).toFixed(2)}`;

const dateText = (value) => {
  if (!value) return 'Not set';
  return new Date(value).toLocaleDateString();
};

const InvoiceTable = ({ title, description, invoices, emptyText, onDownload }) => (
  <section className="bg-white rounded-3xl shadow-sm p-6">
    <div className="mb-5">
      <h2 className="text-xl font-bold text-dark">{title}</h2>
      <p className="text-sm text-gray-600 mt-1">{description}</p>
    </div>

    {invoices.length === 0 ? (
      <div className="text-center py-10 border border-dashed border-gray-200 rounded-2xl">
        <DocumentTextIcon className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p className="text-sm text-gray-500">{emptyText}</p>
      </div>
    ) : (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-100">
          <thead>
            <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
              <th className="pb-3 pr-4">Invoice</th>
              <th className="pb-3 pr-4">Item</th>
              <th className="pb-3 pr-4">Date</th>
              <th className="pb-3 pr-4">Status</th>
              <th className="pb-3 pr-4 text-right">Amount</th>
              <th className="pb-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {invoices.map((invoice) => (
              <tr key={invoice.id} className="text-sm">
                <td className="py-4 pr-4 font-semibold text-dark whitespace-nowrap">{invoice.invoice_number}</td>
                <td className="py-4 pr-4">
                  <p className="font-medium text-dark">{invoice.title}</p>
                  <p className="text-xs text-gray-500">{invoice.description}</p>
                </td>
                <td className="py-4 pr-4 text-gray-600 whitespace-nowrap">{dateText(invoice.paid_at || invoice.due_at || invoice.issued_at)}</td>
                <td className="py-4 pr-4">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    invoice.status === 'paid' ? 'bg-primary/20 text-primary-dark' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {invoice.status === 'paid' ? 'Paid' : 'Upcoming'}
                  </span>
                </td>
                <td className="py-4 pr-4 text-right font-semibold text-dark">{money(invoice.amount)}</td>
                <td className="py-4 text-right">
                  {invoice.download_url ? (
                    <button
                      type="button"
                      onClick={() => onDownload(invoice)}
                      className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-dark hover:bg-primary/90 transition-colors"
                    >
                      <ArrowDownTrayIcon className="h-4 w-4" />
                      Invoice
                    </button>
                  ) : (
                    <span className="text-xs text-gray-400">Pending</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </section>
);

const Billing = () => {
  const [pastInvoices, setPastInvoices] = useState([]);
  const [upcomingInvoices, setUpcomingInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await billingAPI.getInvoices();
        setPastInvoices(response.data.past_invoices || []);
        setUpcomingInvoices(response.data.upcoming_invoices || []);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load billing history');
      } finally {
        setLoading(false);
      }
    };

    fetchInvoices();
  }, []);

  const totalPaid = pastInvoices.reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0);
  const totalUpcoming = upcomingInvoices.reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0);

  const handleDownload = async (invoice) => {
    try {
      const response = await billingAPI.downloadInvoice(invoice.download_url);
      const blob = new Blob([response.data], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to open invoice');
    }
  };

  return (
    <div className="min-h-screen bg-light">
      <Navbar />

      <main className="py-10 px-6 lg:px-12 xl:px-20">
        <div className="w-full max-w-7xl mx-auto space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-dark">Billing</h1>
              <p className="text-gray-600 mt-2">View collaboration, campaign, and subscription invoices.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-3xl shadow-sm p-6">
              <p className="text-sm text-gray-600">Past invoices</p>
              <p className="text-3xl font-bold text-dark mt-2">{money(totalPaid)}</p>
            </div>
            <div className="bg-white rounded-3xl shadow-sm p-6">
              <p className="text-sm text-gray-600">Upcoming invoices</p>
              <p className="text-3xl font-bold text-dark mt-2">{money(totalUpcoming)}</p>
            </div>
          </div>

          {loading && (
            <div className="bg-white rounded-3xl shadow-sm p-10 text-center text-gray-600">
              Loading billing history...
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-3xl p-5 text-red-700">
              {error}
            </div>
          )}

          {!loading && !error && (
            <>
              <InvoiceTable
                title="Upcoming Invoices"
                description="Pending payments and upcoming subscription renewals."
                invoices={upcomingInvoices}
                emptyText="No upcoming invoices right now."
                onDownload={handleDownload}
              />
              <InvoiceTable
                title="Past Invoices"
                description="Paid collaboration, campaign, and subscription invoices."
                invoices={pastInvoices}
                emptyText="No past invoices yet."
                onDownload={handleDownload}
              />
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default Billing;
