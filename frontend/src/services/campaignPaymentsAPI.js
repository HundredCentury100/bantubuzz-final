import api from './api';

export const campaignPaymentsAPI = {
  // Calculate payment amount
  calculate: (data) => api.post('/campaign-payments/calculate', data),

  // Initiate payment
  initiate: (data) => api.post('/campaign-payments/initiate', data),

  // Get payment status (for polling)
  getStatus: (paymentId) => api.get(`/campaign-payments/${paymentId}/status`),

  // Upload bank transfer proof
  uploadProof: (paymentId, formData) =>
    api.post(`/campaign-payments/${paymentId}/upload-proof`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),

  // Get campaign payments
  getCampaignPayments: (campaignId) =>
    api.get(`/campaign-payments/campaign/${campaignId}`)
};
