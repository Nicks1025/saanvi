import axios from '@/services/axios.client';

export const getEmailLogs = async () => {
  const response = await axios.get('/api/admin/email-logs');
  return response.data;
};

export const getCampaigns = async (page = 1, limit = 20) => {
  const response = await axios.get(`/api/marketing/campaigns?page=${page}&limit=${limit}`);
  return response.data;
};

export const getCampaign = async (uuid) => {
  const response = await axios.get(`/api/marketing/campaigns/${uuid}`);
  return response.data;
};

export const createCampaign = async (data) => {
  const response = await axios.post('/api/marketing/campaigns', data);
  return response.data;
};

export const updateCampaign = async (uuid, data) => {
  const response = await axios.put(`/api/marketing/campaigns/${uuid}`, data);
  return response.data;
};

export const deleteCampaign = async (uuid) => {
  const response = await axios.delete(`/api/marketing/campaigns/${uuid}`);
  return response.data;
};

export const sendCampaign = async (uuid) => {
  const response = await axios.post(`/api/marketing/campaigns/${uuid}/send`);
  return response.data;
};
