import { useState, useEffect, useRef } from 'react';
import { FaPaperPlane, FaUser, FaUsers, FaVolumeMute, FaVolumeUp, FaEdit, FaTrash, FaTimes, FaCircle } from 'react-icons/fa';
import campaignChatsAPI from '../services/campaignChatsAPI';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { useCampaignChat } from '../hooks/useCampaignChat';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

const MESSAGING_SERVICE_URL = import.meta.env.VITE_MESSAGING_SERVICE_URL || 'http://localhost:3002';

const CampaignChatWindow = ({ chat, onChatUpdate, onClose }) => {
  const { user } = useAuth();
  const currentUserId = user?.id;

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editText, setEditText] = useState('');
  const [participants, setParticipants] = useState([]);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  // Use WebSocket hook for real-time messaging
  const {
    connected,
    messages,
    setMessages,
    typing,
    sendMessage: sendWebSocketMessage,
    markAsRead,
    sendTypingIndicator
  } = useCampaignChat(chat?.id);

  useEffect(() => {
    if (chat?.id) {
      fetchChatDetails();
      fetchInitialMessages();
    }
  }, [chat?.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Mark as read when messages change or chat becomes active
    if (chat?.id && connected) {
      markAsRead();
      if (onChatUpdate) {
        onChatUpdate();
      }
    }
  }, [messages.length, chat?.id, connected]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchChatDetails = async () => {
    try {
      // Fetch participants from messaging service
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${MESSAGING_SERVICE_URL}/api/campaign-chats/${chat.id}/participants`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      setParticipants(response.data.participants || []);
    } catch (error) {
      console.error('Failed to fetch chat details:', error);
    }
  };

  const fetchInitialMessages = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${MESSAGING_SERVICE_URL}/api/campaign-chats/${chat.id}/messages`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      setMessages(response.data.messages || []);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();

    const text = messageText.trim();
    if (!text || sending || !connected) return;

    try {
      setSending(true);

      // Send via WebSocket
      await sendWebSocketMessage(text);

      setMessageText('');
      textareaRef.current?.focus();
      sendTypingIndicator(false);

      if (onChatUpdate) {
        onChatUpdate();
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleEditMessage = async (messageId) => {
    const text = editText.trim();
    if (!text) return;

    try {
      const response = await campaignChatsAPI.editMessage(messageId, {
        content: text
      });

      setMessages(messages.map(msg =>
        msg.id === messageId ? { ...msg, content: text, is_edited: true, edited_at: new Date().toISOString() } : msg
      ));

      setEditingMessageId(null);
      setEditText('');
      toast.success('Message edited');
    } catch (error) {
      console.error('Failed to edit message:', error);
      toast.error('Failed to edit message');
    }
  };

  const handleDeleteMessage = async (messageId) => {
    if (!confirm('Are you sure you want to delete this message?')) return;

    try {
      await campaignChatsAPI.deleteMessage(messageId);

      setMessages(messages.map(msg =>
        msg.id === messageId ? { ...msg, is_deleted: true, content: 'This message has been deleted' } : msg
      ));

      toast.success('Message deleted');
    } catch (error) {
      console.error('Failed to delete message:', error);
      toast.error('Failed to delete message');
    }
  };

  const handleToggleMute = async () => {
    try {
      const response = await campaignChatsAPI.toggleMute(chat.id);
      toast.success(response.data.message);
      if (onChatUpdate) {
        onChatUpdate();
      }
    } catch (error) {
      console.error('Failed to toggle mute:', error);
      toast.error('Failed to update mute status');
    }
  };

  const handleTyping = () => {
    if (connected) {
      sendTypingIndicator(true);
    }
  };

  const formatMessageTime = (timestamp) => {
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffInHours = (now - date) / (1000 * 60 * 60);

      if (diffInHours < 24) {
        return format(date, 'h:mm a');
      } else if (diffInHours < 168) {
        return format(date, 'EEE h:mm a');
      } else {
        return format(date, 'MMM d, h:mm a');
      }
    } catch {
      return '';
    }
  };

  const getSenderName = (message) => {
    return message.sender_name || 'Unknown User';
  };

  const getSenderAvatar = (message) => {
    return message.sender_picture || null;
  };

  if (!chat) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50 rounded-2xl">
        <div className="text-center">
          <FaUsers className="text-gray-300 mx-auto mb-3" size={64} />
          <p className="text-gray-600 font-medium">Select a chat to start messaging</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white rounded-2xl shadow-md border border-gray-200">
      {/* Chat Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-full ${chat.chat_type === 'broadcast' ? 'bg-blue-100' : 'bg-green-100'}`}>
            {chat.chat_type === 'broadcast' ? (
              <FaUsers className="text-blue-600" size={18} />
            ) : (
              <FaUser className="text-green-600" size={18} />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-gray-900">{chat.title || 'Chat'}</h3>
              {connected && (
                <FaCircle className="text-green-500" size={8} title="Connected" />
              )}
              {!connected && (
                <FaCircle className="text-gray-400" size={8} title="Connecting..." />
              )}
            </div>
            <p className="text-xs text-gray-500">
              {participants.length} participant{participants.length !== 1 ? 's' : ''}
              {chat.is_muted && <span className="ml-2 text-orange-600">(Muted)</span>}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Mute/Unmute */}
          <button
            onClick={handleToggleMute}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
            title={chat.is_muted ? 'Unmute' : 'Mute'}
          >
            {chat.is_muted ? <FaVolumeMute size={16} /> : <FaVolumeUp size={16} />}
          </button>

          {/* Close (mobile) */}
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors lg:hidden"
            >
              <FaTimes size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-sm text-gray-600">Loading messages...</p>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <FaUsers className="text-gray-300 mx-auto mb-3" size={48} />
              <p className="text-gray-600 font-medium">No messages yet</p>
              <p className="text-sm text-gray-500">Start the conversation!</p>
            </div>
          </div>
        ) : (
          messages.map((message) => {
            const isOwnMessage = message.sender_id === currentUserId;
            const senderName = getSenderName(message);
            const senderAvatar = getSenderAvatar(message);

            return (
              <div
                key={message.id}
                className={`flex gap-3 ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {/* Avatar */}
                {!isOwnMessage && (
                  <div className="flex-shrink-0">
                    {senderAvatar ? (
                      <img
                        src={senderAvatar}
                        alt={senderName}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
                        <FaUser size={14} className="text-gray-600" />
                      </div>
                    )}
                  </div>
                )}

                {/* Message Bubble */}
                <div className={`flex-1 max-w-[70%] ${isOwnMessage ? 'flex flex-col items-end' : ''}`}>
                  {!isOwnMessage && (
                    <p className="text-xs font-semibold text-gray-700 mb-1">{senderName}</p>
                  )}

                  {editingMessageId === message.id ? (
                    /* Editing Mode */
                    <div className="w-full">
                      <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-lg resize-none"
                        rows="2"
                        autoFocus
                      />
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => handleEditMessage(message.id)}
                          className="px-3 py-1 bg-primary text-white rounded-lg text-sm hover:bg-primary/90"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setEditingMessageId(null);
                            setEditText('');
                          }}
                          className="px-3 py-1 bg-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-300"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Display Mode */
                    <div
                      className={`relative group px-4 py-2 rounded-2xl ${
                        isOwnMessage
                          ? 'bg-primary text-white'
                          : 'bg-white border border-gray-200 text-gray-900'
                      } ${message.is_deleted ? 'italic opacity-60' : ''}`}
                    >
                      <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>

                      {message.is_edited && !message.is_deleted && (
                        <p className={`text-xs mt-1 ${isOwnMessage ? 'text-white/70' : 'text-gray-500'}`}>
                          (edited)
                        </p>
                      )}

                      {/* Message Actions (for own messages) */}
                      {isOwnMessage && !message.is_deleted && (
                        <div className="absolute -left-16 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                          <button
                            onClick={() => {
                              setEditingMessageId(message.id);
                              setEditText(message.content);
                            }}
                            className="p-1.5 bg-gray-200 hover:bg-gray-300 rounded-full"
                            title="Edit"
                          >
                            <FaEdit size={12} className="text-gray-700" />
                          </button>
                          <button
                            onClick={() => handleDeleteMessage(message.id)}
                            className="p-1.5 bg-red-100 hover:bg-red-200 rounded-full"
                            title="Delete"
                          >
                            <FaTrash size={12} className="text-red-600" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  <p className={`text-xs text-gray-500 mt-1 ${isOwnMessage ? 'text-right' : ''}`}>
                    {formatMessageTime(message.created_at)}
                  </p>
                </div>
              </div>
            );
          })
        )}

        {/* Typing Indicator */}
        {typing.length > 0 && (
          <div className="flex gap-3">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
                <FaUser size={14} className="text-gray-600" />
              </div>
            </div>
            <div className="bg-white border border-gray-200 px-4 py-2 rounded-2xl">
              <div className="flex gap-1">
                <span className="animate-bounce inline-block w-2 h-2 bg-gray-400 rounded-full" style={{ animationDelay: '0ms' }}></span>
                <span className="animate-bounce inline-block w-2 h-2 bg-gray-400 rounded-full" style={{ animationDelay: '150ms' }}></span>
                <span className="animate-bounce inline-block w-2 h-2 bg-gray-400 rounded-full" style={{ animationDelay: '300ms' }}></span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="p-4 border-t border-gray-200 bg-white">
        {!connected && (
          <div className="mb-2 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
            Connecting to chat service...
          </div>
        )}
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <textarea
            ref={textareaRef}
            value={messageText}
            onChange={(e) => {
              setMessageText(e.target.value);
              handleTyping();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage(e);
              }
            }}
            placeholder="Type your message... (Shift+Enter for new line)"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
            rows="2"
            disabled={sending || !connected}
          />
          <button
            type="submit"
            disabled={!messageText.trim() || sending || !connected}
            className="px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            <FaPaperPlane size={16} />
            <span className="hidden sm:inline">Send</span>
          </button>
        </form>
      </div>
    </div>
  );
};

export default CampaignChatWindow;
