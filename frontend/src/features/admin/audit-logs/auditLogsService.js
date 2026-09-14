import axiosClient from '../../../services/axios.client';

export const getAuditLogs = async (params) => {
  const response = await axiosClient.get('/api/admin/audit-logs', { params });
  return response;
};
