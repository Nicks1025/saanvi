import axios from '../../../services/axios.client';

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

// Workflows
export const getWorkflows = async () => {
  const response = await axios.get('/api/admin/workflows');
  return response.data;
};

export const getWorkflowDetails = async (id) => {
  const response = await axios.get(`/api/admin/workflows/${id}`);
  return response.data;
};

export const getSystemEvents = async () => {
  const response = await axios.get('/api/admin/system-events');
  return response.data;
};

export const createWorkflow = async (data) => {
  const response = await axios.post('/api/admin/workflows', data);
  return response.data;
};

export const updateWorkflow = async (id, data) => {
  const response = await axios.put(`/api/admin/workflows/${id}`, data);
  return response.data;
};

export const deleteWorkflow = async (id) => {
  const response = await axios.delete(`/api/admin/workflows/${id}`);
  return response.data;
};

export const createSystemEvent = async (data) => {
  const response = await axios.post('/api/admin/system-events', data);
  return response.data;
};

export const updateSystemEvent = async (event_key, data) => {
  const response = await axios.put(`/api/admin/system-events/${event_key}`, data);
  return response.data;
};

export const deleteSystemEvent = async (event_key) => {
  const response = await axios.delete(`/api/admin/system-events/${event_key}`);
  return response.data;
};
