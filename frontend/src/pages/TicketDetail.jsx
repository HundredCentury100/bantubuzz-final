import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import api from '../services/api';
import { ArrowLeftIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline';

const TicketDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [replyMessage, setReplyMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    loadTicket();
  }, [id]);

  const loadTicket = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/support/tickets/${id}`);

      if (response.data.success) {
        setTicket(response.data.ticket);
      } else {
        toast.error('Ticket not found');
        navigate('/my-tickets');
      }
    } catch (error) {
      console.error('Error loading ticket:', error);
      toast.error(error.response?.data?.error || 'Failed to load ticket');
      navigate('/my-tickets');
    } finally {
      setLoading(false);
    }
  };

  const handleSendReply = async (e) => {
    e.preventDefault();

    if (!replyMessage.trim()) {
      toast.error('Please enter a message');
      return;
    }

    setSending(true);
    try {
      const response = await api.post(`/support/tickets/${id}/messages`, {
        message: replyMessage.trim()
      });

      if (response.data.success) {
        toast.success('Reply sent successfully');
        setReplyMessage('');
        loadTicket(); // Reload ticket to show new message
      } else {
        toast.error(response.data.error || 'Failed to send reply');
      }
    } catch (error) {
      console.error('Error sending reply:', error);
      toast.error(error.response?.data?.error || 'Failed to send reply');
    } finally {
      setSending(false);
    }
  };

  const handleCloseTicket = async () => {
    if (!window.confirm('Are you sure you want to close this ticket? You can reopen it later if needed.')) {
      return;
    }

    setClosing(true);
    try {
      const response = await api.put(`/support/tickets/${id}/close`);

      if (response.data.success) {
        toast.success('Ticket closed successfully');
        loadTicket();
      } else {
        toast.error(response.data.error || 'Failed to close ticket');
      }
    } catch (error) {
      console.error('Error closing ticket:', error);
      toast.error(error.response?.data?.error || 'Failed to close ticket');
    } finally {
      setClosing(false);
    }
  };

  const handleReopenTicket = async () => {
    try {
      const response = await api.put(`/support/tickets/${id}/reopen`);

      if (response.data.success) {
        toast.success('Ticket reopened successfully');
        loadTicket();
      } else {
        toast.error(response.data.error || 'Failed to reopen ticket');
      }
    } catch (error) {
      console.error('Error reopening ticket:', error);
      toast.error(error.response?.data?.error || 'Failed to reopen ticket');
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      open: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Open' },
      under_review: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Under Review' },
      awaiting_user: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Awaiting Your Response' },
      investigating: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Investigating' },
      resolved: { bg: 'bg-green-100', text: 'text-green-800', label: 'Resolved' },
      closed: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Closed' }
    };
    const badge = badges[status] || badges.open;
    return (
      <span className={`px-3 py-1 ${badge.bg} ${badge.text} text-sm font-medium rounded-full`}>
        {badge.label}
      </span>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-light">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!ticket) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-light">
      <Navbar />

      <div className="flex-1 py-8 px-6 lg:px-12 xl:px-20">
        <div className="w-full max-w-4xl mx-auto">
          {/* Back Button */}
          <Link
            to="/my-tickets"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-dark mb-6 transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5" />
            <span>Back to My Tickets</span>
          </Link>

          {/* Ticket Header */}
          <div className="bg-white rounded-3xl shadow-sm p-6 md:p-8 mb-6">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-4">
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-3 mb-3">
                  <span className="text-sm font-mono text-gray-500">{ticket.ticket_number}</span>
                  {getStatusBadge(ticket.status)}
                  <span className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full">
                    {ticket.category}
                  </span>
                </div>
                <h1 className="text-2xl md:text-3xl font-bold text-dark mb-2">{ticket.subject}</h1>
                <p className="text-sm text-gray-500">
                  Created {formatDate(ticket.created_at)}
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                {ticket.status === 'closed' ? (
                  <button
                    onClick={handleReopenTicket}
                    className="px-4 py-2 bg-primary text-dark rounded-full font-medium hover:bg-primary/90 transition-colors text-sm"
                  >
                    Reopen Ticket
                  </button>
                ) : (
                  <button
                    onClick={handleCloseTicket}
                    disabled={closing}
                    className="px-4 py-2 bg-gray-100 text-dark rounded-full font-medium hover:bg-gray-200 transition-colors text-sm disabled:opacity-50"
                  >
                    {closing ? 'Closing...' : 'Close Ticket'}
                  </button>
                )}
              </div>
            </div>

            {/* Original Description */}
            <div className="bg-light rounded-2xl p-4">
              <p className="text-gray-700 whitespace-pre-wrap">{ticket.description}</p>
            </div>
          </div>

          {/* Messages/Conversation Thread */}
          <div className="space-y-4 mb-6">
            {ticket.messages && ticket.messages.length > 0 ? (
              ticket.messages.map((message) => (
                <div
                  key={message.id}
                  className={`bg-white rounded-3xl shadow-sm p-6 ${
                    message.is_admin ? 'border-l-4 border-primary' : ''
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                      message.is_admin ? 'bg-primary text-dark' : 'bg-gray-200 text-gray-600'
                    }`}>
                      {message.is_admin ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-bold text-dark">
                          {message.is_admin ? 'BantuBuzz Support' : 'You'}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatDate(message.created_at)}
                        </span>
                      </div>
                      <p className="text-gray-700 whitespace-pre-wrap">{message.message}</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-white rounded-3xl shadow-sm p-8 text-center">
                <p className="text-gray-500">
                  No messages yet. Our support team will respond soon.
                </p>
              </div>
            )}
          </div>

          {/* Reply Form */}
          {ticket.status !== 'closed' && (
            <div className="bg-white rounded-3xl shadow-sm p-6">
              <h3 className="text-lg font-bold text-dark mb-4">Send a Reply</h3>
              <form onSubmit={handleSendReply}>
                <textarea
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  placeholder="Type your message here..."
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent resize-none mb-4"
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={sending || !replyMessage.trim()}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-dark rounded-full font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {sending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-dark"></div>
                        <span>Sending...</span>
                      </>
                    ) : (
                      <>
                        <PaperAirplaneIcon className="w-5 h-5" />
                        <span>Send Reply</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {ticket.status === 'closed' && (
            <div className="bg-gray-50 border border-gray-200 rounded-3xl p-6 text-center">
              <p className="text-gray-600 mb-4">
                This ticket is closed. You can reopen it if you need further assistance.
              </p>
              <button
                onClick={handleReopenTicket}
                className="px-6 py-3 bg-primary text-dark rounded-full font-medium hover:bg-primary/90 transition-colors"
              >
                Reopen Ticket
              </button>
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default TicketDetail;
