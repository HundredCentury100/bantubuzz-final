import axios from 'axios';

const MESSAGING_API_URL = import.meta.env.VITE_MESSAGING_URL || 'http://localhost:3001/api';
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

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
    const token = localStorage.getItem('access_token');
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

  // Mark messages as read
  markAsRead: (messageIds) =>
    messagingAPI.post('/messages/read', { messageIds }),
};

export default messagingService;
