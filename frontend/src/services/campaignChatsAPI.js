/**
 * Campaign Chats API Service
 * Handles campaign-level messaging between brands and creators
 */
import api from './api';

const campaignChatsAPI = {
  // ==================== Chat Management ====================

  /**
   * Get all chats for a campaign
   * @param {number} campaignId - Campaign ID
   * @returns {Promise} - Array of chats
   */
  getCampaignChats: (campaignId) => {
    return api.get(`/campaign-chats/campaign/${campaignId}`);
  },

  /**
   * Get chat details with participants
   * @param {number} chatId - Chat ID
   * @returns {Promise} - Chat details with participants
   */
  getChatDetails: (chatId) => {
    return api.get(`/campaign-chats/${chatId}`);
  },

  /**
   * Create one-to-one chat between brand and creator
   * @param {object} data - { campaign_id, creator_user_id OR brand_user_id }
   * @returns {Promise} - Created/retrieved chat
   */
  createOneToOneChat: (data) => {
    return api.post('/campaign-chats/create-one-to-one', data);
  },

  /**
   * Create broadcast chat for all collaborators
   * @param {object} data - { campaign_id, title (optional) }
   * @returns {Promise} - Created chat
   */
  createBroadcastChat: (data) => {
    return api.post('/campaign-chats/create-broadcast', data);
  },

  // ==================== Message Management ====================

  /**
   * Get messages for a chat
   * @param {number} chatId - Chat ID
   * @param {number} page - Page number (default: 1)
   * @param {number} perPage - Messages per page (default: 50)
   * @returns {Promise} - Messages with pagination
   */
  getMessages: (chatId, page = 1, perPage = 50) => {
    return api.get(`/campaign-chats/${chatId}/messages`, {
      params: { page, per_page: perPage }
    });
  },

  /**
   * Send a message in a chat
   * @param {number} chatId - Chat ID
   * @param {object} data - { content, message_type, attachments }
   * @returns {Promise} - Sent message
   */
  sendMessage: (chatId, data) => {
    return api.post(`/campaign-chats/${chatId}/messages`, data);
  },

  /**
   * Edit a message
   * @param {number} messageId - Message ID
   * @param {object} data - { content }
   * @returns {Promise} - Updated message
   */
  editMessage: (messageId, data) => {
    return api.put(`/campaign-chats/messages/${messageId}`, data);
  },

  /**
   * Delete a message (soft delete)
   * @param {number} messageId - Message ID
   * @returns {Promise} - Success response
   */
  deleteMessage: (messageId) => {
    return api.delete(`/campaign-chats/messages/${messageId}`);
  },

  /**
   * Mark chat as read
   * @param {number} chatId - Chat ID
   * @returns {Promise} - Success response
   */
  markAsRead: (chatId) => {
    return api.post(`/campaign-chats/${chatId}/mark-read`);
  },

  // ==================== Participant Management ====================

  /**
   * Toggle mute status for a chat
   * @param {number} chatId - Chat ID
   * @returns {Promise} - Updated mute status
   */
  toggleMute: (chatId) => {
    return api.post(`/campaign-chats/${chatId}/mute`);
  },

  /**
   * Leave a broadcast chat
   * @param {number} chatId - Chat ID
   * @returns {Promise} - Success response
   */
  leaveChat: (chatId) => {
    return api.post(`/campaign-chats/${chatId}/leave`);
  },
};

export default campaignChatsAPI;
