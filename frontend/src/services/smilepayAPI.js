/**
 * SmilePay Payment Gateway API Service
 * Handles all SmilePay payment operations
 */

import api from './api';

export const smilepayAPI = {
  /**
   * Initiate Ecocash payment
   * @param {Object} paymentData - Payment details
   * @returns {Promise} Payment response
   */
  initiateEcocash: (paymentData) => {
    return api.post('/payments/smilepay/ecocash', paymentData);
  },

  /**
   * Initiate Innbucks payment
   * @param {Object} paymentData - Payment details
   * @returns {Promise} Payment response
   */
  initiateInnbucks: (paymentData) => {
    return api.post('/payments/smilepay/innbucks', paymentData);
  },

  /**
   * Initiate SmileCash payment (OTP-based)
   * @param {Object} paymentData - Payment details including OTP
   * @returns {Promise} Payment response
   */
  initiateSmileCash: (paymentData) => {
    return api.post('/payments/smilepay/smilecash', paymentData);
  },

  /**
   * Initiate Omari payment (OTP-based)
   * @param {Object} paymentData - Payment details including OTP
   * @returns {Promise} Payment response
   */
  initiateOmari: (paymentData) => {
    return api.post('/payments/smilepay/omari', paymentData);
  },

  /**
   * Initiate card payment (Visa/Mastercard)
   * @param {Object} paymentData - Payment details including card info
   * @returns {Promise} Payment response (may include 3D Secure)
   */
  initiateCard: (paymentData) => {
    return api.post('/payments/smilepay/card', paymentData);
  },

  /**
   * Check payment status by polling
   * @param {string} orderReference - Order reference to check
   * @returns {Promise} Payment status
   */
  checkPaymentStatus: (orderReference) => {
    return api.get(`/payments/smilepay/${orderReference}/status`);
  },

  /**
   * Cancel pending payment
   * @param {string} orderReference - Order reference to cancel
   * @returns {Promise} Cancellation response
   */
  cancelPayment: (orderReference) => {
    return api.post(`/payments/smilepay/${orderReference}/cancel`);
  },

  /**
   * Get user's transaction history
   * @param {number} limit - Number of transactions to fetch
   * @returns {Promise} Transaction list
   */
  getTransactions: (limit = 50) => {
    return api.get(`/payments/smilepay/transactions?limit=${limit}`);
  },

  /**
   * Get transaction details
   * @param {string} orderReference - Order reference
   * @returns {Promise} Transaction details
   */
  getTransaction: (orderReference) => {
    return api.get(`/payments/smilepay/${orderReference}`);
  },
};

export default smilepayAPI;
