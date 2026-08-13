import axios from '../../../services/axios.client';

export const settingsService = {
  updateSettings: async (settings) => {
    return await axios.put('/api/users/me/settings', settings);
  },
  updateProfile: async (formData) => {
    return await axios.put('/api/users/profile', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  }
};
