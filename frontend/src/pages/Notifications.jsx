import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { BellIcon, CheckIcon } from '@heroicons/react/24/outline';
import { useNotifications } from '../contexts/NotificationContext';
import api from '../services/api';
import toast from 'react-hot-toast';

const Notifications = () => {
  const { markAsRead, markAllAsRead } = useNotifications();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState('all'); // 'all' or 'unread'
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchNotifications();
  }, [filter, page]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const unreadOnly = filter === 'unread';

      const response = await api.get('/notifications', {
        params: {
          page,
          per_page: 20,
          unread_only: unreadOnly
        }
      });

      setNotifications(response.data.notifications);
      setUnreadCount(response.data.unread_count);
      setTotalPages(response.data.pages);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      await markAsRead(notificationId);
      // Update local state
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
      // Update local state
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast.error('Failed to mark all as read');
    }
  };

  const getNotificationIcon = (type) => {
    const icons = {
      booking: '📅',
      message: '💬',
      review: '⭐',
      campaign: '📢',
      payment: '💰',
      collaboration: '🤝',
      milestone: '🎯',
      deliverable: '📦',
      approval: '✅',
      rejection: '❌',
    };
    return icons[type] || '🔔';
  };

  const getTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  if (loading && page === 1) {
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
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-dark mb-2">Notifications</h1>
          <p className="text-gray-600">
            {unreadCount > 0
              ? `You have ${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}`
              : 'You\'re all caught up!'
            }
          </p>
        </div>

        {/* Filter Tabs & Actions */}
        <div className="bg-white rounded-3xl shadow-sm p-6 mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            {/* Filter Tabs */}
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setFilter('all');
                  setPage(1);
                }}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  filter === 'all'
                    ? 'bg-primary text-dark'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                All
              </button>
              <button
                onClick={() => {
                  setFilter('unread');
                  setPage(1);
                }}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  filter === 'unread'
                    ? 'bg-primary text-dark'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Unread {unreadCount > 0 && `(${unreadCount})`}
              </button>
            </div>

            {/* Mark All as Read */}
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary hover:text-primary-dark transition-colors"
              >
                <CheckIcon className="w-4 h-4" />
                Mark all as read
              </button>
            )}
          </div>
        </div>

        {/* Notifications List */}
        {notifications.length === 0 ? (
          <div className="bg-white rounded-3xl shadow-sm p-12 text-center">
            <BellIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-700 mb-2">
              {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
            </h3>
            <p className="text-gray-500">
              {filter === 'unread'
                ? 'All caught up! Check back later for updates.'
                : 'When you receive notifications, they\'ll appear here.'
              }
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => (
              <Link
                key={notification.id}
                to={notification.action_url || '#'}
                onClick={() => {
                  if (!notification.is_read) {
                    handleMarkAsRead(notification.id);
                  }
                }}
                className={`block bg-white rounded-3xl shadow-sm hover:shadow-md transition-shadow p-6 ${
                  !notification.is_read ? 'border-2 border-primary/30' : 'border-2 border-transparent'
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className="flex-shrink-0 w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-2xl">
                    {getNotificationIcon(notification.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className={`text-base font-semibold text-dark ${
                        !notification.is_read ? 'font-bold' : ''
                      }`}>
                        {notification.title}
                      </h3>
                      {!notification.is_read && (
                        <span className="flex-shrink-0 w-2.5 h-2.5 bg-primary rounded-full mt-2"></span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      {notification.message}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      <span>{getTimeAgo(notification.created_at)}</span>
                      {notification.type && (
                        <>
                          <span>•</span>
                          <span className="capitalize">{notification.type.replace('_', ' ')}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Mark as Read Button (for unread notifications) */}
                  {!notification.is_read && (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleMarkAsRead(notification.id);
                      }}
                      className="flex-shrink-0 p-2 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-full transition-colors"
                      title="Mark as read"
                    >
                      <CheckIcon className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 rounded-full bg-white border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>

            <div className="flex items-center gap-1">
              {[...Array(totalPages)].map((_, i) => {
                const pageNum = i + 1;
                // Show first page, last page, current page, and pages around current
                if (
                  pageNum === 1 ||
                  pageNum === totalPages ||
                  (pageNum >= page - 1 && pageNum <= page + 1)
                ) {
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`w-10 h-10 rounded-full text-sm font-medium transition-colors ${
                        page === pageNum
                          ? 'bg-primary text-dark'
                          : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                } else if (pageNum === page - 2 || pageNum === page + 2) {
                  return <span key={pageNum} className="text-gray-400">...</span>;
                }
                return null;
              })}
            </div>

            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 rounded-full bg-white border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;
