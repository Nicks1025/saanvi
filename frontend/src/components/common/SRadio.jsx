import React from 'react';

const SRadio = ({
  label,
  value,
  options = [],
  onChange,
  required = false,
  error = '',
  marginBottom = '1rem',
  multiple = false,
  name = Math.random().toString(36).substring(7)
}) => {
  const isChecked = (optValue) => {
    if (multiple) {
      return Array.isArray(value) && value.includes(optValue);
    }
    return value === optValue;
  };

  const handleChange = (optValue, checked) => {
    if (multiple) {
      const current = Array.isArray(value) ? [...value] : [];
      if (checked) {
        onChange([...current, optValue]);
      } else {
        onChange(current.filter(v => v !== optValue));
      }
    } else {
      onChange(optValue);
    }
  };

  return (
    <div style={{ marginBottom }}>
      {label && (
        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: 'var(--text)' }}>
          {label}
          {required && <span style={{ color: '#ef4444', marginLeft: '4px' }}>*</span>}
        </label>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {options.map((option) => (
          <label key={option.value} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: 'var(--text)' }}>
            <input
              type={multiple ? "checkbox" : "radio"}
              name={name}
              value={option.value}
              checked={isChecked(option.value)}
              onChange={(e) => handleChange(option.value, e.target.checked)}
              style={{ accentColor: 'var(--primary)' }}
            />
            {option.label}
          </label>
        ))}
      </div>
      {error && <div style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '4px' }}>{error}</div>}
    </div>
  );
};

export default SRadio;
