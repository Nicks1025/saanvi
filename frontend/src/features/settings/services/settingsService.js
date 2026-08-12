import axios from '../../../services/axios.client';

export const settingsService = {
  updateSettings: async (settings) => {
    return await axios.put('/api/users/me/settings', settings);
  }
};
