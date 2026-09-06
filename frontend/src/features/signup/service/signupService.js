/**
 * signupService.js
 * Handles API communications for the signup feature.
 */

import axios from '@/services/axios.client';

export const signupUser = async (data) => {
  const response = await axios.post('/api/signup', data);
  return response.data;
};

export const resendVerification = async (email) => {
  const response = await axios.post('/api/signup/resend-verification', { email });
  return response.data;
};
