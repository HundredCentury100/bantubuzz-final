import api from './api';

export const campaignInvitationsAPI = {
  // Send invitations to creators
  sendInvitations: (data) => api.post('/campaign-invitations/invite', data),

  // Get creator's pending invitations
  getCreatorInvitations: () => api.get('/campaign-invitations/creator/pending'),

  // Get campaign's invitations (brand only)
  getCampaignInvitations: (campaignId, params = {}) =>
    api.get(`/campaign-invitations/campaign/${campaignId}`, { params }),

  // Accept invitation (creator)
  acceptInvitation: (invitationId, data = {}) =>
    api.post(`/campaign-invitations/${invitationId}/accept`, data),

  // Decline invitation (creator)
  declineInvitation: (invitationId, data = {}) =>
    api.post(`/campaign-invitations/${invitationId}/decline`, data),

  // Cancel invitation (brand)
  cancelInvitation: (invitationId) =>
    api.delete(`/campaign-invitations/${invitationId}`)
};
