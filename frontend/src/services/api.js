import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
export const BASE_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If error is 401 and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {}, {
            headers: {
              Authorization: `Bearer ${refreshToken}`,
            },
          });

          const { access_token } = response.data;
          localStorage.setItem('access_token', access_token);

          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, logout user
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  registerCreator: (data) => api.post('/auth/register/creator', data),
  registerBrand: (data) => api.post('/auth/register/brand', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  getCurrentUser: () => api.get('/auth/me'),
  verifyEmail: (token) => api.get(`/auth/verify/${token}`),
  verifyOTP: (data) => api.post('/auth/verify-otp', data),
  resendOTP: (data) => api.post('/auth/resend-otp', data),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, password) => api.post(`/auth/reset-password/${token}`, { password }),
  // Google OAuth
  googleCreatorAuth: (credential) => api.post('/auth/google/creator', { credential }),
  googleCompleteProfile: (data) => api.post('/auth/google/complete-profile', data),
};

// Users API
export const usersAPI = {
  getProfile: () => api.get('/users/profile'),
  updateProfile: (data) => api.put('/users/profile', data),
};

// Creators API
export const creatorsAPI = {
  getCreators: (params) => api.get('/creators', { params }),
  getCategories: () => api.get('/creators/categories'),
  getFeatured: (params) => api.get('/creators/featured', { params }),
  getCreator: (id) => api.get(`/creators/${id}`),
  getOwnProfile: () => api.get('/creators/profile'),
  updateProfile: (data) => api.put('/creators/profile', data),
  uploadProfilePicture: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/creators/profile/picture', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  uploadGalleryImage: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/creators/profile/gallery', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  deleteGalleryImage: (index) => api.delete(`/creators/profile/gallery/${index}`),
};

// Brands API
export const brandsAPI = {
  getBrand: (id) => api.get(`/brands/${id}`),
  getOwnProfile: () => api.get('/brands/profile'),
  updateProfile: (data) => api.put('/brands/profile', data),
  uploadLogo: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/brands/profile/logo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  getSavedCreators: () => api.get('/brands/saved-creators'),
  saveCreator: (creatorId) => api.post(`/brands/saved-creators/${creatorId}`),
  unsaveCreator: (creatorId) => api.delete(`/brands/saved-creators/${creatorId}`),
};

// Packages API
export const packagesAPI = {
  getPackages: (params) => api.get('/packages', { params }),
  getPackage: (id) => api.get(`/packages/${id}`),
  getMyPackages: () => api.get('/packages', { params: { my_packages: 'true' } }),
  createPackage: (data) => api.post('/packages', data),
  updatePackage: (id, data) => api.put(`/packages/${id}`, data),
  deletePackage: (id) => api.delete(`/packages/${id}`),
};

// Campaigns API - Brand Side
export const campaignsAPI = {
  // Brand: Campaign Management
  getCampaigns: (params) => api.get('/campaigns', { params }),
  getCampaign: (id) => api.get(`/campaigns/${id}`),
  createCampaign: (data) => api.post('/campaigns', data),
  updateCampaign: (id, data) => api.put(`/campaigns/${id}`, data),
  deleteCampaign: (id) => api.delete(`/campaigns/${id}`),

  // Brand: Review Proposals (Applications)
  getCampaignProposals: (campaignId) => api.get(`/campaigns/${campaignId}/proposals`),
  acceptProposal: (proposalId) => api.post(`/campaigns/proposals/${proposalId}/accept`),
  rejectProposal: (proposalId, data) => api.post(`/campaigns/proposals/${proposalId}/reject`, data),
  completeProposalPayment: (proposalId) => api.post(`/campaigns/proposals/${proposalId}/complete-payment`),

  // Brand: Package Management
  addPackageToCampaign: (campaignId, packageId) => api.post(`/campaigns/${campaignId}/packages`, { package_id: packageId }),
  removePackageFromCampaign: (campaignId, packageId) => api.delete(`/campaigns/${campaignId}/packages/${packageId}`),
  getCampaignPackages: (campaignId) => api.get(`/campaigns/${campaignId}/packages`),
  completePackagePayment: (campaignId, packageId, bookingId) =>
    api.post(`/campaigns/${campaignId}/packages/${packageId}/complete-payment`, { booking_id: bookingId }),
};

