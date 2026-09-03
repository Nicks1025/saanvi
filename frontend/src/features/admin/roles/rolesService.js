import axios from '@/services/axios.client';

const API_BASE = '/api/admin';

export const getRoles = async (search = '') => {
  const response = await axios.get(`${API_BASE}/roles`, { params: { search } });
  return response.data || [];
};

export const getRoleByUuid = async (uuid) => {
  const response = await axios.get(`${API_BASE}/roles/${uuid}`);
  return response.data || null;
};

export const createRole = async (payload) => {
  const response = await axios.post(`${API_BASE}/roles`, payload);
  return response.data;
};

export const updateRole = async (uuid, payload) => {
  const response = await axios.put(`${API_BASE}/roles/${uuid}`, payload);
  return response.data;
};

export const getRolePermissions = async (uuid) => {
  const response = await axios.get(`${API_BASE}/roles/${uuid}/permissions`);
  return response.data || [];
};

export const updateRolePermissions = async (uuid, permissionUuids) => {
  const response = await axios.put(`${API_BASE}/roles/${uuid}/permissions`, { permissionUuids });
  return response.data;
};

export const getAllPermissions = async () => {
  const response = await axios.get(`${API_BASE}/permissions`);
  return response.data || [];
};

export const deleteRole = async (uuid) => {
  const response = await axios.delete(`${API_BASE}/roles/${uuid}`);
  return response.data;
};
