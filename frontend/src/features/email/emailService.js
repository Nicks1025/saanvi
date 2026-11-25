import axios from '@/services/axios.client';

export const getEmailLogs = async (pageNumber = 1, pageSize = 10, searchQuery = '') => {
  const params = new URLSearchParams();
  if (pageNumber) params.append('page', pageNumber);
  if (pageSize) params.append('limit', pageSize);
  if (searchQuery) params.append('search', searchQuery);
  const response = await axios.get(`/api/admin/email-logs?${params.toString()}`);
  return response;
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
