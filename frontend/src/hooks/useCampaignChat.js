import { useEffect, useRef, useState } from 'react';
import { useMessaging } from '../contexts/MessagingContext';

/**
 * Campaign chat uses the same authenticated Socket.IO connection as direct
 * messaging. This avoids a second socket with different token/origin handling.
 */
export const useCampaignChat = (chatId) => {
  const { socket, isConnected } = useMessaging();
  const [messages, setMessages] = useState([]);
  const [typing, setTyping] = useState(new Set());
  const typingTimeoutRef = useRef(null);
  const connected = Boolean(socket && isConnected);

  useEffect(() => {
    if (!connected || !socket || !chatId) return undefined;

    socket.emit('join_campaign_chat', { chatId });

    const handleNewMessage = (message) => {
      if (Number(message.chat_id) === Number(chatId)) {
        setMessages((prev) => [...prev, message]);
      }
    };

    const handleUserTyping = ({ chatId: incomingChatId, userId, isTyping }) => {
      if (Number(incomingChatId) !== Number(chatId)) return;

      setTyping((prev) => {
        const next = new Set(prev);
        if (isTyping) {
          next.add(userId);
        } else {
          next.delete(userId);
        }
        return next;
      });
    };

    socket.on('campaign_message', handleNewMessage);
    socket.on('campaign_chat_user_typing', handleUserTyping);

    return () => {
      socket.off('campaign_message', handleNewMessage);
      socket.off('campaign_chat_user_typing', handleUserTyping);
      socket.emit('leave_campaign_chat', { chatId });
    };
  }, [connected, socket, chatId]);

  const sendMessage = (content, messageType = 'text', attachments = []) => {
    if (!connected || !socket || !chatId) {
      throw new Error('Not connected to chat service');
    }

    return new Promise((resolve, reject) => {
      let settled = false;

      const handleConfirmation = (message) => {
        if (Number(message.chat_id) !== Number(chatId)) return;
        settled = true;
        socket.off('campaign_message_sent', handleConfirmation);
        resolve(message);
      };

      socket.on('campaign_message_sent', handleConfirmation);
      socket.emit('send_campaign_message', {
        chatId,
        content,
        messageType,
        attachments,
      });

      setTimeout(() => {
        if (settled) return;
        socket.off('campaign_message_sent', handleConfirmation);
        reject(new Error('Message send timeout'));
      }, 10000);
    });
  };

  const markAsRead = () => {
    if (!connected || !socket || !chatId) return;
    socket.emit('mark_campaign_chat_read', { chatId });
  };

  const sendTypingIndicator = (isTyping) => {
    if (!connected || !socket || !chatId) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    socket.emit('campaign_chat_typing', { chatId, isTyping });

    if (isTyping) {
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('campaign_chat_typing', { chatId, isTyping: false });
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
    sendTypingIndicator,
  };
};
