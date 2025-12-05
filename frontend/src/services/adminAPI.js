import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Create axios instance with default config
const adminAPI = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
adminAPI.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token') || localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle response errors
adminAPI.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('access_token');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/admin/login';
    }
    return Promise.reject(error);
  }
);

// ============================================================================
// DASHBOARD & STATISTICS
// ============================================================================

export const getDashboardStats = () => {
  return adminAPI.get('/admin/dashboard/stats');
};

export const getQuickActions = () => {
  return adminAPI.get('/admin/dashboard/quick-actions');
};

// ============================================================================
// USER MANAGEMENT
// ============================================================================

export const getUsers = (params) => {
  return adminAPI.get('/admin/users', { params });
};

export const getUser = (userId) => {
  return adminAPI.get(`/admin/users/${userId}`);
};

export const toggleUserActive = (userId) => {
  return adminAPI.put(`/admin/users/${userId}/toggle-active`);
};

export const verifyUser = (userId) => {
  return adminAPI.put(`/admin/users/${userId}/verify`);
};

export const unverifyUser = (userId) => {
  return adminAPI.put(`/admin/users/${userId}/unverify`);
};

export const activateUser = (userId) => {
  return adminAPI.put(`/admin/users/${userId}/activate`);
};

export const deactivateUser = (userId, reason) => {
  return adminAPI.put(`/admin/users/${userId}/deactivate`, { reason });
};

export const deleteUser = (userId) => {
  return adminAPI.delete(`/admin/users/${userId}`);
};

// ============================================================================
// CATEGORY MANAGEMENT
// ============================================================================

export const getCategories = (params) => {
  return adminAPI.get('/categories', { params });
};

export const createCategory = (formData) => {
  return adminAPI.post('/admin/categories', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

export const updateCategory = (categoryId, formData) => {
  return adminAPI.put(`/admin/categories/${categoryId}`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

export const deleteCategory = (categoryId) => {
  return adminAPI.delete(`/admin/categories/${categoryId}`);
};

// ============================================================================
// NICHE MANAGEMENT
// ============================================================================

export const getNiches = (params) => {
  return adminAPI.get('/categories/niches', { params });
};

export const createNiche = (formData) => {
  return adminAPI.post('/admin/categories/niches', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

export const updateNiche = (nicheId, formData) => {
  return adminAPI.put(`/admin/categories/niches/${nicheId}`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

export const deleteNiche = (nicheId) => {
  return adminAPI.delete(`/admin/categories/niches/${nicheId}`);
};

// ============================================================================
// COLLABORATION MANAGEMENT
// ============================================================================

export const getCollaborations = (params) => {
  return adminAPI.get('/admin/collaborations', { params });
};

export const getCollaboration = (collaborationId) => {
  return adminAPI.get(`/admin/collaborations/${collaborationId}`);
};

export const updateCollaborationStatus = (collaborationId, data) => {
  return adminAPI.put(`/admin/collaborations/${collaborationId}/status`, data);
};

// ============================================================================
// BOOKING & PAYMENT MANAGEMENT
// ============================================================================

export const getBookings = (params) => {
  return adminAPI.get('/admin/bookings', { params });
};

export const getBooking = (bookingId) => {
  return adminAPI.get(`/admin/bookings/${bookingId}`);
};

export const getRevenueStats = (params) => {
  return adminAPI.get('/admin/bookings/revenue', { params });
};

// ============================================================================
// CAMPAIGN MANAGEMENT
// ============================================================================

export const getCampaigns = (params) => {
  return adminAPI.get('/admin/campaigns', { params });
};

export const getCampaign = (campaignId) => {
  return adminAPI.get(`/admin/campaigns/${campaignId}`);
};

export const updateCampaignStatus = (campaignId, data) => {
  return adminAPI.put(`/admin/campaigns/${campaignId}/status`, data);
};

export const deleteCampaign = (campaignId) => {
  return adminAPI.delete(`/admin/campaigns/${campaignId}`);
};

// ============================================================================
// REVIEW MANAGEMENT
// ============================================================================

export const getReviews = (params) => {
  return adminAPI.get('/admin/reviews', { params });
};

export const getReview = (reviewId) => {
  return adminAPI.get(`/admin/reviews/${reviewId}`);
};

export const deleteReview = (reviewId) => {
  return adminAPI.delete(`/admin/reviews/${reviewId}`);
};

export const getReviewStats = () => {
  return adminAPI.get('/admin/reviews/stats');
};

// ============================================================================
// PACKAGE MANAGEMENT
// ============================================================================

export const getPackages = (params) => {
  return adminAPI.get('/admin/packages', { params });
};

export const deletePackage = (packageId) => {
  return adminAPI.delete(`/admin/packages/${packageId}`);
};

// ============================================================================
// CASHOUT MANAGEMENT
// ============================================================================

export const getCashouts = (params) => {
  return adminAPI.get('/admin/cashouts', { params });
};

export const getCashout = (cashoutId) => {
  return adminAPI.get(`/admin/cashouts/${cashoutId}`);
};

export const approveCashout = (cashoutId) => {
  return adminAPI.put(`/admin/cashouts/${cashoutId}/approve`);
};

export const rejectCashout = (cashoutId, reason) => {
  return adminAPI.put(`/admin/cashouts/${cashoutId}/reject`, { reason });
};

export const completeCashout = (cashoutId, transactionReference) => {
  return adminAPI.put(`/admin/cashouts/${cashoutId}/complete`, { transaction_reference: transactionReference });
};

// ============================================================================
// COLLABORATION & PAYMENT MANAGEMENT
// ============================================================================

export const updateCollaborationPayment = (collaborationId, data) => {
  return adminAPI.put(`/admin/collaborations/${collaborationId}/payment`, data);
};

export const releaseEscrow = (collaborationId) => {
  return adminAPI.post(`/admin/collaborations/${collaborationId}/escrow/release`);
};

export const getCancellationRequests = (params) => {
  return adminAPI.get('/admin/collaborations/cancellations', { params });
};

export const approveCancellation = (collaborationId, adminNotes) => {
  return adminAPI.put(`/admin/collaborations/${collaborationId}/cancellation/approve`, { admin_notes: adminNotes });
};

export const rejectCancellation = (collaborationId, adminNotes) => {
  return adminAPI.put(`/admin/collaborations/${collaborationId}/cancellation/reject`, { admin_notes: adminNotes });
};

// ============================================================================
// FEATURED CREATORS MANAGEMENT
// ============================================================================

export const getFeaturedCreators = () => {
  return adminAPI.get('/admin/creators/featured');
};

export const getEligibleCreators = (params) => {
  return adminAPI.get('/admin/creators/eligible-for-featured', { params });
};

export const featureCreator = (creatorId, featuredOrder = 0) => {
  return adminAPI.post(`/admin/creators/${creatorId}/feature`, { featured_order: featuredOrder });
};

export const unfeatureCreator = (creatorId) => {
  return adminAPI.delete(`/admin/creators/${creatorId}/unfeature`);
};

export const reorderFeaturedCreators = (creatorOrders) => {
  return adminAPI.put('/admin/creators/featured/reorder', { creator_orders: creatorOrders });
};

export default adminAPI;
