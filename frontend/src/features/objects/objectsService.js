import axios from '@/services/axios.client';

const OBJECTS_API = '/api/objects';

// --- Objects ---
export const getObjects = async () => {
  const res = await axios.get(`${OBJECTS_API}/`);
  return res?.data || [];
};

export const getObject = async (uuid) => {
  const res = await axios.get(`${OBJECTS_API}/${uuid}`);
  return res?.data;
};

export const createObject = async (data) => {
  const res = await axios.post(`${OBJECTS_API}/`, data);
  return res?.data;
};

export const updateObject = async (uuid, data) => {
  const res = await axios.put(`${OBJECTS_API}/${uuid}`, data);
  return res?.data;
};

export const deleteObject = async (uuid) => {
  return await axios.delete(`${OBJECTS_API}/${uuid}`);
};

// --- Fields ---
export const getFields = async (objectUuid) => {
  const res = await axios.get(`${OBJECTS_API}/${objectUuid}/fields`);
  return res?.data || [];
};

export const createField = async (objectUuid, data) => {
  const res = await axios.post(`${OBJECTS_API}/${objectUuid}/fields`, data);
  return res?.data;
};

export const updateField = async (objectUuid, fieldUuid, data) => {
  const res = await axios.put(`${OBJECTS_API}/${objectUuid}/fields/${fieldUuid}`, data);
  return res?.data;
};

export const archiveField = async (objectUuid, fieldUuid) => {
  return await axios.delete(`${OBJECTS_API}/${objectUuid}/fields/${fieldUuid}`);
};

export const bulkSaveFields = async (objectUuid, fields, deletedFields) => {
  const res = await axios.post(`${OBJECTS_API}/${objectUuid}/fields/bulk`, { fields, deletedFields });
  return res?.data;
};

// --- Templates ---
export const getTemplates = async (objectUuid) => {
  const res = await axios.get(`${OBJECTS_API}/${objectUuid}/templates`);
  return res?.data || [];
};

export const createTemplate = async (objectUuid, data) => {
  const res = await axios.post(`${OBJECTS_API}/${objectUuid}/templates`, data);
  return res?.data;
};

export const updateTemplate = async (objectUuid, templateUuid, data) => {
  const res = await axios.put(`${OBJECTS_API}/${objectUuid}/templates/${templateUuid}`, data);
  return res?.data;
};

export const deleteTemplate = async (objectUuid, templateUuid) => {
  return await axios.delete(`${OBJECTS_API}/${objectUuid}/templates/${templateUuid}`);
};

// --- Records ---
export const getRecordCount = async (objectUuid) => {
  const res = await axios.get(`${OBJECTS_API}/${objectUuid}/record-count`);
  return res?.data || { count: 0 };
};

export const getRecords = async (objectUuid) => {
  const res = await axios.get(`${OBJECTS_API}/${objectUuid}/records`);
  return res?.data || { records: [], fields: [] };
};

export const getRecord = async (objectUuid, recordUuid) => {
  const res = await axios.get(`${OBJECTS_API}/${objectUuid}/records/${recordUuid}`);
  return res?.data;
};

export const createRecord = async (objectUuid, data) => {
  const res = await axios.post(`${OBJECTS_API}/${objectUuid}/records`, data);
  return res?.data;
};

export const updateRecord = async (objectUuid, recordUuid, data) => {
  const res = await axios.put(`${OBJECTS_API}/${objectUuid}/records/${recordUuid}`, data);
  return res?.data;
};

export const deleteRecord = async (objectUuid, recordUuid) => {
  return await axios.delete(`${OBJECTS_API}/${objectUuid}/records/${recordUuid}`);
};

const objectsService = {
  getObjects,
  getObject,
  createObject,
  updateObject,
  deleteObject,
  getFields,
  createField,
  updateField,
  archiveField,
  bulkSaveFields,
  getTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  getRecordCount,
  getRecords,
  getRecord,
  createRecord,
  updateRecord,
  deleteRecord,
};

export default objectsService;
