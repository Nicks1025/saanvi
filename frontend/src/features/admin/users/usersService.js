import axios from '../../../services/axios.client';

export const getUsers = async (search = '') => {
  const query = search ? `?search=${encodeURIComponent(search)}` : '';
  const response = await axios.get(`/api/admin/users${query}`);
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
