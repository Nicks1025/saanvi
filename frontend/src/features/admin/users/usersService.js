import axios from '../../../services/axios.client';

export const getUsers = async (search = '', showArchived = false, page = 1, limit = 10) => {
  const queryParams = new URLSearchParams();
  if (search) queryParams.append('search', search);
  if (showArchived === true || showArchived === 'true') queryParams.append('archived', 'true');
  else if (showArchived === 'all') queryParams.append('archived', 'all');
  queryParams.append('page', page);
  queryParams.append('limit', limit);
  
  const response = await axios.get(`/api/admin/users?${queryParams.toString()}`);
  return response.data || [];
};

export const getUser = async (uuid) => {
  const response = await axios.get(`/api/admin/users/${uuid}`);
  return response.data || null;
};

export const updateUser = async (uuid, payload) => {
  const response = await axios.put(`/api/admin/users/${uuid}`, payload);
  return response.data;
};

export const getUserRoles = async (uuid) => {
  const response = await axios.get(`/api/admin/users/${uuid}/roles`);
  return response.data || [];
};

export const updateUserRoles = async (uuid, roleUuids) => {
  const response = await axios.put(`/api/admin/users/${uuid}/roles`, { roleUuids });
  return response.data;
};

export const archiveUser = async (uuid) => {
  const response = await axios.put(`/api/admin/users/${uuid}/archive`);
  return response.data;
};

export const restoreUser = async (uuid) => {
  const response = await axios.put(`/api/admin/users/${uuid}/restore`);
  return response.data;
};

export const deleteUser = async (uuid) => {
  const response = await axios.delete(`/api/admin/users/${uuid}`);
  return response.data;
};

export const createUser = async (payload) => {
  const response = await axios.post('/api/admin/users', payload);
  return response.data;
};

export const getFormConfig = async (context = 'admin_create') => {
  const response = await axios.get(`/api/public/users/form-config?context=${context}`);
  return response.data;
};

