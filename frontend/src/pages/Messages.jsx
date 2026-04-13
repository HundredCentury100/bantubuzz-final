import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useMessaging } from '../contexts/MessagingContext';
import messagingService from '../services/messagingAPI';
import Navbar from '../components/Navbar';
import Avatar from '../components/Avatar';
import CustomPackageMessage from '../components/CustomPackageMessage';
import CustomRequestModal from '../components/CustomRequestModal';
import CustomOfferModal from '../components/CustomOfferModal';
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
  const [searchQuery, setSearchQuery] = useState(''); // Search query for filtering conversations
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Trust & Safety modals state
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showSafetyWarning, setShowSafetyWarning] = useState(false);
  const [safetyWarningData, setSafetyWarningData] = useState(null);
  const [reportMessageData, setReportMessageData] = useState(null);
  const [showActionsMenu, setShowActionsMenu] = useState(false);

  // Custom Package modals state
  const [showCustomRequestModal, setShowCustomRequestModal] = useState(false);
  const [showCustomOfferModal, setShowCustomOfferModal] = useState(false);

  // Block status state
  const [blockStatus, setBlockStatus] = useState(null);

  // Load all conversations on mount
  useEffect(() => {
    loadConversations();
  }, []);

  // Listen for real-time message events to refresh conversation list
  useEffect(() => {
    const handleNewMessage = (event) => {
      console.log('New message event detected, refreshing conversations');
      loadConversations();
    };

    const handleMessageSent = (event) => {
      console.log('Message sent event detected, refreshing conversations');
      loadConversations();
    };

    window.addEventListener('new_message_received', handleNewMessage);
    window.addEventListener('message_sent', handleMessageSent);

    return () => {
      window.removeEventListener('new_message_received', handleNewMessage);
      window.removeEventListener('message_sent', handleMessageSent);
    };
  }, []);

  // Handle starting a new conversation from another page
  useEffect(() => {
    if (location.state?.startConversationWith && !loading) {
      const { id, email, display_name, username, company_name, profile_picture } = location.state.startConversationWith;

      console.log('Starting conversation with:', location.state.startConversationWith);
      console.log('Available conversations:', conversations);

      // Check if conversation already exists
      const existingConv = conversations.find(c => c.id === id);

      if (existingConv) {
        console.log('Found existing conversation:', existingConv);
        loadConversation(existingConv);
      } else {
        console.log('Creating new conversation');
        // Create a new conversation object for display with full user info
        const newConversation = {
          id: id,
          email: email,
          display_name: display_name,
          username: username,
          company_name: company_name,
          profile_picture: profile_picture,
          user_type: null,
          last_message: null,
          unread_count: 0
        };
        setSelectedConversation(newConversation);
        setShowMobileChat(true); // Show chat view on mobile
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

      // Check block status
      const blockResponse = await messagingService.checkBlockStatus(conversation.id);
      setBlockStatus(blockResponse.data);

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
    setBlockStatus(null);
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
    // Update block status immediately
    setBlockStatus({ blocked_by_me: true, blocked_me: false, can_message: false });
    // Refresh conversations to update UI
    loadConversations();
  };

  const handleUnblockUser = async () => {
    try {
      await messagingService.unblockUser(selectedConversation.id);
      toast.success('User unblocked successfully');
      // Update block status
      setBlockStatus({ blocked_by_me: false, blocked_me: false, can_message: true });
      // Refresh conversations
      loadConversations();
    } catch (error) {
      console.error('Error unblocking user:', error);
      toast.error('Failed to unblock user. Please try again.');
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

  // Filter conversations based on search query
  const filteredConversations = conversations.filter((conversation) => {
    if (!searchQuery.trim()) return true;

    const query = searchQuery.toLowerCase();
    const displayName = (conversation.display_name || '').toLowerCase();
    const username = (conversation.username || '').toLowerCase();
    const companyName = (conversation.company_name || '').toLowerCase();
    const email = (conversation.email || '').toLowerCase();
    const lastMessage = (conversation.last_message || '').toLowerCase();

    return displayName.includes(query) ||
           username.includes(query) ||
           companyName.includes(query) ||
           email.includes(query) ||
           lastMessage.includes(query);
  });

  return (
    <div className="min-h-screen bg-light">
      <Navbar />
      <div className="container-custom section-padding">
        {/* Header with title and New Message button */}
        <div className={`flex items-center justify-between mb-8 ${showMobileChat ? 'hidden lg:flex' : 'flex'}`}>
          <h1 className="text-4xl font-bold">Messages</h1>
          <Link
            to="/browse/creators"
            className="lg:px-6 lg:py-3 p-3 bg-primary hover:bg-primary-dark text-white font-medium rounded-lg lg:rounded-lg transition-colors flex items-center gap-2 lg:rounded-lg rounded-full"
            title="New Conversation"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="hidden lg:inline">New Conversation</span>
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

            {/* Search Bar */}
            {!sidebarCollapsed && conversations.length > 0 && (
              <div className="p-3 border-b border-gray-200">
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search conversations..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  />
                  <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className="overflow-y-auto h-full">
              {loading ? (
                <div className="p-4 text-center text-gray-500">
                  Loading conversations...
                </div>
              ) : filteredConversations.length === 0 ? (
                conversations.length === 0 ? (
                  <div className="p-6 text-center">
                    <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <p className="text-gray-500 mb-4">No conversations yet</p>
                    <Link
                      to="/browse/creators"
                      className="inline-block text-primary hover:text-primary-dark font-medium text-sm"
                    >
                      Browse Creators →
                    </Link>
                  </div>
                ) : (
                  <div className="p-6 text-center">
                    <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <p className="text-gray-500 mb-2">No conversations found</p>
                    <p className="text-gray-400 text-sm">Try a different search term</p>
                  </div>
                )
              ) : (
                filteredConversations.map((conversation) => (
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
                      <div className="relative flex-shrink-0">
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
                          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white z-10"></div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 truncate">
                          {selectedConversation.display_name || selectedConversation.username || selectedConversation.company_name || selectedConversation.email || 'Unknown User'}
                        </p>
                        <p className="text-sm text-gray-500 flex items-center gap-1">
                          {isUserOnline(selectedConversation.id) ? (
                            <>
                              <span className="inline-block w-2 h-2 bg-green-500 rounded-full"></span>
                              <span>Online</span>
                            </>
                          ) : (
                            'Offline'
                          )}
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

                {/* Blocked User Banner */}
                {blockStatus?.blocked_by_me && (
                  <div className="px-4 py-3 bg-orange-50 border-t border-b border-orange-200 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-orange-800">
                      <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                      </svg>
                      <span className="text-sm font-medium">You have blocked this user</span>
                    </div>
                    <button
                      onClick={handleUnblockUser}
                      className="px-3 py-1.5 text-sm font-medium text-primary hover:text-primary-dark hover:bg-primary/10 rounded-lg transition-colors"
                    >
                      Unblock
                    </button>
                  </div>
                )}

                {blockStatus?.blocked_me && !blockStatus?.blocked_by_me && (
                  <div className="px-4 py-3 bg-red-50 border-t border-b border-red-200 flex items-center gap-2">
                    <svg className="w-5 h-5 flex-shrink-0 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span className="text-sm font-medium text-red-800">This user has blocked you</span>
                  </div>
                )}

                {/* Message Input */}
                <form onSubmit={handleSendMessage} className="p-3 sm:p-4 border-t border-gray-200 bg-white">
                  <div className="flex items-center gap-2 w-full max-w-full">
                    {/* Custom Package Button */}
                    <button
                      type="button"
                      onClick={() => {
                        // Validate: Check if creator trying to send to another creator
                        if (user?.user_type === 'creator' && selectedConversation?.user_type === 'creator') {
                          toast.error('Custom packages can only be created between brands and creators');
                          return;
                        }

                        // Validate: Check if brand trying to send to another brand
                        if (user?.user_type === 'brand' && selectedConversation?.user_type === 'brand') {
                          toast.error('Custom packages can only be created between brands and creators');
                          return;
                        }

                        // Show appropriate modal based on user type
                        if (user?.user_type === 'brand') {
                          setShowCustomRequestModal(true);
                        } else if (user?.user_type === 'creator') {
                          setShowCustomOfferModal(true);
                        }
                      }}
                      className="flex-shrink-0 p-2.5 text-primary hover:bg-primary/10 rounded-full transition-all group relative"
                      title={user?.user_type === 'brand' ? 'Request Custom Package' : 'Send Custom Offer'}
                      disabled={!isConnected}
                    >
                      {/* Package Icon */}
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                      {/* Tooltip */}
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                        {user?.user_type === 'brand' ? 'Create custom package request' : 'Send custom package offer'}
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900"></div>
                      </div>
                    </button>

                    <div className="flex-1 min-w-0">
                      <input
                        type="text"
                        value={messageText}
                        onChange={handleTyping}
                        placeholder="Type a message..."
                        className="w-full px-4 py-3 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-primary text-base"
                        disabled={!isConnected}
                        inputMode="text"
                        autoComplete="off"
                        autoCorrect="on"
                        autoCapitalize="sentences"
                        enterKeyHint="send"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={!messageText.trim() || !isConnected}
                      className="bg-primary hover:bg-primary-dark text-white rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center flex-shrink-0 w-12 h-12 min-w-[48px] min-h-[48px] shadow-lg active:scale-95"
                      title="Send message"
                      aria-label="Send message"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                      </svg>
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

      {/* Custom Package Modals */}
      {showCustomRequestModal && selectedConversation && (
        <CustomRequestModal
          onClose={() => setShowCustomRequestModal(false)}
          onSuccess={() => {
            setShowCustomRequestModal(false);
            loadConversation(selectedConversation);
            toast.success('Custom package request sent!');
          }}
          creatorId={selectedConversation.id}
        />
      )}

      {showCustomOfferModal && selectedConversation && (
        <CustomOfferModal
          onClose={() => setShowCustomOfferModal(false)}
          onSuccess={() => {
            setShowCustomOfferModal(false);
            loadConversation(selectedConversation);
            toast.success('Custom offer sent!');
          }}
          requestId={null}
          requestData={null}
          brandId={selectedConversation.id}
        />
      )}
    </div>
  );
};

export default Messages;
