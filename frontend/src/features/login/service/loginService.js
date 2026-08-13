/**
 * loginService.js
 * Handles all API communications for the login feature.
 */

import axios from '../../../services/axios.client';

export const loginUser = async (email, password) => {
  const data = await axios.post('/api/login', { email, password });
  return data.data; // Contains token and user details from backend { success: true, data: {...} }
};

export const loginWithGoogle = async (accessToken) => {
  const data = await axios.post('/api/login/google', { accessToken });
  return data.data;
};
