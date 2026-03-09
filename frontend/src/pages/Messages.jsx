import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useMessaging } from '../contexts/MessagingContext';
import messagingService from '../services/messagingAPI';
import Navbar from '../components/Navbar';
import Avatar from '../components/Avatar';
import CustomPackageMessage from '../components/CustomPackageMessage';
import { BASE_URL } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';
import BlockUserModal from '../components/BlockUserModal';
import ReportMessageModal from '../components/ReportMessageModal';
import SafetyWarningModal from '../components/SafetyWarningModal';
import { checkMessageSafety } from '../utils/messageSafety';

const Messages = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false); // Desktop sidebar toggle
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Trust & Safety modals state
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showSafetyWarning, setShowSafetyWarning] = useState(false);
  const [safetyWarningData, setSafetyWarningData] = useState(null);
  const [reportMessageData, setReportMessageData] = useState(null);
  const [showActionsMenu, setShowActionsMenu] = useState(false);

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

  // Close actions menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showActionsMenu && !event.target.closest('.actions-menu-container')) {
        setShowActionsMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showActionsMenu]);

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

    // Check message safety before sending
    const safetyCheck = checkMessageSafety(messageText.trim());
    if (safetyCheck.needsWarning) {
      setSafetyWarningData({
        type: safetyCheck.warningType,
        message: messageText.trim(),
        patterns: safetyCheck.patterns
      });
      setShowSafetyWarning(true);
      return;
    }

    // Send message if no safety issues
    const success = sendMessage(selectedConversation.id, messageText.trim());

    if (success) {
      setMessageText('');
      sendTypingIndicator(selectedConversation.id, false);
    }
  };

  const handleSendAnywayAfterWarning = () => {
    // User chose to send message despite warning
    const success = sendMessage(selectedConversation.id, safetyWarningData.message);

    if (success) {
      setMessageText('');
      sendTypingIndicator(selectedConversation.id, false);
      setShowSafetyWarning(false);
      setSafetyWarningData(null);
    }
  };

  const handleEditMessageAfterWarning = () => {
    // User chose to edit - just close modal and let them edit
    setShowSafetyWarning(false);
    // Keep the message text so they can edit it
  };

  const handleBlockUser = () => {
    setShowActionsMenu(false);
    setShowBlockModal(true);
  };

  const handleReportConversation = () => {
    setShowActionsMenu(false);
    // Get the last message from the other user to report
    const lastOtherMessage = conversationMessages
      .filter(msg => msg.sender_id !== currentUserId)
      .slice(-1)[0];

    if (lastOtherMessage) {
      setReportMessageData(lastOtherMessage);
      setShowReportModal(true);
    } else {
      toast.error('No messages to report yet');
    }
  };

  const handleBlockSuccess = () => {
    toast.success('User blocked successfully');
    // Refresh conversations to update UI
    loadConversations();
    // Go back to conversation list
    setSelectedConversation(null);
    setShowMobileChat(false);
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
        {/* Header with title and New Message button */}
        <div className={`flex items-center justify-between mb-8 ${showMobileChat ? 'hidden lg:flex' : 'flex'}`}>
          <h1 className="text-4xl font-bold">Messages</h1>
          <Link
            to={user?.user_type === 'brand' ? '/browse/creators' : '/browse/campaigns'}
            className="px-6 py-3 bg-primary hover:bg-primary-dark text-white font-medium rounded-lg transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Conversation
          </Link>
        </div>

        {!isConnected && conversations.length > 0 && (
          <div className="bg-primary/20 border border-primary text-primary-dark px-4 py-3 rounded-lg mb-6 flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-dark"></div>
            <span>Loading your messages...</span>
          </div>
        )}

        <div className="flex gap-4 h-[calc(100vh-200px)]">
          {/* Conversations List - Collapsible sidebar */}
          <div className={`bg-white rounded-lg shadow-md overflow-hidden transition-all duration-300 ${showMobileChat ? 'hidden lg:block' : 'block'} ${sidebarCollapsed ? 'lg:w-16' : 'lg:w-56'} w-full lg:flex-shrink-0`}>
            <div className="p-3 border-b border-gray-200 flex items-center justify-between">
              {!sidebarCollapsed && <h2 className="text-lg font-semibold">Conversations</h2>}
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="hidden lg:block p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {sidebarCollapsed ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                  )}
                </svg>
              </button>
            </div>

            <div className="overflow-y-auto h-full">
              {loading ? (
                <div className="p-4 text-center text-gray-500">
                  Loading conversations...
                </div>
              ) : conversations.length === 0 ? (
                <div className="p-6 text-center">
                  <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <p className="text-gray-500 mb-4">No conversations yet</p>
                  <Link
                    to={user?.user_type === 'brand' ? '/browse/creators' : '/browse/campaigns'}
                    className="inline-block text-primary hover:text-primary-dark font-medium text-sm"
                  >
                    Start a conversation →
                  </Link>
                </div>
              ) : (
                conversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    onClick={() => loadConversation(conversation)}
                    className={`p-2.5 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition ${
                      selectedConversation?.id === conversation.id ? 'bg-primary/10' : ''
                    } ${sidebarCollapsed ? 'flex justify-center' : ''}`}
                  >
                    {sidebarCollapsed ? (
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
                        {conversation.unread_count > 0 && (
                          <div className="absolute -top-1 -right-1 bg-primary text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                            {parseInt(conversation.unread_count, 10) > 9 ? '9+' : conversation.unread_count}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 flex-1 min-w-0">
                          <div className="relative">
                            {conversation.profile_picture ? (
                              <img
                                src={`${BASE_URL}${conversation.profile_picture}`}
                                alt={conversation.display_name || conversation.username || conversation.company_name}
                                className="w-10 h-10 rounded-full object-cover"
                              />
                            ) : (
                              <Avatar
                                name={conversation.display_name || conversation.username || conversation.company_name || conversation.email}
                                size="sm"
                              />
                            )}
                            {isUserOnline(conversation.id) && (
                              <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white"></div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm text-gray-900 truncate">
                              {conversation.display_name || conversation.username || conversation.company_name || conversation.email || 'Unknown User'}
                            </p>
                            <p className="text-xs text-gray-500 truncate">
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
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Message Thread - Takes remaining space */}
          <div className={`flex-1 bg-white rounded-lg shadow-md overflow-hidden flex flex-col ${!showMobileChat && !selectedConversation ? 'hidden lg:flex' : 'flex'}`}>
            {selectedConversation ? (
              <>
                {/* Conversation Header */}
                <div className="p-4 border-b border-gray-200 bg-light">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 flex-1">
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

                    {/* Actions Menu */}
                    <div className="relative actions-menu-container">
                      <button
                        onClick={() => setShowActionsMenu(!showActionsMenu)}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                        title="More actions"
                      >
                        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                        </svg>
                      </button>

                      {/* Actions Dropdown */}
                      {showActionsMenu && (
                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                          <button
                            onClick={handleReportConversation}
                            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                            </svg>
                            Report User
                          </button>
                          <button
                            onClick={handleBlockUser}
                            className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                            </svg>
                            Block User
                          </button>
                        </div>
                      )}
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

      {/* Trust & Safety Modals */}
      <BlockUserModal
        isOpen={showBlockModal}
        onClose={() => setShowBlockModal(false)}
        user={selectedConversation}
        onBlockSuccess={handleBlockSuccess}
      />

      <ReportMessageModal
        isOpen={showReportModal}
        onClose={() => {
          setShowReportModal(false);
          setReportMessageData(null);
        }}
        message={reportMessageData}
        conversationId={selectedConversation?.id}
        reportedUser={selectedConversation}
      />

      <SafetyWarningModal
        isOpen={showSafetyWarning}
        onClose={() => {
          setShowSafetyWarning(false);
          setSafetyWarningData(null);
          setMessageText(''); // Clear message on cancel
        }}
        warningType={safetyWarningData?.type}
        message={safetyWarningData?.message}
        detectedPatterns={safetyWarningData?.patterns}
        onEdit={handleEditMessageAfterWarning}
        onSendAnyway={handleSendAnywayAfterWarning}
      />
    </div>
  );
};

export default Messages;
