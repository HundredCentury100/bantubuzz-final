import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import AdminLayout from '../components/admin/AdminLayout';
import api from '../services/api';
import toast from 'react-hot-toast';
import { ArrowLeftIcon, UserIcon, ClockIcon, TagIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

const AdminSupportTicketDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState(false);
  const [responseMessage, setResponseMessage] = useState('');
  const [newStatus, setNewStatus] = useState('');

  useEffect(() => {
    fetchTicketDetails();
  }, [id]);

  const fetchTicketDetails = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/admin/support/tickets/${id}`);
      if (response.data.success) {
        setTicket(response.data.ticket);
        setMessages(response.data.messages || []);
        setNewStatus(response.data.ticket.status);
      }
    } catch (error) {
      console.error('Error fetching ticket:', error);
      toast.error('Failed to load ticket details');
    } finally {
      setLoading(false);
    }
  };

  const handleRespond = async (e) => {
    e.preventDefault();
    if (!responseMessage.trim()) {
      toast.error('Please enter a response message');
      return;
    }

    try {
      setResponding(true);
      const response = await api.post(`/admin/support/tickets/${id}/respond`, {
        message: responseMessage
      });

      if (response.data.success) {
        toast.success('Response sent successfully');
        setResponseMessage('');
        fetchTicketDetails(); // Refresh to get new message
      }
    } catch (error) {
      console.error('Error sending response:', error);
      toast.error(error.response?.data?.error || 'Failed to send response');
    } finally {
      setResponding(false);
    }
  };

  const handleStatusUpdate = async () => {
    if (newStatus === ticket.status) {
      toast.error('Please select a different status');
      return;
    }

    try {
      const response = await api.put(`/admin/support/tickets/${id}/status`, {
        status: newStatus
      });

      if (response.data.success) {
        toast.success('Status updated successfully');
        fetchTicketDetails();
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error(error.response?.data?.error || 'Failed to update status');
    }
  };

  const handleResolve = async () => {
    try {
      const response = await api.put(`/admin/support/tickets/${id}/resolve`);
      if (response.data.success) {
        toast.success('Ticket marked as resolved');
        fetchTicketDetails();
      }
    } catch (error) {
      console.error('Error resolving ticket:', error);
      toast.error(error.response?.data?.error || 'Failed to resolve ticket');
    }
  };

  const handleClose = async () => {
    try {
      const response = await api.put(`/admin/support/tickets/${id}/close`);
      if (response.data.success) {
        toast.success('Ticket closed successfully');
        fetchTicketDetails();
      }
    } catch (error) {
      console.error('Error closing ticket:', error);
      toast.error(error.response?.data?.error || 'Failed to close ticket');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'open': 'bg-blue-100 text-blue-800',
      'under_review': 'bg-yellow-100 text-yellow-800',
      'awaiting_user': 'bg-purple-100 text-purple-800',
      'investigating': 'bg-orange-100 text-orange-800',
      'resolved': 'bg-green-100 text-green-800',
      'closed': 'bg-gray-100 text-gray-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityColor = (priority) => {
    const colors = {
      'low': 'bg-blue-100 text-blue-800',
      'normal': 'bg-gray-100 text-gray-800',
      'high': 'bg-orange-100 text-orange-800',
      'emergency': 'bg-red-100 text-red-800'
    };
    return colors[priority] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </AdminLayout>
    );
  }

  if (!ticket) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <ExclamationTriangleIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">Ticket not found</h3>
          <Link to="/admin/support" className="text-primary hover:text-primary-dark mt-4 inline-block">
            Back to Support
          </Link>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Back Button */}
        <Link
          to="/admin/support"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-dark transition-colors"
        >
          <ArrowLeftIcon className="w-5 h-5" />
          <span>Back to Support Tickets</span>
        </Link>

        {/* Header */}
        <div className="bg-white rounded-3xl shadow-sm p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-dark mb-2">{ticket.subject}</h1>
              <p className="text-sm text-gray-600">Ticket #{ticket.ticket_number}</p>
            </div>
            <div className="flex gap-2">
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(ticket.status)}`}>
                {ticket.status.replace('_', ' ').toUpperCase()}
              </span>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getPriorityColor(ticket.priority)}`}>
                {ticket.priority.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Ticket Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-200">
            <div>
              <p className="text-sm text-gray-600 mb-1">User</p>
              <div className="flex items-center gap-2">
                <UserIcon className="h-4 w-4 text-gray-400" />
                <span className="text-sm font-medium">{ticket.user?.email}</span>
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Category</p>
              <div className="flex items-center gap-2">
                <TagIcon className="h-4 w-4 text-gray-400" />
                <span className="text-sm font-medium">{ticket.category}</span>
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Created</p>
              <div className="flex items-center gap-2">
                <ClockIcon className="h-4 w-4 text-gray-400" />
                <span className="text-sm font-medium">
                  {new Date(ticket.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Messages Thread */}
          <div className="lg:col-span-2 space-y-6">
            {/* Original Description */}
            <div className="bg-white rounded-3xl shadow-sm p-6">
              <h3 className="text-lg font-bold text-dark mb-4">Description</h3>
              <p className="text-gray-700 whitespace-pre-wrap">{ticket.description}</p>
            </div>

            {/* Messages */}
            {messages.length > 0 && (
              <div className="bg-white rounded-3xl shadow-sm p-6">
                <h3 className="text-lg font-bold text-dark mb-4">Conversation</h3>
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`p-4 rounded-2xl ${
                        message.is_admin ? 'bg-primary/10' : 'bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-dark">
                          {message.is_admin ? 'Admin' : 'User'}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(message.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-gray-700 whitespace-pre-wrap">{message.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Response Form */}
            {ticket.status !== 'closed' && (
              <div className="bg-white rounded-3xl shadow-sm p-6">
                <h3 className="text-lg font-bold text-dark mb-4">Send Response</h3>
                <form onSubmit={handleRespond}>
                  <textarea
                    value={responseMessage}
                    onChange={(e) => setResponseMessage(e.target.value)}
                    placeholder="Type your response to the user..."
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                  />
                  <div className="mt-4 flex justify-end">
                    <button
                      type="submit"
                      disabled={responding || !responseMessage.trim()}
                      className="px-6 py-3 bg-primary text-dark rounded-full font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {responding ? 'Sending...' : 'Send Response'}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>

          {/* Actions Sidebar */}
          <div className="space-y-6">
            {/* Status Update */}
            <div className="bg-white rounded-3xl shadow-sm p-6">
              <h3 className="text-lg font-bold text-dark mb-4">Update Status</h3>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-2xl mb-4"
              >
                <option value="open">Open</option>
                <option value="under_review">Under Review</option>
                <option value="awaiting_user">Awaiting User</option>
                <option value="investigating">Investigating</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
              <button
                onClick={handleStatusUpdate}
                disabled={newStatus === ticket.status}
                className="w-full px-6 py-3 bg-primary text-dark rounded-full font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Update Status
              </button>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-3xl shadow-sm p-6">
              <h3 className="text-lg font-bold text-dark mb-4">Quick Actions</h3>
              <div className="space-y-3">
                {ticket.status !== 'resolved' && ticket.status !== 'closed' && (
                  <button
                    onClick={handleResolve}
                    className="w-full px-6 py-3 bg-green-600 text-white rounded-full font-medium hover:bg-green-700 transition-colors"
                  >
                    Mark as Resolved
                  </button>
                )}
                {ticket.status !== 'closed' && (
                  <button
                    onClick={handleClose}
                    className="w-full px-6 py-3 bg-gray-600 text-white rounded-full font-medium hover:bg-gray-700 transition-colors"
                  >
                    Close Ticket
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminSupportTicketDetail;
