import axios from '@/services/axios.client';

const FORM_WIZARDS_API = '/api/form-wizards';
const PUBLIC_WIZARDS_API = '/api/public-wizards';

// --- Wizards ---
export const getWizards = async () => {
  const res = await axios.get(`${FORM_WIZARDS_API}/`);
  return res?.data || [];
};

export const getWizard = async (uuid) => {
  const res = await axios.get(`${FORM_WIZARDS_API}/${uuid}`);
  return res?.data;
};

export const createWizard = async (data) => {
  const res = await axios.post(`${FORM_WIZARDS_API}/`, data);
  return res?.data;
};

export const updateWizard = async (uuid, data) => {
  const res = await axios.put(`${FORM_WIZARDS_API}/${uuid}`, data);
  return res?.data;
};

export const deleteWizard = async (uuid) => {
  return await axios.delete(`${FORM_WIZARDS_API}/${uuid}`);
};

// --- Phases ---
export const getPhases = async (wizardUuid) => {
  const res = await axios.get(`${FORM_WIZARDS_API}/${wizardUuid}/phases`);
  return res?.data || [];
};

export const createPhase = async (wizardUuid, data) => {
  const res = await axios.post(`${FORM_WIZARDS_API}/${wizardUuid}/phases`, data);
  return res?.data;
};

export const updatePhase = async (wizardUuid, phaseUuid, data) => {
  const res = await axios.put(`${FORM_WIZARDS_API}/${wizardUuid}/phases/${phaseUuid}`, data);
  return res?.data;
};

export const deletePhase = async (wizardUuid, phaseUuid) => {
  return await axios.delete(`${FORM_WIZARDS_API}/${wizardUuid}/phases/${phaseUuid}`);
};

// --- Steps ---
export const getSteps = async (wizardUuid, phaseUuid) => {
  const res = await axios.get(`${FORM_WIZARDS_API}/${wizardUuid}/phases/${phaseUuid}/steps`);
  return res?.data || [];
};

export const createStep = async (wizardUuid, phaseUuid, data) => {
  const res = await axios.post(`${FORM_WIZARDS_API}/${wizardUuid}/phases/${phaseUuid}/steps`, data);
  return res?.data;
};

export const updateStep = async (wizardUuid, phaseUuid, stepUuid, data) => {
  const res = await axios.put(`${FORM_WIZARDS_API}/${wizardUuid}/phases/${phaseUuid}/steps/${stepUuid}`, data);
  return res?.data;
};

export const deleteStep = async (wizardUuid, phaseUuid, stepUuid) => {
  return await axios.delete(`${FORM_WIZARDS_API}/${wizardUuid}/phases/${phaseUuid}/steps/${stepUuid}`);
};

// --- Public Endpoints ---
export const getPublicWizard = async (name) => {
  const res = await axios.get(`${PUBLIC_WIZARDS_API}/${name}`);
  return res?.data;
};

export const submitPublicWizard = async (name, data) => {
  const res = await axios.post(`${PUBLIC_WIZARDS_API}/${name}`, data);
  return res?.data;
};

// --- Internal Wizard Endpoints ---
export const getInternalWizard = async (pageUrl) => {
  const res = await axios.get(`${FORM_WIZARDS_API}/internal/${pageUrl}`);
  return res?.data;
};

export const submitInternalWizard = async (pageUrl, data) => {
  const res = await axios.post(`${FORM_WIZARDS_API}/internal/${pageUrl}`, data);
  return res?.data;
};
