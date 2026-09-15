import axios from '@/services/axios.client';

const FORM_WIZARDS_API = '/api/form-wizards';
const PUBLIC_WIZARDS_API = '/api/public-wizards';

// --- Wizards ---
export const getWizards = async () => {
  const response = await axios.get(`${FORM_WIZARDS_API}/`);
  return response.data;
};

export const getWizard = async (uuid) => {
  const response = await axios.get(`${FORM_WIZARDS_API}/${uuid}`);
  return response.data;
};

export const createWizard = async (data) => {
  const response = await axios.post(`${FORM_WIZARDS_API}/`, data);
  return response.data;
};

export const updateWizard = async (uuid, data) => {
  const response = await axios.put(`${FORM_WIZARDS_API}/${uuid}`, data);
  return response.data;
};

export const deleteWizard = async (uuid) => {
  const response = await axios.delete(`${FORM_WIZARDS_API}/${uuid}`);
  return response.data;
};

// --- Phases ---
export const getPhases = async (wizardUuid) => {
  const response = await axios.get(`${FORM_WIZARDS_API}/${wizardUuid}/phases`);
  return response.data;
};

export const createPhase = async (wizardUuid, data) => {
  const response = await axios.post(`${FORM_WIZARDS_API}/${wizardUuid}/phases`, data);
  return response.data;
};

export const updatePhase = async (wizardUuid, phaseUuid, data) => {
  const response = await axios.put(`${FORM_WIZARDS_API}/${wizardUuid}/phases/${phaseUuid}`, data);
  return response.data;
};

export const deletePhase = async (wizardUuid, phaseUuid) => {
  const response = await axios.delete(`${FORM_WIZARDS_API}/${wizardUuid}/phases/${phaseUuid}`);
  return response.data;
};

// --- Steps ---
export const getSteps = async (wizardUuid, phaseUuid) => {
  const response = await axios.get(`${FORM_WIZARDS_API}/${wizardUuid}/phases/${phaseUuid}/steps`);
  return response.data;
};

export const createStep = async (wizardUuid, phaseUuid, data) => {
  const response = await axios.post(`${FORM_WIZARDS_API}/${wizardUuid}/phases/${phaseUuid}/steps`, data);
  return response.data;
};

export const updateStep = async (wizardUuid, phaseUuid, stepUuid, data) => {
  const response = await axios.put(`${FORM_WIZARDS_API}/${wizardUuid}/phases/${phaseUuid}/steps/${stepUuid}`, data);
  return response.data;
};

export const deleteStep = async (wizardUuid, phaseUuid, stepUuid) => {
  const response = await axios.delete(`${FORM_WIZARDS_API}/${wizardUuid}/phases/${phaseUuid}/steps/${stepUuid}`);
  return response.data;
};

// --- Public Endpoints ---
export const getPublicWizard = async (name) => {
  const response = await axios.get(`${PUBLIC_WIZARDS_API}/${name}`);
  return response.data;
};

export const submitPublicWizard = async (name, data) => {
  const response = await axios.post(`${PUBLIC_WIZARDS_API}/${name}`, data);
  return response.data;
};
