import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';

const MESSAGING_SOCKET_URL = import.meta.env.VITE_MESSAGING_SOCKET_URL || 'http://localhost:3001';

const MessagingContext = createContext(null);

export const useMessaging = () => {
  const context = useContext(MessagingContext);
  if (!context) {
    throw new Error('useMessaging must be used within a MessagingProvider');
  }
  return context;
};

export const MessagingProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState({});
 // conversationId -> messages array
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [typingUsers, setTypingUsers] = useState(new Map()); // userId -> isTyping
  const [notifications, setNotifications] = useState([]);
  const socketRef = useRef(null);

  // Initialize Socket.IO connection
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    console.log('MessagingContext: Initializing socket connection...');
    console.log('Token exists:', !!token);
    console.log('User ID:', user.id);

    if (token && user.id) {
      const socketInstance = io(MESSAGING_SOCKET_URL, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 10, // Increased from 5 to 10
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
        forceNew: false,
        multiplex: true,
        auth: {
          token: token
        }
      });

      socketRef.current = socketInstance;
      setSocket(socketInstance);

      // Connection events
      socketInstance.on('connect', () => {
        console.log('✅ Connected to messaging service - Socket ID:', socketInstance.id);

        // Get fresh token in case it was refreshed
        const currentToken = localStorage.getItem('access_token');
        if (currentToken) {
          console.log('Sending authentication with token...');
          socketInstance.emit('authenticate', currentToken);
        } else {
          console.error('No token available for authentication');
          setIsConnected(false);
        }
      });

      socketInstance.on('disconnect', () => {
        console.log('❌ Disconnected from messaging service');
        setIsConnected(false);
      });

      socketInstance.on('connect_error', (error) => {
        console.error('❌ Connection error:', error.message);
        setIsConnected(false);
      });

      socketInstance.on('reconnect', (attemptNumber) => {
        console.log(`✅ Reconnected to messaging service after ${attemptNumber} attempts`);
        // Re-authenticate on reconnect
        const currentToken = localStorage.getItem('access_token');
        if (currentToken) {
          socketInstance.emit('authenticate', currentToken);
        }
      });

      socketInstance.on('reconnect_attempt', (attemptNumber) => {
        console.log(`🔄 Attempting to reconnect... (attempt ${attemptNumber})`);
      });

      socketInstance.on('reconnect_failed', () => {
        console.error('❌ Failed to reconnect after maximum attempts');
        toast.error('Unable to connect to messaging service. Please refresh the page.');
      });

      socketInstance.on('authenticated', (data) => {
        if (data.success) {
          console.log('✅ Successfully authenticated with messaging service');
          setIsConnected(true);
        } else {
          console.error('❌ Authentication failed:', data.error);
          setIsConnected(false);

          // If token expired, try to refresh
          if (data.error && data.error.includes('expired')) {
            console.log('Token expired, attempting to refresh...');
            // The axios interceptor in messagingAPI.js should handle refresh
            // For now, show error to user
            toast.error('Session expired. Please refresh the page.');
          } else {
            toast.error('Failed to connect to messaging service');
          }

          // Disconnect the socket if auth failed
          socketInstance.disconnect();
        }
      });

      // Receive new messages
      socketInstance.on('new_message', (message) => {
        console.log('New message received:', message);

        // Add message to conversation
        const conversationId = message.sender_id;
        setMessages(prev => ({
          ...prev,
          [conversationId]: [...(prev[conversationId] || []), message]
        }));

        // Play notification sound
        playNotificationSound();

        // Show toast notification
        toast(`New message from ${message.sender.email}`, {
          duration: 3000,
        });
      });

      // Message sent confirmation
      socketInstance.on('message_sent', (message) => {
        console.log('Message sent:', message);

        // Add message to conversation
        const conversationId = message.receiver_id;
        setMessages(prev => ({
          ...prev,
          [conversationId]: [...(prev[conversationId] || []), message]
        }));
      });

      // User status updates
      socketInstance.on('user_status', ({ userId, status }) => {
        setOnlineUsers(prev => {
          const newSet = new Set(prev);
          if (status === 'online') {
            newSet.add(userId.toString());
          } else {
            newSet.delete(userId.toString());
          }
          return newSet;
        });
      });

      // Typing indicators
      socketInstance.on('user_typing', ({ userId, isTyping }) => {
        setTypingUsers(prev => {
          const newMap = new Map(prev);
          if (isTyping) {
            newMap.set(userId.toString(), true);
          } else {
            newMap.delete(userId.toString());
          }
          return newMap;
        });

        // Auto-clear typing indicator after 3 seconds
        if (isTyping) {
          setTimeout(() => {
            setTypingUsers(prev => {
              const newMap = new Map(prev);
              newMap.delete(userId.toString());
              return newMap;
            });
          }, 3000);
        }
      });

      // Error handling
      socketInstance.on('error', (error) => {
        console.error('Socket error:', error);
        toast.error(error.message || 'Messaging error occurred');
      });

      // Real-time notifications
      socketInstance.on('new_notification', (notification) => {
        console.log('New notification received:', notification);

        // Add to notifications list
        setNotifications(prev => [notification, ...prev].slice(0, 50)); // Keep last 50

        // Play notification sound
        playNotificationSound();

        // Show toast notification
        toast(notification.message, {
          duration: 4000,
          icon: notification.type === 'success' ? '✅' : notification.type === 'error' ? '❌' : '📢',
        });
      });

      // Cleanup
      return () => {
        socketInstance.disconnect();
      };
    }
  }, []);

  // Play notification sound
  const playNotificationSound = useCallback(() => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.2, audioContext.currentTime + 0.1);
      gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.2);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);
    } catch (error) {
      console.error('Error playing sound:', error);
    }
  }, []);

  // Send a message
  const sendMessage = useCallback((receiverId, content, bookingId = null) => {
    if (!socketRef.current || !isConnected) {
      toast.error('Not connected to messaging service');
      return false;
    }

    socketRef.current.emit('send_message', {
      receiverId,
      content,
      bookingId
    });

    return true;
  }, [isConnected]);

  // Mark messages as read
  const markMessagesAsRead = useCallback((messageIds) => {
    if (!socketRef.current || !isConnected) {
      return;
    }

    socketRef.current.emit('mark_read', { messageIds });
  }, [isConnected]);

  // Send typing indicator
  const sendTypingIndicator = useCallback((receiverId, isTyping) => {
    if (!socketRef.current || !isConnected) {
      return;
    }

    socketRef.current.emit('typing', { receiverId, isTyping });
  }, [isConnected]);

  // Load messages for a conversation
  const loadConversationMessages = useCallback((userId, existingMessages = []) => {
    setMessages(prev => ({
      ...prev,
      [userId]: existingMessages
    }));
  }, []);

  const value = {
    socket,
    isConnected,
    messages,
    onlineUsers,
    typingUsers,
    notifications,
    sendMessage,
    markMessagesAsRead,
    sendTypingIndicator,
    loadConversationMessages,
  };

  return (
    <MessagingContext.Provider value={value}>
      {children}
    </MessagingContext.Provider>
  );
};