// Opportunities API - Creator Side
// Same backend endpoints, different naming for creator UX
export const opportunitiesAPI = {
  // Creator: Browse Opportunities
  browseOpportunities: (params) => api.get('/campaigns/browse', { params }),

  // Creator: View Opportunity Details
  getOpportunity: (id) => api.get(`/campaigns/${id}`),

  // Creator: Apply to Opportunity
  applyToOpportunity: (opportunityId, proposalData) =>
    api.post(`/campaigns/${opportunityId}/apply`, proposalData),

  // Creator: My Applications
  getMyApplications: (params) => api.get('/campaigns/my-applications', { params }),
};

// Bookings API
export const bookingsAPI = {
  getBookings: (params) => api.get('/bookings', { params }),
  getBooking: (id) => api.get(`/bookings/${id}`),
  getMyBookings: () => api.get('/bookings'),
  createBooking: (data) => api.post('/bookings', data),
  updateBookingStatus: (id, status) => api.put(`/bookings/${id}/status`, { status }),
  getPaymentStatus: (id) => api.get(`/bookings/${id}/payment-status`),
  initiatePayment: (bookingId) => api.post(`/bookings/${bookingId}/initiate-payment`),

  // Proof of Payment
  uploadProofOfPayment: (bookingId, formData) =>
    api.post(`/bookings/${bookingId}/upload-pop`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
  downloadProofOfPayment: (bookingId) =>
    api.get(`/bookings/${bookingId}/download-pop`, { responseType: 'blob' }),
  verifyPayment: (bookingId) =>
    api.post(`/bookings/${bookingId}/verify-payment`),

  // Cart checkout (combined payment for multiple packages)
  cartCheckout: (packageIds) => api.post('/bookings/cart/checkout', { package_ids: packageIds }),
  cartPaymentStatus: (bookingIds, pollUrl) => api.post('/bookings/cart/status', { booking_ids: bookingIds, poll_url: pollUrl }),
  cartUploadPop: (bookingIds, formData) => {
    formData.append('booking_ids', JSON.stringify(bookingIds));
    return api.post('/bookings/cart/upload-pop', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  cartPayWithWallet: (packageIds) => api.post('/bookings/cart/pay-with-wallet', { package_ids: packageIds }),
  cartBankTransfer: (packageIds) => api.post('/bookings/cart/bank-transfer', { package_ids: packageIds }),
};

// Messages API
export const messagesAPI = {
  getMessages: (params) => api.get('/messages', { params }),
  sendMessage: (data) => api.post('/messages', data),
  markAsRead: (id) => api.put(`/messages/${id}/read`),
  getConversations: () => api.get('/messages/conversations'),
};

// Notifications API
export const notificationsAPI = {
  getNotifications: (params) => api.get('/notifications', { params }),
  markAsRead: (id) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.put('/notifications/mark-all-read'),
};

// Analytics API
export const analyticsAPI = {
  getDashboardStats: () => api.get('/analytics/dashboard'),
  getEarnings: (params) => api.get('/analytics/earnings', { params }),

  // Audience Demographics
  getCampaignAudience: (campaignId) => api.get(`/campaigns/${campaignId}/audience`),
  getCollaborationAudience: (collaborationId) => api.get(`/collaborations/${collaborationId}/audience`),
  getCreatorAudience: (creatorId) => api.get(`/creators/${creatorId}/audience`),
  getBrandAudience: () => api.get(`/brands/audience`),  // Gets brand's overall audience across all collaborations
};

// Collaborations API
export const collaborationsAPI = {
  getCollaborations: (params) => api.get('/collaborations', { params }),
  getCollaboration: (id) => api.get(`/collaborations/${id}`),
  updateProgress: (id, data) => api.patch(`/collaborations/${id}/progress`, data),

  // Deliverables (for package-based collaborations)
  submitDeliverable: (id, data) => api.post(`/collaborations/${id}/deliverables`, data),
  submitDraftDeliverable: (id, data) => api.post(`/collaborations/${id}/deliverables/draft`, data),
  updateDraftDeliverable: (id, deliverableId, data) => api.put(`/collaborations/${id}/deliverables/${deliverableId}`, data),
  approveDeliverable: (id, deliverableId) => api.post(`/collaborations/${id}/deliverables/${deliverableId}/approve`),
  requestRevision: (id, deliverableId, notes) => api.post(`/collaborations/${id}/deliverables/${deliverableId}/request-revision`, { notes }),

  // Milestone Deliverables (for brief/campaign collaborations)
  submitMilestoneDeliverable: (collabId, milestoneId, data) =>
    api.post(`/collaborations/${collabId}/milestones/${milestoneId}/deliverables`, data),
  approveMilestoneDeliverable: (collabId, milestoneId, deliverableId) =>
    api.post(`/collaborations/${collabId}/milestones/${milestoneId}/deliverables/${deliverableId}/approve`),
  requestMilestoneRevision: (collabId, milestoneId, deliverableId, notes) =>
    api.post(`/collaborations/${collabId}/milestones/${milestoneId}/deliverables/${deliverableId}/request-revision`, { notes }),

  // Deliverable URL Submission (for analytics tracking)
  // For package-based collaborations (deliverables stored in JSON)
  submitPackageDeliverableURL: (collabId, deliverableId, data) =>
    api.put(`/collaborations/${collabId}/deliverables/${deliverableId}/submit-url`, data),
  // For milestone-based collaborations (briefs/campaigns with separate deliverable table)
  submitMilestoneDeliverableURL: (collabId, milestoneId, deliverableId, data) =>
    api.put(`/collaborations/${collabId}/milestones/${milestoneId}/deliverables/${deliverableId}/submit-url`, data),

  // Post Metrics Sync (Phase 2 Analytics)
  // Sync metrics for a single deliverable from ThunziAI
  syncDeliverableMetrics: (collabId, milestoneId, deliverableId) => {
    const endpoint = milestoneId
      ? `/collaborations/${collabId}/milestones/${milestoneId}/deliverables/${deliverableId}/sync-metrics`
      : `/collaborations/${collabId}/deliverables/${deliverableId}/sync-metrics`;
    return api.post(endpoint);
  },
  // Get cached metrics for a deliverable
  getDeliverableMetrics: (collabId, deliverableId) =>
    api.get(`/collaborations/${collabId}/deliverables/${deliverableId}/metrics`),
  // Sync metrics for all deliverables in a collaboration
  syncAllCollaborationMetrics: (collabId) =>
    api.post(`/collaborations/${collabId}/sync-all-metrics`),
  // Get aggregated analytics for entire collaboration
  getCollaborationAnalytics: (collabId) =>
    api.get(`/collaborations/${collabId}/analytics`),

  // Paid Revision
  createRevisionBooking: (id, data) => api.post(`/collaborations/${id}/revision/create-booking`, data),
  completeRevisionPayment: (id, bookingId) => api.post(`/collaborations/${id}/revision/complete-payment`, { booking_id: bookingId }),

  // Collaboration actions
  completeCollaboration: (id) => api.patch(`/collaborations/${id}/complete`),
  cancelCollaboration: (id, reason) => api.patch(`/collaborations/${id}/cancel`, { reason }),
  requestCancellation: (id, reason) => api.post(`/collaborations/${id}/cancel-request`, { reason }),

  // Creator response to collaboration requests
  getPendingCollaborations: () => api.get('/collaborations/pending-response'),
  getPendingCount: () => api.get('/collaborations/pending-count'),
  accept: (id) => api.post(`/collaborations/${id}/accept`),
  decline: (id, data) => api.post(`/collaborations/${id}/decline`, data),
};

// Reviews API
export const reviewsAPI = {
  createReview: (data) => api.post('/reviews', data),
  getCreatorReviews: (creatorId, params) => api.get(`/reviews/creator/${creatorId}`, { params }),
  getReview: (id) => api.get(`/reviews/${id}`),
  addCreatorResponse: (id, response) => api.patch(`/reviews/${id}/response`, { response }),
  getBrandReviews: (params) => api.get('/reviews/brand', { params }),
};

// Categories API
export const categoriesAPI = {
  getCategories: () => api.get('/categories'),
  getCategory: (id) => api.get(`/categories/${id}`),
};

// Brand Wallet API
export const brandWalletAPI = {
  getWallet: () => api.get('/brand/wallet/balance'),
  getBalance: () => api.get('/brand/wallet/balance'),
  getStatistics: () => api.get('/brand/wallet/statistics'),
  getTransactions: (params) => api.get('/brand/wallet/transactions', { params }),
  checkBalance: (amount) => api.post('/brand/wallet/check-balance', { amount }),

  // Deposits
  createDeposit: (data) => api.post('/brand/wallet/deposit', data),
  getDeposits: (params) => api.get('/brand/wallet/deposits', { params }),
  getDeposit: (id) => api.get(`/brand/wallet/deposits/${id}`),
  uploadDepositProof: (id, formData) => api.post(`/brand/wallet/deposits/${id}/upload-proof`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  cancelDeposit: (id, reason) => api.delete(`/brand/wallet/deposits/${id}`, { data: { reason } }),
};

// Creator Wallet API
export const creatorWalletAPI = {
  getBalance: () => api.get('/wallet/balance'),
  getTransactions: (params) => api.get('/wallet/transactions', { params }),
  getStatistics: () => api.get('/wallet/statistics'),
};

// Payments API
export const paymentsAPI = {
  createRevisionPayment: (data) => api.post('/payments/revision', data),
  createCampaignPayment: (data) => api.post('/payments/campaign', data),
  uploadCampaignProofOfPayment: (bookingId, formData) => api.post(`/payments/campaign/${bookingId}/upload-pop`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
};

// Briefs API
export const briefsAPI = {
  // Basic CRUD
  getBriefs: (params) => api.get('/briefs', { params }),
  getBrief: (id) => api.get(`/briefs/${id}`),
  createBrief: (data) => api.post('/briefs', data),
  updateBrief: (id, data) => api.patch(`/briefs/${id}`, data),
  deleteBrief: (id) => api.delete(`/briefs/${id}`),

  // Brief Actions
  publishBrief: (id) => api.post(`/briefs/${id}/publish`),
  closeBrief: (id) => api.post(`/briefs/${id}/close`),
  convertToCampaign: (id) => api.post(`/briefs/${id}/convert-to-campaign`),

  // Proposals for Brief
  getBriefProposals: (id) => api.get(`/briefs/${id}/proposals`),
};

// Proposals API
export const proposalsAPI = {
  // Basic CRUD
  getProposals: (params) => api.get('/proposals', { params }),
  getProposal: (id) => api.get(`/proposals/${id}`),
  createProposal: (data) => api.post('/proposals', data),
  updateProposal: (id, data) => api.patch(`/proposals/${id}`, data),
  deleteProposal: (id) => api.delete(`/proposals/${id}`),

  // Proposal Actions
  acceptProposal: (id) => api.post(`/proposals/${id}/accept`),
  rejectProposal: (id, reason) => api.post(`/proposals/${id}/reject`, { reason }),
};

// Milestones API
export const milestonesAPI = {
  // Get Milestones
  getCollaborationMilestones: (collaborationId) => api.get(`/collaborations/${collaborationId}/milestones`),
  getMilestone: (collaborationId, milestoneNumber) => api.get(`/collaborations/${collaborationId}/milestones/${milestoneNumber}`),

  // Deliverable Submission
  submitDeliverable: (collaborationId, milestoneNumber, data) =>
    api.post(`/collaborations/${collaborationId}/milestones/${milestoneNumber}/deliverables`, data),
  updateDeliverable: (collaborationId, milestoneNumber, deliverableId, data) =>
    api.patch(`/collaborations/${collaborationId}/milestones/${milestoneNumber}/deliverables/${deliverableId}`, data),

  // Milestone Actions
  approveMilestone: (collaborationId, milestoneNumber) =>
    api.post(`/collaborations/${collaborationId}/milestones/${milestoneNumber}/approve`),
  approveDeliverable: (collaborationId, milestoneNumber, deliverableId) =>
    api.post(`/collaborations/${collaborationId}/milestones/${milestoneNumber}/deliverables/${deliverableId}/approve`),
  requestRevision: (collaborationId, milestoneNumber, data) =>
    api.post(`/collaborations/${collaborationId}/milestones/${milestoneNumber}/request-revision`, data),
};

// Custom Packages API
export const customPackagesAPI = {
  // Brand endpoints
  createRequest: (data) => api.post('/custom-packages/requests', data),
  getMyRequests: () => api.get('/custom-packages/requests/my-requests'),
  acceptOffer: (offerId) => api.post(`/custom-packages/offers/${offerId}/accept`),
  declineOffer: (offerId, data) => api.post(`/custom-packages/offers/${offerId}/decline`, data),
  getBrandOffers: (brandId) => api.get(`/custom-packages/offers/brand/${brandId}`),

  // Creator endpoints
  getReceivedRequests: () => api.get('/custom-packages/requests/received'),
  createOffer: (data) => api.post('/custom-packages/offers', data),
  getMyOffers: () => api.get('/custom-packages/offers/my-offers'),

  // Shared endpoints
  getRequest: (requestId) => api.get(`/custom-packages/requests/${requestId}`),
  getOffer: (offerId) => api.get(`/custom-packages/offers/${offerId}`),
};

export default api;
