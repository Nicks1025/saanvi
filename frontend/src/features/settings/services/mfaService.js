import axios from '@/services/axios.client';

export const mfaService = {
  getStatus: async () => {
    const res = await axios.get('/api/mfa/status');
    return res.data;
  },

  enroll: async () => {
    const res = await axios.post('/api/mfa/enroll');
    return res.data;
  },

  challenge: async (factorId) => {
    const res = await axios.post('/api/mfa/challenge', { factorId });
    return res.data;
  },

  verify: async ({ factorId, challengeId, code }) => {
    const res = await axios.post('/api/mfa/verify', { factorId, challengeId, code });
    return res.data;
  },

  unenroll: async (factorId = 'totp') => {
    const res = await axios.post('/api/mfa/unenroll', { factorId });
    return res.data;
  }
};
