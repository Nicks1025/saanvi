'use client';

import React, { useState, useEffect } from 'react';
import PhoneInput, { isValidPhoneNumber } from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import './s-phone-number.css';

const SPhoneNumber = ({
  id,
  name,
  label,
  required = false,
  text,
  value,
  placeholder = 'Enter phone number',
  disabled = false,
  error = '',
  onChange,
  width = '100%',
  marginBottom = '1rem',
  defaultCountry = 'IN',
  className = '',
  ...props
}) => {
  const initialValue = value !== undefined ? value : text || '';
  const [phoneValue, setPhoneValue] = useState(initialValue);
  const [internalError, setInternalError] = useState('');

  // Keep internal state in sync with external value prop
  useEffect(() => {
    const nextVal = value !== undefined ? value : text || '';
    setPhoneValue(nextVal);
  }, [value, text]);

  const handleChange = (val) => {
    const normalized = val || '';
    setPhoneValue(normalized);

    // Validate phone number according to country rules
    if (normalized) {
      if (!isValidPhoneNumber(normalized)) {
        setInternalError('Please enter a valid phone number');
      } else {
        setInternalError('');
      }
    } else if (required) {
      setInternalError('Phone number is required');
    } else {
      setInternalError('');
    }

    if (onChange) {
      const syntheticEvent = {
        target: { value: normalized, name: name || id },
        currentTarget: { value: normalized, name: name || id }
      };
      syntheticEvent.toString = () => normalized;
      syntheticEvent.valueOf = () => normalized;
      onChange(syntheticEvent);
    }
  };

  const displayError = error || internalError;

  return (
    <div
      className={`s-phone-field ${className}`.trim()}
      style={{ width, marginBottom }}
    >
      {label && (
        <label htmlFor={id} className="s-phone-label">
          {label}
          {required && <span className="s-phone-required">*</span>}
        </label>
      )}

      <div className={`s-phone-input-wrapper ${displayError ? 'has-error' : ''}`}>
        <PhoneInput
          id={id}
          name={name}
          international
          defaultCountry={defaultCountry}
          value={phoneValue || undefined}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={disabled}
          className="s-phone-input-container"
          {...props}
        />
      </div>

      {displayError && <div className="s-phone-error-msg">{displayError}</div>}
    </div>
  );
};

export default SPhoneNumber;
