import api from './api';

/**
 * Portfolio API Service
 * Handles all portfolio-related API calls
 */

export const portfolioAPI = {
  /**
   * Get creator's public portfolio (visible items only)
   * @param {number} creatorId - Creator ID
   * @returns {Promise} Portfolio items
   */
  getCreatorPortfolio: (creatorId) => {
    return api.get(`/creators/${creatorId}/portfolio`);
  },

  /**
   * Get own portfolio (all items, including hidden)
   * @returns {Promise} Portfolio items
   */
  getMyPortfolio: () => {
    return api.get('/creator/portfolio');
  },

  /**
   * Create new portfolio item
   * @param {Object} portfolioData - Portfolio item data
   * @returns {Promise} Created portfolio item
   */
  createPortfolioItem: (portfolioData) => {
    return api.post('/creator/portfolio', portfolioData);
  },

  /**
   * Update existing portfolio item
   * @param {number} itemId - Portfolio item ID
   * @param {Object} portfolioData - Updated portfolio data
   * @returns {Promise} Updated portfolio item
   */
  updatePortfolioItem: (itemId, portfolioData) => {
    return api.put(`/creator/portfolio/${itemId}`, portfolioData);
  },

  /**
   * Fetch success story post stats from ThunziAI using a pasted public URL
   * @param {string} postUrl - Public social post URL
   * @returns {Promise} Thunzi metrics response
   */
  syncPostUrlMetrics: (postUrl) => {
    return api.post('/creator/portfolio/sync-url', { post_url: postUrl });
  },

  /**
   * Delete portfolio item
   * @param {number} itemId - Portfolio item ID
   * @returns {Promise} Delete confirmation
   */
  deletePortfolioItem: (itemId) => {
    return api.delete(`/creator/portfolio/${itemId}`);
  },

  /**
   * Upload portfolio image for a success story featured/additional media slot
   * @param {File} file - Image file
   * @returns {Promise} Upload response with image URL
   */
  uploadPortfolioImage: async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post('/creator/portfolio/upload-image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

    return response;
  },

  /**
   * Create portfolio item from a completed collaboration
   * Pre-populates data from the collaboration
   * @param {number} collaborationId - Collaboration ID
   * @param {Object} additionalData - Additional portfolio data (optional)
   * @returns {Promise} Created portfolio item
   */
  createFromCollaboration: (collaborationId, additionalData = {}) => {
    return api.post(`/creator/portfolio/from-collaboration/${collaborationId}`, additionalData);
  }
};

export default portfolioAPI;
