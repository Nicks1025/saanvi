import axios from '@/services/axios.client';

export const getEmailTemplates = async () => {
  const response = await axios.get('/api/admin/email-templates');
  return response.data;
};

export const getEmailTemplate = async (uuid) => {
  const response = await axios.get(`/api/admin/email-templates/${uuid}`);
  return response.data;
};

export const getEmailTemplateTableColumns = async (tableName) => {
  const response = await axios.get(`/api/admin/email-templates/table-columns?table=${encodeURIComponent(tableName)}`);
  return response.data;
};

export const createEmailTemplate = async (data) => {
  const response = await axios.post('/api/admin/email-templates', data);
  return response.data;
};

export const updateEmailTemplate = async (uuid, data) => {
  const response = await axios.put(`/api/admin/email-templates/${uuid}`, data);
  return response.data;
};

export const previewEmailTemplate = async (data) => {
  const response = await axios.post('/api/admin/email-templates/preview', data);
  return response.data;
};

export const testEmailTemplate = async (uuid, data) => {
  const response = await axios.post(`/api/admin/email-templates/${uuid}/test`, data);
  return response.data;
};

export const deleteEmailTemplate = async (uuid) => {
  const response = await axios.delete(`/api/admin/email-templates/${uuid}`);
  return response.data;
};

export const getEmailLogs = async () => {
  const response = await axios.get('/api/admin/email-logs');
  return response.data;
};
