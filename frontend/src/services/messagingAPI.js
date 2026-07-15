import axios from 'axios';
import { isNativeAppRuntime } from '../utils/nativeApp';

const configuredMessagingApiUrl = import.meta.env.VITE_MESSAGING_URL || '/messaging/api';
const configuredApiBaseUrl = import.meta.env.VITE_API_URL || '/api';
const MESSAGING_API_URL =
  isNativeAppRuntime() && configuredMessagingApiUrl.startsWith('/')
    ? `https://bantubuzz.com${configuredMessagingApiUrl}`
    : configuredMessagingApiUrl;
const API_BASE_URL =
  isNativeAppRuntime() && configuredApiBaseUrl.startsWith('/')
    ? `https://bantubuzz.com${configuredApiBaseUrl}`
    : configuredApiBaseUrl;

// Create axios instance for messaging service
const messagingAPI = axios.create({
  baseURL: MESSAGING_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
messagingAPI.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token') || localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle token refresh on 401
messagingAPI.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired, try to refresh
      try {
        const refreshToken = localStorage.getItem('refresh_token');
        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {}, {
          headers: { Authorization: `Bearer ${refreshToken}` }
        });

        const { access_token } = response.data;
        localStorage.setItem('access_token', access_token);
        localStorage.setItem('token', access_token);

        // Retry original request
        error.config.headers.Authorization = `Bearer ${access_token}`;
        return axios(error.config);
      } catch (refreshError) {
        // Refresh failed, logout user
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

// Create axios instance for main API (Flask backend)
const mainAPI = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to main API requests
mainAPI.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token') || localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle token refresh on 401 for main API
mainAPI.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired, try to refresh
      try {
        const refreshToken = localStorage.getItem('refresh_token');
        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {}, {
          headers: { Authorization: `Bearer ${refreshToken}` }
        });

        const { access_token } = response.data;
        localStorage.setItem('access_token', access_token);
        localStorage.setItem('token', access_token);

        // Retry original request
        error.config.headers.Authorization = `Bearer ${access_token}`;
        return axios(error.config);
      } catch (refreshError) {
        // Refresh failed, logout user
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

export const messagingService = {
  // Get all conversations
  getConversations: () => messagingAPI.get('/conversations'),

  // Get messages with a specific user
  getConversation: (userId, params = {}) =>
    messagingAPI.get(`/conversations/${userId}`, { params }),

  // Send message through Flask fallback API when Socket.IO is unavailable
  sendMessage: (receiverId, content, bookingId = null, extra = {}) =>
    mainAPI.post('/messages/', {
      receiver_id: receiverId,
      content,
      booking_id: bookingId,
      ...extra,
    }),

  uploadAttachment: (formData) =>
    mainAPI.post('/messages/attachments', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),

  // Mark messages as read
  markAsRead: (messageIds) =>
    messagingAPI.post('/messages/read', { messageIds }),

  markAsReadFallback: (messageIds) =>
    mainAPI.post('/messages/read', { messageIds }),

  // Report a user/message (uses main API)
  reportMessage: (data) => mainAPI.post('/messaging/report', data),

  // Block a user (uses main API)
  blockUser: (userId) => mainAPI.post(`/messaging/block/${userId}`),

  // Check block status between users (uses main API)
  checkBlockStatus: (userId) => mainAPI.get(`/messaging/check-block/${userId}`),

  // Unblock a user (uses main API)
  unblockUser: (userId) => mainAPI.delete(`/messaging/block/${userId}`),

  getVapidPublicKey: () => mainAPI.get('/messages/push/vapid-public-key'),
  savePushSubscription: (subscription) =>
    mainAPI.post('/messages/push-subscriptions', subscription),
  disablePushSubscription: (endpoint) =>
    mainAPI.delete('/messages/push-subscriptions', { data: { endpoint } }),
};

export default messagingService;
