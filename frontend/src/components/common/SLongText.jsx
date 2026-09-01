import React from 'react';
import './s-text-field.css'; // Reusing the text field styles for consistency

const SLongText = ({
  text = '',
  label,
  placeholder,
  width = '100%',
  marginBottom = '1rem',
  onChange,
  required = false,
  error = '',
  rows = 4,
  className = '',
  ...props
}) => {
  return (
    <div className="s-text-field" style={{ width, marginBottom }}>
      {label && (
        <label>
          {label}
          {required && <span style={{ color: '#ef4444', marginLeft: '4px' }}>*</span>}
        </label>
      )}
      <div className={`s-text-field-input-wrapper ${error ? 'has-error' : ''}`}>
        <textarea
          value={text}
          placeholder={placeholder}
          onChange={onChange}
          className={`s-input ${className}`.trim()}
          rows={rows}
          style={{
            borderColor: error ? '#ef4444' : undefined,
            resize: 'vertical',
            padding: '0.8rem'
          }}
          {...props}
        />
      </div>
      {error && <div style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '4px' }}>{error}</div>}
    </div>
  );
};

export default SLongText;
