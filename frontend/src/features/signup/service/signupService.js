/**
 * signupService.js
 * Handles API communications for the signup feature.
 */

import axios from '@/services/axios.client';

export const getSignupFormConfig = async () => {
  const response = await axios.get('/api/public/users/form-config?context=signup');
  const fields = response.data || [];
  return fields.map((field) => ({
    uuid: field.uuid,
    fieldName: field.fieldName,
    label: field.label,
    fieldType: field.fieldType,
    placeholder: field.placeholder,
    defaultValue: field.defaultValue || '',
    isRequired: Boolean(field.isRequired),
    optionsConfig: field.optionsConfig,
    displayOrder: field.displayOrder || 0,
  }));
};

export const signupUser = async (data) => {
  const response = await axios.post('/api/signup', data);
  return response.data;
};

export const resendVerification = async (email) => {
  const response = await axios.post('/api/signup/resend-verification', { email });
  return response.data;
};

export default {
  getSignupFormConfig,
  signupUser,
  resendVerification,
};
