import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import { notificationsAPI } from '../services/api';
import toast from 'react-hot-toast';

const NotificationContext = createContext(null);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  // Play notification sound
  const playNotificationSound = useCallback(() => {
    try {
      // Create audio context
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();

      // Create oscillator (sound generator)
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      // Connect nodes
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Configure the sound (pleasant notification tone)
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime); // First tone
      oscillator.type = 'sine';

      // Volume envelope (fade in and out)
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.1);
      gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.3);

      // Play the sound
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);

      // Second tone for a pleasant "ding-dong" effect
      setTimeout(() => {
        const oscillator2 = audioContext.createOscillator();
        const gainNode2 = audioContext.createGain();

        oscillator2.connect(gainNode2);
        gainNode2.connect(audioContext.destination);

        oscillator2.frequency.setValueAtTime(600, audioContext.currentTime);
        oscillator2.type = 'sine';

        gainNode2.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode2.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.1);
        gainNode2.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.3);

        oscillator2.start(audioContext.currentTime);
        oscillator2.stop(audioContext.currentTime + 0.3);
      }, 150);
    } catch (error) {
      console.error('Error playing notification sound:', error);
    }
  }, []);

  // Fetch notifications from API
  const fetchNotifications = useCallback(async () => {
    try {
      const response = await notificationsAPI.getNotifications({ per_page: 50 });
      setNotifications(response.data.notifications || []);
      setUnreadCount(response.data.unread_count || 0);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  }, []);

  // Initialize Socket.IO connection
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    if (token && user.id) {
      // Connect to Socket.IO server with authentication
      const socketInstance = io('http://localhost:5000', {
        auth: {
          token: token
        },
        transports: ['websocket', 'polling']
      });

      socketInstance.on('connect', () => {
        console.log('Connected to notification service');
        setIsConnected(true);

        // Join user-specific notification room
        socketInstance.emit('join_notification_room', { user_id: user.id });
      });

      socketInstance.on('disconnect', () => {
        console.log('Disconnected from notification service');
        setIsConnected(false);
      });

      socketInstance.on('connection_success', (data) => {
        console.log('Notification service ready:', data);
      });

      socketInstance.on('connection_error', (error) => {
        console.error('Notification connection error:', error);
      });

      // Listen for new notifications
      socketInstance.on('new_notification', (notification) => {
        console.log('New notification received:', notification);

        // Add to notifications list
        setNotifications(prev => [notification, ...prev]);
        setUnreadCount(prev => prev + 1);

        // Play notification sound
        playNotificationSound();

        // Show toast notification
        toast(notification.title, {
          description: notification.message,
          duration: 5000,
          icon: getNotificationIcon(notification.type),
          style: {
            background: '#fff',
            color: '#333',
          },
        });
      });

      // Listen for notification marked as read
      socketInstance.on('notification_marked_read', ({ notification_id }) => {
        setNotifications(prev =>
          prev.map(notif =>
            notif.id === notification_id ? { ...notif, is_read: true } : notif
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      });

      setSocket(socketInstance);

      // Fetch initial notifications
      fetchNotifications();

      // Cleanup on unmount
      return () => {
        socketInstance.disconnect();
      };
    }
  }, [fetchNotifications, playNotificationSound]);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId) => {
    try {
      await notificationsAPI.markAsRead(notificationId);

      // Update local state
      setNotifications(prev =>
        prev.map(notif =>
          notif.id === notificationId ? { ...notif, is_read: true } : notif
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));

      // Emit socket event
      if (socket) {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        socket.emit('mark_notification_read', {
          notification_id: notificationId,
          user_id: user.id
        });
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, [socket]);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      await notificationsAPI.markAllAsRead();

      // Update local state
      setNotifications(prev =>
        prev.map(notif => ({ ...notif, is_read: true }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }, []);

  // Get notification icon based on type
  const getNotificationIcon = (type) => {
    const icons = {
      booking: '📅',
      message: '💬',
      review: '⭐',
      campaign: '📢',
      payment: '💰',
      collaboration: '🤝',
    };
    return icons[type] || '🔔';
  };

  const value = {
    notifications,
    unreadCount,
    isConnected,
    markAsRead,
    markAllAsRead,
    fetchNotifications,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
