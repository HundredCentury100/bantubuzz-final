import { useEffect, useRef, useState } from 'react';
import { useAuth } from './useAuth';
import io from 'socket.io-client';

const MESSAGING_SERVICE_URL = import.meta.env.VITE_MESSAGING_SERVICE_URL || 'http://localhost:3002';

/**
 * Custom hook for managing campaign chat WebSocket connection
 */
export const useCampaignChat = (chatId) => {
  const { token } = useAuth();
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [typing, setTyping] = useState(new Set());
  const socketRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Initialize WebSocket connection
  useEffect(() => {
    if (!token) return;

    // Create socket connection
    const socket = io(MESSAGING_SERVICE_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    socketRef.current = socket;

    // Authenticate
    socket.on('connect', () => {
      console.log('🔌 Connected to messaging service');
      socket.emit('authenticate', token);
    });

    socket.on('authenticated', (data) => {
      if (data.success) {
        console.log('✅ Authenticated with messaging service');
        setConnected(true);

        // Join campaign chat room if chatId is provided
        if (chatId) {
          socket.emit('join_campaign_chat', { chatId });
        }
      } else {
        console.error('❌ Authentication failed:', data.error);
        setConnected(false);
      }
    });

    socket.on('joined_campaign_chat', (data) => {
      console.log(`✅ Joined campaign chat ${data.chatId}`);
    });

    socket.on('disconnect', () => {
      console.log('🔌 Disconnected from messaging service');
      setConnected(false);
    });

    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });

    // Cleanup on unmount
    return () => {
      if (chatId) {
        socket.emit('leave_campaign_chat', { chatId });
      }
      socket.disconnect();
    };
  }, [token]);

  // Handle chatId changes
  useEffect(() => {
    if (!connected || !socketRef.current || !chatId) return;

    const socket = socketRef.current;

    // Join new chat
    socket.emit('join_campaign_chat', { chatId });

    // Listen for new messages in this chat
    const handleNewMessage = (message) => {
      if (message.chat_id === chatId) {
        setMessages((prev) => [...prev, message]);
      }
    };

    const handleMessageSent = (message) => {
      // Message sent confirmation - already optimistically added
      console.log('Message sent:', message.id);
    };

    const handleUserTyping = ({ userId, isTyping }) => {
      setTyping((prev) => {
        const newSet = new Set(prev);
        if (isTyping) {
          newSet.add(userId);
        } else {
          newSet.delete(userId);
        }
        return newSet;
      });
    };

    socket.on('campaign_message', handleNewMessage);
    socket.on('campaign_message_sent', handleMessageSent);
    socket.on('campaign_chat_user_typing', handleUserTyping);

    // Cleanup listeners when chatId changes
    return () => {
      socket.off('campaign_message', handleNewMessage);
      socket.off('campaign_message_sent', handleMessageSent);
      socket.off('campaign_chat_user_typing', handleUserTyping);
      socket.emit('leave_campaign_chat', { chatId });
    };
  }, [connected, chatId]);

  // Send message
  const sendMessage = (content, messageType = 'text', attachments = []) => {
    if (!connected || !socketRef.current || !chatId) {
      throw new Error('Not connected to chat service');
    }

    return new Promise((resolve, reject) => {
      socketRef.current.emit('send_campaign_message', {
        chatId,
        content,
        messageType,
        attachments
      });

      // Listen for confirmation
      const handleConfirmation = (message) => {
        if (message.chat_id === chatId) {
          resolve(message);
          socketRef.current.off('campaign_message_sent', handleConfirmation);
        }
      };

      socketRef.current.on('campaign_message_sent', handleConfirmation);

      // Timeout after 10 seconds
      setTimeout(() => {
        socketRef.current.off('campaign_message_sent', handleConfirmation);
        reject(new Error('Message send timeout'));
      }, 10000);
    });
  };

  // Mark chat as read
  const markAsRead = () => {
    if (!connected || !socketRef.current || !chatId) return;

    socketRef.current.emit('mark_campaign_chat_read', { chatId });
  };

  // Send typing indicator
  const sendTypingIndicator = (isTyping) => {
    if (!connected || !socketRef.current || !chatId) return;

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    socketRef.current.emit('campaign_chat_typing', { chatId, isTyping });

    // Auto-stop typing after 3 seconds
    if (isTyping) {
      typingTimeoutRef.current = setTimeout(() => {
        socketRef.current.emit('campaign_chat_typing', { chatId, isTyping: false });
      }, 3000);
    }
  };

  return {
    connected,
    messages,
    setMessages,
    typing: Array.from(typing),
    sendMessage,
    markAsRead,
    sendTypingIndicator
  };
};
