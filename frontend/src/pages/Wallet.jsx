import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import Navbar from '../components/Navbar';
import StatusBadge from '../components/admin/StatusBadge';

export default function Wallet() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [pendingClearance, setPendingClearance] = useState([]);
  const [cashouts, setCashouts] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchWalletData();
  }, []);

  const fetchWalletData = async () => {
    try {
      setLoading(true);
      const [balanceRes, transactionsRes, pendingRes, cashoutsRes] = await Promise.all([
        api.get('/wallet/balance'),
        api.get('/wallet/transactions?limit=20'),
        api.get('/wallet/pending-clearance'),
        api.get('/wallet/cashouts')
      ]);

      setWallet(balanceRes.data.wallet);
      setTransactions(transactionsRes.data.transactions);
      setPendingClearance(pendingRes.data.pending_transactions);
      setCashouts(cashoutsRes.data.cashouts);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load wallet data');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: wallet?.currency || 'USD'
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-light">
        <Navbar />
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-light">
      <Navbar />

      <div className="container-custom section-padding">
        {/* Header with Back Button */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => navigate('/creator/dashboard')}
              className="flex items-center text-primary hover:text-primary-dark transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Dashboard
            </button>
          </div>
          <h1 className="text-4xl font-bold text-dark leading-tight mb-2">My Wallet</h1>
          <p className="text-gray-600 leading-relaxed">Manage your earnings and cashouts</p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Balance Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Available Balance</p>
                <p className="text-3xl font-bold text-primary-dark mt-2">
                  {formatCurrency(wallet?.available_balance)}
                </p>
              </div>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-primary-dark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <Link
              to="/wallet/cashout"
              className="mt-4 block w-full text-center btn btn-primary"
            >
              Request Cashout
            </Link>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Pending Clearance</p>
                <p className="text-3xl font-bold text-dark mt-2">
                  {formatCurrency(wallet?.pending_clearance)}
                </p>
              </div>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="mt-4 text-xs text-gray-500">30-day clearance period</p>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Earned</p>
                <p className="text-3xl font-bold text-primary mt-2">
                  {formatCurrency(wallet?.total_earned)}
                </p>
              </div>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>
            <p className="mt-4 text-xs text-gray-500">Withdrawn: {formatCurrency(wallet?.withdrawn_total)}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="card overflow-hidden">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              {['overview', 'pending', 'transactions', 'cashouts'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-6 py-3 text-sm font-medium capitalize ${
                    activeTab === tab
                      ? 'border-b-2 border-primary text-primary'
                      : 'text-gray-600 hover:text-dark'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
                  {transactions.slice(0, 5).length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No transactions yet</p>
                  ) : (
                    <div className="space-y-3">
                      {transactions.slice(0, 5).map((tx) => (
                        <div key={tx.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                          <div className="flex-1">
                            <p className="font-medium text-dark">{tx.description || tx.transaction_type}</p>
                            <p className="text-sm text-gray-500">{formatDate(tx.created_at)}</p>
                          </div>
                          <div className="text-right">
                            <p className={`font-semibold ${tx.transaction_type === 'withdrawal' ? 'text-red-600' : 'text-primary-dark'}`}>
                              {tx.transaction_type === 'withdrawal' ? '-' : '+'}{formatCurrency(tx.amount)}
                            </p>
                            <StatusBadge status={tx.status} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Pending Clearance Tab */}
            {activeTab === 'pending' && (
              <div>
                <h3 className="text-lg font-semibold mb-4">Funds Pending Clearance</h3>
                <p className="text-sm text-gray-600 mb-6">
                  These funds are held for 30 days after work completion for quality assurance.
                </p>
                {pendingClearance.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No pending funds</p>
                ) : (
                  <div className="space-y-4">
                    {pendingClearance.map((tx) => (
                      <div key={tx.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="font-medium text-gray-900">{tx.description}</p>
                            <p className="text-sm text-gray-500">Completed: {formatDate(tx.completed_at)}</p>
                          </div>
                          <p className="text-lg font-bold text-orange-600">{formatCurrency(tx.amount)}</p>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Available on:</span>
                            <span className="font-medium">{formatDate(tx.available_at)}</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-orange-600 h-2 rounded-full transition-all"
                              style={{ width: `${tx.progress_percentage}%` }}
                            ></div>
                          </div>
                          <div className="flex justify-between text-xs text-gray-500">
                            <span>{tx.days_elapsed} of {tx.clearance_days} days</span>
                            <span>{tx.days_remaining} days remaining</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Transactions Tab */}
            {activeTab === 'transactions' && (
              <div>
                <h3 className="text-lg font-semibold mb-4">Transaction History</h3>
                {transactions.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No transactions yet</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {transactions.map((tx) => (
                          <tr key={tx.id}>
                            <td className="px-4 py-4 text-sm text-gray-900">{formatDate(tx.created_at)}</td>
                            <td className="px-4 py-4 text-sm text-gray-900">{tx.description || tx.transaction_type}</td>
                            <td className="px-4 py-4 text-sm text-gray-600 capitalize">{tx.transaction_type}</td>
                            <td className={`px-4 py-4 text-sm text-right font-medium ${tx.transaction_type === 'withdrawal' ? 'text-red-600' : 'text-primary-dark'}`}>
                              {tx.transaction_type === 'withdrawal' ? '-' : '+'}{formatCurrency(tx.amount)}
                            </td>
                            <td className="px-4 py-4 text-center">
                              <StatusBadge status={tx.status} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Cashouts Tab */}
            {activeTab === 'cashouts' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-dark">Cashout Requests</h3>
                  <Link
                    to="/wallet/cashout"
                    className="btn btn-primary"
                  >
                    New Cashout
                  </Link>
                </div>
                {cashouts.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No cashout requests yet</p>
                ) : (
                  <div className="space-y-4">
                    {cashouts.map((cashout) => (
                      <div key={cashout.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <p className="font-medium text-gray-900">Reference: {cashout.request_reference}</p>
                              <StatusBadge status={cashout.status} />
                            </div>
                            <p className="text-sm text-gray-600 mb-1">
                              Payment Method: {cashout.payment_method}
                            </p>
                            <p className="text-sm text-gray-600">
                              Requested: {formatDate(cashout.requested_at)}
                            </p>
                            {cashout.processed_at && (
                              <p className="text-sm text-gray-600">
                                Processed: {formatDate(cashout.processed_at)}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-primary-dark">{formatCurrency(cashout.amount)}</p>
                            {cashout.cashout_fee > 0 && (
                              <p className="text-sm text-gray-500">Fee: {formatCurrency(cashout.cashout_fee)}</p>
                            )}
                            <p className="text-sm font-medium text-gray-900">Net: {formatCurrency(cashout.net_amount)}</p>
                          </div>
                        </div>
                        {cashout.status === 'pending' && (
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <Link
                              to={`/wallet/cashouts/${cashout.id}`}
                              className="text-primary-dark hover:text-primary text-sm font-medium"
                            >
                              View Details →
                            </Link>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
