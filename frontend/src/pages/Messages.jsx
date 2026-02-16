import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useMessaging } from '../contexts/MessagingContext';
import messagingService from '../services/messagingAPI';
import Navbar from '../components/Navbar';
import Avatar from '../components/Avatar';
import CustomPackageMessage from '../components/CustomPackageMessage';
import { BASE_URL } from '../services/api';
import toast from 'react-hot-toast';

const Messages = () => {
  const location = useLocation();
  const {
    isConnected,
    messages,
    onlineUsers,
    typingUsers,
    sendMessage,
    markMessagesAsRead,
    sendTypingIndicator,
    loadConversationMessages,
  } = useMessaging();

  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [showMobileChat, setShowMobileChat] = useState(false); // Mobile chat view state
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Load all conversations on mount
  useEffect(() => {
    loadConversations();
  }, []);

  // Handle starting a new conversation from another page
  useEffect(() => {
    if (location.state?.startConversationWith && !loading) {
      const { id, email } = location.state.startConversationWith;

      console.log('Starting conversation with:', { id, email });
      console.log('Available conversations:', conversations);

      // Check if conversation already exists
      const existingConv = conversations.find(c => c.id === id);

      if (existingConv) {
        console.log('Found existing conversation:', existingConv);
        loadConversation(existingConv);
      } else {
        console.log('Creating new conversation');
        // Create a new conversation object for display
        const newConversation = {
          id: id,
          email: email,
          user_type: null,
          last_message: null,
          unread_count: 0
        };
        setSelectedConversation(newConversation);
        loadConversationMessages(id, []); // Empty messages initially
      }

      // Clear the state to avoid reloading
      window.history.replaceState({}, document.title);
    }
  }, [location.state, conversations, loading]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages, selectedConversation]);

  // Mark messages as read when conversation is selected
  useEffect(() => {
    if (selectedConversation) {
      const conversationMessages = messages[selectedConversation.id] || [];
      const unreadIds = conversationMessages
        .filter(msg => !msg.read_at && msg.receiver_id === getCurrentUserId())
        .map(msg => msg.id);

      if (unreadIds.length > 0) {
        markMessagesAsRead(unreadIds);
      }
    }
  }, [selectedConversation, messages]);

  const getCurrentUserId = () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return user.id;
  };

  const loadConversations = async () => {
    try {
      setLoading(true);
      const response = await messagingService.getConversations();
      setConversations(response.data.conversations || []);
    } catch (error) {
      console.error('Error loading conversations:', error);

      // Check if it's a network error (messaging service unavailable)
      if (error.code === 'ERR_NETWORK' || error.message.includes('Network Error')) {
        toast.error('Unable to load messages. The messaging service is currently unavailable.');
      } else {
        toast.error('Unable to load conversations. Please try again later.');
      }

      // Set empty array so UI shows "No conversations" instead of staying in loading state
      setConversations([]);
    } finally {
      setLoading(false);
    }
  };

  const loadConversation = async (conversation) => {
    try {
      setSelectedConversation(conversation);
      setShowMobileChat(true); // Show chat view on mobile
      const response = await messagingService.getConversation(conversation.id);
      loadConversationMessages(conversation.id, response.data.messages || []);
    } catch (error) {
      console.error('Error loading conversation:', error);

      // Still set the conversation so user can see the UI, just with empty messages
      setSelectedConversation(conversation);
      setShowMobileChat(true); // Show chat view on mobile
      loadConversationMessages(conversation.id, []);

      // Check if it's a network error
      if (error.code === 'ERR_NETWORK' || error.message.includes('Network Error')) {
        toast.error('Unable to load messages. The messaging service is currently unavailable.');
      } else {
        toast.error('Unable to load messages for this conversation.');
      }
    }
  };

  const handleBackToConversations = () => {
    setShowMobileChat(false);
    setSelectedConversation(null);
  };

  const handleSendMessage = (e) => {
    e.preventDefault();

    if (!messageText.trim() || !selectedConversation) {
      return;
    }

    const success = sendMessage(selectedConversation.id, messageText.trim());

    if (success) {
      setMessageText('');
      sendTypingIndicator(selectedConversation.id, false);
    }
  };

  const handleTyping = (e) => {
    setMessageText(e.target.value);

    if (!selectedConversation) return;

    // Send typing indicator
    sendTypingIndicator(selectedConversation.id, true);

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      sendTypingIndicator(selectedConversation.id, false);
    }, 2000);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatMessageTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
  };

  const isUserOnline = (userId) => {
    return onlineUsers.has(userId?.toString());
  };

  const isUserTyping = (userId) => {
    return typingUsers.has(userId?.toString());
  };

  const currentUserId = getCurrentUserId();
  const conversationMessages = selectedConversation
    ? (messages[selectedConversation.id] || [])
    : [];

  return (
    <div className="min-h-screen bg-light">
      <Navbar />
      <div className="container-custom section-padding">
        {/* Hide title on mobile when chat is open */}
        <h1 className={`text-4xl font-bold mb-8 ${showMobileChat ? 'hidden lg:block' : 'block'}`}>Messages</h1>

        {!isConnected && conversations.length > 0 && (
          <div className="bg-primary/20 border border-primary text-primary-dark px-4 py-3 rounded-lg mb-6 flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-dark"></div>
            <span>Loading your messages...</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-250px)]">
          {/* Conversations List - Hidden on mobile when chat is open */}
          <div className={`lg:col-span-1 bg-white rounded-lg shadow-md overflow-hidden ${showMobileChat ? 'hidden lg:block' : 'block'}`}>
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold">Conversations</h2>
            </div>

            <div className="overflow-y-auto h-full">
              {loading ? (
                <div className="p-4 text-center text-gray-500">
                  Loading conversations...
                </div>
              ) : conversations.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  No conversations yet
                </div>
              ) : (
                conversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    onClick={() => loadConversation(conversation)}
                    className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition ${
                      selectedConversation?.id === conversation.id ? 'bg-primary/10' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <div className="relative">
                          {conversation.profile_picture ? (
                            <img
                              src={`${BASE_URL}${conversation.profile_picture}`}
                              alt={conversation.display_name || conversation.username || conversation.company_name}
                              className="w-12 h-12 rounded-full object-cover"
                            />
                          ) : (
                            <Avatar
                              name={conversation.display_name || conversation.username || conversation.company_name || conversation.email}
                              size="md"
                            />
                          )}
                          {isUserOnline(conversation.id) && (
                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 truncate">
                            {conversation.display_name || conversation.username || conversation.company_name || conversation.email || 'Unknown User'}
                          </p>
                          <p className="text-sm text-gray-500 truncate">
                            {conversation.last_message || 'No messages yet'}
                          </p>
                        </div>
                      </div>
                      {conversation.unread_count > 0 && (
                        <div className="ml-2 bg-primary text-white text-xs font-bold rounded-full min-w-6 h-6 px-2 flex items-center justify-center flex-shrink-0">
                          {parseInt(conversation.unread_count, 10)}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Message Thread - Full screen on mobile when chat is open */}
          <div className={`lg:col-span-2 bg-white rounded-lg shadow-md overflow-hidden flex flex-col ${!showMobileChat && !selectedConversation ? 'hidden lg:flex' : 'block lg:flex'}`}>
            {selectedConversation ? (
              <>
                {/* Conversation Header */}
                <div className="p-4 border-b border-gray-200 bg-light">
                  <div className="flex items-center space-x-3">
                    {/* Back button - Only visible on mobile */}
                    <button
                      onClick={handleBackToConversations}
                      className="lg:hidden text-gray-600 hover:text-gray-900 mr-2"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <div className="relative">
                      {selectedConversation.profile_picture ? (
                        <img
                          src={`${BASE_URL}${selectedConversation.profile_picture}`}
                          alt={selectedConversation.display_name || selectedConversation.username || selectedConversation.company_name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <Avatar
                          name={selectedConversation.display_name || selectedConversation.username || selectedConversation.company_name || selectedConversation.email}
                          size="sm"
                        />
                      )}
                      {isUserOnline(selectedConversation.id) && (
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">
                        {selectedConversation.display_name || selectedConversation.username || selectedConversation.company_name || selectedConversation.email || 'Unknown User'}
                      </p>
                      <p className="text-sm text-gray-500">
                        {isUserOnline(selectedConversation.id)
                          ? 'Online'
                          : 'Offline'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {conversationMessages.length === 0 ? (
                    <div className="text-center text-gray-500 mt-8">
                      No messages yet. Start the conversation!
                    </div>
                  ) : (
                    conversationMessages.map((message, index) => {
                      const isOwnMessage = message.sender_id === currentUserId;

                      // Render custom package (request or offer) - navy blue unified card
                      if (message.message_type === 'custom_request' || message.message_type === 'custom_offer') {
                        return (
                          <CustomPackageMessage
                            key={message.id || index}
                            message={message}
                            isOwnMessage={isOwnMessage}
                            currentUserId={currentUserId}
                          />
                        );
                      }

                      // Render regular text message
                      return (
                        <div
                          key={message.id || index}
                          className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[70%] rounded-lg px-4 py-2 ${
                              isOwnMessage
                                ? 'bg-primary text-white'
                                : 'bg-gray-100 text-gray-900'
                            }`}
                          >
                            <p className="break-words">{message.content}</p>
                            <p
                              className={`text-xs mt-1 ${
                                isOwnMessage ? 'text-white/70' : 'text-gray-500'
                              }`}
                            >
                              {formatMessageTime(message.created_at)}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}

                  {/* Typing Indicator */}
                  {isUserTyping(selectedConversation.id) && (
                    <div className="flex justify-start">
                      <div className="bg-gray-100 rounded-lg px-4 py-2">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200">
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={messageText}
                      onChange={handleTyping}
                      placeholder="Type a message..."
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      disabled={!isConnected}
                    />
                    <button
                      type="submit"
                      disabled={!messageText.trim() || !isConnected}
                      className="btn-primary px-6 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Send
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                Select a conversation to start messaging
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Messages;
