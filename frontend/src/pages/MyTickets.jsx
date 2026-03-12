import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import api from '../services/api';
import { PlusCircleIcon, FunnelIcon } from '@heroicons/react/24/outline';

const MyTickets = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({
    status: '',
    category: ''
  });

  useEffect(() => {
    loadTickets();
  }, [page, filters]);

  const loadTickets = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        per_page: '10'
      });

      if (filters.status) params.append('status', filters.status);
      if (filters.category) params.append('category', filters.category);

      const response = await api.get(`/support/tickets?${params}`);

      if (response.data.success) {
        setTickets(response.data.tickets);
        setTotalPages(response.data.total_pages);
      }
    } catch (error) {
      console.error('Error loading tickets:', error);
      toast.error('Failed to load tickets');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      open: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Open' },
      under_review: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Under Review' },
      awaiting_user: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Awaiting Response' },
      investigating: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Investigating' },
      resolved: { bg: 'bg-green-100', text: 'text-green-800', label: 'Resolved' },
      closed: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Closed' }
    };
    const badge = badges[status] || badges.open;
    return (
      <span className={`px-3 py-1 ${badge.bg} ${badge.text} text-xs font-medium rounded-full`}>
        {badge.label}
      </span>
    );
  };

  const getCategoryLabel = (category) => {
    const labels = {
      technical: 'Technical',
      campaign: 'Campaign',
      payment: 'Payment',
      messaging: 'Messaging',
      account: 'Account',
      inquiry: 'General',
      other: 'Other'
    };
    return labels[category] || category;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000); // difference in seconds

    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)} days ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-light">
      <Navbar />

      <div className="flex-1 py-8 px-6 lg:px-12 xl:px-20">
        <div className="w-full max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div>
              <h1 className="text-4xl font-bold text-dark mb-2">My Support Tickets</h1>
              <p className="text-lg text-gray-600">
                Track and manage your support requests
              </p>
            </div>
            <Link
              to="/help-center/submit"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-dark rounded-full font-medium hover:bg-primary/90 transition-colors"
            >
              <PlusCircleIcon className="w-5 h-5" />
              <span>New Ticket</span>
            </Link>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-3xl shadow-sm p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <FunnelIcon className="w-5 h-5 text-gray-600" />
              <h3 className="font-bold text-dark">Filters</h3>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => {
                    setFilters({ ...filters, status: e.target.value });
                    setPage(1);
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="">All Statuses</option>
                  <option value="open">Open</option>
                  <option value="under_review">Under Review</option>
                  <option value="awaiting_user">Awaiting Response</option>
                  <option value="investigating">Investigating</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <select
                  value={filters.category}
                  onChange={(e) => {
                    setFilters({ ...filters, category: e.target.value });
                    setPage(1);
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="">All Categories</option>
                  <option value="technical">Technical</option>
                  <option value="campaign">Campaign</option>
                  <option value="payment">Payment</option>
                  <option value="messaging">Messaging</option>
                  <option value="account">Account</option>
                  <option value="inquiry">General Inquiry</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
          </div>

          {/* Tickets List */}
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : tickets.length === 0 ? (
            <div className="bg-white rounded-3xl shadow-sm p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-dark mb-2">No tickets found</h3>
              <p className="text-gray-600 mb-6">
                {filters.status || filters.category
                  ? 'Try adjusting your filters'
                  : 'You haven\'t submitted any support tickets yet'}
              </p>
              {!filters.status && !filters.category && (
                <Link
                  to="/help-center/submit"
                  className="inline-block px-6 py-3 bg-primary text-dark rounded-full font-medium hover:bg-primary/90 transition-colors"
                >
                  Submit Your First Ticket
                </Link>
              )}
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {tickets.map((ticket) => (
                  <Link
                    key={ticket.id}
                    to={`/tickets/${ticket.id}`}
                    className="block bg-white rounded-3xl shadow-sm hover:shadow-md transition-shadow p-6"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        {/* Ticket Number & Status */}
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-sm font-mono text-gray-500">{ticket.ticket_number}</span>
                          {getStatusBadge(ticket.status)}
                          <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                            {getCategoryLabel(ticket.category)}
                          </span>
                        </div>

                        {/* Subject */}
                        <h3 className="text-lg font-bold text-dark mb-2">{ticket.subject}</h3>

                        {/* Description Preview */}
                        <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                          {ticket.description}
                        </p>

                        {/* Meta Info */}
                        <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
                          <span>Created {formatDate(ticket.created_at)}</span>
                          {ticket.response_count > 0 && (
                            <span className="flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                              </svg>
                              {ticket.response_count} {ticket.response_count === 1 ? 'reply' : 'replies'}
                            </span>
                          )}
                          {ticket.last_response_at && (
                            <span>Last updated {formatDate(ticket.last_response_at)}</span>
                          )}
                        </div>
                      </div>

                      {/* Arrow Icon */}
                      <div className="flex-shrink-0 self-center">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-8">
                  <button
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                    className="px-4 py-2 bg-white text-dark rounded-full hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Previous
                  </button>
                  <span className="px-4 py-2 text-gray-600">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(page + 1)}
                    disabled={page === totalPages}
                    className="px-4 py-2 bg-white text-dark rounded-full hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default MyTickets;
