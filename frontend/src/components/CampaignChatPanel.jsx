import { useState, useEffect } from 'react';
import { FaComments, FaUsers, FaUser, FaPlus, FaCircle } from 'react-icons/fa';
import campaignChatsAPI from '../services/campaignChatsAPI';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

const CampaignChatPanel = ({ campaign, userType, onChatSelect, selectedChatId }) => {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [collaborators, setCollaborators] = useState([]);

  useEffect(() => {
    if (campaign?.id) {
      fetchChats();
    }
  }, [campaign]);

  const fetchChats = async () => {
    try {
      setLoading(true);
      const response = await campaignChatsAPI.getCampaignChats(campaign.id);
      const fetchedChats = response.data.chats || [];
      setChats(fetchedChats);
      if (!selectedChatId && fetchedChats.length === 1) {
        onChatSelect(fetchedChats[0]);
      }
    } catch (error) {
      console.error('Failed to fetch chats:', error);
      toast.error('Failed to load chats');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBroadcast = async () => {
    try {
      const response = await campaignChatsAPI.createBroadcastChat({
        campaign_id: campaign.id,
        title: `${campaign.title} - Team Chat`
      });

      toast.success('Broadcast chat created');
      setChats([response.data.chat, ...chats]);
      setShowCreateMenu(false);
      onChatSelect(response.data.chat);
    } catch (error) {
      console.error('Failed to create broadcast chat:', error);
      toast.error(error.response?.data?.error || 'Failed to create chat');
    }
  };

  const handleCreateOneToOne = async (creatorUserId) => {
    try {
      const response = await campaignChatsAPI.createOneToOneChat({
        campaign_id: campaign.id,
        creator_user_id: creatorUserId
      });

      // Check if chat already exists in list
      const existingChat = chats.find(c => c.id === response.data.chat.id);
      if (!existingChat) {
        setChats([response.data.chat, ...chats]);
      }

      setShowCreateMenu(false);
      onChatSelect(response.data.chat);
    } catch (error) {
      console.error('Failed to create one-to-one chat:', error);
      toast.error(error.response?.data?.error || 'Failed to create chat');
    }
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch {
      return '';
    }
  };

  const getTotalUnreadCount = () => {
    return chats.reduce((total, chat) => total + (chat.unread_count || 0), 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-sm text-gray-600">Loading chats...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white rounded-2xl shadow-md border border-gray-200">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <FaComments className="text-primary" size={20} />
            <h3 className="font-bold text-gray-900">Campaign Chats</h3>
            {getTotalUnreadCount() > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {getTotalUnreadCount()}
              </span>
            )}
          </div>

          {/* Create Chat Button (Brand only) */}
          {userType === 'brand' && (
            <div className="relative">
              <button
                onClick={() => setShowCreateMenu(!showCreateMenu)}
                className="p-2 text-primary hover:bg-primary/10 rounded-full transition-colors"
                title="Create new chat"
              >
                <FaPlus size={16} />
              </button>

              {/* Create Menu Dropdown */}
              {showCreateMenu && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-200 z-10">
                  <div className="p-2">
                    <button
                      onClick={handleCreateBroadcast}
                      className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      <FaUsers className="text-primary" size={16} />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Broadcast Chat</p>
                        <p className="text-xs text-gray-500">Message all creators</p>
                      </div>
                    </button>

                    {campaign.collaborations && campaign.collaborations.length > 0 && (
                      <>
                        <div className="border-t border-gray-200 my-2"></div>
                        <p className="text-xs font-semibold text-gray-600 px-3 py-1">Message Creator</p>
                        <div className="max-h-48 overflow-y-auto">
                          {campaign.collaborations.map((collab) => (
                            <button
                              key={collab.id}
                              onClick={() => handleCreateOneToOne(collab.creator_user_id)}
                              className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-50 rounded-lg transition-colors"
                            >
                              {collab.creator?.creator_profile?.profile_picture ? (
                                <img
                                  src={collab.creator.creator_profile.profile_picture}
                                  alt={collab.creator.creator_profile.display_name}
                                  className="w-6 h-6 rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center">
                                  <FaUser size={12} className="text-gray-600" />
                                </div>
                              )}
                              <p className="text-sm text-gray-900 truncate flex-1">
                                {collab.creator?.creator_profile?.display_name || 'Creator'}
                              </p>
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        <p className="text-xs text-gray-500">{chats.length} conversation{chats.length !== 1 ? 's' : ''}</p>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto">
        {chats.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center">
            <FaComments className="text-gray-300 mb-3" size={48} />
            <p className="text-gray-600 font-medium mb-1">No chats yet</p>
            <p className="text-sm text-gray-500">
              {userType === 'brand'
                ? 'Start a conversation with your creators'
                : 'Your brand will reach out to you here'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {chats.map((chat) => (
              <button
                key={chat.id}
                onClick={() => onChatSelect(chat)}
                className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${
                  selectedChatId === chat.id ? 'bg-primary/5 border-l-4 border-primary' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Chat Icon */}
                  <div className={`p-2 rounded-full ${chat.chat_type === 'broadcast' ? 'bg-blue-100' : 'bg-green-100'}`}>
                    {chat.chat_type === 'broadcast' ? (
                      <FaUsers className={chat.chat_type === 'broadcast' ? 'text-blue-600' : 'text-green-600'} size={16} />
                    ) : (
                      <FaUser className="text-green-600" size={16} />
                    )}
                  </div>

                  {/* Chat Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-semibold text-gray-900 truncate flex-1">
                        {chat.title || 'Untitled Chat'}
                      </h4>
                      {chat.last_message_at && (
                        <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
                          {formatTimestamp(chat.last_message_at)}
                        </span>
                      )}
                    </div>

                    {/* Last Message Preview */}
                    {chat.last_message_preview ? (
                      <p className="text-sm text-gray-600 truncate mb-1">
                        {chat.last_message_preview}
                      </p>
                    ) : (
                      <p className="text-sm text-gray-400 italic">No messages yet</p>
                    )}

                    {/* Unread Badge & Info */}
                    <div className="flex items-center gap-2">
                      {chat.unread_count > 0 && (
                        <span className="inline-flex items-center gap-1 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                          <FaCircle size={6} />
                          {chat.unread_count} new
                        </span>
                      )}
                      <span className="text-xs text-gray-500">
                        {chat.participants_count} participant{chat.participants_count !== 1 ? 's' : ''}
                      </span>
                      {chat.is_muted && (
                        <span className="text-xs text-gray-400">(Muted)</span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CampaignChatPanel;
