import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import './s-text-field.css';

const STextField = ({
  type = 'text',
  text = '',
  label,
  placeholder,
  width = '100%',
  marginBottom = '1rem',
  onChange,
  required = false,
  error = '',
  validate,
  autoComplete,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [internalError, setInternalError] = useState('');

  const isPasswordType = type === 'password';
  const currentType = isPasswordType && showPassword ? 'text' : type;
  const displayError = error || internalError;

  const handleChange = (e) => {
    if (validate) {
      const validators = Array.isArray(validate) ? validate : [validate];
      let err = '';
      for (const fn of validators) {
        const result = fn(e.target.value);
        if (result) { err = result; break; }
      }
      setInternalError(err);
    }
    onChange && onChange(e);
  };

  return (
    <div className="s-text-field" style={{ width, marginBottom }}>
      {label && (
        <label>
          {label}
          {required && <span style={{ color: '#ef4444', marginLeft: '4px' }}>*</span>}
        </label>
      )}
      <div className={`s-text-field-input-wrapper ${displayError ? 'has-error' : ''}`}>
        <input
          type={currentType}
          value={text}
          placeholder={placeholder}
          onChange={handleChange}
          className="s-input"
          autoComplete={autoComplete}
          style={{
            paddingRight: isPasswordType ? '2.5rem' : '0.8rem',
            borderColor: displayError ? '#ef4444' : undefined,
          }}
        />
        {isPasswordType && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="s-text-field-toggle"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
      {displayError && (
        <div style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.25rem', fontWeight: 500 }}>
          {displayError}
        </div>
      )}
    </div>
  );
};

export default STextField;
