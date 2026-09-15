import axios from '@/services/axios.client';

const OBJECTS_API = '/api/objects';

// --- Objects ---
export const getObjects = async () => {
  const response = await axios.get(`${OBJECTS_API}/`);
  return response.data;
};

export const getObject = async (uuid) => {
  const response = await axios.get(`${OBJECTS_API}/${uuid}`);
  return response.data;
};

export const createObject = async (data) => {
  const response = await axios.post(`${OBJECTS_API}/`, data);
  return response.data;
};

export const updateObject = async (uuid, data) => {
  const response = await axios.put(`${OBJECTS_API}/${uuid}`, data);
  return response.data;
};

export const deleteObject = async (uuid) => {
  const response = await axios.delete(`${OBJECTS_API}/${uuid}`);
  return response.data;
};

// --- Fields ---
export const getFields = async (objectUuid) => {
  const response = await axios.get(`${OBJECTS_API}/${objectUuid}/fields`);
  return response.data;
};

export const createField = async (objectUuid, data) => {
  const response = await axios.post(`${OBJECTS_API}/${objectUuid}/fields`, data);
  return response.data;
};

export const updateField = async (objectUuid, fieldUuid, data) => {
  const response = await axios.put(`${OBJECTS_API}/${objectUuid}/fields/${fieldUuid}`, data);
  return response.data;
};

export const archiveField = async (objectUuid, fieldUuid) => {
  const response = await axios.delete(`${OBJECTS_API}/${objectUuid}/fields/${fieldUuid}`);
  return response.data;
};

// --- Templates ---
export const getTemplates = async (objectUuid) => {
  const response = await axios.get(`${OBJECTS_API}/${objectUuid}/templates`);
  return response.data;
};

export const createTemplate = async (objectUuid, data) => {
  const response = await axios.post(`${OBJECTS_API}/${objectUuid}/templates`, data);
  return response.data;
};

export const updateTemplate = async (objectUuid, templateUuid, data) => {
  const response = await axios.put(`${OBJECTS_API}/${objectUuid}/templates/${templateUuid}`, data);
  return response.data;
};

export const deleteTemplate = async (objectUuid, templateUuid) => {
  const response = await axios.delete(`${OBJECTS_API}/${objectUuid}/templates/${templateUuid}`);
  return response.data;
};

// --- Records ---
export const getRecords = async (objectUuid) => {
  const response = await axios.get(`${OBJECTS_API}/${objectUuid}/records`);
  return response.data;
};
export const deleteRecord = async (objectUuid, recordUuid) => {
  const response = await axios.delete(`${OBJECTS_API}/${objectUuid}/records/${recordUuid}`);
  return response.data;
};
export const bulkSaveFields = async (objectUuid, fields, deletedFields) => {
  const response = await axios.post(`${OBJECTS_API}/${objectUuid}/fields/bulk`, { fields, deletedFields });
  return response.data;
};
