/**
 * validations.js
 * Centralised, reusable validation functions for the Saanvi application.
 * Single source of truth — used by SignupFeature, SettingsFeature (Change Password), etc.
 */

// ---------------------------------------------------------------------------
// Basic validators
// ---------------------------------------------------------------------------

export const validateRequired = (value, label = 'This field') => {
  if (value === null || value === undefined || (typeof value === 'string' && !value.trim())) {
    return `${label} is required`;
  }
  return null;
};

export const validateMaxLength = (value, max, label = 'Field') => {
  if (value && value.length > max) {
    return `${label} must be at most ${max} characters`;
  }
  return null;
};

export const validateMinLength = (value, min, label = 'Field') => {
  if (!value || value.length < min) {
    return `${label} must be at least ${min} characters`;
  }
  return null;
};

export const validateEmail = (value) => {
  if (!value || !value.trim()) return 'Email is required';
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(value.trim())) return 'Please enter a valid email address';
  return null;
};

export const validatePhone = (value) => {
  if (!value || !value.trim()) return 'Phone number is required';
  const digits = value.replace(/\D/g, '');
  if (digits.length === 0) return 'Phone number is required';
  if (digits.length !== 10) return 'Phone number must be exactly 10 digits';
  return null;
};

export const validateDate = (value, label = 'Date') => {
  if (!value) return `${label} is required`;
  const d = new Date(value);
  if (isNaN(d.getTime())) return `${label} is not a valid date`;
  return null;
};

// ---------------------------------------------------------------------------
// Password validators
// ---------------------------------------------------------------------------

/**
 * Validates password strength and enforces name restrictions.
 *
 * @param {string} password
 * @param {{ firstName?: string, lastName?: string, displayName?: string }} [options]
 * @returns {string|null}  Error message, or null if valid.
 */
export const validatePassword = (password, { firstName = '', lastName = '', displayName = '' } = {}) => {
  if (!password) return 'Password is required';
  if (password.length < 8) return 'Password must be at least 8 characters';
  if (!/\d/.test(password)) return 'Password must contain at least one number';
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) return 'Password must contain at least one special character';

  const lower = password.toLowerCase();
  if (firstName && firstName.trim() && lower.includes(firstName.trim().toLowerCase())) {
    return 'Password must not contain your name';
  }
  if (lastName && lastName.trim() && lower.includes(lastName.trim().toLowerCase())) {
    return 'Password must not contain your name';
  }
  if (displayName && displayName.trim() && lower.includes(displayName.trim().toLowerCase())) {
    return 'Password must not contain your name';
  }

  return null;
};

/**
 * Returns the live requirement status for each password rule.
 * Used to render the real-time requirements checklist below the password field.
 *
 * @param {string} password
 * @param {{ firstName?: string, lastName?: string, displayName?: string }} [options]
 * @returns {{ key: string, label: string, met: boolean }[]}
 */
export const getPasswordRequirements = (password, { firstName = '', lastName = '', displayName = '' } = {}) => {
  const pw = password || '';
  const lower = pw.toLowerCase();

  const nameContained =
    (firstName && firstName.trim() && lower.includes(firstName.trim().toLowerCase())) ||
    (lastName && lastName.trim() && lower.includes(lastName.trim().toLowerCase())) ||
    (displayName && displayName.trim() && lower.includes(displayName.trim().toLowerCase()));

  return [
    { key: 'length',  label: '8 or more characters',           met: pw.length >= 8 },
    { key: 'number',  label: 'Contains a number',              met: /\d/.test(pw) },
    { key: 'special', label: 'Contains a special character',   met: /[!@#$%^&*(),.?":{}|<>]/.test(pw) },
    { key: 'noName',  label: 'Does not contain your name',     met: pw.length > 0 && !nameContained },
  ];
};

export const validateCurrentPassword = (value) => {
  if (!value || !value.trim()) return 'Current password is required';
  return null;
};

/**
 * Validates that confirmPassword matches password.
 *
 * @param {string} password
 * @param {string} confirmPassword
 * @returns {string|null}
 */
export const validateConfirmPassword = (password, confirmPassword) => {
  if (!confirmPassword) return 'Please confirm your password';
  if (password !== confirmPassword) return 'Passwords do not match';
  return null;
};
